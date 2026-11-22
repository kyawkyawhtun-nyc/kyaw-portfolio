import { defineConfig } from 'astro/config';

// site + base => https://kyawkyawhtun-nyc.github.io/kyaw-portfolio/
//
// build.format 'directory' writes each page as a folder index.html. That is
// the shape GitHub Pages serves: /about/ is the page, and /about redirects
// to it. trailingSlash 'ignore' still emits those trailing-slash URLs
// (directory format appends the slash) but does not make `astro preview`
// answer slashless paths with its own trailing-slash error. Preview serves
// the page, or the custom 404, the way a missing path should.
export default defineConfig({
  site: 'https://kyawkyawhtun-nyc.github.io',
  base: '/kyaw-portfolio',
  output: 'static',
  trailingSlash: 'ignore',
  prefetch: false,
  build: {
    format: 'directory',
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
