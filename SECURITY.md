# Security

This is a static portfolio site. It has no server, no accounts, and no form backend.

## Reporting

Report a vulnerability to the repository owner. After the repository is public, use GitHub private vulnerability reporting. Do not open a public issue for a security report.

## Baseline

- The first element in `<head>` is a Content-Security-Policy meta tag. `script-src` is `'self'` only. The build must not emit an inline script.
- Referrer policy is `strict-origin-when-cross-origin`.
- Links that use `target="_blank"` also set `rel="noopener noreferrer"`.
- There is no analytics, no third-party CDN, and no embedded form provider.
- Do not commit secrets, tokens, API keys, or real `.env` values. `PUBLIC_` variables are not a place for secrets.
- Images must not contain EXIF or GPS metadata. Strip a file with `exiftool -all= <file>`.
- GitHub Actions jobs in CI request `contents: read` only. The Pages deploy workflow stays disabled until the launch checklist in `README.md` is done.

## History

If a secret or personal data is ever committed, do not rewrite published history to hide it. Treat the credential as exposed, and follow the launch note in the README if personal data is in history.
