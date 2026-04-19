# Hotfix Funnel Open

Target branch/source: `FunnelPesanan`

## Files changed
- `assets/js/shared/ui-polish.js`
- `assets/js/pages/funnel-pipeline.js`

## What this fixes
- Makes query-string redirect building safe when the page is opened from non-standard origins such as `about:blank`, preview harnesses, or restrictive environments.
- Makes `Simpan & Buka Daftar` more resilient by catching navigation helper errors and falling back to `window.location.href`.

## Intended effect
- Prevent `Failed to construct 'URL': Invalid URL` from breaking the post-save open flow.
- Keep normal browser/server behavior unchanged for standard HTTP hosting.
