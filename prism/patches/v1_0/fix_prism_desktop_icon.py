import frappe


def execute():
	"""Re-apply the Prism Desktop Icon fix on sites that already had the app
	installed before it existed (or before it was corrected).

	install.add_prism_desktop_icon() only runs from the `after_sync` app hook,
	which Frappe fires exclusively during `bench install-app` — never during
	`bench migrate`. A site that installed Prism before a fix landed (bad
	icon_image, wrong icon_type, stale link_to, etc.) never re-runs that
	logic on deploy, so the broken Desktop Icon record persists forever and
	the tile silently loses its logo. This patch makes the same fix
	self-healing on migrate too.
	"""
	from prism.install import add_prism_desktop_icon

	add_prism_desktop_icon()
