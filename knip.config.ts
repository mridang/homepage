/**
 * @file Knip configuration: the entry points, and the dependencies and files it should ignore.
 */
export default {
  entry: ['astro.config.mjs', 'src/pages/**/*.astro'],
  ignore: ['knip.config.ts', 'scripts/**'],
  ignoreDependencies: [
    /^@semantic-release\//,
    /^@astrojs\//,
    /^@tailwindcss\//,
    'cloudflare',
  ],
  tags: ['+public'],
};
