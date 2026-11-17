/**
 * @file Tests the cursor rules in the global stylesheet.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from '@jest/globals';

/** The rule that sets the pointer, capturing its selector list. */
const POINTER_RULE = /(button:not\(:disabled\),[^{]*)\{\s*cursor: pointer;/u;

/** A bare `button` selector, which would also match disabled buttons. */
const BARE_BUTTON = /(^|,)\s*button,/u;

const css = await readFile(
  path.join(process.cwd(), 'src', 'styles', 'global.css'),
  'utf8',
);

describe('global.css', () => {
  describe('cursor', () => {
    const rule = POINTER_RULE.exec(css)?.[1];

    it('is the pointer for anything clickable, since Tailwind 4 no longer gives buttons one', () => {
      for (const selector of [
        'button:not(:disabled)',
        'summary',
        'select:not(:disabled)',
      ]) {
        expect(rule).toContain(selector);
      }
      expect(rule).toContain("[role='button']");
    });

    it('is left alone for disabled controls', () => {
      expect(rule).not.toMatch(BARE_BUTTON);
      expect(rule).toContain(':not(:disabled)');
    });
  });
});
