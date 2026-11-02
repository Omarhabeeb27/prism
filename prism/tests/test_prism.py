import json

import frappe
from frappe.tests import IntegrationTestCase

from prism import api
from prism.utils import extend_bootinfo

TEST_THEME = "_Prism Test Theme"


class TestPrism(IntegrationTestCase):
	def setUp(self):
		frappe.set_user("Administrator")

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.rollback()

	def make_theme(self, name=TEST_THEME):
		return api.duplicate_preset("Frappe Modern", name)

	def test_save_preset_only_writes_editable_fields(self):
		self.make_theme()
		api.save_preset(TEST_THEME, json.dumps({"primary_color": "#123456", "is_standard": 1, "theme_name": "Hacked"}))
		doc = frappe.get_doc("Theme Preset", TEST_THEME)
		self.assertEqual(doc.primary_color, "#123456")
		self.assertEqual(doc.is_standard, 0)
		self.assertEqual(doc.theme_name, TEST_THEME)

	def test_gradient_can_be_cleared(self):
		self.make_theme()
		api.save_preset(TEST_THEME, json.dumps({"gradient_end_color": "#ffffff"}))
		api.save_preset(TEST_THEME, json.dumps({"gradient_end_color": None}))
		self.assertFalse(frappe.db.get_value("Theme Preset", TEST_THEME, "gradient_end_color"))

	def test_values_cannot_break_out_of_css(self):
		self.make_theme()
		for values in (
			{"primary_color": "red;}body{display:none"},
			{"font_family": "x');}*{display:none}"},
			{"desktop_bg_image": "javascript:alert(1)"},
			{"app_color_overrides": [{"app": "erpnext", "primary_color": "url(x)"}]},
		):
			with self.assertRaises(frappe.ValidationError):
				api.save_preset(TEST_THEME, json.dumps(values))

	def test_opacity_is_clamped(self):
		self.make_theme()
		payload = api.save_preset(TEST_THEME, json.dumps({"glass_opacity": 500}))
		self.assertEqual(payload["glass_opacity"], 100)

	def test_duplicate_is_custom_and_carries_unsaved_edits(self):
		payload = api.duplicate_preset("Frappe Modern", TEST_THEME, json.dumps({"primary_color": "#abcdef"}))
		self.assertEqual(payload["is_standard"], 0)
		self.assertEqual(payload["primary_color"], "#abcdef")
		self.assertNotEqual(frappe.db.get_value("Theme Preset", "Frappe Modern", "primary_color"), "#abcdef")

	def test_duplicate_rejects_existing_name(self):
		with self.assertRaises(frappe.ValidationError):
			api.duplicate_preset("Frappe Modern", "Frappe Modern")

	def test_builtin_and_in_use_themes_cannot_be_deleted(self):
		with self.assertRaises(frappe.ValidationError):
			api.delete_preset("Frappe Modern")
		self.make_theme()
		api.set_default_theme(TEST_THEME)
		with self.assertRaises(frappe.ValidationError):
			api.delete_preset(TEST_THEME)

	def test_apply_clears_boot_cache_and_reaches_boot(self):
		frappe.cache.hset("bootinfo", "Administrator", {"stale": 1})
		api.set_default_theme("Odoo Violet")
		self.assertFalse(frappe.cache.hget("bootinfo", "Administrator"))
		boot = frappe._dict(desktop_icons=[])
		extend_bootinfo(boot)
		self.assertEqual(boot.prism_theme.name, "Odoo Violet")

	def test_turning_off_removes_theme_from_boot_and_login(self):
		api.set_default_theme("Odoo Violet")
		api.set_theming_enabled(0)
		boot = frappe._dict(desktop_icons=[])
		extend_bootinfo(boot)
		self.assertNotIn("prism_theme", boot)
		frappe.clear_document_cache("Theme Settings", "Theme Settings")
		self.assertIsNone(api.get_login_theme())

	def test_theme_can_hide_home_screen_icons(self):
		self.make_theme()
		api.save_preset(TEST_THEME, json.dumps({"hidden_desktop_icons": ["Prism"]}))
		api.set_default_theme(TEST_THEME)
		boot = frappe._dict(desktop_icons=[{"name": "Prism"}, {"name": "Other"}])
		extend_bootinfo(boot)
		self.assertEqual([icon["name"] for icon in boot.desktop_icons], ["Other"])

	def test_tile_from_uninstalled_app_does_not_block_saving(self):
		self.make_theme()
		payload = api.save_preset(TEST_THEME, json.dumps({"hidden_desktop_icons": ["Prism", "App That Is Gone"]}))
		self.assertEqual(payload["hidden_desktop_icons"], ["Prism"])

	def test_managers_only(self):
		user = "test_prism_guest@example.com"
		if not frappe.db.exists("User", user):
			frappe.get_doc(
				{"doctype": "User", "email": user, "first_name": "Prism", "send_welcome_email": 0}
			).insert(ignore_permissions=True)
		frappe.set_user(user)
		for call in (
			api.get_studio_state,
			api.get_desktop_icons,
			lambda: api.save_preset("Frappe Modern", "{}"),
			lambda: api.set_default_theme("Frappe Modern"),
			lambda: api.set_theming_enabled(0),
			lambda: api.delete_preset("Frappe Modern"),
		):
			with self.assertRaises(frappe.PermissionError):
				call()

	def test_login_theme_exposes_no_private_fields(self):
		api.set_default_theme("Frappe Modern")
		frappe.set_user("Guest")
		theme = api.get_login_theme()
		self.assertNotIn("hidden_desktop_icons", theme)
		self.assertNotIn("owner", theme)

	def test_every_shipped_preset_is_valid(self):
		for name in frappe.get_all("Theme Preset", filters={"is_standard": 1}, pluck="name"):
			frappe.get_doc("Theme Preset", name).validate()

	def test_new_options_and_user_preference(self):
		user = "test_prism_user@example.com"
		if not frappe.db.exists("User", user):
			frappe.get_doc({"doctype": "User", "email": user, "first_name": "Prism", "send_welcome_email": 0}).insert(ignore_permissions=True)
		api.set_default_theme("Odoo Violet")
		api.save_settings(json.dumps({"allow_user_toggle": 1, "allow_user_choice": 1}))
		frappe.set_user(user)
		api.set_my_theme_enabled(0)
		boot = frappe._dict(desktop_icons=[])
		extend_bootinfo(boot)
		self.assertEqual(boot.prism["off"], 1)
		api.set_my_theme_enabled(1)
		boot = frappe._dict(desktop_icons=[])
		extend_bootinfo(boot)
		self.assertEqual(boot.prism["off"], 0)

		api.set_my_theme("Porcelain")
		self.assertEqual(api.get_my_theme()["my_theme"], "Porcelain")
		boot = frappe._dict(desktop_icons=[])
		extend_bootinfo(boot)
		self.assertEqual(boot.prism_theme.name, "Porcelain")
		api.set_my_theme(None)
		self.assertIsNone(api.get_my_theme()["my_theme"])

		frappe.set_user("Administrator")
		api.save_settings(json.dumps({"allow_user_toggle": 0, "allow_user_choice": 0}))
		frappe.set_user(user)
		with self.assertRaises(frappe.ValidationError):
			api.set_my_theme_enabled(0)
		with self.assertRaises(frappe.ValidationError):
			api.set_my_theme("Porcelain")

	def test_assignment_moves_users_between_groups(self):
		user = "Administrator"
		first = api.save_assignment(json.dumps({"title": "_T First", "theme_preset": "Porcelain", "users": [user], "menu_style": "Glass", "button_style": "Ripple"}))
		second = api.save_assignment(json.dumps({"title": "_T Second", "theme_preset": "Graphite", "users": [user]}))
		self.assertEqual(frappe.db.get_value("Prism User Theme", user, "assignment"), second)
		self.assertFalse(frappe.db.exists("Prism Theme Assignment User", {"parent": first, "user": user}))
		renamed = api.save_assignment(json.dumps({"title": "_T Renamed", "theme_preset": "Graphite", "users": [user]}), name=second)
		self.assertEqual(renamed, "_T Renamed")
		self.assertEqual(frappe.db.get_value("Prism User Theme", user, "assignment"), "_T Renamed")
		api.delete_assignment(renamed)
		self.assertFalse(frappe.db.exists("Prism User Theme", user))

	def test_user_theme_overrides_assignment_membership(self):
		user = "Administrator"
		name = api.save_assignment(json.dumps({"title": "_T Group", "theme_preset": "Porcelain", "users": [user]}))
		api.set_user_theme(user, "Graphite")
		self.assertFalse(frappe.db.get_value("Prism User Theme", user, "assignment"))
		self.assertFalse(frappe.db.exists("Prism Theme Assignment User", {"parent": name, "user": user}))
		api.set_user_theme(user, None)
		self.assertFalse(frappe.db.exists("Prism User Theme", user))

	def test_import_and_reset(self):
		payload = api.import_preset(json.dumps({"theme_name": "_T Imported", "primary_color": "#112233", "is_standard": 1, "owner": "x"}))
		self.assertEqual(payload["is_standard"], 0)
		self.assertEqual(payload["primary_color"], "#112233")
		with self.assertRaises(frappe.ValidationError):
			api.import_preset(json.dumps({"primary_color": "#112233"}))
		original = frappe.db.get_value("Theme Preset", "Graphite", "primary_color")
		api.save_preset("Graphite", json.dumps({"primary_color": "#000001"}))
		self.assertEqual(api.reset_preset("Graphite")["primary_color"], original)

	def test_migrate_keeps_edits_to_built_in_themes(self):
		from prism.install import sync_built_in_themes

		api.save_preset("Graphite", json.dumps({"primary_color": "#123123"}))
		sync_built_in_themes()
		self.assertEqual(frappe.db.get_value("Theme Preset", "Graphite", "primary_color"), "#123123")

	def test_built_in_themes_are_readable(self):
		from prism.install import built_in_themes

		def luminance(color):
			channels = [int(color[i : i + 2], 16) / 255 for i in (1, 3, 5)]
			r, g, b = (c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in channels)
			return 0.2126 * r + 0.7152 * g + 0.0722 * b

		def ratio(a, b):
			la, lb = sorted((luminance(a), luminance(b)), reverse=True)
			return (la + 0.05) / (lb + 0.05)

		for row in built_in_themes():
			self.assertGreaterEqual(ratio(row["text_color"], row["background_color"]), 4.5, row["name"])
			ends = [row["primary_color"], row.get("gradient_end_color") or row["primary_color"]]
			best = max(min(ratio(ink, c) for c in ends) for ink in ("#ffffff", "#14181d"))
			self.assertGreaterEqual(best, 4.5, row["name"])
