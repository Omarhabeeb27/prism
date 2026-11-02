frappe.pages["prism-themes"].on_page_load = function (wrapper) {
	const ui = prism.ui.make_page(wrapper, {
		title: __("Themes"),
		list_label: __("Open list"),
		list_route: "List/Theme Preset",
	});
	wrapper.themes_page = new prism.ThemesPage(wrapper, ui);
};
frappe.pages["prism-themes"].on_page_show = function (wrapper) {
	if (wrapper.themes_page) wrapper.themes_page.load();
};

prism.ThemesPage = class ThemesPage {
	constructor(wrapper, ui) {
		Object.assign(this, ui);
		this.filter = "all";
		this.search = "";
		this.$actions.html(`
			<button type="button" class="ps-btn ps-import">${frappe.utils.icon("upload", "sm")}${__("Import")}</button>
			<button type="button" class="ps-btn ps-btn-primary ps-new">${frappe.utils.icon("plus", "sm")}${__("New theme")}</button>
		`);
		this.$body.html(`
			<div class="ps-toolbar">
				<label class="ps-search">${frappe.utils.icon("search", "sm")}<input type="search" placeholder="${__("Search themes")}" aria-label="${__("Search themes")}"></label>
				<div class="ps-seg ps-filter"></div>
			</div>
			<div class="ps-lib-grid"></div>
		`);
		this.bind();
		this.load();
	}

	bind() {
		this.$actions.find(".ps-new").on("click", () => this.new_theme());
		this.$actions.find(".ps-import").on("click", () => this.import_theme());
		this.$body.find(".ps-search input").on("input", (e) => {
			this.search = e.target.value.toLowerCase();
			this.render_grid();
		});
		this.$body.on("click", ".ps-filter button", (e) => {
			this.filter = e.currentTarget.dataset.filter;
			this.render_grid();
		});
		const preset_of = (e) => this.state.presets.find((p) => p.name === e.currentTarget.closest(".ps-lib-card").dataset.name);
		this.$body.on("click", ".ps-edit, .ps-lib-open", (e) => this.edit(preset_of(e).name));
		this.$body.on("click", ".ps-use-theme", (e) => this.use(preset_of(e).name));
		this.$body.on("click", ".ps-duplicate", (e) => this.duplicate(preset_of(e)));
		this.$body.on("click", ".ps-export", (e) => this.export_theme(preset_of(e)));
		this.$body.on("click", ".ps-reset", (e) => this.reset(preset_of(e)));
		this.$body.on("click", ".ps-delete", (e) => this.remove(preset_of(e)));
	}

	load() {
		return frappe.call("prism.api.get_studio_state").then((r) => {
			this.state = r.message;
			this.render();
		});
	}

	is_dark(p) {
		return prism.luminance(p.background_color || "#ffffff") < 0.2;
	}

	render() {
		const presets = this.state.presets;
		const custom = presets.filter((p) => !p.is_standard).length;
		const users = Object.values(this.state.usage || {}).reduce((a, b) => a + b, 0);
		this.$stats.html(
			prism.ui.stat("swatch-book", presets.length, __("Themes")) +
				prism.ui.stat("sparkles", custom, __("Your own")) +
				prism.ui.stat("moon", presets.filter((p) => this.is_dark(p)).length, __("Dark")) +
				prism.ui.stat("users", users, __("Users on their own theme"))
		);
		this.render_grid();
	}

	render_grid() {
		const counts = { all: 0, light: 0, dark: 0, builtin: 0, custom: 0 };
		const matches = (p, f) =>
			f === "all" ||
			(f === "dark" && this.is_dark(p)) ||
			(f === "light" && !this.is_dark(p)) ||
			(f === "builtin" && p.is_standard) ||
			(f === "custom" && !p.is_standard);
		this.state.presets.forEach((p) => Object.keys(counts).forEach((f) => matches(p, f) && counts[f]++));
		const labels = { all: __("All"), light: __("Light"), dark: __("Dark"), builtin: __("Built-in"), custom: __("Your own") };
		this.$body.find(".ps-filter").html(
			Object.keys(labels)
				.map((f) => `<button type="button" data-filter="${f}" aria-pressed="${this.filter === f}">${labels[f]} ${counts[f]}</button>`)
				.join("")
		);
		const list = this.state.presets.filter(
			(p) => matches(p, this.filter) && (!this.search || p.theme_name.toLowerCase().includes(this.search))
		);
		this.$body
			.find(".ps-lib-grid")
			.html(list.map((p) => this.card(p)).join("") || `<div class="ps-empty-state">${__("No themes match. Clear the search or choose another filter.")}</div>`);
	}

	card(p) {
		const live = this.state.enabled && p.name === this.state.default_theme;
		const users = (this.state.usage || {})[p.name] || 0;
		const ratio = prism.ui.readability(p);
		const swatches = [p.primary_color, p.gradient_end_color, p.navbar_color, p.sidebar_color, p.background_color, p.text_color]
			.filter(Boolean)
			.map((c) => `<i style="background:${c}"></i>`)
			.join("");
		const icon_btn = (cls, icon, label) =>
			`<button type="button" class="ps-icon-btn ${cls}" title="${label}" aria-label="${label}">${frappe.utils.icon(icon, "sm")}</button>`;
		return `<article class="ps-lib-card ${live ? "is-default" : ""}" data-name="${frappe.utils.escape_html(p.name)}">
			<button type="button" class="ps-lib-open" aria-label="${__("Edit {0} in Theme Studio", [frappe.utils.escape_html(p.theme_name)])}">${prism.ui.thumb(p)}</button>
			<div class="ps-lib-head">
				<div>
					<b>${frappe.utils.escape_html(p.theme_name)}</b>
					<small>${this.is_dark(p) ? __("Dark") : __("Light")}, ${frappe.utils.escape_html(p.font_family || "Inter")}</small>
				</div>
				${live ? `<span class="ps-tag is-strong">${__("In use")}</span>` : ""}
			</div>
			<div class="ps-palette" aria-hidden="true">${swatches}</div>
			<div class="ps-lib-facts">
				<span class="ps-tag">${p.is_standard ? __("Built-in") : __("Your own")}</span>
				<span class="ps-tag ${ratio < 4.5 ? "is-accent" : ""}">${__("Contrast {0}:1", [ratio.toFixed(1)])}</span>
				${users ? `<span class="ps-tag is-accent">${users === 1 ? __("1 user") : __("{0} users", [users])}</span>` : ""}
			</div>
			<div class="ps-lib-actions">
				<button type="button" class="ps-btn ps-edit">${__("Edit")}</button>
				${live ? "" : `<button type="button" class="ps-btn ps-use-theme">${__("Use")}</button>`}
				<span class="ps-spacer"></span>
				${icon_btn("ps-duplicate", "copy", __("Duplicate"))}
				${icon_btn("ps-export", "download", __("Export"))}
				${p.is_standard ? icon_btn("ps-reset", "rotate-ccw", __("Reset to original")) : icon_btn("ps-delete", "trash-2", __("Delete"))}
			</div>
		</article>`;
	}

	edit(name) {
		frappe.route_options = { theme: name };
		frappe.set_route("theme-studio");
	}

	use(name) {
		const previous = this.state.enabled ? this.state.default_theme : null;
		frappe.call({ method: "prism.api.set_default_theme", args: { theme: name }, freeze: true }).then((r) => {
			this.adopt(r.message);
			this.load().then(() =>
				prism.ui.toast(this.$root, __("{0} is now on for everyone", [frappe.utils.escape_html(name)]), previous ? () => this.use(previous) : null)
			);
		});
	}

	adopt(theme) {
		prism.base_theme = theme;
		frappe.boot.prism_theme = theme;
		if (prism.is_on()) prism.apply_theme(prism.current_theme());
	}

	new_theme() {
		const d = new frappe.ui.Dialog({
			title: __("New theme"),
			fields: [
				{ fieldname: "theme_name", fieldtype: "Data", label: __("Name"), reqd: 1 },
				{
					fieldname: "start",
					fieldtype: "Select",
					label: __("Start from"),
					options: [
						{ label: __("My brand colour"), value: "colour" },
						{ label: __("An existing theme"), value: "theme" },
					],
					default: "colour",
				},
				{ fieldname: "accent", fieldtype: "Color", label: __("Brand colour"), default: "#2563EB", depends_on: "eval:doc.start=='colour'" },
				{
					fieldname: "mode",
					fieldtype: "Select",
					label: __("Mode"),
					options: [
						{ label: __("Light"), value: "light" },
						{ label: __("Dark"), value: "dark" },
					],
					default: "light",
					depends_on: "eval:doc.start=='colour'",
				},
				{
					fieldname: "base",
					fieldtype: "Select",
					label: __("Theme"),
					options: this.state.presets.map((p) => p.name),
					default: this.state.default_theme,
					depends_on: "eval:doc.start=='theme'",
				},
			],
			primary_action_label: __("Create and edit"),
			primary_action: (values) => {
				const from_colour = values.start === "colour";
				const args = {
					theme: from_colour ? this.state.presets[0].name : values.base,
					theme_name: values.theme_name,
					values: from_colour ? this.palette_from(values.accent, values.mode) : {},
				};
				frappe.call({ method: "prism.api.duplicate_preset", args, freeze: true }).then((r) => {
					d.hide();
					this.edit(r.message.name);
				});
			},
		});
		d.show();
	}

	// A complete, readable starting palette from one colour.
	palette_from(accent, mode) {
		const dark = mode === "dark";
		const background = dark ? prism.mix("#0f1218", accent, 0.05) : "#ffffff";
		const text = dark ? "#eceef3" : prism.mix("#14181d", accent, 0.08);
		return {
			primary_color: accent,
			gradient_end_color: null,
			background_color: background,
			text_color: text,
			navbar_color: dark ? prism.mix(background, "#ffffff", 0.03) : "#ffffff",
			sidebar_color: dark ? prism.mix(background, "#000000", 0.2) : prism.mix("#f6f7f9", accent, 0.05),
			menu_style: "Theme Color",
			button_style: "Solid",
			field_style: "Outlined",
			field_radius: "Rounded",
			icon_style: "Outline",
			background_style: "Solid",
			hover_effect: "Lift",
			font_family: "Inter",
			desktop_bg_image: null,
			hidden_desktop_icons: [],
			app_color_overrides: [],
		};
	}

	duplicate(preset) {
		frappe.prompt(
			{ fieldname: "theme_name", fieldtype: "Data", label: __("Theme name"), reqd: 1, default: __("{0} copy", [preset.theme_name]) },
			({ theme_name }) => {
				frappe
					.call({ method: "prism.api.duplicate_preset", args: { theme: preset.name, theme_name }, freeze: true })
					.then(() => this.load())
					.then(() => prism.ui.toast(this.$root, __("Saved as {0}", [frappe.utils.escape_html(theme_name)])));
			},
			__("Duplicate theme"),
			__("Duplicate")
		);
	}

	export_theme(preset) {
		const { name, is_standard, is_dark_mode, ...data } = preset;
		const blob = new Blob([JSON.stringify({ prism_theme: 1, ...data }, null, 2)], { type: "application/json" });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `${frappe.scrub(preset.theme_name)}.prism-theme.json`;
		link.click();
		URL.revokeObjectURL(link.href);
	}

	import_theme() {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json,application/json";
		input.onchange = () => {
			const file = input.files[0];
			if (!file) return;
			file.text().then((data) => {
				frappe
					.call({ method: "prism.api.import_preset", args: { data }, freeze: true })
					.then((r) => this.load().then(() => prism.ui.toast(this.$root, __("Imported {0}", [frappe.utils.escape_html(r.message.theme_name)]))));
			});
		};
		input.click();
	}

	reset(preset) {
		frappe.confirm(__("Put {0} back to how Prism ships it? Your changes to this theme will be lost.", [frappe.utils.escape_html(preset.theme_name)]), () => {
			frappe.call({ method: "prism.api.reset_preset", args: { theme: preset.name }, freeze: true }).then(() =>
				this.load().then(() => prism.ui.toast(this.$root, __("Reset {0}", [frappe.utils.escape_html(preset.theme_name)])))
			);
		});
	}

	remove(preset) {
		frappe.confirm(__("Delete {0}? This can't be undone.", [frappe.utils.escape_html(preset.theme_name)]), () => {
			frappe.call({ method: "prism.api.delete_preset", args: { theme: preset.name }, freeze: true }).then(() =>
				this.load().then(() => prism.ui.toast(this.$root, __("Deleted {0}", [frappe.utils.escape_html(preset.theme_name)])))
			);
		});
	}
};
