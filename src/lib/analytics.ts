/**
 * @file The origins of Cloudflare Web Analytics' beacon, which the Content Security Policy must allow.
 * @packageDocumentation
 *
 * Where Cloudflare Web Analytics' beacon loads from and reports to. Cloudflare
 * adds the beacon script to pages by itself, so the Content-Security-Policy
 * (see `astro.config.mjs`) has to let it through.
 */

/** The origin of the beacon script. */
export const BEACON_SCRIPT_SOURCE = 'https://static.cloudflareinsights.com';

/** The origin the beacon may report to. */
export const BEACON_CONNECT_SOURCE = 'https://cloudflareinsights.com';
