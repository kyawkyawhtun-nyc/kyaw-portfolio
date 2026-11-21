# AGENTS.md

Rules for the OpenAI Codex CLI (and any other coding agent) working in this repository.

## Stack

- Astro static site, TypeScript strict, plain CSS with design tokens in `src/styles/tokens.css`.
- No client-side JavaScript framework. Node is pinned in `.nvmrc` and `package.json` `engines`.
- Content collections live in `src/content/projects/*.md`.

## Commands

- `npm ci`
- `npm run dev`
- `npm run build && npm run preview`
- `npm run check`

## Git

- Work on branches and open pull requests. Never push to `main`.
- Until this repository is public, run gitleaks locally before every push. Codex must run it before every push.
- Install the hook once per clone with `npm run hooks:install`. That sets `core.hooksPath` to `scripts/hooks`. The `pre-push` hook runs `gitleaks git --redact` on the commits being pushed.
- A push is blocked if gitleaks is not installed or if it reports a finding. Do not use `git push --no-verify`.
- The optional `pre-commit` hook runs the same scanner when gitleaks is already installed.

## Dependencies

- Do not add dependencies without asking.

## Secrets

- Never add secrets, keys, or tokens to code, logs, or pull requests.

## Security baseline

- No inline scripts. Keep the Content-Security-Policy meta tag intact and first in `<head>` (including `form-action 'none'`), followed by the referrer policy meta. Project link hrefs may only be `https://`, a root-relative `/` path, or a `#` fragment.
- External links that open in a new tab use `rel="noopener noreferrer"`.
- No third-party CDNs or trackers. Leave `ASTRO_TELEMETRY_DISABLED=1` in CI.

## Content

- Placeholder or approved content only. No personal data beyond what the owner approves. Do not add an address, phone number, date of birth, or immigration details.

## Images

- Strip EXIF and GPS metadata before committing images: `exiftool -all= <file>`. For a PDF, that command only appends an update. Run `exiftool -overwrite_original -all:all= input.pdf && qpdf --linearize input.pdf output.pdf` and commit `output.pdf`.
- `npm run check:images` must pass.

## Security review

- Changes to dependencies, headers/CSP, forms, or env vars need security review.
