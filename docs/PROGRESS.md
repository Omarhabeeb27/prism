# Prism: where things stand

Last updated 2026-11-02. Current release: **0.3.0** (git tag `v0.3.0`, branch `version-16`).

For the list of changes, see [CHANGELOG.md](../CHANGELOG.md).

## Why 0.3.0 happened

Frappe 16.54 changed the Desk markup and tokens that Prism relied on. On 16.54 the old Prism:

- made sidebar text unreadable on any theme with a dark sidebar colour
- had no effect on the header (`.navbar` no longer exists)
- didn't theme page action buttons (they are now `.es-button`)
- half-applied dark themes (it never set Frappe's `data-theme`)
- changed Desk even when switched off (unscoped CSS)

The engine, the Desk stylesheet and Theme Studio were rebuilt around the real 16.54 tokens.

## What exists now

| Area | Where |
|---|---|
| Theme engine: one function turns a preset into CSS values, used by both the Desk and the thumbnails | `prism.compute_tokens` in `prism/public/js/prism.bundle.js` |
| Desk styles, all scoped to an active theme | `prism/public/css/prism.bundle.css` |
| Styles for Prism's pages and the on/off switches | `prism/public/css/prism_ui.bundle.css` |
| Login and error pages | `prism/public/css/login_theme.bundle.css`, `prism/public/js/login_theme.bundle.js` |
| Pages: Theme Studio, Themes, Theme Assignments, User Themes, Settings | `prism/prism/page/` |
| Sidebar and Dock, in Frappe 16's format | `prism/prism/sidebar/prism/`, `prism/dock/prism/` |
| Server API | `prism/api.py` |
| Boot data and the per-user preference | `prism/utils.py` |
| Built-in themes, deliberately **not** in `fixtures/` | `prism/themes/built_in_themes.json` |
| Arabic | `prism/locale/ar.po` |
| Tests | `prism/tests/test_prism.py` |

## How to work on it

- **Don't move built-in themes back to `fixtures/`.** Frappe re-imports fixtures on every migrate, which overwrites people's edits.
- **New CSS must depend on a `prism-*` body class**, so that Prism off means no effect.
- **Page CSS uses logical properties** (`margin-inline-start`, not `margin-left`) because the pages are used in Arabic.
- **New strings** go through `__()`, and need a line in `prism/locale/ar.po`.
- **Never put real employee or customer data in `screenshots/`.** Use demo names.
- **Run tests on a site that holds no real data:** `bench --site <test-site> run-tests --app prism --module prism.tests.test_prism`
- **Local bench:** `bench start` only serves `default_site`, because it is pinned in `common_site_config.json`. To test another site, run `bench --site <site> serve --port 8101 --noreload`.

## What was verified for 0.3.0

All on Frappe 16.54, ERPNext 16.53 and HRMS 16.53.

| Check | Result |
|---|---|
| Backend tests | 20 of 20 pass |
| Browser flow: toggles, Appearance, assignments, users, new theme, save, revert on leaving, list buttons | 28 of 28 pass |
| Contrast and overflow audit on all 16 themes: home, list, form, Studio, report, HR dashboard, settings | No issues |
| The same 16 themes: menus, dialogs, field types, link dropdown, Settings dialog, alerts | No issues |
| Upgrade from an existing install, on a local copy of a production site | Works |
| Clean install on a new site with only Frappe and Prism | Works |
| Tablet and phone widths | No page overflow |

Before the final fixes, the backend tests were also run on that clean Frappe-only site. They exposed a problem with hidden tiles from uninstalled apps, which is now fixed and tested on a site with ERPNext and HRMS. The clean site was then removed, so that exact test run wasn't repeated.

## Not verified

- **Frappe 16 releases before 16.54.** Prism has fallbacks for older markup, but they have never been run.
- **Other themes in Arabic, and phone layouts in Arabic.** The Arabic layout was reviewed on one theme, on a site where KamilX's styling interfered. That interference is fixed, but Arabic wasn't re-reviewed afterwards.
- **Apps other than** ERPNext, HRMS, Falcon HR, Lang Toggle, KamilX and Helpdesk. Apps with heavy custom styling may need their own adjustments.
- **The automated audit** measures text contrast and overflow. It doesn't judge how good a theme looks.

## Ideas for later

- A theme schedule, such as dark after sunset
- Custom CSS per theme, with a sandboxed preview
- Screenshots in Arabic in this README

## Updating on Frappe Cloud

See [UPDATING_ON_FRAPPE_CLOUD.md](UPDATING_ON_FRAPPE_CLOUD.md).
