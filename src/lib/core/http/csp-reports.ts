/**
 * @file Summaries of the Content Security Policy and Reporting API reports that browsers send about this site.
 * @packageDocumentation
 *
 * Reading the reports browsers send about this site. Two formats arrive at the
 * same address: the Reporting API's (`application/reports+json`, a list of
 * `{ type, url, body }`) and the older CSP one (`application/csp-report`, one
 * `{ "csp-report": {…} }`). Both are boiled down to the same few facts, kept
 * short, with query strings and fragments cut off (an address on this site can
 * carry a sign-in code or a search) and anything from a browser extension left
 * out, because extensions inject scripts and styles into pages and every one of
 * them would otherwise be reported as a fault in the site.
 *
 * Reports come from anyone's browser, or from anyone pretending to be one, so
 * nothing in them is trusted: every field is cut to a short length and made
 * printable before it is logged.
 */

/** One report, reduced to what is worth a log line. */
export interface ReportSummary {
  /** `csp-violation`, `deprecation`, `permissions-policy-violation`, and others. */
  readonly type: string;
  /** The page it happened on: path only. */
  readonly page: string;
  /** What was blocked: `inline`, `eval`, `trusted-types-sink`, or an origin. */
  readonly blocked: string;
  /** The directive that was violated (`script-src-elem`, `require-trusted-types-for`, …). */
  readonly directive: string;
  /** `enforce` or `report`. */
  readonly disposition: string;
  /** The start of the offending code, if the browser gave it. */
  readonly sample: string;
  /** Where in which file, path only, if the browser said. */
  readonly source: string;
}

/** The most reports taken from one request. */
export const MAX_REPORTS_PER_REQUEST = 20;

/** The schemes extensions use for their own addresses. */
const EXTENSION_SCHEME =
  /^(?:chrome|moz|safari|safari-web|ms-browser|edge)-extension:/i;

/**
 * Whether a value is a plain JSON object, neither an array nor null.
 * @param value - The value to test.
 * @returns True when the value is a non-null, non-array object.
 * @example
 * ```ts
 * isRecord({ a: 1 }); // true
 * isRecord([1]); // false
 * ```
 */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Cuts a value to printable text of at most `limit` characters.
 *
 * Control characters become spaces, so a report cannot break a log line into two.
 * @param value - The value to read. Anything that is not a string yields an empty string.
 * @param limit - The maximum length of the returned text, in characters.
 * @returns The printable, trimmed text, or an empty string when the value is not text.
 * @example
 * ```ts
 * short('a\nb', 10); // 'a b'
 * ```
 */
function short(value: unknown, limit: number): string {
  if (typeof value !== 'string') {
    return '';
  }
  // Control characters (a line break in a log line could pass for another line) become spaces.
  const head = value.slice(0, limit * 2);
  const printable = [...head]
    .map((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code < 32 || code === 127 ? ' ' : char;
    })
    .join('');
  return printable.replaceAll(/\s+/g, ' ').trim().slice(0, limit);
}

/**
 * The first of `keys` in `body` that holds text.
 * @param body - The report body to read from.
 * @param keys - The field names to try, in order.
 * @returns The first string value found, or an empty string when none is text.
 * @example
 * ```ts
 * field({ 'blocked-uri': 'inline' }, 'blockedURL', 'blocked-uri'); // 'inline'
 * ```
 */
function field(
  body: Readonly<Record<string, unknown>>,
  ...keys: readonly string[]
): string {
  return (
    (keys.map((key) => body[key]).find((v) => typeof v === 'string') as
      string | undefined) ?? ''
  );
}

/**
 * The path of an address, without its origin, query or fragment.
 * @param address - The address to read.
 * @returns The path, at most 200 characters long, or an empty string when the address is not a URL.
 * @example
 * ```ts
 * pathOf('https://example.com/a/b?c=d'); // '/a/b'
 * ```
 */
function pathOf(address: string): string {
  try {
    return new URL(address).pathname.slice(0, 200);
  } catch {
    return '';
  }
}

