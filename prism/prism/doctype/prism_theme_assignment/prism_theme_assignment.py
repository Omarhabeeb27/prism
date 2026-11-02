# Copyright (c) 2026, Omar Habeeb and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

from prism.utils import clear_boot_cache

OVERRIDE_FIELDS = ["navbar_color", "menu_style", "button_style", "hover_effect", "field_style"]


class PrismThemeAssignment(Document):
	def on_update(self):
		self.sync_user_themes()
		clear_boot_cache()

	def sync_user_themes(self):
		"""Writes this assignment's theme + overrides into Prism User Theme
		(the cache extend_bootinfo actually reads) for every user in the
		table, and cleans up anyone removed from it since the last save."""
		wanted_users = {row.user for row in self.users}

		previously_assigned = frappe.get_all(
			"Prism User Theme", filters={"assignment": self.name}, pluck="user"
		)
		for user in previously_assigned:
			if user not in wanted_users:
				frappe.delete_doc("Prism User Theme", user, ignore_permissions=True, delete_permanently=True)

		values = {"assignment": self.name, "theme_preset": self.theme_preset}
		for field in OVERRIDE_FIELDS:
			values[field] = self.get(field) or None

		for user in wanted_users:
			if frappe.db.exists("Prism User Theme", user):
				doc = frappe.get_doc("Prism User Theme", user)
				doc.update(values)
				doc.save(ignore_permissions=True)
			else:
				frappe.get_doc(doctype="Prism User Theme", user=user, **values).insert(ignore_permissions=True)

	def on_trash(self):
		for user in frappe.get_all("Prism User Theme", filters={"assignment": self.name}, pluck="user"):
			frappe.delete_doc("Prism User Theme", user, ignore_permissions=True, delete_permanently=True)
		clear_boot_cache()
