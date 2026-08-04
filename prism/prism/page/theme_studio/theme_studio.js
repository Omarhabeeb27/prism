frappe.pages["theme-studio"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Theme Studio"),
		single_column: true,
	});

	new prism.ThemeStudio(page);
};

prism.ThemeStudio = class ThemeStudio {
	constructor(page) {
		this.page = page;
		this.presets = [];
		this.selected_theme = null;
		this.overrides = {}; // font_family / navbar_color / menu_style edits pending Apply
		this.make_layout();
		this.fetch_presets();
	}

	make_layout() {
		// page.body (.layout-main-section) already carries Desk's standard
		// page padding; the wrapper below just adds internal rhythm so tab
		// content doesn't sit flush against its own edges.
		this.$body = $(`
			<div class="prism-theme-studio" style="padding: 4px var(--padding-sm) var(--padding-lg);">
				<div class="prism-tabs" style="display: flex; gap: 2px; border-bottom: 1.5px solid var(--border-color);">
					<div class="prism-ftab active" data-tab="prism-tab-layout" style="padding: 9px 14px; font-size: 12.5px; font-weight: 600; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1.5px;">${__("Layout")}</div>
					<div class="prism-ftab" data-tab="prism-tab-navbar" style="padding: 9px 14px; font-size: 12.5px; font-weight: 600; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1.5px;">${__("Navbar")}</div>
					<div class="prism-ftab" data-tab="prism-tab-fonts" style="padding: 9px 14px; font-size: 12.5px; font-weight: 600; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1.5px;">${__("Fonts")}</div>
					<div class="prism-ftab" data-tab="prism-tab-a11y" style="padding: 9px 14px; font-size: 12.5px; font-weight: 600; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1.5px;">${__("Accessibility")}</div>
					<div class="prism-ftab" data-tab="prism-tab-elements" style="padding: 9px 14px; font-size: 12.5px; font-weight: 600; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1.5px;">${__("Elements")}</div>
					<div class="prism-ftab" data-tab="prism-tab-desktop" style="padding: 9px 14px; font-size: 12.5px; font-weight: 600; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1.5px;">${__("Desktop")}</div>
					<div class="prism-ftab" data-tab="prism-tab-apps" style="padding: 9px 14px; font-size: 12.5px; font-weight: 600; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1.5px;">${__("Apps")}</div>
					<div class="prism-ftab" data-tab="prism-tab-login" style="padding: 9px 14px; font-size: 12.5px; font-weight: 600; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1.5px;">${__("Login")}</div>
				</div>
				<div class="tab-content" style="padding-top: var(--padding-lg);">
					<div class="prism-tab-panel" id="prism-tab-layout" style="display: block;">
						<p class="text-muted">${__(
							"Pick a preset to preview it instantly across Desk. Click Apply to make it the theme everyone sees."
						)}</p>
						<div class="prism-preset-gallery" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: var(--margin-md);"></div>
					</div>
					<div class="prism-tab-panel" id="prism-tab-navbar" style="display: none;">
						<p class="text-muted">${__("Override the navbar and sidebar colors and pick how the sidebar rail is treated.")}</p>
						<div class="prism-field-row" style="display: flex; gap: var(--margin-lg); align-items: flex-end; max-width: 480px; flex-wrap: wrap;">
							<div style="flex: 1; min-width: 120px;">
								<label class="text-muted small" style="display:block; margin-bottom: 4px;">${__("Navbar Color")}</label>
								<input type="color" class="form-control prism-navbar-color" style="height: 36px; padding: 2px; cursor: pointer;">
							</div>
							<div style="flex: 1; min-width: 120px;">
								<label class="text-muted small" style="display:block; margin-bottom: 4px;">${__("Sidebar Color")}</label>
								<input type="color" class="form-control prism-sidebar-color" style="height: 36px; padding: 2px; cursor: pointer;">
							</div>
							<div>
								<button class="btn btn-xs btn-default prism-reset-sidebar-color" title="${__("Reset to this theme's own sidebar color")}">${__("Reset")}</button>
							</div>
							<div style="flex: 1; min-width: 160px;">
								<label class="text-muted small" style="display:block; margin-bottom: 4px;">${__("Sidebar Menu Style")}</label>
								<select class="form-control prism-menu-style">
									<option value="Theme Color">${__("Theme Color")}</option>
									<option value="Dark">${__("Dark")}</option>
									<option value="Light">${__("Light")}</option>
									<option value="Transparent">${__("Transparent")}</option>
									<option value="Glass">${__("Glass")}</option>
								</select>
							</div>
						</div>
					</div>
					<div class="prism-tab-panel" id="prism-tab-fonts" style="display: none;">
						<p class="text-muted">${__("Change the Desk-wide font for the selected preset. Applies instantly for preview.")}</p>
						<div style="max-width: 320px;">
							<label class="text-muted small" style="display:block; margin-bottom: 4px;">${__("Font Family")}</label>
							<select class="form-control prism-font-family"></select>
						</div>
					</div>
					<div class="prism-tab-panel" id="prism-tab-a11y" style="display: none;">
						<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--margin-md);">
							<div>
								<div style="font-weight: 600; font-size: 12.5px;">${__("Auto-fix contrast issues")}</div>
								<div class="text-muted small">${__(
									"Adjusts accent lightness to meet WCAG AA (4.5:1) automatically when you pick a preset."
								)}</div>
							</div>
							<input type="checkbox" class="prism-autofix-toggle" checked style="width: 16px; height: 16px;">
						</div>
						<div class="prism-contrast-rows"></div>
						<div class="text-muted small prism-fix-note" style="margin-top: var(--margin-sm); display: none;"></div>
					</div>
					<div class="prism-tab-panel" id="prism-tab-elements" style="display: none;">
						<p class="text-muted">${__("Choose how buttons, hover feedback, and fields render — applied live across all of Desk, not just this preview.")}</p>
						<div style="margin-bottom: var(--margin-lg);">
							<div class="text-muted small" style="margin-bottom: 6px; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px;">${__("Button Style")}</div>
							<div class="prism-opt-row" data-group="button_style" style="display: flex; gap: 8px; flex-wrap: wrap;">
								${["Solid", "Gradient", "Outline", "Soft", "Ghost", "Pill", "Sweep", "Link", "Bordered Gradient", "Glass", "Neumorphic", "Elevated", "Ripple"]
									.map((v) => `<div class="prism-opt-pill" data-val="${v}" style="padding: 7px 14px; border-radius: 20px; border: 1.5px solid var(--border-color); font-size: 12px; font-weight: 600; cursor: pointer;">${__(v)}</div>`)
									.join("")}
							</div>
						</div>
						<div style="margin-bottom: var(--margin-lg);">
							<div class="text-muted small" style="margin-bottom: 6px; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px;">${__("Hover Effect")}</div>
							<div class="prism-opt-row" data-group="hover_effect" style="display: flex; gap: 8px; flex-wrap: wrap;">
								${["Lift", "Glow", "Invert", "Scale", "Tilt", "Border Draw", "Underline", "Fade Background", "Icon Shift", "Dim"]
									.map((v) => `<div class="prism-opt-pill" data-val="${v}" style="padding: 7px 14px; border-radius: 20px; border: 1.5px solid var(--border-color); font-size: 12px; font-weight: 600; cursor: pointer;">${__(v)}</div>`)
									.join("")}
							</div>
						</div>
						<div style="margin-bottom: var(--margin-lg);">
							<div class="text-muted small" style="margin-bottom: 6px; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px;">${__("Field Style")}</div>
							<div class="prism-opt-row" data-group="field_style" style="display: flex; gap: 8px; flex-wrap: wrap;">
								${["Filled", "Outlined", "Underline", "Pill", "Sharp", "Soft Shadow", "Glass", "Minimal", "Bottom Accent", "Bordered Thick"]
									.map((v) => `<div class="prism-opt-pill" data-val="${v}" style="padding: 7px 14px; border-radius: 20px; border: 1.5px solid var(--border-color); font-size: 12px; font-weight: 600; cursor: pointer;">${__(v)}</div>`)
									.join("")}
							</div>
							<input type="text" class="form-control prism-field-preview-input" placeholder="${__("Preview field")}" style="max-width: 260px; margin-top: 10px;">
						</div>
						<div style="margin-bottom: var(--margin-lg);">
							<div class="text-muted small" style="margin-bottom: 6px; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px;">${__("Corner Style")}</div>
							<div class="prism-opt-row" data-group="corner_style" style="display: flex; gap: 8px; flex-wrap: wrap;">
								${["Default", "Cut Corner", "Diamond Cut", "Extra Rounded", "Soft Edge"]
									.map((v) => `<div class="prism-opt-pill" data-val="${v}" style="padding: 7px 14px; border-radius: 20px; border: 1.5px solid var(--border-color); font-size: 12px; font-weight: 600; cursor: pointer;">${__(v)}</div>`)
									.join("")}
							</div>
						</div>
						<div style="margin-bottom: var(--margin-lg);">
							<div class="text-muted small" style="margin-bottom: 6px; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px;">${__("Checkbox Style")}</div>
							<div class="prism-opt-row" data-group="checkbox_style" style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
								${["Default", "Glow", "Bounce", "Ripple", "Squircle"]
									.map((v) => `<div class="prism-opt-pill" data-val="${v}" style="padding: 7px 14px; border-radius: 20px; border: 1.5px solid var(--border-color); font-size: 12px; font-weight: 600; cursor: pointer;">${__(v)}</div>`)
									.join("")}
								<label style="display: flex; align-items: center; gap: 6px; margin: 0 0 0 8px; font-size: 12px;">
									<input type="checkbox" class="prism-checkbox-preview"> ${__("Preview")}
								</label>
							</div>
						</div>
						<div style="margin-bottom: var(--margin-lg); max-width: 360px;">
							<div class="text-muted small" style="margin-bottom: 6px; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px;">${__("Glass Opacity")}</div>
							<div class="text-muted small" style="margin-bottom: 8px;">${__("How see-through Glass button/field/sidebar surfaces are.")}</div>
							<input type="range" class="prism-glass-opacity" min="10" max="100" step="5" style="width: 100%;">
							<div style="display: flex; justify-content: space-between; font-size: 10.5px; margin-top: 2px;">
								<span class="text-muted">${__("10%")}</span>
								<span class="text-muted"><b>${__("65% recommended")}</b></span>
								<span class="text-muted">${__("100%")}</span>
							</div>
						</div>
						<div>
							<div class="text-muted small" style="margin-bottom: 6px; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px;">${__("Preview — all button types")}</div>
							<div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
								<button class="btn btn-primary btn-sm prism-elements-preview-btn">${__("Primary")}</button>
								<button class="btn btn-default btn-sm">${__("Default")}</button>
								<button class="btn btn-secondary btn-sm">${__("Secondary")}</button>
								<button class="btn btn-ghost btn-sm">${__("Ghost")}</button>
								<button class="btn btn-primary-light btn-sm">${__("Soft")}</button>
								<button class="btn btn-danger btn-sm">${__("Danger")}</button>
								<button class="btn btn-default btn-sm" disabled>${__("Disabled")}</button>
								<button class="btn icon-btn btn-default btn-sm">${frappe.utils.icon("settings", "sm")}</button>
							</div>
						</div>
					</div>
					<div class="prism-tab-panel" id="prism-tab-desktop" style="display: none;">
						<p class="text-muted">${__("Controls the Desk canvas background (behind cards/lists), independent of any single page's own background.")}</p>
						<div style="margin-bottom: var(--margin-lg);">
							<div class="text-muted small" style="margin-bottom: 6px; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px;">${__("Background Style")}</div>
							<div class="prism-opt-row" data-group="background_style" style="display: flex; gap: 8px; flex-wrap: wrap;">
								${["Solid", "Subtle Gradient"]
									.map((v) => `<div class="prism-opt-pill" data-val="${v}" style="padding: 7px 14px; border-radius: 20px; border: 1.5px solid var(--border-color); font-size: 12px; font-weight: 600; cursor: pointer;">${__(v)}</div>`)
									.join("")}
							</div>
						</div>
						<div style="margin: var(--margin-lg) 0;">
							<div class="text-muted small" style="margin-bottom: 6px; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px;">${__("Background Image")}</div>
							<div class="text-muted small" style="margin-bottom: var(--margin-sm);">${__("Shown behind the app icon grid. Icon tiles keep their own theme-colored fill and labels get a readable backdrop, so any photo stays usable.")}</div>
							<div class="prism-desktop-bg-preview" style="width: 220px; height: 90px; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); background: var(--subtle-accent, #f5f5f5) center/cover no-repeat; margin-bottom: 8px;"></div>
							<button class="btn btn-xs btn-default prism-upload-desktop-bg">${__("Upload Image")}</button>
							<button class="btn btn-xs btn-default prism-remove-desktop-bg" style="margin-left: 6px; display: none;">${__("Remove")}</button>
							<div class="prism-desktop-bg-opacity-row" style="max-width: 360px; margin-top: var(--margin-md);">
								<div class="text-muted small" style="margin-bottom: 6px; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px;">${__("Background Image Overlay")}</div>
								<div class="text-muted small" style="margin-bottom: 8px;">${__("How strongly this theme's color washes over the photo.")}</div>
								<input type="range" class="prism-desktop-bg-opacity" min="0" max="100" step="5" style="width: 100%;">
								<div style="display: flex; justify-content: space-between; font-size: 10.5px; margin-top: 2px;">
									<span class="text-muted">${__("0% (photo as-is)")}</span>
									<span class="text-muted"><b>${__("40% recommended")}</b></span>
									<span class="text-muted">${__("100% (hidden)")}</span>
								</div>
							</div>
						</div>
						<div style="margin-top: var(--margin-lg);">
							<div class="text-muted small" style="margin-bottom: 6px; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px;">${__("Module Icons")}</div>
							<div class="text-muted small" style="margin-bottom: var(--margin-sm);">${__("Toggle off icons this theme should hide from the Desk app grid, for everyone using it.")}</div>
							<div class="prism-icon-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; max-height: 320px; overflow-y: auto; padding-right: 4px;"></div>
						</div>
					</div>
					<div class="prism-tab-panel" id="prism-tab-apps" style="display: none;">
						<p class="text-muted">${__(
							"Give specific installed apps their own accent, navbar, and sidebar colors — Prism swaps these in automatically as you move between apps in Desk, and falls back to this theme's own colors everywhere else."
						)}</p>
						<div class="prism-app-override-rows" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: var(--margin-md);"></div>
						<button class="btn btn-default btn-sm prism-add-app-override">${__("Add App Override")}</button>
					</div>
					<div class="prism-tab-panel" id="prism-tab-login" style="display: none;">
						<p class="text-muted">${__("Pick the structural layout of the login/signup page — colors always follow this theme regardless of which style is selected.")}</p>
						<div class="prism-opt-row" data-group="login_style" style="display: flex; gap: 8px; flex-wrap: wrap;">
							${["Centered Card", "Split Screen", "Minimal", "Glass Floating", "Full Gradient"]
								.map((v) => `<div class="prism-opt-pill" data-val="${v}" style="padding: 7px 14px; border-radius: 20px; border: 1.5px solid var(--border-color); font-size: 12px; font-weight: 600; cursor: pointer;">${__(v)}</div>`)
								.join("")}
						</div>
						<p class="text-muted small" style="margin-top: var(--margin-sm);">${__("Preview by opening /login in another tab after applying — Theme Studio itself is a Desk page, so it can't render the login page inline.")}</p>
					</div>
				</div>
				<div class="prism-apply-bar" style="margin-top: var(--margin-lg); padding-top: var(--margin-md); border-top: 1px solid var(--border-color); display: flex; align-items: center; gap: var(--margin-md);">
					<button class="btn btn-primary btn-sm prism-apply-btn prism-press" disabled>${__("Apply as Default Theme")}</button>
					<span class="text-muted small prism-selected-label"></span>
				</div>
			</div>
		`).appendTo(this.page.body);

		this.$gallery = this.$body.find(".prism-preset-gallery");
		this.$apply_btn = this.$body.find(".prism-apply-btn");
		this.$selected_label = this.$body.find(".prism-selected-label");
		this.$navbar_color = this.$body.find(".prism-navbar-color");
		this.$sidebar_color = this.$body.find(".prism-sidebar-color");
		this.$menu_style = this.$body.find(".prism-menu-style");
		this.$font_family = this.$body.find(".prism-font-family");
		this.$contrast_rows = this.$body.find(".prism-contrast-rows");
		this.$fix_note = this.$body.find(".prism-fix-note");
		this.$autofix_toggle = this.$body.find(".prism-autofix-toggle");
		this.$elements_preview_btn = this.$body.find(".prism-elements-preview-btn");
		this.$icon_grid = this.$body.find(".prism-icon-grid");
		this.$app_override_rows = this.$body.find(".prism-app-override-rows");
		this.installed_apps = ((frappe.boot.app_data || [])).map((a) => a.app_name);
		this.$desktop_bg_preview = this.$body.find(".prism-desktop-bg-preview");
		this.$remove_desktop_bg = this.$body.find(".prism-remove-desktop-bg");
		this.$desktop_bg_opacity_row = this.$body.find(".prism-desktop-bg-opacity-row");
		this.$desktop_bg_opacity = this.$body.find(".prism-desktop-bg-opacity");
		this.$glass_opacity = this.$body.find(".prism-glass-opacity");

		this.$desktop_bg_opacity.on("change", () => {
			if (!this.selected_theme) return;
			const value = Number(this.$desktop_bg_opacity.val());
			this.selected_theme.desktop_bg_overlay_opacity = value;
			frappe.call({
				method: "prism.api.update_preset_overrides",
				args: { theme: this.selected_theme.name, desktop_bg_overlay_opacity: value },
			});
			this.live_preview();
		});
		this.$glass_opacity.on("change", () => {
			if (!this.selected_theme) return;
			const value = Number(this.$glass_opacity.val());
			this.selected_theme.glass_opacity = value;
			frappe.call({
				method: "prism.api.update_preset_overrides",
				args: { theme: this.selected_theme.name, glass_opacity: value },
			});
			this.live_preview();
		});
		this.$desktop_bg_opacity.on("input", () => this.live_preview_opacity_only());
		this.$glass_opacity.on("input", () => this.live_preview_opacity_only());

		this.$body.find(".prism-upload-desktop-bg").on("click", () => {
			if (!this.selected_theme) return;
			new frappe.ui.FileUploader({
				folder: "Home/Attachments",
				on_success: (file) => {
					frappe.call({
						method: "prism.api.update_preset_overrides",
						args: { theme: this.selected_theme.name, desktop_bg_image: file.file_url },
						freeze: true,
						callback: (r) => {
							this.selected_theme.desktop_bg_image = r.message.desktop_bg_image;
							this.render_desktop_bg_image(this.selected_theme.desktop_bg_image);
							this.live_preview();
							frappe.show_alert({ message: __("Desktop background updated"), indicator: "green" });
						},
					});
				},
			});
		});
		this.$remove_desktop_bg.on("click", () => {
			if (!this.selected_theme) return;
			frappe.call({
				method: "prism.api.update_preset_overrides",
				args: { theme: this.selected_theme.name, clear_desktop_bg_image: 1 },
				freeze: true,
				callback: () => {
					this.selected_theme.desktop_bg_image = null;
					this.render_desktop_bg_image(null);
					this.live_preview();
				},
			});
		});

		this.$body.find(".prism-add-app-override").on("click", () => {
			this.app_overrides = this.app_overrides || [];
			this.app_overrides.push({ app: "", primary_color: "", gradient_end_color: "", navbar_color: "", sidebar_color: "" });
			this.render_app_overrides();
		});

		Object.keys(prism.FONT_STACKS).forEach((font) => {
			this.$font_family.append(`<option value="${font}">${font}</option>`);
		});

		this.$navbar_color.on("input", () => {
			if (!this.selected_theme) return;
			this.overrides.navbar_color = this.$navbar_color.val();
			this.live_preview();
		});
		this.$sidebar_color.on("input", () => {
			if (!this.selected_theme) return;
			this.overrides.sidebar_color = this.$sidebar_color.val();
			this.live_preview();
		});
		this.$body.find(".prism-reset-sidebar-color").on("click", () => {
			if (!this.selected_theme) return;
			delete this.overrides.sidebar_color;
			this.$sidebar_color.val(this.to_hex(this.selected_theme.sidebar_color));
			this.live_preview();
		});
		this.$menu_style.on("change", () => {
			if (!this.selected_theme) return;
			this.overrides.menu_style = this.$menu_style.val();
			this.live_preview();
		});
		this.$font_family.on("change", () => {
			if (!this.selected_theme) return;
			this.overrides.font_family = this.$font_family.val();
			this.live_preview();
		});

		this.$apply_btn.on("click", () => this.apply_default());

		this.$body.find(".prism-opt-row").each((_, row) => {
			const $row = $(row);
			const group = $row.data("group");
			$row.find(".prism-opt-pill").on("click", (e) => {
				if (!this.selected_theme) return;
				const val = $(e.currentTarget).data("val");
				$row.find(".prism-opt-pill").removeClass("selected").css({ background: "#fff", color: "var(--text-color)", "border-color": "var(--border-color)" });
				$(e.currentTarget).addClass("selected").css({ background: "var(--primary)", color: "var(--prism-on-primary, #fff)", "border-color": "var(--primary)" });
				this.overrides[group] = val;
				this.live_preview();
			});
		});

		// Desk doesn't load Bootstrap's Tab JS plugin, so data-toggle="tab"
		// is a no-op here — wire tab switching manually instead.
		this.$body.find(".prism-ftab").on("click", (e) => {
			const $tab = $(e.currentTarget);
			this.$body.find(".prism-ftab").removeClass("active").css({ color: "var(--text-muted)", "border-color": "transparent" });
			$tab.addClass("active").css({ color: "var(--text-color)", "border-color": "var(--primary)" });
			this.$body.find(".prism-tab-panel").hide();
			this.$body.find("#" + $tab.data("tab")).show();
		});
		this.$body.find('.prism-ftab[data-tab="prism-tab-layout"]').css({ color: "var(--text-color)", "border-color": "var(--primary)" });
	}

	fetch_presets() {
		frappe.call("prism.api.get_presets").then((r) => {
			this.presets = r.message || [];
			this.render_gallery();
		});
	}

	render_gallery() {
		this.$gallery.empty();
		const current_theme = frappe.boot.prism_theme ? frappe.boot.prism_theme.name : null;

		this.presets.forEach((preset) => {
			const is_active = preset.name === current_theme;
			const accent = preset.gradient_end_color
				? `linear-gradient(135deg, ${preset.primary_color}, ${preset.gradient_end_color})`
				: preset.primary_color;

			const $card = $(`
				<div class="prism-preset-card prism-hover-lift prism-press" data-theme="${frappe.utils.escape_html(preset.name)}"
					style="position: relative; border: 1px solid var(--border-color); border-radius: var(--border-radius-md);
						padding: var(--padding-md); cursor: pointer; overflow: hidden;
						background: linear-gradient(180deg, ${preset.background_color} 0%, ${preset.background_color} 100%);">
					<div style="position: absolute; inset: 0 0 auto 0; height: 4px; background: ${accent};"></div>
					<div style="display: flex; gap: 6px; margin: 6px 0 var(--margin-sm);">
						<span style="width: 18px; height: 18px; border-radius: 50%; background: ${accent};"></span>
						<span style="width: 18px; height: 18px; border-radius: 50%; background: ${preset.navbar_color}; border: 1px solid var(--border-color);"></span>
						<span style="width: 18px; height: 18px; border-radius: 50%; background: ${preset.sidebar_color}; border: 1px solid var(--border-color);"></span>
					</div>
					<div style="color: ${preset.text_color};"><strong>${frappe.utils.escape_html(preset.theme_name)}</strong></div>
					<div class="small" style="color: ${prism.rgba(preset.text_color, 0.65)};">${preset.field_radius} · ${preset.icon_style}${is_active ? " · <b>" + __("Active") + "</b>" : ""}</div>
				</div>
			`).appendTo(this.$gallery);

			if (is_active) $card.addClass("prism-hover-glow").css("border-color", "var(--primary)");

			$card.on("click", () => this.select(preset));
		});
	}

	select(preset) {
		this.selected_theme = preset;
		this.overrides = {};
		this.$navbar_color.val(this.to_hex(preset.navbar_color));
		this.$sidebar_color.val(this.to_hex(preset.sidebar_color));
		this.$menu_style.val(preset.menu_style || "Theme Color");
		this.$font_family.val(preset.font_family);
		this.$selected_label.text(__("Selected: {0}", [preset.theme_name]));
		this.$fix_note.hide();
		this.set_opt_pill_state("button_style", preset.button_style || "Solid");
		this.set_opt_pill_state("hover_effect", preset.hover_effect || "Lift");
		this.set_opt_pill_state("background_style", preset.background_style || "Solid");
		this.set_opt_pill_state("field_style", preset.field_style || "Outlined");
		this.set_opt_pill_state("corner_style", preset.corner_style || "Default");
		this.set_opt_pill_state("checkbox_style", preset.checkbox_style || "Default");
		this.set_opt_pill_state("login_style", preset.login_style || "Centered Card");
		this.render_desktop_bg_image(preset.desktop_bg_image);
		this.$glass_opacity.val(preset.glass_opacity || 65);
		this.$desktop_bg_opacity.val(preset.desktop_bg_overlay_opacity != null ? preset.desktop_bg_overlay_opacity : 40);
		this.live_preview();

		this.$gallery.find(".prism-preset-card").css("outline", "none");
		this.$gallery.find(`[data-theme="${preset.name}"]`).css("outline", "2px solid var(--primary)");
		this.$apply_btn.prop("disabled", false);

		this.render_contrast();
		if (this.$autofix_toggle.is(":checked")) {
			this.fix_all_contrast(true);
		}
		this.render_icon_grid();
		this.load_app_overrides();
	}

	load_app_overrides() {
		if (!this.selected_theme) return;
		frappe.call("prism.api.get_app_overrides", { theme: this.selected_theme.name }).then((r) => {
			this.app_overrides = r.message || [];
			this.render_app_overrides();
		});
	}

	render_app_overrides() {
		this.$app_override_rows.empty();
		(this.app_overrides || []).forEach((row, idx) => {
			const $row = $(`
				<div class="prism-app-override-row" style="display: flex; gap: 8px; align-items: center; padding: 8px;
					border: 1px solid var(--border-color); border-radius: var(--border-radius-sm);">
					<select class="form-control prism-app-override-app" style="max-width: 200px;">
						<option value="">${__("Select app...")}</option>
						${this.installed_apps.map((a) => `<option value="${a}" ${row.app === a ? "selected" : ""}>${a}</option>`).join("")}
					</select>
					<input type="color" class="form-control prism-app-override-primary" value="${this.to_hex(row.primary_color) || "#5865f2"}" title="${__("Primary Color")}" style="height: 32px; width: 44px; padding: 2px; cursor: pointer;">
					<input type="color" class="form-control prism-app-override-navbar" value="${this.to_hex(row.navbar_color) || "#1a1f24"}" title="${__("Navbar Color")}" style="height: 32px; width: 44px; padding: 2px; cursor: pointer;">
					<input type="color" class="form-control prism-app-override-sidebar" value="${this.to_hex(row.sidebar_color) || "#1a1f24"}" title="${__("Sidebar Color")}" style="height: 32px; width: 44px; padding: 2px; cursor: pointer;">
					<button class="btn btn-xs btn-default prism-app-override-remove" style="margin-left: auto;">${__("Remove")}</button>
				</div>
			`).appendTo(this.$app_override_rows);

			const sync_row = () => {
				this.app_overrides[idx] = {
					app: $row.find(".prism-app-override-app").val(),
					primary_color: $row.find(".prism-app-override-primary").val(),
					navbar_color: $row.find(".prism-app-override-navbar").val(),
					sidebar_color: $row.find(".prism-app-override-sidebar").val(),
				};
			};
			$row.find("select, input").on("change", () => {
				sync_row();
				this.save_app_overrides();
			});
			$row.find(".prism-app-override-remove").on("click", () => {
				this.app_overrides.splice(idx, 1);
				this.save_app_overrides();
			});
		});
	}

	save_app_overrides() {
		if (!this.selected_theme) return;
		const overrides = (this.app_overrides || []).filter((row) => row.app);
		frappe.call({
			method: "prism.api.update_app_overrides",
			args: { theme: this.selected_theme.name, overrides },
			callback: () => {
				frappe.show_alert({ message: __("App color overrides updated"), indicator: "green" });
				this.load_app_overrides();
			},
		});
	}

	render_desktop_bg_image(image_url) {
		if (image_url) {
			this.$desktop_bg_preview.css("background-image", `url("${image_url}")`);
			this.$remove_desktop_bg.show();
		} else {
			this.$desktop_bg_preview.css("background-image", "none");
			this.$remove_desktop_bg.hide();
		}
	}

	render_icon_grid() {
		this.$icon_grid.empty();
		if (!this.selected_theme) return;
		frappe.call("prism.api.get_desktop_icons_for_theme", { theme: this.selected_theme.name }).then((r) => {
			const icons = r.message || [];
			icons.forEach((icon) => {
				const $row = $(`
					<label class="prism-icon-toggle-row" style="display: flex; align-items: center; gap: 8px; padding: 6px 8px;
						border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); font-size: 12px; cursor: pointer; margin: 0;">
						<input type="checkbox" class="prism-icon-toggle" data-icon="${frappe.utils.escape_html(icon.name)}" ${icon.hidden ? "" : "checked"}>
						<span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${frappe.utils.escape_html(icon.label || icon.name)}</span>
					</label>
				`).appendTo(this.$icon_grid);

				$row.find(".prism-icon-toggle").on("change", () => this.save_hidden_icons());
			});
		});
	}

	save_hidden_icons() {
		if (!this.selected_theme) return;
		const hidden_icons = [];
		this.$icon_grid.find(".prism-icon-toggle").each((_, el) => {
			if (!el.checked) hidden_icons.push($(el).data("icon"));
		});
		frappe.call({
			method: "prism.api.update_hidden_icons",
			args: { theme: this.selected_theme.name, hidden_icons },
			callback: () => frappe.show_alert({ message: __("Module icon visibility updated"), indicator: "green" }),
		});
	}

	live_preview() {
		prism.apply_theme(Object.assign({}, this.selected_theme, this.overrides));
	}

	// Cheap re-apply while dragging a slider — no server round-trip, just an
	// instant visual update using the slider's current (unsaved) value. The
	// "change" handlers above persist the value once the user lets go.
	live_preview_opacity_only() {
		if (!this.selected_theme) return;
		const merged = Object.assign({}, this.selected_theme, this.overrides);
		merged.glass_opacity = Number(this.$glass_opacity.val());
		merged.desktop_bg_overlay_opacity = Number(this.$desktop_bg_opacity.val());
		prism.apply_theme(merged);
	}

	set_opt_pill_state(group, value) {
		const $row = this.$body.find(`.prism-opt-row[data-group="${group}"]`);
		$row.find(".prism-opt-pill").each((_, el) => {
			const $pill = $(el);
			const is_selected = $pill.data("val") === value;
			$pill
				.toggleClass("selected", is_selected)
				.css(
					is_selected
						? { background: "var(--primary)", color: "var(--prism-on-primary, #fff)", "border-color": "var(--primary)" }
						: { background: "#fff", color: "var(--text-color)", "border-color": "var(--border-color)" }
				);
		});
	}

	current_theme() {
		return Object.assign({}, this.selected_theme, this.overrides);
	}

	// Two pairings that actually occur in Desk: the accent as a button fill
	// (needs white/near-white text on top), and the accent used as text on
	// the page background (links, active states).
	contrast_checks() {
		const theme = this.current_theme();
		return [
			{ key: "body_text", label: __("Body text on background"), fg: theme.text_color, bg: theme.background_color },
			{ key: "on_button", label: __("Text on accent button"), fg: "#FFFFFF", bg: theme.primary_color },
			{ key: "on_bg", label: __("Accent text on background"), fg: theme.primary_color, bg: theme.background_color },
		];
	}

	render_contrast() {
		this.$contrast_rows.empty();
		this.contrast_checks().forEach((check) => {
			const ratio = prism.contrast_ratio(check.fg, check.bg);
			const passing = ratio >= 4.5;
			const $row = $(`
				<div class="prism-contrast-row" data-key="${check.key}" style="display: flex; align-items: center; justify-content: space-between;
					padding: 10px 0; border-bottom: 1px dashed var(--border-color); font-size: 12px;">
					<div>
						${check.label}
						<div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
							<span style="width:14px; height:14px; border-radius:4px; background:${check.bg}; border:1px solid var(--border-color);"></span>
							<span class="text-muted" style="font-family: var(--font-family-monospace, monospace); font-size: 10.5px;">${check.bg}</span>
						</div>
					</div>
					<div style="display:flex; align-items:center; gap:10px;">
						<span style="font-weight:700; font-family: var(--font-family-monospace, monospace); color: ${passing ? "var(--green-600, #3d9b6e)" : "var(--red-600, #b14b3c)"};">${ratio.toFixed(2)}:1</span>
						<span class="indicator-pill ${passing ? "green" : "red"}" style="font-size: 10px;">${passing ? __("AA Pass") : __("AA Fail")}</span>
						<button class="btn btn-xs btn-default prism-fix-btn" ${passing ? "disabled" : ""}>${__("Fix")}</button>
					</div>
				</div>
			`).appendTo(this.$contrast_rows);

			$row.find(".prism-fix-btn").on("click", () => this.fix_contrast(check.key));
		});
	}

	fix_contrast(key) {
		const theme = this.current_theme();
		// Each check fixes a different override field, holding the other side
		// of the pair fixed: body text adjusts text_color, the two accent
		// checks adjust primary_color.
		const config = {
			body_text: { override_key: "text_color", value: theme.text_color, against: theme.background_color },
			on_button: { override_key: "primary_color", value: theme.primary_color, against: "#FFFFFF" },
			on_bg: { override_key: "primary_color", value: theme.primary_color, against: theme.background_color },
		}[key];
		if (!config) return;

		const fixed = prism.fix_contrast(config.value, config.against, 4.5);
		this.overrides[config.override_key] = fixed;
		this.live_preview();
		this.render_contrast();
		this.$fix_note
			.show()
			.text(__("Auto-fixed: adjusted {0} from {1} to {2} to meet AA contrast (4.5:1).", [config.override_key, config.value, fixed]));
	}

	fix_all_contrast(silent) {
		let changed = false;
		this.contrast_checks().forEach((check) => {
			if (prism.contrast_ratio(check.fg, check.bg) < 4.5) {
				this.fix_contrast(check.key);
				changed = true;
			}
		});
		if (!changed && silent) this.$fix_note.hide();
	}

	to_hex(color) {
		// native <input type=color> only accepts #rrggbb
		if (!color) return "#000000";
		const { r, g, b } = prism.hex_to_rgb(color);
		return prism.rgb_to_hex(r, g, b);
	}

	apply_default() {
		if (!this.selected_theme) return;
		const has_overrides = Object.keys(this.overrides).length > 0;

		const finish = () => {
			frappe.call({
				method: "prism.api.set_default_theme",
				args: { theme: this.selected_theme.name },
				freeze: true,
				callback: (r) => {
					frappe.show_alert({ message: __("Theme applied"), indicator: "green" });
					frappe.boot.prism_theme = Object.assign({}, this.selected_theme, this.overrides);
					this.fetch_presets();
				},
			});
		};

		if (has_overrides) {
			frappe.call({
				method: "prism.api.update_preset_overrides",
				args: Object.assign({ theme: this.selected_theme.name }, this.overrides),
				freeze: true,
				callback: finish,
			});
		} else {
			finish();
		}
	}
};
