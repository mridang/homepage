/**
 * @file Application context attached to the invocation's root span, so Workers Issues can show who and what an error affected.
 * @packageDocumentation
 *
 * Application context for Workers Issues. Cloudflare shows the attributes set
 * on the invocation's root span next to an error, so an error can say who and
 * what it affected. Everything here is best effort: where there is no Workers
 * runtime (plain Node, tests) or no active span, it does nothing, and it never
 * throws.
 *
 * Only plain facts go in: an internal user number, the kind of sign-in, a
 * fixed reason code. Never an email address, a name, an address, a cookie, a
 * token, a code or any text from a request or from Google.
 */

/** What a span attribute may hold. */
export type ContextValue = string | number | boolean;

/** Attributes to set; those left undefined are dropped. */
export type ContextAttributes = Readonly<
  Record<string, ContextValue | undefined>
>;

/** The part of a Workers span this file uses. */
interface ContextSpan {
  setAttribute(key: string, value: ContextValue): void;
  recordException(exception: { name: string; message: string }): void;
}

/** The part of `tracing` from `cloudflare:workers` this file uses. */
interface ContextTracing {
  getActiveSpan(): ContextSpan | undefined;
}

/** Longest text kept in one attribute; the rest is cut off. */
const MAX_TEXT = 256;

/** The tracing API once loaded under the key `tracing`; `null` where there is none, and no entry before the first load. */
const loaded = new Map<'tracing', ContextTracing | null>();

/**
 * Loads `cloudflare:workers`. Only the loaded module is remembered, never the
 * promise: a promise started in one request must not be waited on in another,
 * which the Workers runtime may never settle. The module is lazy because it
 * exists only in the Workers runtime, and a failure is remembered. The ignore
 * comments keep the app's bundlers from trying to resolve it.
 * @returns The tracing API, or null when the runtime module is not available.
 * @example
 * ```ts
 * const tracing = await load();
 * ```
 */
async function load(): Promise<ContextTracing | null> {
  return import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ 'cloudflare:workers'
  )
    .then((workers) => {
      // eslint-disable-next-line functional/immutable-data -- the module-level memo of the loaded runtime module
      loaded.set('tracing', workers.tracing);
      return workers.tracing;
    })
    .catch(() => {
      // eslint-disable-next-line functional/immutable-data -- the module-level memo of the loaded runtime module
      loaded.set('tracing', null);
      return null;
    });
}

/**
 * Runs `apply` on the invocation's root span, if there is one. Once the runtime
 * module has loaded this happens at once, before the call returns, so that
 * context set in a handler that does not wait is still on the span when the
 * invocation ends. Never rejects.
 * @param apply - The change to make to the active span.
 * @returns A promise that settles once the change has been made or skipped.
 * @example
 * ```ts
 * await withActiveSpan((span) => span.setAttribute('user.kind', 'signed-in'));
 * ```
 */
async function withActiveSpan(
  apply: (span: ContextSpan) => void,
): Promise<void> {
  const run = (tracing: ContextTracing | null): void => {
    try {
      const span = tracing?.getActiveSpan();
      if (span) {
        apply(span);
      }
    } catch {
      // Context is a convenience: it must never fail a request.
    }
  };
  if (loaded.has('tracing')) {
    run(loaded.get('tracing') ?? null);
  } else {
    await load()
      .then(run)
      .catch(() => undefined);
  }
}

/**
 * The attributes worth keeping: defined, and a string, a finite number or a boolean.
 * @param attributes - The attributes the caller wants to set.
 * @returns The accepted attributes as key and value pairs, with text cut to a fixed length.
 * @example
 * ```ts
 * accepted({ 'user.kind': 'signed-in', skipped: undefined }); // [['user.kind', 'signed-in']]
 * ```
 */
function accepted(attributes: ContextAttributes): [string, ContextValue][] {
  return Object.entries(attributes).flatMap(
    ([key, value]): [string, ContextValue][] => {
      if (typeof value === 'string') {
        return [[key, value.slice(0, MAX_TEXT)]];
      }
      if (
        typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value))
      ) {
        return [[key, value]];
      }
      return [];
    },
  );
}

/**
 * Attaches attributes to the current invocation so an error in it shows them.
 * Safe to call anywhere, any number of times (a later call for the same key
 * replaces the earlier value). The first call has to load the runtime module,
 * so where the caller is async it should wait for the result; the returned
 * promise never rejects.
 * @param attributes - The attributes to set. Undefined values are dropped.
 * @returns A promise that settles once the attributes have been set or skipped.
 * @example
 * ```ts
 * await setErrorContext({ 'user.kind': 'signed-in', 'flow.id': 'abc' });
 * ```
 */
export async function setErrorContext(
  attributes: ContextAttributes,
): Promise<void> {
  try {
    const kept = accepted(attributes);
    if (kept.length === 0) {
      return;
    }
    await withActiveSpan((span) => {
      // eslint-disable-next-line functional/no-loop-statements -- sets attributes on the span, a side effect that has no value to build
      for (const [key, value] of kept) {
        span.setAttribute(key, value);
      }
    });
  } catch {
    // Context is a convenience: it must never fail a request.
  }
}

/**
 * Records an error on the current invocation's span so Issues groups it by
 * `name`. Only the two fixed words are sent, never text that came from a
 * request, a person or a provider.
 * @param name - The error name that Issues groups by.
 * @param message - A fixed message for the error.
 * @returns A promise that settles once the error has been recorded or skipped.
 * @example
 * ```ts
 * await recordErrorOnSpan('LoggedError', 'torrent.lookup');
 * ```
 */
export async function recordErrorOnSpan(
  name: string,
  message: string,
): Promise<void> {
  return withActiveSpan((span) =>
    span.recordException({
      name: name.slice(0, MAX_TEXT),
      message: message.slice(0, MAX_TEXT),
    }),
  );
}
