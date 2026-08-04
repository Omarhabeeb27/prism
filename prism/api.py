import frappe


def has_app_permission():
	roles = frappe.get_roles()
	return "System Manager" in roles or "Prism Manager" in roles


@frappe.whitelist()
def get_presets():
	frappe.only_for(["System Manager", "Prism Manager"])
	return frappe.get_all(
		"Theme Preset",
		fields=[
			"name",
			"theme_name",
			"primary_color",
			"gradient_end_color",
			"navbar_color",
			"sidebar_color",
			"background_color",
			"text_color",
			"field_radius",
			"icon_style",
			"menu_style",
			"font_family",
			"is_dark_mode",
			"button_style",
			"hover_effect",
			"field_style",
			"background_style",
			"corner_style",
			"checkbox_style",
			"desktop_bg_image",
			"desktop_bg_overlay_opacity",
			"glass_opacity",
			"login_style",
		],
		order_by="theme_name asc",
	)


@frappe.whitelist()
def update_preset_overrides(
	theme,
	font_family=None,
	navbar_color=None,
	sidebar_color=None,
	menu_style=None,
	primary_color=None,
	text_color=None,
	button_style=None,
	hover_effect=None,
	field_style=None,
	background_style=None,
	corner_style=None,
	checkbox_style=None,
	desktop_bg_image=None,
	clear_desktop_bg_image=None,
	glass_opacity=None,
	login_style=None,
	desktop_bg_overlay_opacity=None,
):
	"""Lets Theme Studio's Fonts/Navbar/Accessibility/Elements tabs persist
	small per-preset overrides (font, navbar color, sidebar menu style, an
	auto-contrast-fixed accent, button/hover style) without needing a
	separate per-user preference doctype for Phase 1."""
	frappe.only_for(["System Manager", "Prism Manager"])
	doc = frappe.get_doc("Theme Preset", theme)
	if font_family:
		doc.font_family = font_family
	if navbar_color:
		doc.navbar_color = navbar_color
	if sidebar_color:
		doc.sidebar_color = sidebar_color
	if menu_style:
		doc.menu_style = menu_style
	if primary_color:
		doc.primary_color = primary_color
	if text_color:
		doc.text_color = text_color
	if button_style:
		doc.button_style = button_style
	if hover_effect:
		doc.hover_effect = hover_effect
	if field_style:
		doc.field_style = field_style
	if background_style:
		doc.background_style = background_style
	if corner_style:
		doc.corner_style = corner_style
	if checkbox_style:
		doc.checkbox_style = checkbox_style
	if desktop_bg_image:
		doc.desktop_bg_image = desktop_bg_image
	if frappe.utils.cint(clear_desktop_bg_image):
		doc.desktop_bg_image = None
	if glass_opacity is not None:
		doc.glass_opacity = frappe.utils.cint(glass_opacity)
	if login_style:
		doc.login_style = login_style
	if desktop_bg_overlay_opacity is not None:
		doc.desktop_bg_overlay_opacity = frappe.utils.cint(desktop_bg_overlay_opacity)
	doc.save()
	frappe.cache.delete_key("bootinfo")
	return doc.as_dict()


@frappe.whitelist()
def get_desktop_icons_for_theme(theme):
	"""Standard app/module icons (the Desk home app grid) plus which of them
	are hidden for this theme, for the Theme Studio Desktop tab's icon grid."""
	frappe.only_for(["System Manager", "Prism Manager"])
	icons = frappe.get_all(
		"Desktop Icon",
		filters={"standard": 1, "icon_type": "App"},
		fields=["name", "label", "app", "icon_image", "logo_url"],
		order_by="label asc",
	)
	hidden = set(
		frappe.get_all(
			"Prism Hidden Desktop Icon",
			filters={"parent": theme, "parenttype": "Theme Preset"},
			pluck="desktop_icon",
		)
	)
	for icon in icons:
		icon["hidden"] = icon["name"] in hidden
	return icons


@frappe.whitelist()
def update_hidden_icons(theme, hidden_icons):
	"""hidden_icons: JSON list of Desktop Icon names to hide for this theme."""
	frappe.only_for(["System Manager", "Prism Manager"])
	if isinstance(hidden_icons, str):
		hidden_icons = frappe.parse_json(hidden_icons)

	doc = frappe.get_doc("Theme Preset", theme)
	doc.set("hidden_desktop_icons", [])
	for icon_name in hidden_icons:
		doc.append("hidden_desktop_icons", {"desktop_icon": icon_name})
	doc.save()
	frappe.cache.delete_key("bootinfo")
	return [d.desktop_icon for d in doc.hidden_desktop_icons]


@frappe.whitelist()
def get_app_overrides(theme):
	frappe.only_for(["System Manager", "Prism Manager"])
	return frappe.get_all(
		"Prism App Color Override",
		filters={"parent": theme, "parenttype": "Theme Preset"},
		fields=["name", "app", "primary_color", "gradient_end_color", "navbar_color", "sidebar_color"],
		order_by="idx asc",
	)


@frappe.whitelist()
def update_app_overrides(theme, overrides):
	"""overrides: JSON list of {app, primary_color, gradient_end_color, navbar_color, sidebar_color}."""
	frappe.only_for(["System Manager", "Prism Manager"])
	if isinstance(overrides, str):
		overrides = frappe.parse_json(overrides)

	doc = frappe.get_doc("Theme Preset", theme)
	doc.set("app_color_overrides", [])
	for row in overrides:
		if not row.get("app"):
			continue
		doc.append(
			"app_color_overrides",
			{
				"app": row.get("app"),
				"primary_color": row.get("primary_color"),
				"gradient_end_color": row.get("gradient_end_color"),
				"navbar_color": row.get("navbar_color"),
				"sidebar_color": row.get("sidebar_color"),
			},
		)
	doc.save()
	frappe.cache.delete_key("bootinfo")
	return doc.app_color_overrides


@frappe.whitelist(allow_guest=True)
def get_login_theme():
	"""Guest-accessible: only colors/fonts, nothing sensitive. Lets the
	unauthenticated login/signup page (which never gets Desk's boot_session)
	pick up the active theme via a plain fetch instead."""
	settings = frappe.get_cached_doc("Theme Settings")
	if not settings.theming_enabled or not settings.default_theme:
		return None
	preset = frappe.get_cached_doc("Theme Preset", settings.default_theme)
	return {
		"theme_name": preset.theme_name,
		"primary_color": preset.primary_color,
		"gradient_end_color": preset.gradient_end_color,
		"navbar_color": preset.navbar_color,
		"background_color": preset.background_color,
		"text_color": preset.text_color,
		"field_radius": preset.field_radius,
		"font_family": preset.font_family,
		"is_dark_mode": preset.is_dark_mode,
		"button_style": preset.button_style,
		"hover_effect": preset.hover_effect,
		"field_style": preset.field_style,
		"background_style": preset.background_style,
		"login_style": preset.login_style,
		"glass_opacity": preset.glass_opacity,
	}


@frappe.whitelist()
def set_default_theme(theme):
	frappe.only_for(["System Manager", "Prism Manager"])
	if not frappe.db.exists("Theme Preset", theme):
		frappe.throw(frappe._("Theme Preset {0} does not exist").format(theme))

	settings = frappe.get_single("Theme Settings")
	settings.default_theme = theme
	settings.theming_enabled = 1
	settings.save()
	return settings.as_dict()
