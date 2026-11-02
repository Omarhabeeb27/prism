import frappe
from frappe import _

from prism.utils import clear_boot_cache

MANAGER_ROLES = ["System Manager", "Prism Manager"]

# What Theme Studio may write to a preset. theme_name/is_standard stay out of it:
# renaming breaks links, and is_standard decides what fixtures own.
EDITABLE_FIELDS = (
	"primary_color",
	"gradient_end_color",
	"navbar_color",
	"sidebar_color",
	"background_color",
	"text_color",
	"field_radius",
	"icon_style",
	"menu_style",
	"glass_opacity",
	"font_family",
	"login_style",
	"button_style",
	"hover_effect",
	"field_style",
	"corner_style",
	"checkbox_style",
	"background_style",
	"desktop_bg_image",
	"desktop_bg_overlay_opacity",
)
APP_OVERRIDE_FIELDS = ("app", "primary_color", "gradient_end_color", "navbar_color", "sidebar_color")


def has_app_permission():
	roles = frappe.get_roles()
	return "System Manager" in roles or "Prism Manager" in roles


def preset_payload(doc):
	"""The preset as Theme Studio works on it: flat fields plus its two child tables."""
	data = {field: doc.get(field) for field in EDITABLE_FIELDS}
	data.update(
		name=doc.name,
		theme_name=doc.theme_name,
		is_standard=doc.is_standard,
		is_dark_mode=doc.is_dark_mode,
		hidden_desktop_icons=[row.desktop_icon for row in doc.hidden_desktop_icons],
		app_color_overrides=[{field: row.get(field) for field in APP_OVERRIDE_FIELDS} for row in doc.app_color_overrides],
	)
	return data


def apply_values(doc, values):
	for field in EDITABLE_FIELDS:
		if field in values:
			doc.set(field, values[field] or None)
	if "hidden_desktop_icons" in values:
		doc.set("hidden_desktop_icons", [])
		for name in values["hidden_desktop_icons"] or []:
			doc.append("hidden_desktop_icons", {"desktop_icon": name})
	if "app_color_overrides" in values:
		doc.set("app_color_overrides", [])
		for row in values["app_color_overrides"] or []:
			if row.get("app"):
				doc.append("app_color_overrides", {field: row.get(field) or None for field in APP_OVERRIDE_FIELDS})


@frappe.whitelist()
def get_studio_state():
	frappe.only_for(MANAGER_ROLES)
	settings = frappe.get_single("Theme Settings")
	names = frappe.get_all("Theme Preset", order_by="theme_name asc", pluck="name")
	return {
		"presets": [preset_payload(frappe.get_doc("Theme Preset", name)) for name in names],
		"default_theme": settings.default_theme,
		"enabled": settings.theming_enabled,
		"apps": [
			{"name": app, "title": app.replace("_", " ").title()}
			for app in frappe.get_installed_apps()
			if app != "prism"
		],
		"assigned_users": frappe.db.count("Prism User Theme"),
	}


@frappe.whitelist()
def get_desktop_icons():
	"""Tiles a theme can hide from Desk home: top-level ones plus ERPNext's modules,
	which core shows directly. Prism's own tile stays, so the Studio can't be hidden."""
	frappe.only_for(MANAGER_ROLES)
	icons = frappe.get_all(
		"Desktop Icon",
		filters={"hidden": 0, "name": ["!=", "Prism"]},
		fields=["name", "label", "parent_icon"],
		order_by="label asc",
	)
	return [icon for icon in icons if not icon.parent_icon or icon.parent_icon == "ERPNext"]


@frappe.whitelist()
def save_preset(theme, values):
	frappe.only_for(MANAGER_ROLES)
	doc = frappe.get_doc("Theme Preset", theme)
	apply_values(doc, frappe.parse_json(values))
	doc.save()
	return preset_payload(doc)


@frappe.whitelist()
def duplicate_preset(theme, theme_name, values=None):
	"""Save-as: a new custom preset from `theme`, with any unsaved edits layered on."""
	frappe.only_for(MANAGER_ROLES)
	theme_name = (theme_name or "").strip()
	if not theme_name:
		frappe.throw(_("Enter a name for the new theme."))
	if frappe.db.exists("Theme Preset", theme_name):
		frappe.throw(_("A theme named {0} already exists. Choose another name.").format(theme_name))
	doc = frappe.copy_doc(frappe.get_doc("Theme Preset", theme))
	doc.theme_name = theme_name
	doc.is_standard = 0
	if values:
		apply_values(doc, frappe.parse_json(values))
	doc.insert()
	return preset_payload(doc)


@frappe.whitelist()
def delete_preset(theme):
	frappe.only_for(MANAGER_ROLES)
	doc = frappe.get_doc("Theme Preset", theme)
	if doc.is_standard:
		frappe.throw(_("Built-in themes can't be deleted. Duplicate one to make your own."))
	if frappe.db.get_single_value("Theme Settings", "default_theme") == theme:
		frappe.throw(_("{0} is in use. Choose another theme first.").format(theme))
	doc.delete()


@frappe.whitelist()
def set_default_theme(theme):
	frappe.only_for(MANAGER_ROLES)
	if not frappe.db.exists("Theme Preset", theme):
		frappe.throw(_("Theme Preset {0} does not exist").format(theme))

	settings = frappe.get_single("Theme Settings")
	settings.default_theme = theme
	settings.theming_enabled = 1
	settings.save()
	clear_boot_cache()
	return get_active_theme()


@frappe.whitelist()
def set_theming_enabled(enabled):
	frappe.only_for(MANAGER_ROLES)
	settings = frappe.get_single("Theme Settings")
	settings.theming_enabled = frappe.utils.cint(enabled)
	settings.save()
	clear_boot_cache()
	return get_active_theme()


def get_active_theme():
	"""The default theme in the same shape boot gives the client, or None if off."""
	settings = frappe.get_single("Theme Settings")
	if not settings.theming_enabled or not settings.default_theme:
		return None
	from prism.utils import theme_for_boot

	return theme_for_boot(settings.default_theme)


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
		"sidebar_color": preset.sidebar_color,
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
