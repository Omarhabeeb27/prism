frappe.pages["theme-studio"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Theme Studio"),
		single_column: true,
	});
	wrapper.theme_studio = new prism.ThemeStudio(page, wrapper);
};

prism.ThemeStudio = class ThemeStudio {
	constructor(page, wrapper) {
		this.page = page;
		this.wrapper = $(wrapper);
		this.tab = "themes";
		this.mock_view = "list";
		this.filter = "all";
		this.make_shell();
		this.bind_events();
		this.load(this.requested_theme());
	}

	// Another page can send us to a theme. Frappe moves route options into the URL.
	requested_theme() {
		const from_options = frappe.route_options && frappe.route_options.theme;
		if (from_options) frappe.route_options = null;
		return from_options || new URLSearchParams(window.location.search).get("theme");
	}

	// -- State ---------------------------------------------------------------

	load(select_name) {
		return frappe.call("prism.api.get_studio_state").then((r) => {
			this.state = r.message;
			const name = select_name || (this.selected && this.selected.name) || this.state.default_theme;
			const preset = this.state.presets.find((p) => p.name === name) || this.state.presets[0];
			this.select(preset);
		});
	}

	select(preset) {
		this.selected = preset;
		this.draft = JSON.parse(JSON.stringify(preset));
		this.preview();
		this.render();
	}

	preview() {
		prism.apply_theme(this.draft);
	}

	// Leaving the page must never leave an unsaved look behind.
	restore_live_theme() {
		if (prism.is_on()) prism.apply_theme(prism.current_theme());
		else prism.clear_theme();
	}

	changed_fields() {
		if (!this.selected) return [];
		return Object.keys(this.draft).filter(
			(key) => JSON.stringify(this.draft[key] ?? null) !== JSON.stringify(this.selected[key] ?? null)
		);
	}

	changes() {
		const values = {};
		this.changed_fields().forEach((key) => (values[key] = this.draft[key]));
		return values;
	}

	is_live() {
		return !!this.state.enabled && this.state.default_theme === this.selected.name;
	}

	set(field, value) {
		this.draft[field] = value;
		this.preview();
		this.sync();
	}

	// -- Skeleton ------------------------------------------------------------

	make_shell() {
		const tabs = [
			["themes", __("Themes"), "swatch-book"],
			["colours", __("Colours"), "palette"],
			["type", __("Type"), "type"],
			["shapes", __("Shapes"), "shapes"],
			["desktop", __("Desktop"), "layout-grid"],
			["apps", __("Apps"), "blocks"],
			["login", __("Login"), "log-in"],
		];
		this.$root = $(`
			<div class="ps-root">
				<header class="ps-hero">
					<div class="ps-hero-text">
						<h1 class="ps-title"></h1>
						<div class="ps-stats"></div>
					</div>
					<div class="ps-hero-actions">
						<label class="ps-power">
							<span class="ps-power-label"></span>
							<span class="ps-switch"><input type="checkbox" class="ps-power-input"><i></i></span>
						</label>
						<button type="button" class="ps-btn ps-btn-primary ps-use"></button>
					</div>
				</header>
				<section class="ps-tiles" aria-label="${__("Colours in this theme")}"></section>
				<nav class="ps-tabs" role="tablist">
					<span class="ps-tabs-pill" aria-hidden="true"></span>
					${tabs
						.map(
							([id, label, icon]) =>
								`<button type="button" role="tab" class="ps-tab" data-tab="${id}">${frappe.utils.icon(icon, "sm")}<span>${label}</span></button>`
						)
						.join("")}
				</nav>
				<div class="ps-body">
					<div class="ps-stage">
						<div class="ps-stage-head">
							<div>
								<h2>${__("Live preview")}</h2>
								<p>${__("Your whole Desk is previewing this theme. Nobody else sees it until you apply it.")}</p>
							</div>
							<div class="ps-seg ps-mock-views">
								<button type="button" data-view="list">${__("List")}</button>
								<button type="button" data-view="form">${__("Form")}</button>
								<button type="button" data-view="login">${__("Login")}</button>
							</div>
						</div>
						<div class="ps-mock"></div>
					</div>
					<aside class="ps-panel"></aside>
				</div>
				<div class="ps-bar" hidden>
					<span class="ps-bar-count"></span>
					<button type="button" class="ps-bar-btn ps-discard">${__("Discard")}</button>
					<button type="button" class="ps-bar-btn ps-save-new">${__("Save as new theme")}</button>
					<button type="button" class="ps-bar-btn ps-bar-primary ps-save">${__("Save changes")}</button>
				</div>
				<div class="ps-toast" hidden role="status"></div>
			</div>
		`).appendTo(this.page.body);

		this.page.set_secondary_action(__("All themes"), () => frappe.set_route("prism-themes"), "swatch-book");
		this.page.add_menu_item(__("Duplicate this theme"), () => this.prompt_save_as());
		this.page.add_menu_item(__("Delete this theme"), () => this.delete_selected());
	}

	bind_events() {
		const $r = this.$root;
		$r.on("click", ".ps-tab", (e) => this.go_to_tab($(e.currentTarget).data("tab")));
		$r.on("click", ".ps-mock-views button", (e) => {
			this.mock_view = $(e.currentTarget).data("view");
			this.render_mock();
		});
		$r.on("click", ".ps-theme-card", (e) => {
			const name = $(e.currentTarget).attr("data-name");
			this.confirm_discard(() => this.select(this.state.presets.find((p) => p.name === name)));
		});
		$r.on("click", ".ps-filter button", (e) => {
			this.filter = $(e.currentTarget).data("filter");
			this.render_panel();
		});
		$r.on("click", ".ps-tile", (e) => {
			const field = $(e.currentTarget).attr("data-field");
			this.go_to_tab("colours");
			const input = this.$root.find(`.ps-color[data-field="${field}"] input[type=color]`)[0];
			if (input) {
				input.closest(".ps-row").scrollIntoView({ block: "nearest" });
				input.click();
			}
		});
		$r.on("click", "[data-choice-field] button", (e) => {
			const $button = $(e.currentTarget);
			this.set($button.closest("[data-choice-field]").attr("data-choice-field"), String($button.attr("data-val")));
		});
		$r.on("input", ".ps-color input[type=color]", (e) => {
			this.set($(e.currentTarget).closest(".ps-color").attr("data-field"), e.currentTarget.value);
		});
		$r.on("change", ".ps-color input[type=text]", (e) => {
			const value = e.currentTarget.value.trim();
			const field = $(e.currentTarget).closest(".ps-color").attr("data-field");
			if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) this.set(field, value);
			else {
				frappe.show_alert({ message: __("Enter a hex colour like #1A7C93."), indicator: "red" });
				this.sync();
			}
		});
		$r.on("click", ".ps-clear-gradient", () => this.set("gradient_end_color", null));
		$r.on("click", ".ps-add-gradient", () => this.set("gradient_end_color", this.draft.primary_color));
		$r.on("input", ".ps-range", (e) => this.set($(e.currentTarget).attr("data-field"), Number(e.currentTarget.value)));
		$r.on("click", ".ps-fix", (e) => this.fix_check($(e.currentTarget).attr("data-key")));
		$r.on("click", ".ps-font", (e) => this.set("font_family", $(e.currentTarget).attr("data-val")));
		$r.on("click", ".ps-upload", () => this.upload_image());
		$r.on("click", ".ps-remove-image", () => this.set("desktop_bg_image", null));
		$r.on("change", ".ps-icon-toggle", () => this.read_hidden_icons());
		$r.on("click", ".ps-add-app", () => this.add_app_override());
		$r.on("click", ".ps-remove-app", (e) => {
			this.draft.app_color_overrides.splice(Number($(e.currentTarget).attr("data-idx")), 1);
			this.render_panel();
			this.sync();
		});
		$r.on("change", ".ps-app-row select, .ps-app-row input", () => this.read_app_overrides());

		$r.find(".ps-use").on("click", () => this.primary_action());
		$r.find(".ps-save").on("click", () => this.save());
		$r.find(".ps-save-new").on("click", () => this.prompt_save_as());
		$r.find(".ps-discard").on("click", () => this.select(this.selected));
		$r.find(".ps-power-input").on("change", (e) => this.set_power(e.currentTarget.checked));

		this.wrapper.on("hide", () => this.restore_live_theme());
		this.wrapper.on("show", () => {
			const wanted = this.requested_theme();
			if (wanted && this.state && wanted !== this.selected?.name) this.load(wanted);
			else if (this.draft) this.preview();
			this.move_tab_pill(false);
		});
		$(window).on("resize.prism-studio", frappe.utils.debounce(() => this.move_tab_pill(false), 120));
		window.addEventListener("beforeunload", (e) => {
			if (this.selected && this.changed_fields().length && frappe.get_route_str().includes("theme-studio")) {
				e.preventDefault();
				e.returnValue = "";
			}
		});
	}

	go_to_tab(tab) {
		this.tab = tab;
		this.render_panel();
		this.sync_tabs();
	}

	confirm_discard(proceed) {
		if (!this.changed_fields().length) return proceed();
		frappe.confirm(__("Discard your unsaved changes to {0}?", [frappe.utils.escape_html(this.selected.theme_name)]), proceed);
	}

	// -- Rendering -----------------------------------------------------------

	render() {
		this.render_mock();
		this.render_panel();
		this.sync();
		this.sync_tabs();
	}

	// Everything that follows the draft without rebuilding a control the user may
	// be dragging or typing in.
	sync() {
		this.render_hero();
		this.render_tiles();
		this.render_bar();
		this.sync_controls();
		this.render_checks();
		this.render_cards_state();
	}

	sync_tabs() {
		this.$root.find(".ps-tab").each((_, el) => {
			const active = el.dataset.tab === this.tab;
			el.classList.toggle("is-active", active);
			el.setAttribute("aria-selected", active);
		});
		this.$root.find(".ps-mock-views button").each((_, el) => {
			el.setAttribute("aria-pressed", el.dataset.view === this.mock_view);
		});
		this.move_tab_pill(true);
	}

	// The pill's leading edge moves first and the trailing edge catches up, so it
	// stretches toward the new tab rather than sliding as a rigid block.
	move_tab_pill(animate) {
		const nav = this.$root.find(".ps-tabs")[0];
		const pill = this.$root.find(".ps-tabs-pill")[0];
		const active = this.$root.find(".ps-tab.is-active")[0];
		if (!nav || !active || !active.offsetWidth) return;
		const left = active.offsetLeft;
		const right = nav.scrollWidth - left - active.offsetWidth;
		const previous_left = this.pill_left ?? left;
		const going_forward = left >= previous_left;
		const fast = "0.26s cubic-bezier(0.2, 0.8, 0.2, 1)";
		const slow = "0.44s cubic-bezier(0.4, 0, 0.2, 1)";
		pill.style.transition = animate
			? `left ${going_forward ? slow : fast}, right ${going_forward ? fast : slow}`
			: "none";
		pill.style.left = `${left}px`;
		pill.style.right = `${right}px`;
		this.pill_left = left;
	}

	render_hero() {
		const d = this.draft;
		const checks = this.contrast_checks();
		const failing = checks.filter((c) => c.ratio < 4.5).length;
		const best = checks[0].ratio.toFixed(1);
		const tokens = prism.compute_tokens(d);
		this.$root.find(".ps-title").text(d.theme_name);
		const stat = (icon, value, label, cls = "") => `
			<div class="ps-stat ${cls}">
				<span class="ps-stat-icon">${frappe.utils.icon(icon, "sm")}</span>
				<span><b>${value}</b><small>${label}</small></span>
			</div>`;
		this.$root.find(".ps-stats").html(
			stat(tokens.is_dark ? "moon" : "sun", tokens.is_dark ? __("Dark") : __("Light"), __("Colour mode")) +
				stat("baseline", `${best}:1`, __("Body text contrast")) +
				stat(
					failing ? "triangle-alert" : "check",
					failing ? __("{0} to fix", [failing]) : __("All pass"),
					__("Readability"),
					failing ? "is-warn" : ""
				) +
				stat("type", frappe.utils.escape_html(d.font_family || "Inter"), __("Font"))
		);

		const live = this.is_live();
		const changed = this.changed_fields().length;
		const $use = this.$root.find(".ps-use");
		if (live && !changed) $use.text(__("In use")).prop("disabled", true);
		else if (live) $use.text(__("Save and apply")).prop("disabled", false);
		else $use.text(__("Use this theme")).prop("disabled", false);

		this.$root.find(".ps-power-input").prop("checked", !!this.state.enabled);
		this.$root
			.find(".ps-power-label")
			.text(this.state.enabled ? __("Prism is on for everyone") : __("Prism is off. Only you see this preview."));
	}

	render_tiles() {
		const d = this.draft;
		const tile = (field, label, value) => {
			const color = value || "#ffffff";
			return `<button type="button" class="ps-tile" data-field="${field}" style="background:${color};color:${prism.best_on(color)}">
				<span class="ps-tile-label">${label}</span>
				<span class="ps-tile-value">${color.toUpperCase()}</span>
			</button>`;
		};
		this.$root.find(".ps-tiles").html(
			tile("primary_color", __("Accent"), d.primary_color) +
				tile("navbar_color", __("Header"), d.navbar_color) +
				tile("sidebar_color", __("Sidebar"), d.sidebar_color) +
				tile("background_color", __("Page"), d.background_color) +
				tile("text_color", __("Text"), d.text_color)
		);
	}

	render_bar() {
		const count = this.changed_fields().length;
		const $bar = this.$root.find(".ps-bar");
		$bar.prop("hidden", !count);
		$bar.find(".ps-bar-count").text(count === 1 ? __("1 unsaved change") : __("{0} unsaved changes", [count]));
	}

	sync_controls() {
		const d = this.draft;
		const $p = this.$panel();
		$p.find("[data-choice-field]").each((_, group) => {
			const field = group.getAttribute("data-choice-field");
			const value = d[field] || group.getAttribute("data-default");
			$(group)
				.find("button")
				.each((__, b) => b.setAttribute("aria-pressed", b.getAttribute("data-val") === value));
		});
		$p.find(".ps-color").each((_, row) => {
			const field = row.getAttribute("data-field");
			const value = d[field];
			const picker = row.querySelector("input[type=color]");
			const text = row.querySelector("input[type=text]");
			if (picker && value && document.activeElement !== picker) picker.value = this.to_hex(value);
			if (text && document.activeElement !== text) text.value = value ? value.toUpperCase() : "";
		});
		$p.find(".ps-range").each((_, input) => {
			const field = input.getAttribute("data-field");
			const value = d[field] ?? Number(input.getAttribute("data-default"));
			input.value = value;
			$(input).closest(".ps-row-block").find(".ps-range-value").text(`${value}%`);
		});
		$p.find(".ps-font").each((_, b) => {
			const on = b.getAttribute("data-val") === (d.font_family || "Inter");
			b.setAttribute("aria-pressed", on);
		});
		$p.find(".ps-font-sample").css("font-family", prism.FONT_STACKS[d.font_family] || "inherit");
		$p.find(".ps-gradient-off").prop("hidden", !!d.gradient_end_color);
		$p.find(".ps-gradient-on").prop("hidden", !d.gradient_end_color);
		$p.find(".ps-image-preview").css("background-image", d.desktop_bg_image ? `url("${encodeURI(d.desktop_bg_image)}")` : "none");
		$p.find(".ps-remove-image, .ps-overlay-row").prop("hidden", !d.desktop_bg_image);
	}

	render_cards_state() {
		this.$root.find(".ps-theme-card").each((_, card) => {
			const name = card.getAttribute("data-name");
			card.setAttribute("aria-pressed", name === this.selected.name);
			card.classList.toggle("is-live", !!this.state.enabled && name === this.state.default_theme);
		});
	}

	$panel() {
		return this.$root.find(".ps-panel");
	}

	render_panel() {
		const renderer = {
			themes: () => this.panel_themes(),
			colours: () => this.panel_colours(),
			type: () => this.panel_type(),
			shapes: () => this.panel_shapes(),
			desktop: () => this.panel_desktop(),
			apps: () => this.panel_apps(),
			login: () => this.panel_login(),
		}[this.tab];
		this.$panel().html(renderer());
		if (this.tab === "desktop") this.load_icons();
		if (this.state) {
			this.sync_controls();
			this.render_checks();
			this.render_cards_state();
		}
	}

	row(icon, title, sub, control = "") {
		return `<div class="ps-row">
			<span class="ps-row-icon">${frappe.utils.icon(icon, "sm")}</span>
			<div class="ps-row-text"><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</div>
			${control ? `<div class="ps-row-control">${control}</div>` : ""}
		</div>`;
	}

	block(icon, title, sub, body) {
		return `<div class="ps-row-block">
			<div class="ps-row">
				<span class="ps-row-icon">${frappe.utils.icon(icon, "sm")}</span>
				<div class="ps-row-text"><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</div>
			</div>
			<div class="ps-row-body">${body}</div>
		</div>`;
	}

	choices(field, fallback) {
		return `<div class="ps-chips" data-choice-field="${field}" data-default="${fallback}">
			${prism.STUDIO_OPTIONS[field].map((v) => `<button type="button" data-val="${v}">${__(v)}</button>`).join("")}
		</div>`;
	}

	color_row(field, title, sub, icon) {
		return this.row(
			icon,
			title,
			sub,
			`<div class="ps-color" data-field="${field}">
				<input type="text" spellcheck="false" maxlength="7" aria-label="${title}">
				<input type="color" aria-label="${title}">
			</div>`
		);
	}

	theme_card(preset) {
		const check = `<span class="ps-thumb-check">${frappe.utils.icon("check", "xs")}</span>`;
		return `<button type="button" class="ps-theme-card" data-name="${frappe.utils.escape_html(preset.name)}">
			${prism.ui.thumb(preset, check)}
			<span class="ps-card-name">${frappe.utils.escape_html(preset.theme_name)}</span>
			<span class="ps-card-tag">${__("In use")}</span>
		</button>`;
	}

	panel_themes() {
		const is_dark = (p) => prism.luminance(p.background_color || "#ffffff") < 0.2;
		const presets = this.state.presets.filter(
			(p) => this.filter === "all" || (this.filter === "dark" ? is_dark(p) : !is_dark(p))
		);
		const seg = (id, label) => `<button type="button" data-filter="${id}" aria-pressed="${this.filter === id}">${label}</button>`;
		const assigned = this.state.assigned_users
			? `<p class="ps-note">${__("{0} users have their own theme through Theme Assignments and won't change.", [this.state.assigned_users])}</p>`
			: "";
		return `<div class="ps-panel-head">
				<h2>${__("Choose a theme")}</h2>
				<div class="ps-seg ps-filter">${seg("all", __("All"))}${seg("light", __("Light"))}${seg("dark", __("Dark"))}</div>
			</div>
			<div class="ps-theme-grid">${presets.map((p) => this.theme_card(p)).join("")}</div>
			${assigned}`;
	}

	panel_colours() {
		return `<div class="ps-panel-head"><h2>${__("Colours")}</h2></div>
			${this.color_row("primary_color", __("Accent"), __("Buttons, links and highlights"), "droplet")}
			<div class="ps-gradient-on">${this.color_row("gradient_end_color", __("Accent gradient end"), `<a class="ps-clear-gradient">${__("Remove gradient")}</a>`, "blend")}</div>
			<div class="ps-gradient-off">${this.row("blend", __("Accent gradient"), __("Blend the accent into a second colour"), `<button type="button" class="ps-btn ps-add-gradient">${__("Add")}</button>`)}</div>
			${this.color_row("navbar_color", __("Header"), __("The bar across the top of each page"), "panel-top")}
			${this.color_row("sidebar_color", __("Sidebar"), __("The module menu and icon rail"), "panel-left")}
			${this.color_row("background_color", __("Page"), __("Also decides light or dark mode"), "square")}
			${this.color_row("text_color", __("Text"), __("Body text on the page"), "baseline")}
			${this.block("panel-left", __("Sidebar style"), "", this.choices("menu_style", "Theme Color"))}
			<div class="ps-panel-head ps-panel-sub"><h2>${__("Readability")}</h2></div>
			<div class="ps-checks"></div>`;
	}

	panel_type() {
		const fonts = Object.keys(prism.FONT_STACKS);
		return `<div class="ps-panel-head"><h2>${__("Type")}</h2></div>
			<div class="ps-font-sample">
				<strong>${__("March salary slips are ready")}</strong>
				<span>${__("336 employees across 40 branches")}</span>
				<span dir="rtl" lang="ar">قسائم رواتب شهر مارس جاهزة</span>
			</div>
			<div class="ps-font-list">
				${fonts.map((f) => `<button type="button" class="ps-font" data-val="${frappe.utils.escape_html(f)}">${frappe.utils.escape_html(f)}${frappe.utils.icon("check", "xs")}</button>`).join("")}
			</div>`;
	}

	panel_shapes() {
		return `<div class="ps-panel-head"><h2>${__("Shapes and motion")}</h2></div>
			${this.block("square", __("Roundness"), __("Fields, buttons and cards"), this.choices("field_radius", "Rounded"))}
			${this.block("mouse-pointer-click", __("Primary buttons"), "", this.choices("button_style", "Solid"))}
			${this.block("sparkles", __("Button hover"), "", this.choices("hover_effect", "Lift"))}
			${this.block("text-cursor-input", __("Fields"), "", this.choices("field_style", "Outlined"))}
			${this.block("scissors", __("Corner cut"), "", this.choices("corner_style", "Default"))}
			${this.block("square-check", __("Checkboxes"), "", this.choices("checkbox_style", "Default"))}
			${this.block("shapes", __("Icons"), "", this.choices("icon_style", "Outline"))}`;
	}

	range(field, fallback, hint) {
		return `<div class="ps-range-wrap">
			<input type="range" class="ps-range" data-field="${field}" data-default="${fallback}" min="0" max="100" step="5">
			<span class="ps-range-value"></span>
		</div><small class="ps-hint">${hint}</small>`;
	}

	panel_desktop() {
		return `<div class="ps-panel-head"><h2>${__("Desktop")}</h2></div>
			${this.block("wallpaper", __("Page background"), "", this.choices("background_style", "Solid"))}
			${this.block(
				"image",
				__("Background image"),
				__("Shown behind the app icons on the home screen"),
				`<div class="ps-image-preview"></div>
				<div class="ps-inline">
					<button type="button" class="ps-btn ps-upload">${__("Upload image")}</button>
					<button type="button" class="ps-btn ps-remove-image">${__("Remove")}</button>
				</div>`
			)}
			<div class="ps-overlay-row">${this.block("layers", __("Image wash"), "", this.range("desktop_bg_overlay_opacity", 40, __("40% keeps most photos readable")))}</div>
			${this.block("blend", __("Glass strength"), __("For Glass buttons, fields and sidebar"), this.range("glass_opacity", 65, __("65% keeps text readable over the blur")))}
			${this.block("layout-grid", __("Apps on the home screen"), __("Turn off what this theme should hide"), `<div class="ps-icon-grid"></div>`)}`;
	}

	panel_apps() {
		const apps = this.state.apps;
		const rows = (this.draft.app_color_overrides || []).map(
			(row, idx) => `<div class="ps-app-row" data-idx="${idx}">
				<select aria-label="${__("App")}">
					<option value="">${__("Choose an app")}</option>
					${apps.map((a) => `<option value="${a.name}" ${row.app === a.name ? "selected" : ""}>${frappe.utils.escape_html(a.title)}</option>`).join("")}
				</select>
				<label title="${__("Accent")}"><input type="color" data-key="primary_color" value="${this.to_hex(row.primary_color || this.draft.primary_color)}"><small>${__("Accent")}</small></label>
				<label title="${__("Header")}"><input type="color" data-key="navbar_color" value="${this.to_hex(row.navbar_color || this.draft.navbar_color)}"><small>${__("Header")}</small></label>
				<label title="${__("Sidebar")}"><input type="color" data-key="sidebar_color" value="${this.to_hex(row.sidebar_color || this.draft.sidebar_color)}"><small>${__("Sidebar")}</small></label>
				<button type="button" class="ps-remove-app ps-icon-btn" data-idx="${idx}" aria-label="${__("Remove")}">${frappe.utils.icon("x", "sm")}</button>
			</div>`
		);
		return `<div class="ps-panel-head"><h2>${__("App colours")}</h2></div>
			<p class="ps-note">${__("Give an app its own colours. Desk switches to them as you move into that app.")}</p>
			${rows.join("") || `<p class="ps-empty">${__("No app has its own colours yet.")}</p>`}
			<button type="button" class="ps-btn ps-add-app">${frappe.utils.icon("plus", "sm")}${__("Add an app")}</button>`;
	}

	panel_login() {
		const tiles = prism.STUDIO_OPTIONS.login_style
			.map(
				(v) => `<button type="button" data-val="${v}" class="ps-login-tile ps-lt-${frappe.scrub(v)}">
					<span class="ps-lt-art"><i></i></span><span>${__(v)}</span></button>`
			)
			.join("");
		return `<div class="ps-panel-head"><h2>${__("Login page")}</h2></div>
			<div class="ps-login-grid" data-choice-field="login_style" data-default="Centered Card">${tiles}</div>
			<p class="ps-note">${__("Sign-out and error pages follow this theme too. The real page updates when you apply the theme.")}</p>`;
	}

	render_mock() {
		const views = { list: () => this.mock_list(), form: () => this.mock_form(), login: () => this.mock_login() };
		const $mock = this.$root.find(".ps-mock");
		$mock.html(views[this.mock_view]());
		this.$root.find(".ps-mock-views button").each((_, el) => el.setAttribute("aria-pressed", el.dataset.view === this.mock_view));
	}

	mock_shell(title, actions, body) {
		const items = [
			["users", __("Employees"), true],
			["calendar-check", __("Attendance")],
			["banknote", __("Payroll")],
			["file-text", __("Documents")],
			["chart-column", __("Reports")],
		];
		return `<div class="ps-mock-desk">
			<div class="ps-mock-side">
				<div class="ps-mock-brand"><span class="ps-mock-logo"></span>${__("People")}</div>
				${items.map(([icon, label, on]) => `<div class="ps-mock-item ${on ? "on" : ""}">${frappe.utils.icon(icon, "sm")}<span>${label}</span></div>`).join("")}
			</div>
			<div class="ps-mock-main">
				<div class="ps-mock-head"><b>${title}</b><div class="ps-mock-actions">${actions}</div></div>
				<div class="ps-mock-body">${body}</div>
			</div>
		</div>`;
	}

	mock_list() {
		const rows = [
			[__("Layla Al-Harbi"), __("Active"), "green", __("Riyadh"), __("Accountant")],
			[__("Noor Rahman"), __("Active"), "green", __("Jeddah"), __("Site supervisor")],
			[__("Daniel Cruz"), __("On leave"), "orange", __("Dammam"), __("Technician")],
			[__("Hana Yusuf"), __("Active"), "green", __("Riyadh"), __("HR officer")],
			[__("Omar Saleh"), __("Left"), "red", __("Jeddah"), __("Driver")],
		];
		return this.mock_shell(
			__("Employees"),
			`<button type="button" class="btn btn-default btn-sm">${__("Filter")}</button>
			<button type="button" class="btn btn-primary btn-sm">${__("Add employee")}</button>`,
			`<div class="ps-mock-table">
				<div class="ps-mock-tr ps-mock-th"><span>${__("Name")}</span><span>${__("Status")}</span><span>${__("Branch")}</span><span>${__("Role")}</span></div>
				${rows.map((r) => `<div class="ps-mock-tr"><span class="ps-mock-strong"><input type="checkbox" tabindex="-1">${r[0]}</span><span><span class="indicator-pill ${r[2]}">${r[1]}</span></span><span>${r[3]}</span><span>${r[4]}</span></div>`).join("")}
			</div>`
		);
	}

	mock_form() {
		const field = (label, value, disabled) => `<label class="ps-mock-field"><span>${label}</span>
			<input type="text" class="form-control" value="${value}" tabindex="-1" ${disabled ? "disabled" : ""}></label>`;
		return this.mock_shell(
			__("Layla Al-Harbi"),
			`<button type="button" class="btn btn-default btn-sm">${__("Print")}</button>
			<button type="button" class="btn btn-primary btn-sm">${__("Save")}</button>`,
			`<div class="ps-mock-formcard">
				<div class="ps-mock-tabs"><span class="on">${__("Details")}</span><span>${__("Documents")}</span><span>${__("Salary")}</span></div>
				<div class="ps-mock-grid">
					${field(__("First name"), __("Layla"))}
					${field(__("Last name"), __("Al-Harbi"))}
					${field(__("Employee ID"), "EMP-0042", true)}
					${field(__("Branch"), __("Riyadh"))}
				</div>
				<label class="ps-mock-check"><input type="checkbox" checked tabindex="-1">${__("Send a welcome email")}</label>
			</div>`
		);
	}

	mock_login() {
		const style = frappe.scrub(this.draft.login_style || "Centered Card");
		return `<div class="ps-mock-login ps-ml-${style}">
			<div class="ps-mock-login-card">
				<span class="ps-mock-login-logo"></span>
				<strong>${__("Sign in")}</strong>
				<input type="text" class="form-control" value="you@company.com" tabindex="-1">
				<input type="password" class="form-control" value="password" tabindex="-1">
				<button type="button" class="btn btn-primary">${__("Continue")}</button>
			</div>
		</div>`;
	}

	// -- Readability ----------------------------------------------------------

	contrast_checks() {
		const d = this.draft;
		const on_primary = prism.best_on(d.primary_color, d.gradient_end_color);
		const worst_button = Math.min(
			prism.contrast_ratio(on_primary, d.primary_color),
			prism.contrast_ratio(on_primary, d.gradient_end_color || d.primary_color)
		);
		return [
			{ key: "text_color", label: __("Text on the page"), ratio: prism.contrast_ratio(d.text_color, d.background_color) },
			{ key: "primary_color", label: __("Text on accent buttons"), ratio: worst_button },
		];
	}

	render_checks() {
		const $checks = this.$panel().find(".ps-checks");
		if (!$checks.length) return;
		$checks.html(
			this.contrast_checks()
				.map((check) => {
					const pass = check.ratio >= 4.5;
					return `<div class="ps-check ${pass ? "" : "is-low"}">
						<span>${check.label}</span>
						<b>${check.ratio.toFixed(2)}:1</b>
						${pass ? `<em>${__("Passes AA")}</em>` : `<button type="button" class="ps-btn ps-fix" data-key="${check.key}">${__("Fix")}</button>`}
					</div>`;
				})
				.join("")
		);
	}

	fix_check(key) {
		const d = this.draft;
		if (key === "text_color") {
			this.set("text_color", prism.fix_contrast(d.text_color, d.background_color, 4.5));
		} else {
			// Darken or lighten the accent until the better of white/black passes.
			const ink = prism.best_on(d.primary_color, d.gradient_end_color);
			this.draft.primary_color = prism.fix_contrast(d.primary_color, ink, 4.5);
			if (d.gradient_end_color) this.draft.gradient_end_color = prism.fix_contrast(d.gradient_end_color, ink, 4.5);
			this.preview();
			this.sync();
		}
	}

	// -- Desktop / apps --------------------------------------------------------

	upload_image() {
		new frappe.ui.FileUploader({
			folder: "Home/Attachments",
			restrictions: { allowed_file_types: ["image/*"] },
			on_success: (file) => this.set("desktop_bg_image", file.file_url),
		});
	}

	load_icons() {
		frappe.call("prism.api.get_desktop_icons").then((r) => {
			const hidden = new Set(this.draft.hidden_desktop_icons || []);
			this.$panel()
				.find(".ps-icon-grid")
				.html(
					(r.message || [])
						.map(
							(icon) => `<label class="ps-icon-row">
								<span>${frappe.utils.escape_html(__(icon.label || icon.name))}</span>
								<span class="ps-switch"><input type="checkbox" class="ps-icon-toggle" data-icon="${frappe.utils.escape_html(icon.name)}" ${hidden.has(icon.name) ? "" : "checked"}><i></i></span>
							</label>`
						)
						.join("")
				);
		});
	}

	read_hidden_icons() {
		const hidden = [];
		this.$panel()
			.find(".ps-icon-toggle")
			.each((_, el) => {
				if (!el.checked) hidden.push(el.getAttribute("data-icon"));
			});
		this.draft.hidden_desktop_icons = hidden;
		this.sync();
	}

	add_app_override() {
		this.draft.app_color_overrides = this.draft.app_color_overrides || [];
		this.draft.app_color_overrides.push({
			app: "",
			primary_color: this.draft.primary_color,
			navbar_color: this.draft.navbar_color,
			sidebar_color: this.draft.sidebar_color,
			gradient_end_color: null,
		});
		this.render_panel();
		this.sync();
	}

	read_app_overrides() {
		this.draft.app_color_overrides = this.$panel()
			.find(".ps-app-row")
			.toArray()
			.map((row) => ({
				app: row.querySelector("select").value,
				primary_color: row.querySelector('[data-key="primary_color"]').value,
				navbar_color: row.querySelector('[data-key="navbar_color"]').value,
				sidebar_color: row.querySelector('[data-key="sidebar_color"]').value,
				gradient_end_color: null,
			}));
		this.sync();
	}

	// -- Actions ---------------------------------------------------------------

	store(preset) {
		const idx = this.state.presets.findIndex((p) => p.name === preset.name);
		if (idx >= 0) this.state.presets[idx] = preset;
		else this.state.presets.push(preset);
		this.state.presets.sort((a, b) => a.theme_name.localeCompare(b.theme_name));
		this.selected = preset;
		this.draft = JSON.parse(JSON.stringify(preset));
	}

	save() {
		const values = this.changes();
		const was_live = this.is_live();
		return frappe
			.call({
				method: "prism.api.save_preset",
				args: { theme: this.selected.name, values },
				freeze: true,
			})
			.then((r) => {
				this.store(r.message);
				if (was_live) return this.refresh_live_theme();
			})
			.then(() => {
				this.render();
				this.toast(__("Saved {0}", [frappe.utils.escape_html(this.selected.theme_name)]));
			});
	}

	refresh_live_theme() {
		return frappe.call("prism.api.set_default_theme", { theme: this.selected.name }).then((r) => this.adopt(r.message));
	}

	adopt(theme) {
		prism.base_theme = theme;
		if (frappe.boot) frappe.boot.prism_theme = theme;
		prism.settings = prism.settings || {};
		if (theme) {
			prism.watch_color_mode();
			if (Object.keys(theme.app_overrides || {}).length) prism.watch_app_overrides();
		}
	}

	primary_action() {
		const previous = this.state.enabled ? this.state.default_theme : null;
		const name = this.selected.name;
		const push = this.changed_fields().length
			? frappe.call({ method: "prism.api.save_preset", args: { theme: name, values: this.changes() } }).then((r) => this.store(r.message))
			: Promise.resolve();
		push.then(() => frappe.call({ method: "prism.api.set_default_theme", args: { theme: name }, freeze: true })).then((r) => {
			this.adopt(r.message);
			this.state.enabled = 1;
			this.state.default_theme = name;
			this.render();
			this.toast(__("{0} is now on for everyone", [frappe.utils.escape_html(name)]), previous && previous !== name ? () => this.undo_to(previous) : null);
		});
	}

	undo_to(name) {
		frappe.call("prism.api.set_default_theme", { theme: name }).then((r) => {
			this.adopt(r.message);
			this.state.default_theme = name;
			this.select(this.state.presets.find((p) => p.name === name));
			this.toast(__("Back to {0}", [frappe.utils.escape_html(name)]));
		});
	}

	set_power(enabled) {
		frappe.call("prism.api.set_theming_enabled", { enabled: enabled ? 1 : 0 }).then((r) => {
			this.state.enabled = enabled ? 1 : 0;
			this.adopt(r.message);
			this.sync();
			this.toast(enabled ? __("Prism is on for everyone") : __("Prism is off. Desk is back to its standard look."));
		});
	}

	prompt_save_as() {
		frappe.prompt(
			{ fieldname: "theme_name", label: __("Theme name"), fieldtype: "Data", reqd: 1, default: __("{0} copy", [this.selected.theme_name]) },
			({ theme_name }) => {
				frappe
					.call({
						method: "prism.api.duplicate_preset",
						args: { theme: this.selected.name, theme_name, values: this.changes() },
						freeze: true,
					})
					.then((r) => {
						// the original goes back to how it was saved; only the copy has the edits
						this.store(r.message);
						this.render();
						this.toast(__("Saved as {0}", [frappe.utils.escape_html(theme_name)]));
					});
			},
			__("Save as new theme"),
			__("Save")
		);
	}

	delete_selected() {
		const name = this.selected.name;
		frappe.confirm(__("Delete {0}? This can't be undone.", [frappe.utils.escape_html(name)]), () => {
			frappe.call({ method: "prism.api.delete_preset", args: { theme: name }, freeze: true }).then(() => {
				this.selected = null;
				this.load(this.state.default_theme);
				this.toast(__("Deleted {0}", [frappe.utils.escape_html(name)]));
			});
		});
	}

	toast(message, undo) {
		const $toast = this.$root.find(".ps-toast");
		$toast.html(
			`${frappe.utils.icon("check", "sm")}<span>${message}</span>${undo ? `<button type="button" class="ps-toast-undo">${__("Undo")}</button>` : ""}`
		);
		$toast.prop("hidden", false);
		clearTimeout(this.toast_timer);
		if (undo) {
			$toast.find(".ps-toast-undo").on("click", () => {
				$toast.prop("hidden", true);
				undo();
			});
		}
		this.toast_timer = setTimeout(() => $toast.prop("hidden", true), undo ? 8000 : 3500);
	}

	to_hex(color) {
		if (!color) return "#000000";
		const { r, g, b } = prism.hex_to_rgb(color);
		return prism.rgb_to_hex(r, g, b);
	}
};
