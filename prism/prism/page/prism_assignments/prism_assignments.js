frappe.pages["prism-assignments"].on_page_load = function (wrapper) {
	const ui = prism.ui.make_page(wrapper, {
		title: __("Theme Assignments"),
		list_label: __("Open list"),
		list_route: "List/Prism Theme Assignment",
	});
	wrapper.assign_page = new prism.AssignmentsPage(ui);
};

prism.AssignmentsPage = class AssignmentsPage {
	constructor(ui) {
		Object.assign(this, ui);
		this.search = "";
		this.$actions.html(`<button type="button" class="ps-btn ps-btn-primary ps-new">${frappe.utils.icon("plus", "sm")}${__("New assignment")}</button>`);
		this.$body.html(`<div class="ps-split"><aside class="ps-assign-list"></aside><section class="ps-assign-editor"></section></div>`);
		this.bind();
		this.load();
	}

	bind() {
		this.$actions.find(".ps-new").on("click", () => this.edit(null));
		const $b = this.$body;
		$b.on("click", ".ps-assign-item", (e) => this.edit(this.data.assignments.find((a) => a.name === e.currentTarget.dataset.name)));
		$b.on("input", ".ps-f-title", (e) => (this.draft.title = e.target.value));
		$b.on("change", ".ps-f-theme", (e) => {
			this.draft.theme_preset = e.target.value;
			this.render_theme_preview();
		});
		$b.on("change", ".ps-f-override", (e) => (this.draft[e.target.dataset.field] = e.target.value || null));
		$b.on("input", ".ps-f-navbar", (e) => (this.draft.navbar_color = e.target.value));
		$b.on("change", ".ps-f-navbar-on", (e) => {
			this.draft.navbar_color = e.target.checked ? this.draft.navbar_color || "#1a1f24" : null;
			$b.find(".ps-f-navbar").prop("disabled", !e.target.checked).val(this.draft.navbar_color || "#1a1f24");
		});
		$b.on("input", ".ps-user-search", (e) => {
			this.search = e.target.value.toLowerCase();
			this.render_users();
		});
		$b.on("change", ".ps-user-check", (e) => {
			const users = new Set(this.draft.users);
			if (e.target.checked) users.add(e.target.value);
			else users.delete(e.target.value);
			this.draft.users = [...users];
			this.render_user_count();
		});
		$b.on("click", ".ps-select-shown", () => {
			const users = new Set(this.draft.users);
			this.visible_users().forEach((u) => users.add(u.name));
			this.draft.users = [...users];
			this.render_users();
		});
		$b.on("click", ".ps-clear-users", () => {
			this.draft.users = [];
			this.render_users();
		});
		$b.on("click", ".ps-save-assignment", () => this.save());
		$b.on("click", ".ps-delete-assignment", () => this.remove());
	}

	load(select) {
		return frappe.call("prism.api.get_assignments").then((r) => {
			this.data = r.message;
			this.render_stats();
			this.render_list();
			const wanted = select ?? this.draft?.name;
			this.edit(this.data.assignments.find((a) => a.name === wanted) || this.data.assignments[0] || null);
		});
	}

	render_stats() {
		const assigned = new Set(this.data.assignments.flatMap((a) => a.users));
		this.$stats.html(
			prism.ui.stat("users", this.data.assignments.length, __("Assignments")) +
				prism.ui.stat("user-check", assigned.size, __("Users assigned")) +
				prism.ui.stat("user", this.data.users.length - assigned.size, __("On default or their own theme"))
		);
	}

	preset(name) {
		return this.data.presets.find((p) => p.name === name);
	}

	render_list() {
		const selected = this.draft && this.draft.name;
		const items = this.data.assignments.map((a) => {
			const preset = this.preset(a.theme_preset) || {};
			return `<button type="button" class="ps-assign-item" data-name="${frappe.utils.escape_html(a.name)}" aria-pressed="${a.name === selected}">
				${prism.ui.thumb(preset)}
				<span class="ps-assign-text">
					<b>${frappe.utils.escape_html(a.title)}</b>
					<small>${frappe.utils.escape_html(a.theme_preset)}</small>
					<small>${a.users.length === 1 ? __("1 user") : __("{0} users", [a.users.length])}</small>
				</span>
			</button>`;
		});
		this.$body
			.find(".ps-assign-list")
			.html(`<h2 class="ps-list-title">${__("Assignments")}</h2>` + (items.join("") || `<p class="ps-empty">${__("No assignments yet. Create one to give a team its own theme.")}</p>`));
	}

	edit(assignment) {
		this.search = "";
		this.draft = assignment
			? JSON.parse(JSON.stringify(assignment))
			: { name: null, title: "", theme_preset: this.data.presets[0] && this.data.presets[0].name, users: [] };
		this.render_list();
		const override = (field, label) => `<label class="ps-field">${label}
			<select class="ps-input ps-f-override" data-field="${field}">
				<option value="">${__("Same as the theme")}</option>
				${prism.STUDIO_OPTIONS[field].map((v) => `<option value="${v}" ${this.draft[field] === v ? "selected" : ""}>${__(v)}</option>`).join("")}
			</select></label>`;
		this.$body.find(".ps-assign-editor").html(`
			<h2>${assignment ? __("Edit assignment") : __("New assignment")}</h2>
			<p class="ps-note">${__("Everyone you add sees this theme instead of the default. A user can only be in one assignment, so adding them here moves them.")}</p>
			<div class="ps-form-grid">
				<label class="ps-field">${__("Name")}<input type="text" class="ps-input ps-f-title" value="${frappe.utils.escape_html(this.draft.title)}" placeholder="${__("Finance team")}"></label>
				<label class="ps-field">${__("Theme")}
					<select class="ps-input ps-f-theme">
						${this.data.presets.map((p) => `<option value="${frappe.utils.escape_html(p.name)}" ${p.name === this.draft.theme_preset ? "selected" : ""}>${frappe.utils.escape_html(p.theme_name)}</option>`).join("")}
					</select>
				</label>
			</div>
			<div class="ps-assign-preview"></div>
			<div class="ps-section-title"><div><h2>${__("Adjust for this group")}</h2><small>${__("Optional. Anything left alone comes from the theme.")}</small></div></div>
			<div class="ps-form-grid">
				${override("menu_style", __("Sidebar style"))}
				${override("button_style", __("Primary buttons"))}
				${override("hover_effect", __("Button hover"))}
				${override("field_style", __("Fields"))}
				<label class="ps-field">${__("Header colour")}
					<span class="ps-inline" style="align-items:center">
						<span class="ps-switch"><input type="checkbox" class="ps-f-navbar-on" aria-label="${__("Use a different header colour")}" ${this.draft.navbar_color ? "checked" : ""}><i></i></span>
						<input type="color" class="ps-f-navbar" aria-label="${__("Header colour")}" value="${this.draft.navbar_color || "#1a1f24"}" ${this.draft.navbar_color ? "" : "disabled"}>
					</span>
				</label>
			</div>
			<div class="ps-section-title">
				<div><h2>${__("Users")} <span class="ps-tag ps-user-count"></span></h2></div>
				<div class="ps-inline">
					<button type="button" class="ps-btn ps-select-shown">${__("Select shown")}</button>
					<button type="button" class="ps-btn ps-clear-users">${__("Clear")}</button>
				</div>
			</div>
			<label class="ps-search" style="max-width:none">${frappe.utils.icon("search", "sm")}<input type="search" class="ps-user-search" placeholder="${__("Search users")}" aria-label="${__("Search users")}"></label>
			<div class="ps-user-pick"></div>
			<div class="ps-form-actions">
				${assignment ? `<button type="button" class="ps-btn ps-btn-danger ps-delete-assignment">${__("Delete")}</button>` : ""}
				<span class="ps-spacer"></span>
				<button type="button" class="ps-btn ps-btn-primary ps-save-assignment">${assignment ? __("Save changes") : __("Create assignment")}</button>
			</div>
		`);
		this.render_theme_preview();
		this.render_users();
	}

	render_theme_preview() {
		const preset = this.preset(this.draft.theme_preset);
		if (!preset) return;
		this.$body.find(".ps-assign-preview").html(`<div class="ps-default-preview">${prism.ui.thumb(preset)}
			<small class="ps-hint">${frappe.utils.escape_html(preset.font_family || "Inter")}, ${__("contrast {0}:1", [prism.ui.readability(preset).toFixed(1)])}</small></div>`);
	}

	visible_users() {
		return this.data.users.filter(
			(u) => !this.search || (u.full_name || "").toLowerCase().includes(this.search) || u.name.toLowerCase().includes(this.search)
		);
	}

	current_of(user) {
		const elsewhere = this.data.assignments.find((a) => a.name !== this.draft.name && a.users.includes(user));
		if (elsewhere) return __("Now in {0}, will move here", [frappe.utils.escape_html(elsewhere.title)]);
		return frappe.utils.escape_html(user);
	}

	render_users() {
		const chosen = new Set(this.draft.users);
		this.$body.find(".ps-user-pick").html(
			this.visible_users()
				.map(
					(u) => `<label class="ps-user-row">
						<input type="checkbox" class="ps-user-check" value="${frappe.utils.escape_html(u.name)}" ${chosen.has(u.name) ? "checked" : ""}>
						${prism.ui.avatar(u)}
						<span class="ps-user-text"><b>${frappe.utils.escape_html(u.full_name || u.name)}</b><small>${this.current_of(u.name)}</small></span>
					</label>`
				)
				.join("") || `<p class="ps-empty">${__("No users match this search.")}</p>`
		);
		this.render_user_count();
	}

	render_user_count() {
		this.$body.find(".ps-user-count").text(this.draft.users.length);
	}

	save() {
		const values = Object.assign({}, this.draft);
		frappe
			.call({ method: "prism.api.save_assignment", args: { name: this.draft.name, values }, freeze: true })
			.then((r) => this.load(r.message))
			.then(() => prism.ui.toast(this.$root, __("Saved {0}", [frappe.utils.escape_html(values.title)])));
	}

	remove() {
		const name = this.draft.name;
		frappe.confirm(__("Delete {0}? Its users go back to the default theme.", [frappe.utils.escape_html(name)]), () => {
			frappe.call({ method: "prism.api.delete_assignment", args: { name }, freeze: true }).then(() => {
				this.draft = null;
				this.load().then(() => prism.ui.toast(this.$root, __("Deleted {0}", [frappe.utils.escape_html(name)])));
			});
		});
	}
};
