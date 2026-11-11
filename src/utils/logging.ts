/**
 * @file Structured JSON logging for Workers Logs, one line per call.
 * @packageDocumentation
 *
 * Structured logging for Workers Logs. Each log call emits a single
 * JSON line (no multi-line stack traces) so the Cloudflare dashboard
 * indexes fields directly. Using these wrappers consistently means we
 * can query e.g. `event = "torrent.lookup" status:error` later.
 */

import { recordErrorOnSpan } from '@/lib/core/observability/context';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Required + extra fields for a structured log entry. `event` and
 * `level` are always set; any other fields you pass land verbatim.
 * @public
 */
export type LogFields = {
  /** Stable event identifier (e.g. `"torrent.lookup"`). */
  readonly event: string;
} & Record<string, unknown>;

/**
 * The text of a thrown value, for a log field.
 * @param error - The thrown value.
 * @returns The `Error`'s message, or the value converted to a string.
 * @public
 * @example
 * ```ts
 * errorMessage(new Error('boom')); // 'boom'
 * ```
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Writes one structured log line: the level and fields as JSON, with a timestamp.
 * Warnings and errors go to the error stream; everything else to the log stream.
 * @param level - The severity of the entry.
 * @param fields - The event name and any other fields to log.
 * @example
 * ```ts
 * emit('info', { event: 'torrent.lookup' });
 * ```
 */
function emit(level: LogLevel, fields: LogFields): void {
  const line = JSON.stringify({
    level,
    ...fields,
    ts: new Date().toISOString(),
  });
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
}

/**
 * Emits an info-level structured log.
 * @param fields - The event name and any other fields to log.
 * @public
 * @example
 * ```ts
 * logInfo({ event: 'torrent.lookup', status: 'ok' });
 * ```
 */
export function logInfo(fields: LogFields): void {
  emit('info', fields);
}

/**
 * Emits a warn-level structured log.
 * @param fields - The event name and any other fields to log.
 * @public
 * @example
 * ```ts
 * logWarn({ event: 'torrent.lookup', status: 'slow' });
 * ```
 */
export function logWarn(fields: LogFields): void {
  emit('warn', fields);
}

/**
 * Emits an error-level structured log, and records the event name as an error on the current span.
 * @param fields - The event name and any other fields to log.
 * @public
 * @example
 * ```ts
 * logError({ event: 'torrent.lookup', error: 'timeout' });
 * ```
 */
export function logError(fields: LogFields): void {
  emit('error', fields);
  // Issues groups errors by this name. Only the event name is sent: the
  // fields can carry text from requests and providers.
  void recordErrorOnSpan('LoggedError', fields.event);
}