/**
 * What a blocked address says about the block without the address itself: the
 * keywords browsers use (`inline`, `eval`, `self`), or just the origin.
 * @param address - The blocked address, or one of the browser's keywords.
 * @returns The keyword unchanged, the origin of the address, or a shortened copy of text that is not an address.
 * @example
 * ```ts
 * blockedOf('https://cdn.example.com/x.js'); // 'https://cdn.example.com'
 * ```
 */
function blockedOf(address: string): string {
  if (
    address === '' ||
    /^(?:inline|eval|self|trusted-types-sink|wasm-eval)$/.test(address)
  ) {
    return address;
  }
  try {
    const { origin, protocol } = new URL(address);
    return origin === 'null' ? protocol : origin;
  } catch {
    return short(address, 40);
  }
}

/**
 * Whether a report was caused by a browser extension, and so says nothing about the site.
 * @param body - The report body to check.
 * @returns True when the blocked or source address uses an extension scheme.
 * @example
 * ```ts
 * fromExtension({ blockedURL: 'chrome-extension://abc/x.js' }); // true
 * ```
 */
function fromExtension(body: Readonly<Record<string, unknown>>): boolean {
  return [
    field(body, 'blockedURL', 'blocked-uri'),
    field(body, 'sourceFile', 'source-file'),
  ].some((address) => EXTENSION_SCHEME.test(address));
}

/**
 * Boils one report body down to a summary.
 * @param type - The report type, such as `csp-violation`.
 * @param body - The report body to summarise.
 * @returns The summary of the report.
 * @example
 * ```ts
 * summarise('deprecation', {}).type; // 'deprecation'
 * ```
 */
function summarise(
  type: string,
  body: Readonly<Record<string, unknown>>,
): ReportSummary {
  return {
    type: short(type, 40) || 'unknown',
    page: pathOf(field(body, 'documentURL', 'document-uri')),
    blocked: blockedOf(field(body, 'blockedURL', 'blocked-uri')),
    directive: short(
      field(
        body,
        'effectiveDirective',
        'effective-directive',
        'violated-directive',
      ),
      60,
    ),
    disposition: short(field(body, 'disposition'), 10),
    sample: short(field(body, 'sample', 'script-sample'), 80),
    source: [
      pathOf(field(body, 'sourceFile', 'source-file')),
      field(body, 'lineNumber', 'line-number') ||
        (typeof body['lineNumber'] === 'number'
          ? String(body['lineNumber'])
          : ''),
    ]
      .filter(Boolean)
      .join(':'),
  };
}

/**
 * The entry for a body in the older CSP format, if it carries one.
 * @param body - The parsed request body.
 * @returns The single `csp-violation` entry, or an empty list when the body is not a CSP report.
 * @example
 * ```ts
 * cspReportEntries({ 'csp-report': { 'blocked-uri': 'inline' } }).length; // 1
 * ```
 */
function cspReportEntries(
  body: unknown,
): readonly (readonly [string, Readonly<Record<string, unknown>>])[] {
  if (isRecord(body) && isRecord(body['csp-report'])) {
    return [['csp-violation', body['csp-report']]];
  }
  return [];
}

/**
 * The reports in a request body, whichever format it came in, as summaries,
 * leaving out anything an extension caused and keeping at most
 * {@link MAX_REPORTS_PER_REQUEST}. Anything that is not a report is ignored.
 * @param body - The parsed request body, in either the Reporting API or the CSP format.
 * @returns The summaries of the reports that were kept.
 * @example
 * ```ts
 * summariseReports({ 'csp-report': { 'blocked-uri': 'inline' } }).length; // 1
 * ```
 */
export function summariseReports(body: unknown): readonly ReportSummary[] {
  const entries: readonly (readonly [
    string,
    Readonly<Record<string, unknown>>,
  ])[] = Array.isArray(body)
    ? body.flatMap((entry): [string, Readonly<Record<string, unknown>>][] =>
        isRecord(entry) && isRecord(entry['body'])
          ? [[short(entry['type'], 40), entry['body']]]
          : [],
      )
    : cspReportEntries(body);
  return entries
    .slice(0, MAX_REPORTS_PER_REQUEST)
    .filter(([, report]) => !fromExtension(report))
    .map(([type, report]) => summarise(type, report));
}
