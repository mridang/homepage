export default {
  entry: ['astro.config.mjs', 'src/pages/**/*.astro'],
  ignore: ['knip.config.ts'],
  ignoreDependencies: [
    /^@semantic-release\//,
    /^@astrojs\//,
    /^@tailwindcss\//,
    /^cloudflare$/,
  ],
  tags: ['+public'],
};
