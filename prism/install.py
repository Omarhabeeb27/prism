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

	icon = frappe.get_doc("Desktop Icon", "Prism")
	icon.icon_image = "/assets/prism/images/prism-logo.svg"
	icon.standard = 1
	icon.app = "prism"
	icon.save(ignore_permissions=True)
