import frappe
from frappe import _

from prism.utils import USER_OFF_KEY, clear_boot_cache, clear_user_boot_cache, is_off_for_user

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
	# A tile disappears when its app is uninstalled. A leftover row fails link validation
	# and would make this theme impossible to save. This has to happen before save().
	doc.set(
		"hidden_desktop_icons",
		[row for row in doc.hidden_desktop_icons if frappe.db.exists("Desktop Icon", row.desktop_icon)],
	)


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
		"usage": theme_usage(),
	}


def theme_usage():
	"""Users on each theme through an assignment or individually."""
	rows = frappe.get_all("Prism User Theme", fields=["theme_preset"])
	usage = {}
	for row in rows:
		usage[row.theme_preset] = usage.get(row.theme_preset, 0) + 1
	return usage


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
	apply_values(doc, frappe.parse_json(values) if values else {})
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


@frappe.whitelist()
def import_preset(data):
	"""Create a custom theme from a file made by Export. Everything goes through the
	same allow-list and validation as a Theme Studio save."""
	frappe.only_for(MANAGER_ROLES)
	data = frappe.parse_json(data)
	if not isinstance(data, dict) or not (data.get("theme_name") or "").strip():
		frappe.throw(_("This file isn't a Prism theme."))
	theme_name = data["theme_name"].strip()
	if frappe.db.exists("Theme Preset", theme_name):
		frappe.throw(_("A theme named {0} already exists. Rename it in the file or delete the existing one.").format(theme_name))
	# Anything the file leaves out comes from a built-in theme, so a partial file still
	# makes a complete theme. Internal fields in the file are never read.
	doc = frappe.copy_doc(frappe.get_doc("Theme Preset", frappe.get_all("Theme Preset", filters={"is_standard": 1}, order_by="theme_name asc", limit=1, pluck="name")[0]))
	doc.theme_name = theme_name
	doc.is_standard = 0
	doc.set("hidden_desktop_icons", [])
	doc.set("app_color_overrides", [])
	apply_values(doc, {key: value for key, value in data.items() if value is not None})
	doc.insert()
	return preset_payload(doc)


# -- Theme assignments ---------------------------------------------------------

ASSIGNMENT_OVERRIDES = ("navbar_color", "menu_style", "button_style", "hover_effect", "field_style")


def desk_users():
	return frappe.get_all(
		"User",
		filters={"enabled": 1, "user_type": "System User", "name": ["not in", ["Guest"]]},
		fields=["name", "full_name", "user_image"],
		order_by="full_name asc",
		limit_page_length=0,
	)


@frappe.whitelist()
def get_assignments():
	frappe.only_for(MANAGER_ROLES)
	assignments = []
	for name in frappe.get_all("Prism Theme Assignment", order_by="modified desc", pluck="name"):
		doc = frappe.get_doc("Prism Theme Assignment", name)
		row = {"name": doc.name, "title": doc.title, "theme_preset": doc.theme_preset, "users": [u.user for u in doc.users]}
		row.update({field: doc.get(field) for field in ASSIGNMENT_OVERRIDES})
		assignments.append(row)
	return {
		"assignments": assignments,
		"users": desk_users(),
		"presets": [preset_payload(frappe.get_doc("Theme Preset", n)) for n in frappe.get_all("Theme Preset", order_by="theme_name asc", pluck="name")],
		"individual": frappe.get_all("Prism User Theme", filters={"assignment": ["is", "not set"]}, pluck="user"),
	}


@frappe.whitelist()
def save_assignment(values, name=None):
	frappe.only_for(MANAGER_ROLES)
	values = frappe.parse_json(values)
	title = (values.get("title") or "").strip()
	if not title:
		frappe.throw(_("Enter a name for this assignment."))
	if not values.get("theme_preset"):
		frappe.throw(_("Choose a theme for this assignment."))
	if name and name != title:
		if frappe.db.exists("Prism Theme Assignment", title):
			frappe.throw(_("An assignment named {0} already exists. Choose another name.").format(title))
		name = frappe.rename_doc("Prism Theme Assignment", name, title, force=True)
	doc = frappe.get_doc("Prism Theme Assignment", name) if name else frappe.new_doc("Prism Theme Assignment")
	doc.title = title
	doc.theme_preset = values["theme_preset"]
	for field in ASSIGNMENT_OVERRIDES:
		doc.set(field, values.get(field) or None)
	doc.set("users", [])
	for user in values.get("users") or []:
		doc.append("users", {"user": user})
	doc.save()
	return doc.name


@frappe.whitelist()
def delete_assignment(name):
	frappe.only_for(MANAGER_ROLES)
	frappe.delete_doc("Prism Theme Assignment", name)


# -- User themes ---------------------------------------------------------------


@frappe.whitelist()
def get_user_themes():
	frappe.only_for(MANAGER_ROLES)
	settings = frappe.get_single("Theme Settings")
	personal = {
		row.user: row
		for row in frappe.get_all("Prism User Theme", fields=["user", "theme_preset", "assignment", *ASSIGNMENT_OVERRIDES])
	}
	users = []
	for user in desk_users():
		row = personal.get(user.name)
		users.append(
			{
				"user": user.name,
				"full_name": user.full_name,
				"user_image": user.user_image,
				"theme": row.theme_preset if row else settings.default_theme,
				"source": ("assignment" if row.assignment else "individual") if row else "default",
				"assignment": row.assignment if row else None,
				"overrides": {f: row.get(f) for f in ASSIGNMENT_OVERRIDES if row.get(f)} if row else {},
			}
		)
	return {
		"users": users,
		"default_theme": settings.default_theme,
		"enabled": settings.theming_enabled,
		"presets": [preset_payload(frappe.get_doc("Theme Preset", n)) for n in frappe.get_all("Theme Preset", order_by="theme_name asc", pluck="name")],
	}


