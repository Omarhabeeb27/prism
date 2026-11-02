frappe.provide("prism");

// Radius scale (px) per field_radius option. --border-radius-full (circular
// elements like avatars) is intentionally left untouched at its core default.
prism.RADIUS_SCALE = {
	Sharp: { base: "0px", sm: "0px", md: "2px", lg: "4px", xl: "4px" },
	Soft: { base: "4px", sm: "4px", md: "6px", lg: "8px", xl: "10px" },
	Rounded: { base: "8px", sm: "6px", md: "8px", lg: "12px", xl: "16px" },
	Pill: { base: "16px", sm: "12px", md: "16px", lg: "22px", xl: "26px" },
};

prism.ICON_STYLE_CLASS = {
	Outline: "prism-icon-outline",
	Filled: "prism-icon-filled",
	"Solid Glyph": "prism-icon-solid-glyph",
	"Two-tone": "prism-icon-two-tone",
	Gradient: "prism-icon-gradient",
};

prism.MENU_STYLE_CLASS = {
	"Theme Color": "prism-menu-theme",
	Dark: "prism-menu-dark",
	Light: "prism-menu-light",
	Transparent: "prism-menu-transparent",
	Glass: "prism-menu-glass",
};

prism.BUTTON_STYLE_CLASS = {
	Solid: "prism-btn-solid",
	Gradient: "prism-btn-gradient",
	Outline: "prism-btn-outline",
	Soft: "prism-btn-soft",
	Ghost: "prism-btn-ghost",
	Pill: "prism-btn-pill",
	Sweep: "prism-btn-sweep",
	Link: "prism-btn-link",
	"Bordered Gradient": "prism-btn-bordered-gradient",
	Glass: "prism-btn-glass",
	Neumorphic: "prism-btn-neumorphic",
	Elevated: "prism-btn-elevated",
	Ripple: "prism-btn-ripple",
};

prism.HOVER_EFFECT_CLASS = {
	Lift: "prism-hover-fx-lift",
	Glow: "prism-hover-fx-glow",
	Invert: "prism-hover-fx-invert",
	Scale: "prism-hover-fx-scale",
	Tilt: "prism-hover-fx-tilt",
	"Border Draw": "prism-hover-fx-border-draw",
	Underline: "prism-hover-fx-underline",
	"Fade Background": "prism-hover-fx-fade-bg",
	"Icon Shift": "prism-hover-fx-icon-shift",
	Dim: "prism-hover-fx-dim",
};

prism.FIELD_STYLE_CLASS = {
	Filled: "prism-field-filled",
	Outlined: "prism-field-outlined",
	Underline: "prism-field-underline",
	Pill: "prism-field-pill",
	Sharp: "prism-field-sharp",
	"Soft Shadow": "prism-field-soft-shadow",
	Glass: "prism-field-glass",
	Minimal: "prism-field-minimal",
	"Bottom Accent": "prism-field-bottom-accent",
	"Bordered Thick": "prism-field-bordered-thick",
};

prism.CORNER_STYLE_CLASS = {
	Default: "",
	"Cut Corner": "prism-corner-cut",
	"Diamond Cut": "prism-corner-diamond",
	"Extra Rounded": "prism-corner-extra-rounded",
	"Soft Edge": "prism-corner-soft-edge",
};

prism.CHECKBOX_STYLE_CLASS = {
	Default: "",
	Glow: "prism-checkbox-glow",
	Bounce: "prism-checkbox-bounce",
	Ripple: "prism-checkbox-ripple",
	Squircle: "prism-checkbox-squircle",
};

