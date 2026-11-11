// noinspection JSUnusedGlobalSymbols

/**
 * @file Jest global teardown, run once after the test suite finishes.
 */

/**
 * Tears down the test run. No external services need to be stopped.
 * @returns A promise that resolves once teardown is complete.
 * @example
 * ```ts
 * // jest.config.mjs refers to this file as globalTeardown: './test/teardown.ts'
 * ```
 */
export default async function teardown(): Promise<void> {
  // No external services to tear down.
}
