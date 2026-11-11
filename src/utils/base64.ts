/**
 * @file Base64 and URL-safe base64 helpers for raw bytes, shared by the Worker and the tests.
 * @packageDocumentation
 *
 * Base64 and URL-safe base64 for raw bytes, plus the one Web Crypto typing
 * helper that goes with them. The signed session token, the encrypted refresh
 * token, PKCE challenges, client secrets and pagination cursors all need
 * these, and they run unchanged on Cloudflare Workers and under Jest because
 * `btoa`/`atob` are globals in both.
 */

/**
 * Encodes raw bytes as standard (padded) base64.
 * @param bytes - The bytes to encode.
 * @returns The padded base64 text.
 * @example
 * ```ts
 * bytesToBase64(new Uint8Array([104, 105])); // 'aGk='
 * ```
 */
export function bytesToBase64(bytes: Uint8Array): string {
  // btoa wants a "binary string": one character per byte.
  return btoa(Array.from(bytes, (byte) => String.fromCodePoint(byte)).join(''));
}

/**
 * Decodes standard base64 into raw bytes. Throws on malformed input.
 * @param base64 - The padded base64 text to decode.
 * @returns The decoded bytes.
 * @throws When the text is not valid base64.
 * @example
 * ```ts
 * base64ToBytes('aGk='); // Uint8Array [104, 105]
 * ```
 */
export function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (char) => char.codePointAt(0) ?? 0);
}

/**
 * Encodes raw bytes as URL-safe base64 (`-` and `_`, no padding).
 * @param bytes - The bytes to encode.
 * @returns The URL-safe base64 text.
 * @example
 * ```ts
 * bytesToBase64Url(new Uint8Array([251, 255])); // '-_8'
 * ```
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  const encoded = bytesToBase64(bytes)
    .replaceAll('+', '-')
    .replaceAll('/', '_');
  let end = encoded.length;
  while (end > 0 && encoded.charAt(end - 1) === '=') {
    end--;
  }
  return encoded.slice(0, end);
}

/**
 * Decodes URL-safe base64, with or without padding, into raw bytes. Throws on malformed input.
 * @param text - The URL-safe base64 text to decode.
 * @returns The decoded bytes.
 * @throws When the text is not valid base64.
 * @example
 * ```ts
 * base64UrlToBytes('aGk'); // Uint8Array [104, 105]
 * ```
 */
export function base64UrlToBytes(text: string): Uint8Array {
  const standard = text.replaceAll('-', '+').replaceAll('_', '/');
  // Put back the padding that the URL-safe form leaves off.
  return base64ToBytes(standard + '==='.slice((standard.length + 3) % 4));
}

/**
 * Re-wraps bytes as an ArrayBuffer-backed view. Web Crypto's `BufferSource`
 * requires an `ArrayBuffer` (not the wider `ArrayBufferLike`, which includes
 * `SharedArrayBuffer`), and `TextEncoder`/views can be typed as the latter, so
 * copying through the array-like constructor guarantees the exact type.
 * @param bytes - The bytes to copy.
 * @returns A copy of the bytes, typed as a `BufferSource`.
 * @example
 * ```ts
 * const source = bufferSource(new TextEncoder().encode('text'));
 * ```
 */
export function bufferSource(bytes: Uint8Array): BufferSource {
  return new Uint8Array(bytes);
}
