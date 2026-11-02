# Copyright (c) 2026, Omar Habeeb and contributors
# For license information, please see license.txt

import re

import frappe
from frappe import _
from frappe.model.document import Document

from prism.utils import clear_boot_cache

HEX_COLOR = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
FONT_NAME = re.compile(r"^[A-Za-z0-9 \-]+$")
COLOR_FIELDS = (
	"primary_color",
	"gradient_end_color",
	"navbar_color",
	"sidebar_color",
	"background_color",
	"text_color",
)


class ThemePreset(Document):
	def validate(self):
		# These values go straight into CSS custom properties and a stylesheet URL
		# for every user on the site, so only plain values are allowed through.
		for field in COLOR_FIELDS:
			value = self.get(field)
			if value and not HEX_COLOR.match(value):
				frappe.throw(_("{0} must be a hex colour like #1A7C93.").format(self.meta.get_label(field)))
		for row in self.app_color_overrides:
			for field in ("primary_color", "gradient_end_color", "navbar_color", "sidebar_color"):
				value = row.get(field)
				if value and not HEX_COLOR.match(value):
					frappe.throw(_("App colours must be hex colours like #1A7C93."))
		if self.font_family and not FONT_NAME.match(self.font_family):
			frappe.throw(_("Font name can only contain letters, numbers, spaces and hyphens."))
		if self.desktop_bg_image and not self.desktop_bg_image.startswith(("/", "https://", "http://")):
			frappe.throw(_("Background image must be an uploaded file or a web address."))
		for field in ("glass_opacity", "desktop_bg_overlay_opacity"):
			if self.get(field) is not None:
				self.set(field, min(100, max(0, frappe.utils.cint(self.get(field)))))

	def on_update(self):
		clear_boot_cache()

	def on_trash(self):
		clear_boot_cache()
