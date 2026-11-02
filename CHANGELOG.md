# Changelog

Prism follows [semantic versioning](https://semver.org). Each release is a git tag (`v0.3.0`).

## 0.3.0 - 2026-11-02

Rebuilt for the current Frappe 16 UI. If you run an older Prism on Frappe 16.54, this fixes the unreadable sidebar and half-applied dark themes.

### Added
- **On/off switch for every user**, in the icon rail above the avatar (pinned dock only), the sidebar, the home screen and Settings > Appearance. It applies instantly, is saved per user, and only affects that user.
- **Prism section in Settings > Appearance**: turn the theme on or off and pick a personal theme.
- **Themes page**: search, filter, contrast scores, usage counts, create a theme from one brand colour, duplicate, export, import, reset a built-in theme.
- **Theme Assignments page**: create and edit assignments, with style adjustments and a searchable user picker.
- **User Themes page**: see which theme each user gets and why, and change it per user.
- **Settings page**: on/off, default theme, what users are allowed to do, a dark-mode theme, maintenance actions and install details.
- **Theme for dark mode**: follow each person's Light, Dark or Automatic choice with a second theme.
- Four themes: Riyadh Night, Porcelain, Graphite, Desert Sand.
- Prism's own Sidebar and Dock with icons, in Frappe 16's new format.
- Change history on themes, assignments and settings.
- Arabic translations.

### Changed
- **Theme Studio redesigned**: live preview, colour tiles, real theme thumbnails, and one save flow with Save, Discard and Undo. Previews no longer change a saved theme until you save, and leaving the page reverts them.
- Dark themes now use Frappe's own dark mode rather than repainting a light Desk.
- The sidebar uses Frappe 16's native look: a raised active row and no accent bar.
- Third-party app icons and company logos keep their own colours. Only ERPNext's module icons are retinted.

### Fixed
- Unreadable sidebar text on themes with a dark sidebar colour.
- Invisible page titles on dark themes.
- The header colour setting and primary button styles having no effect on Frappe 16.54 (`.navbar` is gone and page actions are `.es-button`).
- Corner radius settings having no effect on most controls.
- Prism changing Desk while switched off. All styles now need an active theme.
- **Edits to built-in themes being overwritten on every migrate.** Built-in themes are no longer fixtures.
- "Filled" and "Solid Glyph" icons rendering as solid blobs.
- Selecting Glass or Ripple in an assignment being rejected.
- A user staying listed in an old assignment after moving to a new one.
- Four built-in themes below AA contrast on buttons.
- Login page: mismatched button sizes, two primary buttons, unreadable labels on Glass Floating, and a broken-image icon when the logo is a private file.
- Sidebar text being overridden by other apps' Desk styles (seen with KamilX).

### Security
- Theme values are validated before they reach CSS: colours must be hex, and font names and image addresses are restricted.
- Theme Studio saves only through an allow-list of fields.

### Upgrade notes
- Run `bench --site <site> migrate` and `bench build --app prism`.
- Built-in themes that were never edited move to the corrected colours. Edited ones are left alone.
- Removed API methods: `get_presets`, `update_preset_overrides`, `get_desktop_icons_for_theme`, `update_hidden_icons`, `get_app_overrides`, `update_app_overrides`. Use `get_studio_state` and `save_preset`.

## 0.2.0-beta

Per-app colour overrides, Glass menu style and opacity control, corner and checkbox style pickers, desktop background image, five login layouts, dark-theme contrast pass.

## 0.1.x

Desktop icon visibility, per-user theme assignment, login and error-page theming, 12-preset gallery, WCAG checker.

## 0.0.1

Initial scaffold: Theme Preset and Theme Settings doctypes, boot-time theme injection, first presets, Theme Studio.
