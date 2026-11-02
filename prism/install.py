import frappe


def built_in_themes():
	return frappe.get_file_json(frappe.get_app_path("prism", "themes", "built_in_themes.json"))


def sync_built_in_themes():
	"""Adds any built-in theme this site doesn't have yet. Existing ones are never
	touched, so edits to them survive every migrate and deploy."""
	for row in built_in_themes():
		if not frappe.db.exists("Theme Preset", row["name"]):
			doc = frappe.get_doc({key: value for key, value in row.items() if key not in ("modified", "name")})
			doc.is_standard = 1
			doc.insert(ignore_permissions=True, ignore_if_duplicate=True)


def after_sync():
	"""Installs the built-in themes first, so the default is guaranteed to exist."""
	sync_built_in_themes()
	settings = frappe.get_single("Theme Settings")
	if not settings.default_theme and frappe.db.exists("Theme Preset", "Frappe Modern"):
		settings.theming_enabled = 1
		settings.default_theme = "Frappe Modern"
		settings.save()

	# Frappe marks patches as done on a fresh install, so the defaults go here as well.
	from prism.patches.v1_0.enable_user_theme_options import execute as enable_user_theme_options

	enable_user_theme_options()
	add_prism_desktop_icon()


def add_prism_desktop_icon():
	"""Gives Prism its own tile in the Desk home/apps icon grid, using the
	same core helper Frappe itself uses for "add workspace to desktop" —
	keeps this portable across fresh installs instead of relying on a
	one-off console command."""
	if not frappe.db.exists("DocType", "Desktop Icon"):
		return

	if not frappe.db.exists("Desktop Icon", "Prism"):
		try:
			from frappe.desk.doctype.desktop_icon.desktop_icon import add_workspace_to_desktop

			add_workspace_to_desktop("Prism")
		except ImportError:
			frappe.get_doc({"doctype": "Desktop Icon", "label": "Prism", "name": "Prism"}).insert(ignore_permissions=True)

	# Frappe's own post-install sync (create_desktop_icons_from_installed_apps)
	# only recognizes an app as "already iconified" when icon_type == "App".
	# add_workspace_to_desktop() above leaves icon_type as "Link", so core
	# would try to insert a second Desktop Icon also auto-named "Prism" on
	# every subsequent `bench install-app` for any app, hit a duplicate-key
	# error, and (since that particular core loop has no try/except) silently
	# abort icon creation for every app installed after prism in
	# installed_apps order. Matching icon_type="App" here makes core's own
	# exists-check short-circuit cleanly instead.
	icon = frappe.get_doc("Desktop Icon", "Prism")
	icon.icon_image = "/assets/prism/images/prism-logo.svg"
	icon.standard = 1
	icon.app = "prism"
	icon.icon_type = "App"
	icon.link_type = "External"
	icon.link = "/app/theme-studio"
	# link_to is a Dynamic Link resolved against whatever doctype link_type
	# names. Sites that installed an earlier version of this app have
	# link_to="Prism" left over from when link_type="Workspace Sidebar"; with
	# link_type now "External" (not a real doctype), Frappe's link validation
	# tries frappe.get_meta("External") and throws DoesNotExistError unless
	# this stale value is cleared.
	icon.link_to = None
	icon.save(ignore_permissions=True)
