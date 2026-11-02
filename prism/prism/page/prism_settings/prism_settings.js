frappe.pages["prism-settings"].on_page_load = function (wrapper) {
	const ui = prism.ui.make_page(wrapper, {
		title: __("Settings"),
		list_label: __("Open settings form"),
		list_route: "Form/Theme Settings",
	});
	wrapper.settings_page = new prism.SettingsPage(ui);
};
frappe.pages["prism-settings"].on_page_show = function (wrapper) {
	if (wrapper.settings_page) wrapper.settings_page.load();
};

prism.SettingsPage = class SettingsPage {
	constructor(ui) {
		Object.assign(this, ui);
		this.bind();
		this.load();
	}

	bind() {
		this.$body.on("change", ".ps-power-input", (e) => this.set_power(e.target.checked));
		this.$body.on("change", ".ps-default-theme", (e) => this.set_default(e.target.value));
		this.$body.on("change", ".ps-setting", (e) => {
			const field = e.target.dataset.field;
			const value = e.target.type === "checkbox" ? (e.target.checked ? 1 : 0) : e.target.value;
			frappe
				.call({ method: "prism.api.save_settings", args: { values: { [field]: value } } })
				.then(() => prism.ui.toast(this.$root, __("Saved. Users get this the next time a page loads.")));
		});
		this.$body.on("click", ".ps-open-studio", () => frappe.set_route("theme-studio"));
		this.$body.on("click", ".ps-open-login", () => window.open("/login", "_blank", "noopener"));
		this.$body.on("click", ".ps-refresh", () =>
			frappe.call("prism.api.refresh_everyone").then(() => prism.ui.toast(this.$root, __("Everyone gets the current theme the next time a page loads.")))
		);
		this.$body.on("click", ".ps-clear-individual", () => {
			frappe.confirm(__("Send everyone with an individually set theme back to the default? Assignments aren't affected."), () =>
				frappe.call("prism.api.remove_individual_themes").then((r) => {
					prism.ui.toast(this.$root, __("{0} users moved back to the default", [r.message]));
					this.load();
				})
			);
		});
	}

	load() {
		return frappe.call("prism.api.get_settings_state").then((r) => {
			this.state = r.message;
			this.settings = r.message;
			return frappe.db.get_doc("Theme Settings").then((doc) => {
				this.doc = doc;
				this.render();
			});
		});
	}

	render() {
		const s = this.state;
		const failing = s.presets.filter((p) => prism.ui.readability(p) < 4.5).length;
		this.$stats.html(
			prism.ui.stat(s.enabled ? "check" : "circle-off", s.enabled ? __("On") : __("Off"), __("Prism for everyone")) +
				prism.ui.stat("swatch-book", frappe.utils.escape_html(s.default_theme || __("None")), __("Default theme")) +
				prism.ui.stat("users", s.desk_users, __("Desk users"))
		);
		const options = (selected, empty) =>
			(empty ? `<option value="">${empty}</option>` : "") +
			s.presets.map((p) => `<option value="${frappe.utils.escape_html(p.name)}" ${p.name === selected ? "selected" : ""}>${frappe.utils.escape_html(p.theme_name)}</option>`).join("");
		const row = (icon, title, sub, control) => `<div class="ps-row">
			<span class="ps-row-icon">${frappe.utils.icon(icon, "sm")}</span>
			<div class="ps-row-text"><b>${title}</b><small>${sub}</small></div>
			<div class="ps-row-control">${control}</div>
		</div>`;
		const check = (field) => `<span class="ps-switch"><input type="checkbox" class="ps-setting" data-field="${field}" aria-label="${field}" ${this.doc[field] ? "checked" : ""}><i></i></span>`;
		const fact = (label, value) => `<div class="ps-fact"><span>${label}</span><b>${value}</b></div>`;
		const preset = s.presets.find((p) => p.name === s.default_theme) || {};

		this.$body.html(`<div class="ps-settings">
			<section>
				<h2>${__("Theme for everyone")}</h2>
				${row("power", __("Prism"), __("Off puts every user back on Frappe's standard look. Nothing is deleted."), `<span class="ps-switch"><input type="checkbox" class="ps-power-input" aria-label="${__("Prism")}" ${s.enabled ? "checked" : ""}><i></i></span>`)}
				<div class="ps-default-preview">${prism.ui.thumb(preset)}
					<label class="ps-field" style="flex:1;min-width:0">${__("Default theme")}<select class="ps-input ps-default-theme">${options(s.default_theme)}</select></label>
				</div>
				<div class="ps-form-actions" style="justify-content:flex-start">
					<button type="button" class="ps-btn ps-open-studio">${__("Open Theme Studio")}</button>
					<button type="button" class="ps-btn ps-open-login">${__("View login page")}</button>
				</div>
			</section>
			<section>
				<h2>${__("What users can do")}</h2>
				${row("toggle-right", __("Turn Prism on or off for themselves"), __("Adds the option to Settings, Appearance."), check("allow_user_toggle"))}
				${row("eye", __("Show the switch in the sidebar and home screen"), __("Makes that option one click away."), check("show_toggle_button"))}
				${row("palette", __("Pick their own theme"), __("Appears in Settings, Appearance. Assigned users keep their assignment."), check("allow_user_choice"))}
			</section>
			<section>
				<h2>${__("Light and dark")}</h2>
				<p class="ps-note">${__("Follow each person's Light, Dark or Automatic choice in Settings, Appearance by giving dark mode its own theme.")}</p>
				<label class="ps-field">${__("Theme for dark mode")}
					<select class="ps-input ps-setting" data-field="dark_companion_theme">${options(this.doc.dark_companion_theme, __("None, the default theme decides"))}</select>
				</label>
			</section>
			<section>
				<h2>${__("Maintenance")}</h2>
				${row("refresh-cw", __("Refresh everyone's theme"), __("Use this if someone still sees an old theme."), `<button type="button" class="ps-btn ps-refresh">${__("Refresh")}</button>`)}
				${row("user-x", __("Clear individual themes"), __("{0} users have one set.", [s.individual]), `<button type="button" class="ps-btn ps-clear-individual" ${s.individual ? "" : "disabled"}>${__("Clear")}</button>`)}
			</section>
			<section>
				<h2>${__("About this install")}</h2>
				${fact(__("Prism version"), frappe.utils.escape_html(s.prism_version))}
				${fact(__("Frappe version"), frappe.utils.escape_html(s.frappe_version))}
				${fact(__("Themes"), s.presets.length)}
				${fact(__("Themes below AA contrast"), failing)}
				${fact(__("Theme assignments"), s.assignments)}
				${fact(__("Users with their own theme"), s.assigned_users)}
			</section>
		</div>`);
	}

	adopt(theme) {
		prism.base_theme = theme;
		frappe.boot.prism_theme = theme;
		if (prism.is_on()) prism.apply_theme(prism.current_theme());
		else prism.clear_theme();
	}

	set_power(on) {
		frappe.call("prism.api.set_theming_enabled", { enabled: on ? 1 : 0 }).then((r) => {
			this.adopt(r.message);
			this.load().then(() => prism.ui.toast(this.$root, on ? __("Prism is on for everyone") : __("Prism is off. Desk is back to its standard look.")));
		});
	}

	set_default(theme) {
		const previous = this.state.default_theme;
		frappe.call("prism.api.set_default_theme", { theme }).then((r) => {
			this.adopt(r.message);
			this.load().then(() =>
				prism.ui.toast(this.$root, __("{0} is now on for everyone", [frappe.utils.escape_html(theme)]), () => this.set_default(previous))
			);
		});
	}
};
