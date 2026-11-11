// noinspection JSUnusedGlobalSymbols

/**
 * @file Jest global setup, run once before the test suite starts.
 */

/**
 * Prepares the test run. No external services are required for the test suite.
 * @returns A promise that resolves once setup is complete.
 * @example
 * ```ts
 * // jest.config.mjs refers to this file as globalSetup: './test/setup.ts'
 * ```
 */
export default async function setup(): Promise<void> {
  // No external services are required for the test suite.
}