@frappe.whitelist()
def set_user_theme(user, theme=None):
	"""Give one user their own theme, or send them back to the default (theme=None).
	Either way they leave any assignment, which would otherwise overwrite this."""
	frappe.only_for(MANAGER_ROLES)
	if not frappe.db.exists("User", user):
		frappe.throw(_("User {0} does not exist").format(user))
	frappe.db.delete("Prism Theme Assignment User", {"user": user})
	if frappe.db.exists("Prism User Theme", user):
		frappe.delete_doc("Prism User Theme", user, ignore_permissions=True, delete_permanently=True)
	if theme:
		frappe.get_doc(doctype="Prism User Theme", user=user, theme_preset=theme).insert(ignore_permissions=True)
	clear_boot_cache()


# -- Settings ------------------------------------------------------------------


@frappe.whitelist()
def get_settings_state():
	frappe.only_for(MANAGER_ROLES)
	import prism

	state = get_studio_state()
	state.update(
		prism_version=prism.__version__,
		frappe_version=frappe.__version__,
		assignments=frappe.db.count("Prism Theme Assignment"),
		individual=frappe.db.count("Prism User Theme", {"assignment": ["is", "not set"]}),
		desk_users=len(desk_users()),
		language=frappe.db.get_single_value("System Settings", "language"),
	)
	return state


@frappe.whitelist()
def remove_individual_themes():
	frappe.only_for(MANAGER_ROLES)
	users = frappe.get_all("Prism User Theme", filters={"assignment": ["is", "not set"]}, pluck="user")
	for user in users:
		frappe.delete_doc("Prism User Theme", user, ignore_permissions=True, delete_permanently=True)
	clear_boot_cache()
	return len(users)


@frappe.whitelist()
def refresh_everyone():
	"""Makes every user pick up the current theme the next time a page loads."""
	frappe.only_for(MANAGER_ROLES)
	clear_boot_cache()


SETTINGS_FIELDS = ("allow_user_toggle", "show_toggle_button", "allow_user_choice", "dark_companion_theme")


@frappe.whitelist()
def save_settings(values):
	frappe.only_for(MANAGER_ROLES)
	values = frappe.parse_json(values)
	settings = frappe.get_single("Theme Settings")
	for field in SETTINGS_FIELDS:
		if field in values:
			settings.set(field, values[field] or None if field == "dark_companion_theme" else frappe.utils.cint(values[field]))
	settings.save()
	clear_boot_cache()


@frappe.whitelist()
def reset_preset(theme):
	"""Put a built-in theme back to how Prism ships it."""
	frappe.only_for(MANAGER_ROLES)
	doc = frappe.get_doc("Theme Preset", theme)
	if not doc.is_standard:
		frappe.throw(_("Only built-in themes can be reset."))
	from prism.install import built_in_themes

	shipped = next((row for row in built_in_themes() if row.get("name") == theme), None)
	if not shipped:
		frappe.throw(_("{0} isn't one of the themes Prism ships.").format(theme))
	apply_values(doc, {field: shipped.get(field) for field in EDITABLE_FIELDS})
	doc.set("hidden_desktop_icons", [])
	doc.set("app_color_overrides", [])
	doc.save()
	return preset_payload(doc)


# -- What every logged-in user can do for themselves ----------------------------


@frappe.whitelist()
def get_my_theme():
	settings = frappe.get_single("Theme Settings")
	personal = frappe.db.get_value("Prism User Theme", frappe.session.user, ["theme_preset", "assignment"], as_dict=True)
	names = frappe.get_all("Theme Preset", order_by="theme_name asc", pluck="name") if settings.allow_user_choice else []
	return {
		"enabled": settings.theming_enabled,
		"allow_toggle": settings.allow_user_toggle,
		"allow_choice": settings.allow_user_choice,
		"off": is_off_for_user(),
		"default_theme": settings.default_theme,
		"my_theme": personal.theme_preset if personal else None,
		"assigned": bool(personal and personal.assignment),
		"presets": [preset_payload(frappe.get_doc("Theme Preset", name)) for name in names],
	}


@frappe.whitelist()
def set_my_theme_enabled(enabled):
	if frappe.session.user == "Guest":
		frappe.throw(_("Log in to change this."), frappe.PermissionError)
	if not frappe.db.get_single_value("Theme Settings", "allow_user_toggle"):
		frappe.throw(_("Your administrator has turned this option off."))
	frappe.defaults.set_user_default(USER_OFF_KEY, "0" if frappe.utils.cint(enabled) else "1")
	clear_user_boot_cache()


@frappe.whitelist()
def set_my_theme(theme=None):
	"""theme=None goes back to the organisation's default."""
	user = frappe.session.user
	if user == "Guest":
		frappe.throw(_("Log in to change this."), frappe.PermissionError)
	if not frappe.db.get_single_value("Theme Settings", "allow_user_choice"):
		frappe.throw(_("Your administrator has turned this option off."))
	row = frappe.db.get_value("Prism User Theme", user, "assignment")
	if row:
		frappe.throw(_("Your theme is set by the assignment {0}.").format(row))
	if frappe.db.exists("Prism User Theme", user):
		frappe.delete_doc("Prism User Theme", user, ignore_permissions=True, delete_permanently=True)
	if theme:
		if not frappe.db.exists("Theme Preset", theme):
			frappe.throw(_("Theme Preset {0} does not exist").format(theme))
		frappe.get_doc(doctype="Prism User Theme", user=user, theme_preset=theme).insert(ignore_permissions=True)
	clear_user_boot_cache()

