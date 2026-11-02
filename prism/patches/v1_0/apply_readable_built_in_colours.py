import frappe

from prism.install import built_in_themes

# Built-ins last shipped as fixtures on this date. Anything modified later was edited
# on the site, and the owner's edits win.
LAST_FIXTURE_DATE = "2026-11-02 12:00:01"


def execute():
	"""Moves never-edited built-in themes onto the corrected, AA-readable colours."""
	for row in built_in_themes():
		if not row.get("modified", "").startswith("2026-11-02 23"):
			continue
		modified = frappe.db.get_value("Theme Preset", row["name"], "modified")
		if modified and str(modified) < LAST_FIXTURE_DATE:
			frappe.db.set_value(
				"Theme Preset",
				row["name"],
				{"primary_color": row["primary_color"], "gradient_end_color": row.get("gradient_end_color")},
				update_modified=False,
			)