prism.FONT_STACKS = {
	// System / already available — no webfont load needed
	Inter: "'Inter', sans-serif",
	"Segoe UI": "'Segoe UI', Tahoma, sans-serif",
	"System UI": "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
	Helvetica: "'Helvetica Neue', Helvetica, Arial, sans-serif",
	// Clean professional sans
	Roboto: "'Roboto', sans-serif",
	"Roboto Condensed": "'Roboto Condensed', sans-serif",
	"Open Sans": "'Open Sans', sans-serif",
	Lato: "'Lato', sans-serif",
	"Source Sans 3": "'Source Sans 3', sans-serif",
	"Work Sans": "'Work Sans', sans-serif",
	Karla: "'Karla', sans-serif",
	Mulish: "'Mulish', sans-serif",
	"IBM Plex Sans": "'IBM Plex Sans', sans-serif",
	// Geometric / modern sans
	Poppins: "'Poppins', sans-serif",
	Nunito: "'Nunito', sans-serif",
	Montserrat: "'Montserrat', sans-serif",
	Manrope: "'Manrope', sans-serif",
	"DM Sans": "'DM Sans', sans-serif",
	"Plus Jakarta Sans": "'Plus Jakarta Sans', sans-serif",
	Outfit: "'Outfit', sans-serif",
	Rubik: "'Rubik', sans-serif",
	Figtree: "'Figtree', sans-serif",
	// Serif / editorial
	Newsreader: "'Newsreader', serif",
	"Playfair Display": "'Playfair Display', serif",
	Merriweather: "'Merriweather', serif",
	Lora: "'Lora', serif",
	"Source Serif 4": "'Source Serif 4', serif",
	// Arabic and Latin
	Cairo: "'Cairo', sans-serif",
	Tajawal: "'Tajawal', sans-serif",
	"IBM Plex Sans Arabic": "'IBM Plex Sans Arabic', sans-serif",
	"Noto Kufi Arabic": "'Noto Kufi Arabic', sans-serif",
};

// -- Color utilities -------------------------------------------------------

