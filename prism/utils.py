import frappe

OVERRIDE_FIELDS = ["navbar_color", "menu_style", "button_style", "hover_effect", "field_style"]


def clear_boot_cache():
	"""Boot data is cached per user, and the theme is part of it. Without this,
	everyone keeps the old theme until their cache happens to expire."""
	frappe.cache.delete_key("bootinfo")


def theme_for_boot(theme_name):
	theme = frappe.get_cached_doc("Theme Preset", theme_name).as_dict()
	# Keyed by app for a cheap lookup on every route change.
	theme["app_overrides"] = {
		row.get("app"): row for row in theme.get("app_color_overrides") or [] if row.get("app")
	}
	return theme


def extend_bootinfo(bootinfo):
	settings = frappe.get_single("Theme Settings")
	if not settings.theming_enabled:
		return

	# Per-user assignment (Prism User Theme, maintained by Prism Theme
	# Assignment) takes priority over the system-wide default, so an admin
	# can hand a group of users a different theme — and optionally a
	# different navbar/button/hover/field style on top of it — without
	# touching what everyone else sees.
	user_theme = frappe.db.get_value(
		"Prism User Theme",
		{"user": frappe.session.user},
		["theme_preset", *OVERRIDE_FIELDS],
		as_dict=True,
	)
	theme_name = (user_theme and user_theme.theme_preset) or settings.default_theme
	if not theme_name:
		return

	theme = theme_for_boot(theme_name)
	if user_theme:
		for field in OVERRIDE_FIELDS:
			if user_theme.get(field):
				theme[field] = user_theme[field]
	bootinfo.prism_theme = theme

	# get_desktop_icons() already populated bootinfo.desktop_icons before
	# extend_bootinfo hooks run (see frappe/boot.py boot_session) — strip out
	# whatever this theme marks hidden for everyone.
	hidden = {row.get("desktop_icon") for row in theme.get("hidden_desktop_icons") or []}
	if hidden and bootinfo.get("desktop_icons"):
		bootinfo.desktop_icons = [icon for icon in bootinfo.desktop_icons if icon.get("name") not in hidden]
