frappe.pages["prism-users"].on_page_load = function (wrapper) {
	const ui = prism.ui.make_page(wrapper, {
		title: __("User Themes"),
		list_label: __("Open list"),
		list_route: "List/Prism User Theme",
	});
	wrapper.users_page = new prism.UsersPage(ui);
};
frappe.pages["prism-users"].on_page_show = function (wrapper) {
	if (wrapper.users_page) wrapper.users_page.load();
};

prism.UsersPage = class UsersPage {
	constructor(ui) {
		Object.assign(this, ui);
		this.search = "";
		this.filter = "all";
		this.$body.html(`
			<div class="ps-toolbar">
				<label class="ps-search">${frappe.utils.icon("search", "sm")}<input type="search" placeholder="${__("Search users")}" aria-label="${__("Search users")}"></label>
				<div class="ps-seg ps-filter"></div>
			</div>
			<div class="ps-table-card">
				<table class="ps-table">
					<thead><tr><th>${__("User")}</th><th>${__("Sees")}</th><th>${__("Why")}</th><th>${__("Adjustments")}</th><th>${__("Change")}</th></tr></thead>
					<tbody></tbody>
				</table>
			</div>
		`);
		this.$body.find(".ps-search input").on("input", (e) => {
			this.search = e.target.value.toLowerCase();
			this.render_rows();
		});
		this.$body.on("click", ".ps-filter button", (e) => {
			this.filter = e.currentTarget.dataset.filter;
			this.render_rows();
		});
		this.$body.on("change", ".ps-user-theme", (e) => this.change(e.target.dataset.user, e.target.value));
		this.load();
	}

	load() {
		return frappe.call("prism.api.get_user_themes").then((r) => {
			this.data = r.message;
			const count = (s) => this.data.users.filter((u) => u.source === s).length;
			this.$stats.html(
				prism.ui.stat("users", this.data.users.length, __("Desk users")) +
					prism.ui.stat("globe", count("default"), __("On the default")) +
					prism.ui.stat("users-round", count("assignment"), __("By assignment")) +
					prism.ui.stat("user", count("individual"), __("Their own"))
			);
			this.render_rows();
		});
	}

	render_rows() {
		const labels = { all: __("All"), default: __("Default"), assignment: __("Assignment"), individual: __("Their own") };
		this.$body.find(".ps-filter").html(
			Object.keys(labels)
				.map((f) => `<button type="button" data-filter="${f}" aria-pressed="${this.filter === f}">${labels[f]}</button>`)
				.join("")
		);
		const rows = this.data.users.filter(
			(u) =>
				(this.filter === "all" || u.source === this.filter) &&
				(!this.search || (u.full_name || "").toLowerCase().includes(this.search) || u.user.toLowerCase().includes(this.search))
		);
		this.$body.find("tbody").html(rows.map((u) => this.row(u)).join("") || `<tr><td colspan="5" class="ps-empty-state">${__("No users match.")}</td></tr>`);
	}

	row(u) {
		const preset = this.data.presets.find((p) => p.name === u.theme) || {};
		const why = {
			default: `<span class="ps-tag">${__("Site default")}</span>`,
			assignment: `<a class="ps-tag is-accent" href="/app/prism-assignments">${frappe.utils.escape_html(u.assignment || "")}</a>`,
			individual: `<span class="ps-tag is-strong">${__("Set individually")}</span>`,
		}[u.source];
		const adjustments = Object.entries(u.overrides || {})
			.map(([, value]) => `<span class="ps-tag">${frappe.utils.escape_html(__(value))}</span>`)
			.join(" ");
		const selected = u.source === "default" ? "" : u.theme;
		return `<tr>
			<td><div class="ps-cell-user">${prism.ui.avatar(u)}<span class="ps-user-text"><b>${frappe.utils.escape_html(u.full_name || u.user)}</b><small>${frappe.utils.escape_html(u.user)}</small></span></div></td>
			<td><div class="ps-cell-theme">${prism.ui.thumb(preset)}<b>${frappe.utils.escape_html(u.theme || __("Standard Desk"))}</b></div></td>
			<td>${why}</td>
			<td>${adjustments || `<span class="ps-hint">${__("None")}</span>`}</td>
			<td><select class="ps-user-theme" data-user="${frappe.utils.escape_html(u.user)}" aria-label="${__("Theme for {0}", [frappe.utils.escape_html(u.full_name || u.user)])}">
				<option value="">${__("Site default")}</option>
				${this.data.presets.map((p) => `<option value="${frappe.utils.escape_html(p.name)}" ${p.name === selected ? "selected" : ""}>${frappe.utils.escape_html(p.theme_name)}</option>`).join("")}
			</select></td>
		</tr>`;
	}

	change(user, theme) {
		const row = this.data.users.find((u) => u.user === user);
		const go = () =>
			frappe
				.call({ method: "prism.api.set_user_theme", args: { user, theme: theme || null }, freeze: true })
				.then(() => this.load())
				.then(() => prism.ui.toast(this.$root, __("Updated {0}", [frappe.utils.escape_html(row.full_name || user)])));
		if (row.source === "assignment") {
			frappe.confirm(__("This takes {0} out of the assignment {1}. Continue?", [frappe.utils.escape_html(row.full_name || user), frappe.utils.escape_html(row.assignment)]), go, () => this.render_rows());
		} else go();
	}
};