prism.hex_to_rgb = function (hex) {
	if (!hex) return { r: 0, g: 0, b: 0 };
	hex = hex.replace("#", "");
	if (hex.length === 3) {
		hex = hex
			.split("")
			.map((c) => c + c)
			.join("");
	}
	const num = parseInt(hex, 16);
	return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

prism.rgb_to_hex = function (r, g, b) {
	const to_hex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
	return `#${to_hex(r)}${to_hex(g)}${to_hex(b)}`;
};

// Relative luminance (WCAG). Used to auto-pick readable text color.
prism.luminance = function (hex) {
	const { r, g, b } = prism.hex_to_rgb(hex);
	const [rs, gs, bs] = [r, g, b].map((v) => {
		v /= 255;
		return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

// Returns near-black or near-white, whichever contrasts better against `hex`.
prism.contrast_color = function (hex) {
	return prism.contrast_ratio(hex, "#ffffff") >= prism.contrast_ratio(hex, "#14181d") ? "#ffffff" : "#14181d";
};

prism.rgba = function (hex, alpha) {
	const { r, g, b } = prism.hex_to_rgb(hex);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

prism.mix = function (hex_a, hex_b, weight) {
	const a = prism.hex_to_rgb(hex_a);
	const b = prism.hex_to_rgb(hex_b);
	return prism.rgb_to_hex(
		a.r + (b.r - a.r) * weight,
		a.g + (b.g - a.g) * weight,
		a.b + (b.b - a.b) * weight
	);
};

// WCAG contrast ratio between two colors (1:1 to 21:1). >= 4.5 passes AA for
// normal text; this is the same math the browser's own devtools use.
prism.contrast_ratio = function (hex_a, hex_b) {
	const l1 = prism.luminance(hex_a) + 0.05;
	const l2 = prism.luminance(hex_b) + 0.05;
	return l1 > l2 ? l1 / l2 : l2 / l1;
};

prism.rgb_to_hsl = function (r, g, b) {
	(r /= 255), (g /= 255), (b /= 255);
	const max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	let h,
		s,
		l = (max + min) / 2;
	if (max === min) {
		h = s = 0;
	} else {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			default:
				h = (r - g) / d + 4;
		}
		h /= 6;
	}
	return { h: h * 360, s: s * 100, l: l * 100 };
};

prism.hsl_to_rgb = function (h, s, l) {
	(h /= 360), (s /= 100), (l /= 100);
	let r, g, b;
	if (s === 0) {
		r = g = b = l;
	} else {
		const hue2rgb = (p, q, t) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}
	return prism.rgb_to_hex(r * 255, g * 255, b * 255);
};

// Nudges `hex`'s lightness (in the direction away from `against`) in small
// steps until it passes `min_ratio` contrast against `against`, or gives up
// after a bounded number of steps. Used by Theme Studio's "Fix" button.
prism.fix_contrast = function (hex, against, min_ratio) {
	min_ratio = min_ratio || 4.5;
	if (prism.contrast_ratio(hex, against) >= min_ratio) return hex;

	const rgb = prism.hex_to_rgb(hex);
	const { h, s, l } = prism.rgb_to_hsl(rgb.r, rgb.g, rgb.b);
	const darken = prism.luminance(against) > prism.luminance(hex);
	let cur_l = l;
	let result = hex;

	for (let i = 0; i < 60 && (cur_l > 0 && cur_l < 100); i++) {
		cur_l = darken ? Math.max(0, cur_l - 2) : Math.min(100, cur_l + 2);
		result = prism.hsl_to_rgb(h, s, cur_l);
		if (prism.contrast_ratio(result, against) >= min_ratio) break;
	}
	return result;
};

// -- Font loading ------------------------------------------------------------

prism.GOOGLE_FONT_QUERY = {
	Roboto: "Roboto:wght@400;500;600;700",
	"Roboto Condensed": "Roboto+Condensed:wght@400;500;600;700",
	"Open Sans": "Open+Sans:wght@400;500;600;700",
	Lato: "Lato:wght@400;700",
	"Source Sans 3": "Source+Sans+3:wght@400;500;600;700",
	"Work Sans": "Work+Sans:wght@400;500;600;700",
	Karla: "Karla:wght@400;500;600;700",
	Mulish: "Mulish:wght@400;500;600;700",
	"IBM Plex Sans": "IBM+Plex+Sans:wght@400;500;600;700",
	Poppins: "Poppins:wght@400;500;600;700",
	Nunito: "Nunito:wght@400;500;600;700",
	Montserrat: "Montserrat:wght@400;500;600;700",
	Manrope: "Manrope:wght@400;500;600;700",
	"DM Sans": "DM+Sans:wght@400;500;600;700",
	"Plus Jakarta Sans": "Plus+Jakarta+Sans:wght@400;500;600;700",
	Outfit: "Outfit:wght@400;500;600;700",
	Rubik: "Rubik:wght@400;500;600;700",
	Figtree: "Figtree:wght@400;500;600;700",
	Newsreader: "Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600",
	"Playfair Display": "Playfair+Display:wght@500;600;700",
	Merriweather: "Merriweather:wght@400;700",
	Lora: "Lora:wght@400;500;600;700",
	"Source Serif 4": "Source+Serif+4:wght@400;500;600;700",
	Cairo: "Cairo:wght@400;500;600;700",
	Tajawal: "Tajawal:wght@400;500;700",
	"IBM Plex Sans Arabic": "IBM+Plex+Sans+Arabic:wght@400;500;600;700",
	"Noto Kufi Arabic": "Noto+Kufi+Arabic:wght@400;500;600;700",
};

prism.ensure_font_loaded = function (font_family) {
	const query = prism.GOOGLE_FONT_QUERY[font_family];
	if (!query) return; // Inter/Segoe UI/System UI are already available locally
	const id = "prism-google-font-" + font_family.replace(/\s+/g, "-").toLowerCase();
	if (document.getElementById(id)) return;
	const link = document.createElement("link");
	link.id = id;
	link.rel = "stylesheet";
	link.href = `https://fonts.googleapis.com/css2?family=${query}&display=swap`;
	document.head.appendChild(link);
};

// -- Theme application --------------------------------------------------------

// Numeric scales for the surfaces/ink/outlines Frappe 16's Espresso tokens
// expect, derived from one surface + one ink so any pairing stays coherent.
// Muted steps are pushed until they stay readable on that surface: without this
// a low-contrast preset would produce illegible hints and labels.
prism.build_scale = function (surface, ink, accent) {
	const dark = prism.luminance(surface) < 0.2;
	const tint = (weight) => prism.mix(prism.mix(surface, ink, weight), accent, dark ? 0.04 : 0.06);
	const steps = dark ? [0.05, 0.09, 0.13, 0.19] : [0.035, 0.06, 0.1, 0.15];
	const scale = {
		surface_1: tint(steps[0]),
		surface_2: tint(steps[1]),
		surface_3: tint(steps[2]),
		surface_4: tint(steps[3]),
		outline_1: tint(0.1),
		outline_2: tint(0.16),
		outline_3: tint(0.26),
		outline_4: tint(0.42),
		ink_9: ink,
		ink_8: prism.mix(ink, surface, 0.06),
		ink_7: prism.mix(ink, surface, 0.18),
		ink_6: prism.fix_contrast(prism.mix(ink, surface, 0.3), surface, 4.5),
		ink_5: prism.fix_contrast(prism.mix(ink, surface, 0.44), surface, 3.6),
		ink_4: prism.fix_contrast(prism.mix(ink, surface, 0.56), surface, 2.6),
		ink_3: prism.mix(ink, surface, 0.7),
		ink_2: prism.mix(ink, surface, 0.82),
		ink_1: prism.mix(ink, surface, 0.9),
	};
	return scale;
};

// Text colour that stays readable on the whole accent, including both ends of
// a gradient: picks whichever of white/near-black has the better worst case.
prism.best_on = function (color_a, color_b) {
	const worst = (ink) =>
		Math.min(prism.contrast_ratio(ink, color_a), prism.contrast_ratio(ink, color_b || color_a));
	return worst("#ffffff") >= worst("#14181d") ? "#ffffff" : "#14181d";
};

// The ink for a chrome surface (sidebar, header). Keeps the theme's own text
// colour when it already works there, so a tinted preset stays tinted.
prism.ink_for = function (surface, text_color) {
	if (text_color && prism.contrast_ratio(text_color, surface) >= 7) return text_color;
	return prism.best_on(surface);
};

// The one place a preset becomes CSS values. Pure (no DOM), so Theme Studio
// renders thumbnails and the live Desk from the same numbers: what a preview
// shows is what applying the theme produces.
prism.compute_tokens = function (theme) {
	const bg = theme.background_color || "#ffffff";
	const primary = theme.primary_color || "#2563eb";
	const end = theme.gradient_end_color || null;
	const is_dark = prism.luminance(bg) < 0.2;
	const text = theme.text_color || prism.best_on(bg);
	const page = prism.build_scale(bg, text, primary);
	const raised = is_dark ? prism.mix(bg, "#ffffff", 0.035) : bg;
	const popover = is_dark ? prism.mix(bg, "#ffffff", 0.07) : bg;
	const canvas = is_dark ? bg : prism.mix(bg, primary, 0.025);
	const on_primary = prism.best_on(primary, end);
	const accent_ink = prism.fix_contrast(primary, raised, 4.5);
	const gradient = end ? `linear-gradient(135deg, ${primary} 0%, ${end} 100%)` : primary;

	const vars = {
		"--primary": primary,
		"--btn-primary": primary,
		"--prism-accent-gradient": gradient,
		"--prism-on-primary": on_primary,
		"--prism-accent-ink": accent_ink,
		"--checkbox-gradient": `linear-gradient(180deg, ${primary}, ${primary})`,
		"--bg-color": canvas,
		"--fg-color": raised,
		"--card-bg": raised,
		"--surface-base": raised,
		"--popover-bg": popover,
		"--prism-popover": popover,
		"--control-bg": page.surface_2,
		"--btn-default-bg": page.surface_2,
		"--btn-default-hover-bg": page.surface_4,
		"--subtle-fg": page.surface_2,
		"--subtle-accent": page.surface_1,
		// Opaque on purpose: an rgba() row highlight bleeds page content through
		// animated dropdowns in Chromium.
		"--highlight-color": prism.mix(raised, primary, is_dark ? 0.2 : 0.09),
		"--awesomplete-hover-bg": page.surface_2,
		"--disabled-control-bg": page.surface_1,
		"--disabled-text-color": page.ink_5,
		"--fg-hover-color": page.surface_1,
		"--border-color": page.outline_1,
		"--dark-border-color": page.outline_2,
		"--text-color": page.ink_8,
		"--heading-color": page.ink_9,
		"--text-muted": page.ink_6,
		"--text-light": page.ink_5,
		"--invert-neutral": page.ink_9,
		"--focus-default": `0 0 0 2px ${prism.rgba(primary, 0.4)}`,
		"--sidebar-hover-color": prism.rgba(primary, 0.12),
		"--sidebar-active-color": prism.rgba(primary, 0.2),
		"--prism-neu-dark": is_dark ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.12)",
		"--prism-neu-light": is_dark ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.7)",
		"--prism-canvas": canvas,
		"--prism-raised": raised,
	};
	const push_scale = (scale, prefix) => {
		[1, 2, 3, 4].forEach((n) => {
			vars[`--prism-${prefix}surface-${n}`] = scale[`surface_${n}`];
			vars[`--prism-${prefix}outline-${n}`] = scale[`outline_${n}`];
		});
		[1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((n) => {
			vars[`--prism-${prefix}ink-${n}`] = scale[`ink_${n}`];
		});
	};
	push_scale(page, "");
	[1, 2, 3, 4].forEach((n) => {
		vars[`--surface-gray-${n}`] = page[`surface_${n}`];
		vars[`--outline-gray-${n}`] = page[`outline_${n}`];
	});
	[1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((n) => {
		vars[`--ink-gray-${n}`] = page[`ink_${n}`];
	});

	// Sidebar. Glass/Transparent have no colour of their own, so their ink is
	// worked out against the page behind them.
	const glass_alpha = (theme.glass_opacity ?? 65) / 100;
	const see_through = ["Glass", "Transparent"].includes(theme.menu_style);
	const sidebar =
		{ Dark: "#14161a", Light: "#ffffff" }[theme.menu_style] ||
		(see_through ? canvas : theme.sidebar_color || page.surface_1);
	const sidebar_ink = prism.ink_for(sidebar, text);
	push_scale(prism.build_scale(sidebar, sidebar_ink, primary), "sb-");
	const sidebar_fill =
		theme.menu_style === "Glass" ? prism.rgba(is_dark ? "#000000" : "#ffffff", glass_alpha * 0.5) : sidebar;
	vars["--desk-sidebar-bg"] = sidebar_fill;
	// core resolves these at :root, so setting them inside the sidebar is too late
	vars["--dock-bg"] = sidebar === canvas ? raised : sidebar;
	vars["--dock-ink"] = vars["--prism-sb-ink-5"];
	vars["--dock-ink-hover"] = vars["--prism-sb-ink-7"];
	vars["--dock-ink-active"] = vars["--prism-sb-ink-9"];
	// Frappe's active row is one step lighter than the panel in either mode.
	vars["--prism-sb-raised"] = prism.mix(sidebar, "#ffffff", prism.luminance(sidebar) < 0.2 ? 0.14 : 0.85);
	vars["--surface-elevation-3"] = is_dark ? prism.mix(bg, "#ffffff", 0.1) : "#ffffff";
	vars["--prism-sb-fill"] = sidebar_fill;

	// Header bar (Frappe 16 has no .navbar: .page-head and .desktop-navbar are
	// the top of the screen). A primary button that would melt into a same-colour
	// header flips to the header's ink instead.
	const navbar = theme.navbar_color || raised;
	const navbar_ink = prism.ink_for(navbar, text);
	push_scale(prism.build_scale(navbar, navbar_ink, primary), "nav-");
	vars["--prism-nav-bg"] = navbar;
	vars["--navbar-bg"] = navbar;
	const clash = prism.contrast_ratio(primary, navbar) < 1.8;
	vars["--prism-nav-btn"] = clash ? navbar_ink : primary;
	vars["--prism-nav-on-btn"] = clash ? navbar : on_primary;
	vars["--prism-nav-gradient"] = clash ? navbar_ink : gradient;
	vars["--prism-nav-accent"] = prism.fix_contrast(primary, navbar, 4.5);

	// ERPNext's module icons are a single baked blue (#0289F7) so they can only
	// be retinted by filter: rotate from that blue to the accent, and scale
	// saturation so a muted accent doesn't come out neon.
	const source_hsl = prism.rgb_to_hsl(2, 137, 247);
	const target = end ? prism.mix(primary, end, 0.5) : primary;
	const target_rgb = prism.hex_to_rgb(target);
	const target_hsl = prism.rgb_to_hsl(target_rgb.r, target_rgb.g, target_rgb.b);
	vars["--prism-icon-hue-rotate"] = `${target_hsl.h - source_hsl.h}deg`;
	vars["--prism-icon-saturate"] = Math.max(0.15, Math.min(1.6, target_hsl.s / source_hsl.s)).toFixed(2);

	vars["--prism-desktop-bg"] =
		theme.background_style === "Subtle Gradient"
			? `linear-gradient(160deg, ${canvas} 0%, ${prism.mix(bg, primary, 0.06)} 55%, ${prism.mix(bg, primary, is_dark ? 0.16 : 0.11)} 100%)`
			: canvas;

	vars["--prism-font"] = prism.FONT_STACKS[theme.font_family] || "inherit";

	// Frappe 16 reads --radius-*, older components still read --border-radius-*.
	const radius = prism.RADIUS_SCALE[theme.field_radius] || prism.RADIUS_SCALE.Rounded;
	Object.entries({ sm: radius.sm, md: radius.md, lg: radius.lg, xl: radius.xl }).forEach(([size, value]) => {
		vars[`--radius-${size}`] = value;
		vars[`--border-radius-${size}`] = value;
	});
	vars["--border-radius"] = radius.base;
	vars["--radius"] = radius.base;

	vars["--prism-glass-bg"] = prism.rgba(primary, glass_alpha * 0.18);
	vars["--prism-glass-border"] = prism.rgba(primary, glass_alpha * 0.28);
	vars["--prism-glass-surface"] = prism.rgba(is_dark ? "#000000" : "#ffffff", glass_alpha * 0.5);

	return { vars, is_dark };
};

// Frappe's own dark stylesheet keys off data-theme, so a dark preset has to turn
// it on rather than repaint a light Desk. The preset decides light/dark while
// Prism is on; the user's own setting comes back in clear_theme().
prism.set_color_mode = function (is_dark) {
	const root = document.documentElement;
	const mode = is_dark ? "dark" : "light";
	prism.forced_mode = mode;
	if (root.getAttribute("data-theme-mode") !== mode) root.setAttribute("data-theme-mode", mode);
	root.setAttribute("data-theme", mode);
};

prism.watch_color_mode = function () {
	if (prism.color_mode_watcher) return;
	const root = document.documentElement;
	prism.color_mode_watcher = new MutationObserver(() => {
		if (!prism.forced_mode || root.getAttribute("data-theme-mode") === prism.forced_mode) return;
		prism.set_color_mode(prism.forced_mode === "dark");
		frappe.show_alert({ message: __("Light and dark mode are set by your Prism theme."), indicator: "blue" });
	});
	prism.color_mode_watcher.observe(root, { attributes: true, attributeFilter: ["data-theme-mode"] });
};

prism.toggle_class_group = function (class_map, value, fallback) {
	Object.values(class_map).forEach((cls) => cls && document.body.classList.remove(cls));
	const cls = class_map[value] || (fallback && class_map[fallback]);
	if (cls) document.body.classList.add(cls);
};

// Applies a preset as inline CSS custom properties on <html>. Used on boot and
// by Theme Studio for live preview before anything is saved.
prism.apply_theme = function (theme) {
	if (!theme) return;
	const root = document.documentElement;
	const { vars, is_dark } = prism.compute_tokens(theme);

	(prism.applied_vars || []).forEach((name) => {
		if (!(name in vars)) root.style.removeProperty(name);
	});
	Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
	prism.applied_vars = Object.keys(vars);

	prism.ensure_font_loaded(theme.font_family);
	prism.set_color_mode(is_dark);

	const body = document.body;
	prism.toggle_class_group(prism.ICON_STYLE_CLASS, theme.icon_style);
	prism.toggle_class_group(prism.MENU_STYLE_CLASS, theme.menu_style, "Theme Color");
	prism.toggle_class_group(prism.BUTTON_STYLE_CLASS, theme.button_style, "Solid");
	prism.toggle_class_group(prism.HOVER_EFFECT_CLASS, theme.hover_effect, "Lift");
	prism.toggle_class_group(prism.FIELD_STYLE_CLASS, theme.field_style, "Outlined");
	prism.toggle_class_group(prism.CORNER_STYLE_CLASS, theme.corner_style);
	prism.toggle_class_group(prism.CHECKBOX_STYLE_CLASS, theme.checkbox_style);
	body.classList.toggle("prism-bg-gradient", theme.background_style === "Subtle Gradient");

	if (theme.desktop_bg_image) {
		const overlay = (theme.desktop_bg_overlay_opacity ?? 40) / 100;
		root.style.setProperty("--prism-desktop-bg-image", `url("${encodeURI(theme.desktop_bg_image)}")`);
		root.style.setProperty("--prism-desktop-bg-overlay-color", prism.rgba(theme.background_color, overlay));
		body.classList.add("prism-desktop-image-bg");
	} else {
		root.style.removeProperty("--prism-desktop-bg-image");
		root.style.removeProperty("--prism-desktop-bg-overlay-color");
		body.classList.remove("prism-desktop-image-bg");
	}

	body.classList.toggle("prism-dark-theme", is_dark);
	body.classList.add("prism-theme-active");
};

// Hands Desk back exactly as it was: every property, class and mode Prism set.
prism.clear_theme = function () {
	const root = document.documentElement;
	(prism.applied_vars || []).forEach((name) => root.style.removeProperty(name));
	prism.applied_vars = [];
	root.style.removeProperty("--prism-desktop-bg-image");
	root.style.removeProperty("--prism-desktop-bg-overlay-color");
	[
		prism.ICON_STYLE_CLASS,
		prism.MENU_STYLE_CLASS,
		prism.BUTTON_STYLE_CLASS,
		prism.HOVER_EFFECT_CLASS,
		prism.FIELD_STYLE_CLASS,
		prism.CORNER_STYLE_CLASS,
		prism.CHECKBOX_STYLE_CLASS,
	].forEach((group) => prism.toggle_class_group(group, null));
	["prism-bg-gradient", "prism-desktop-image-bg", "prism-dark-theme", "prism-theme-active"].forEach((cls) =>
		document.body.classList.remove(cls)
	);
	prism.forced_mode = null;
	const user_mode = ((frappe.boot && frappe.boot.user && frappe.boot.user.desk_theme) || "Light").toLowerCase();
	root.setAttribute("data-theme-mode", user_mode);
	if (frappe.ui && frappe.ui.set_theme) frappe.ui.set_theme();
	else root.setAttribute("data-theme", user_mode === "dark" ? "dark" : "light");
};

// -- Per-app color overrides --------------------------------------------------

// Workspace/page routes carry their owning app directly (bootinfo.workspaces
// includes it per-record); doctype routes (List/Form/Report/...) don't, so
// those are resolved via the doctype's module -> module_app map instead.
prism.get_workspace_app_map = function () {
	if (prism.WORKSPACE_APP_MAP) return prism.WORKSPACE_APP_MAP;
	const map = {};
	const pages = (frappe.boot.workspaces && frappe.boot.workspaces.pages) || [];
	pages.forEach((p) => {
		if (p.app) map[(p.name || "").toLowerCase()] = p.app;
	});
	prism.WORKSPACE_APP_MAP = map;
	return map;
};

const DOCTYPE_ROUTE_VIEWS = [
	"List",
	"Form",
	"Tree",
	"print",
	"query-report",
	"dashboard-view",
	"kanban-view",
	"Report",
	"Gantt",
	"Calendar",
];

prism.resolve_app_for_route = function (route, callback) {
	if (!route || !route.length) return callback(null);

	if (DOCTYPE_ROUTE_VIEWS.includes(route[0]) && route[1] && frappe.model && frappe.model.with_doctype) {
		const doctype = route[1];
		frappe.model.with_doctype(doctype, () => {
			const meta = frappe.get_meta(doctype);
			const module = meta && meta.module;
			const app = module && frappe.boot.module_app && frappe.boot.module_app[frappe.scrub(module)];
			callback(app || null);
		});
		return;
	}

	const map = prism.get_workspace_app_map();
	callback(map[(route[0] || "").toLowerCase()] || null);
};

// Merges an app's override on top of the active base theme and re-applies —
// cheap enough to just call the full apply_theme again since every step in
// it is idempotent (classList toggles, inline style overwrites).
prism.apply_app_override = function (app) {
	const base = prism.base_theme;
	if (!base) return;
	const override = app && base.app_overrides && base.app_overrides[app];
	if (!override) {
		prism.apply_theme(base);
		return;
	}
	prism.apply_theme(
		Object.assign({}, base, {
			primary_color: override.primary_color || base.primary_color,
			gradient_end_color: override.gradient_end_color || base.gradient_end_color,
			navbar_color: override.navbar_color || base.navbar_color,
			sidebar_color: override.sidebar_color || base.sidebar_color,
		})
	);
};

prism.watch_app_overrides = function () {
	if (!frappe.router || prism.APP_OVERRIDE_WATCHING) return;
	prism.APP_OVERRIDE_WATCHING = true;
	const on_route_change = () => {
		prism.resolve_app_for_route(frappe.get_route(), (app) => prism.apply_app_override(app));
	};
	frappe.router.on("change", on_route_change);
	on_route_change(); // resolve for whatever route Desk booted onto
};

if (frappe.boot && frappe.boot.prism_theme) {
	prism.base_theme = frappe.boot.prism_theme;
	prism.apply_theme(frappe.boot.prism_theme);
	prism.watch_color_mode();
	if (prism.base_theme.app_overrides && Object.keys(prism.base_theme.app_overrides).length) {
		prism.watch_app_overrides();
	}
}
