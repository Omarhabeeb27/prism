import frappe


def after_sync():
	"""Runs after fixtures (Theme Preset records) are synced, so the default is guaranteed to exist."""
	settings = frappe.get_single("Theme Settings")
	if not settings.default_theme and frappe.db.exists("Theme Preset", "Frappe Modern"):
		settings.theming_enabled = 1
		settings.default_theme = "Frappe Modern"
		settings.save()

	add_prism_desktop_icon()


def add_prism_desktop_icon():
	"""Gives Prism its own tile in the Desk home/apps icon grid, using the
	same core helper Frappe itself uses for "add workspace to desktop" —
	keeps this portable across fresh installs instead of relying on a
	one-off console command."""
	from frappe.desk.doctype.desktop_icon.desktop_icon import add_workspace_to_desktop

	if not frappe.db.exists("Desktop Icon", "Prism"):
		add_workspace_to_desktop("Prism")

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
