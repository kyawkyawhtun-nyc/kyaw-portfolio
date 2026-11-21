# kyaw-portfolio

Static personal portfolio skeleton for a data analyst. Pages, projects, and contact details are placeholders. Visual design is intentionally minimal until a separate spec lands.

The deployed URL, once GitHub Pages is turned on, is `https://kyawkyawhtun-nyc.github.io/kyaw-portfolio/`.

## Setup

1. Install Node.js 26.13.1 (current LTS). The version is pinned in `.nvmrc` and in `package.json` `engines`.
2. Install [gitleaks](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1) 8.30.1 or a newer 8.x, and check the checksum published with that release. The `gitleaks git` command is required.
3. Install dependencies and the local git hooks:

```sh
npm ci
npm run hooks:install
```

`npm run hooks:install` sets `core.hooksPath` to `scripts/hooks` for this clone. Until the repository is public, gitleaks must run locally before every push. The `pre-push` hook runs `gitleaks git --redact` on the commits being pushed and blocks the push if gitleaks is missing or reports a finding. Do not bypass it with `git push --no-verify`.

The optional `pre-commit` hook in the same directory runs gitleaks only when the binary is already installed.

4. Start the dev server:

```sh
npm run dev
```

The site is served under `/kyaw-portfolio/` because Astro `base` is set for GitHub project Pages.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Astro dev server |
| `npm run check` | `astro check` (TypeScript strict) |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Serve the build locally |
| `npm run check:dist` | Fail if built HTML has an inline script, a missing or non-first CSP meta, or `target="_blank"` without `rel="noopener noreferrer"`. Also fail if a built SVG contains `<script`, an `on…=` handler, `javascript:`, or `<foreignObject` |
| `npm run check:images` | Fail if an image or PDF under `public/` or `src/` contains EXIF, GPS, or PDF Author/Creator/Producer metadata |
| `npm run test:security` | Fixture tests for the SVG and project-link checks |
| `npm run hooks:install` | Point this clone at `scripts/hooks` |

CI also runs `npm audit --audit-level=high` and an offline internal link check.

## Security baseline

- The first element in every page `<head>` is:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'none'; object-src 'none'; upgrade-insecure-requests">
```

  The next element is `<meta name="referrer" content="strict-origin-when-cross-origin">`.
- Styles are external files (`build.inlineStylesheets: 'never'`). There is no client-side framework and no inline script. Syntax highlighting is done at build time.
- External new-tab links are written in the page templates (contact and project frontmatter). Do not put `target="_blank"` in Markdown unless `rel="noopener noreferrer"` is on the same tag. `npm run check:dist` rejects a new-tab link that omits it.
- CI sets `ASTRO_TELEMETRY_DISABLED=1` so the Astro CLI does not send usage telemetry. Locally, `npx astro telemetry disable` does the same for your machine.
- Fonts are a system stack. There is no Google Fonts, analytics, third-party CDN, or form host. Contact is an obfuscated `mailto:` plus a LinkedIn placeholder.
- External new-tab links use `rel="noopener noreferrer"`.
- No secrets belong in the repo, in logs, in pull requests, or in `PUBLIC_` variables. `.env.example` is a comment only.
- Third-party GitHub Actions are pinned to a full commit SHA. CI permissions are `contents: read`. There is no `pull_request_target`.
- CI scans the full git history with the gitleaks binary (v8.30.1, checksum-pinned). No license key is stored or required for this personal account. `gitleaks-action` is not used because that action only scans the commits on the triggering event, not the full history.

### Images

Before committing a photo, SVG, or PDF, strip metadata:

```sh
exiftool -all= <file>
```

`npm run check:images` scans raster images, SVGs, and `.pdf` files under `public/` and `src/`. Images are checked with exiftool when it is installed, and with a byte scan for EXIF headers and GPS text. PDFs require exiftool: if a PDF is present and exiftool is missing, the check fails and tells you to install it. A byte scan is not used for PDFs, because compressed metadata and escaped names such as `/Auth#6Fr` are easy to miss.

The PDF check fails when ExifTool reports an error or warning, when the file type is not PDF, or when `Author`, `Creator`, or GPS tags are present. `Producer` does not fail the check. Preview, browsers, and other PDF tools set it on almost every file, so treating it as a finding would reject ordinary documents. The script prints a warning when `Producer` is present and still exits successfully.

`exiftool -all=` on a PDF only appends an update. The old `Author` bytes stay in the file and can be recovered. Rewrite the file instead, and commit the rewritten output:

```sh
exiftool -overwrite_original -all:all= input.pdf && qpdf --linearize input.pdf output.pdf
```

`-overwrite_original` avoids leaving `input.pdf_original`, which would still contain the old bytes. `qpdf --linearize` writes a new file without that incremental trailer.

## Content

Project write-ups are Markdown files in `src/content/projects/` validated by the schema in `src/content.config.ts` (`title`, `summary`, `tools`, `dataset`, `links`, optional `image`). A project link `href` must be an `https://` URL, a root-relative path (`/…`, not `//…`), or a `#` fragment. `javascript:`, `http:`, and `data:` are rejected. The two sample projects are dummy text.

Internal links go through `siteHref()` so they keep the `/kyaw-portfolio` base.

## CI and deploy

- `.github/workflows/ci.yml` runs on pull requests and on pushes to `main`.
- `.github/workflows/deploy.yml` is present and disabled. It can only be started with `workflow_dispatch`, and both the `build` and `deploy` jobs are skipped unless the repository variable `PAGES_ENABLED` is `true`. The build job only has `contents: read`. The deploy job only has `pages: write` and `id-token: write`. The build does not call `configure-pages`: that action needs `pages: read`, runs after the site is already built, and is unused because `site` and `base` are set in `astro.config.mjs`.
- `.github/dependabot.yml` opens weekly updates for npm and GitHub Actions.

Link checking uses lychee v0.24.2 through `lycheeverse/lychee-action` (pinned by commit). The action is called with an empty `token` so it does not receive the workflow `GITHUB_TOKEN`. It runs offline, skips `http(s)` and `mailto` URLs, and resolves `/kyaw-portfolio/...` against `dist/` so only internal files and anchors are checked.

## Launch checklist

Do this only when the site is ready to publish. Do not flip these settings as part of ordinary development.

1. Run gitleaks over the full history (`gitleaks git . --redact --log-opts="--all"` with a full clone).
2. Review the history for personal data. If anything personal is found, publish from a fresh repository instead of rewriting history.
3. Make the repository public.
4. Enable branch protection on `main` (pull requests only; no force-push; no deletion).
5. Enable secret scanning and push protection.
6. Enable Dependabot alerts and Dependabot security updates.
7. Set the Actions default token to read-only.
8. Set the Pages source to "GitHub Actions", not "Deploy from a branch".
9. Enable Enforce HTTPS.
10. Restrict the `github-pages` environment to `main`.
11. Set the repository variable `PAGES_ENABLED=true`.

After that, a manual run of "Deploy to GitHub Pages" can publish `dist/`. The pre-push gitleaks requirement stays in place until the repository is public; the CI gitleaks job stays either way.
