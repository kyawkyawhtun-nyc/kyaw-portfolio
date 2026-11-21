import { defineConfig } from 'astro/config';

// site + base => https://kyawkyawhtun-nyc.github.io/kyaw-portfolio/
export default defineConfig({
  site: 'https://kyawkyawhtun-nyc.github.io',
  base: '/kyaw-portfolio',
  output: 'static',
  trailingSlash: 'always',
  prefetch: false,
  build: {
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      modulePreload: false,
      assetsInlineLimit: 0,
    },
  },
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
