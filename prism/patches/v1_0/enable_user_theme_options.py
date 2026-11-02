import frappe


def execute():
	"""Existing sites have no stored value for the new per-user options, which would
	read as off. Turn them on, matching a fresh install. A stored value is left alone."""
	for field in ("allow_user_toggle", "show_toggle_button", "allow_user_choice"):
		if not frappe.db.exists("Singles", {"doctype": "Theme Settings", "field": field}):
			frappe.db.set_single_value("Theme Settings", field, 1)
