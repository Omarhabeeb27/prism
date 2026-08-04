frappe.provide("prism");

// Radius scale (px) per field_radius option. --border-radius-full (circular
// elements like avatars) is intentionally left untouched at its core default.
prism.RADIUS_SCALE = {
	Sharp: { base: "0px", sm: "0px", md: "2px", lg: "4px" },
	Soft: { base: "4px", sm: "4px", md: "6px", lg: "8px" },
	Rounded: { base: "8px", sm: "8px", md: "10px", lg: "12px" },
	Pill: { base: "16px", sm: "16px", md: "20px", lg: "24px" },
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
	return prism.luminance(hex) > 0.45 ? "#1a1f24" : "#ffffff";
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

// Applies a Theme Preset dict as runtime CSS custom properties on <html>.
// Called on boot with the system default, and reused by Theme Studio for
// instant live-preview before the user commits a choice.
prism.apply_theme = function (theme) {
	if (!theme) return;
	const root = document.documentElement;

	const accent_gradient = theme.gradient_end_color
		? `linear-gradient(135deg, ${theme.primary_color} 0%, ${theme.gradient_end_color} 100%)`
		: theme.primary_color;

	root.style.setProperty("--primary", theme.primary_color);
	root.style.setProperty("--btn-primary", theme.primary_color);
	root.style.setProperty("--prism-accent-gradient", accent_gradient);
	root.style.setProperty("--prism-on-primary", prism.contrast_color(theme.primary_color));

	root.style.setProperty("--navbar-bg", theme.navbar_color);
	const on_navbar = prism.contrast_color(theme.navbar_color);
	root.style.setProperty("--prism-on-navbar", on_navbar);
	root.style.setProperty("--prism-on-navbar-muted", on_navbar === "#ffffff" ? "rgba(255,255,255,0.65)" : "rgba(26,31,36,0.65)");

	// menu_style picks the sidebar surface independent of the theme's own
	// sidebar_color; since this is applied via inline style (which always
	// wins over any CSS class rule for the same property) the branching
	// has to happen here, not in CSS.
	const menu_surface =
		{
			Dark: "#14161a",
			Light: "#ffffff",
			Transparent: "transparent",
			Glass: "transparent",
		}[theme.menu_style] || theme.sidebar_color;
	root.style.setProperty("--surface-menu-bar", menu_surface);
	const on_sidebar =
		menu_surface === "transparent" ? prism.contrast_color(theme.background_color) : prism.contrast_color(menu_surface);
	root.style.setProperty("--prism-on-sidebar", on_sidebar);
	root.style.setProperty("--prism-on-sidebar-muted", on_sidebar === "#ffffff" ? "rgba(255,255,255,0.65)" : "rgba(26,31,36,0.65)");
	root.style.setProperty("--sidebar-hover-color", prism.rgba(theme.primary_color, 0.12));
	root.style.setProperty("--sidebar-active-color", prism.rgba(theme.primary_color, 0.18));

	// --highlight-color/--subtle-fg are Frappe's light-mode-only "row
	// selected" tokens; on a dark theme they need a visibly distinct value
	// too (see the list-view selection-contrast fix), but reusing an
	// rgba()-based color like --sidebar-hover-color here triggers a real
	// Chromium compositing bug: crisp page content bleeds through the
	// translucent background wherever it's used inside an animated/
	// absolutely-positioned dropdown (e.g. the list view sort-selector's
	// active option). prism.mix() produces a fully OPAQUE solid color —
	// same visual tint, no alpha channel for that bug to exploit.
	if (theme.is_dark_mode) {
		const opaque_highlight = prism.mix(theme.background_color, theme.primary_color, 0.14);
		root.style.setProperty("--highlight-color", opaque_highlight);
		root.style.setProperty("--subtle-fg", opaque_highlight);
	} else {
		root.style.removeProperty("--highlight-color");
		root.style.removeProperty("--subtle-fg");
	}

	// A pure #FFFFFF canvas reads as flat/generic regardless of accent choice
	// (this was the "everything is still white" issue) — always apply a very
	// subtle brand tint to the page background, even in "Solid" mode, and a
	// lighter one to card/panel surfaces so cards still pop off the canvas.
	const bg_tint = prism.mix(theme.background_color, theme.primary_color, 0.025);
	const fg_tint = prism.mix(theme.background_color, theme.primary_color, 0.01);
	root.style.setProperty("--bg-color", bg_tint);
	root.style.setProperty("--fg-color", fg_tint);

	// On dark themes, Frappe's own --control-bg (= --gray-100, redefined dark
	// by core's dark-mode CSS) can end up nearly the same luminance as our
	// custom --bg-color, so toolbar buttons/dropdowns/filters visually
	// disappear into the page. Force a visible lighter tier when the
	// resolved background is dark.
	const is_dark_surface = prism.contrast_color(theme.background_color) === "#ffffff";
	if (is_dark_surface) {
		root.style.setProperty("--control-bg", prism.mix(theme.background_color, "#ffffff", 0.14));
		root.style.setProperty("--btn-default-hover-bg", prism.mix(theme.background_color, "#ffffff", 0.22));
	} else {
		root.style.removeProperty("--control-bg");
		root.style.removeProperty("--btn-default-hover-bg");
	}

	// Most module/desktop icons (Framework, Organization, Accounting, ...)
	// are baked PNG/SVG assets colored blue (#0289F7) at the source, not
	// CSS-driven — they can't be recolored directly. Rotating hue toward the
	// theme's own accent is a real, working approximation used by several
	// theming systems for exactly this "can't touch the source asset" case.
	const base_hsl = prism.rgb_to_hsl(2, 137, 247); // #0289F7, the baked icon asset color
	// Gradient presets (Prism Gradient, Glass Aurora, ...) read as
	// half-and-half accents rather than a single flat color — blending
	// primary + gradient_end before taking the hue keeps the icon recolor
	// consistent with what the buttons/accent actually look like, instead
	// of skewing to just one end of the gradient.
	const icon_target_color = theme.gradient_end_color
		? prism.mix(theme.primary_color, theme.gradient_end_color, 0.5)
		: theme.primary_color;
	const icon_target_rgb = prism.hex_to_rgb(icon_target_color);
	const target_hsl = prism.rgb_to_hsl(icon_target_rgb.r, icon_target_rgb.g, icon_target_rgb.b);
	root.style.setProperty("--prism-icon-hue-rotate", `${target_hsl.h - base_hsl.h}deg`);
	// hue-rotate() only ever rotates hue — it can't touch saturation, so a
	// muted theme color (e.g. Odoo Violet's plum, ~20% saturation) rotated
	// from the vivid ~98%-saturated source blue would still render at ~98%
	// saturation, reading as neon rather than muted. Scale saturate() by
	// how saturated the target actually is relative to the source, instead
	// of a flat boost that only suited vivid accent colors.
	const icon_saturate = Math.max(0.15, Math.min(2.5, (target_hsl.s / base_hsl.s) * 1.6));
	root.style.setProperty("--prism-icon-saturate", icon_saturate);
	root.style.setProperty(
		"--prism-desktop-bg",
		theme.background_style === "Subtle Gradient"
			? `linear-gradient(160deg, ${bg_tint} 0%, ${prism.mix(theme.background_color, theme.primary_color, 0.05)} 55%, ${prism.mix(theme.background_color, theme.primary_color, 0.09)} 100%)`
			: bg_tint
	);
	document.body.classList.toggle("prism-bg-gradient", theme.background_style === "Subtle Gradient");
	root.style.setProperty("--text-color", theme.text_color);

	// The .body-sidebar/.navbar contrast fixes above only cover THOSE two
	// surfaces. Dark theme presets (Prism Gradient, Slate Dark Pro, Glass
	// Aurora, ...) also need legible field labels, muted hints, and icon
	// strokes in the MAIN CONTENT area (form pages, dialogs, doctype forms)
	// — this is what was making "Primary Color"/"Gradient End Color"-style
	// labels nearly invisible when editing a dark theme's own Theme Preset.
	const on_content = prism.contrast_color(bg_tint);
	const on_content_muted = on_content === "#ffffff" ? "rgba(255,255,255,0.65)" : "rgba(26,31,36,0.65)";
	root.style.setProperty("--text-muted", on_content_muted);
	root.style.setProperty("--icon-stroke", on_content);

	const font_stack = prism.FONT_STACKS[theme.font_family] || `'${theme.font_family}', sans-serif`;
	root.style.setProperty("--prism-font", font_stack);
	prism.ensure_font_loaded(theme.font_family);

	const radius = prism.RADIUS_SCALE[theme.field_radius] || prism.RADIUS_SCALE.Rounded;
	root.style.setProperty("--border-radius", radius.base);
	root.style.setProperty("--border-radius-sm", radius.sm);
	root.style.setProperty("--border-radius-md", radius.md);
	root.style.setProperty("--border-radius-lg", radius.lg);

	Object.values(prism.ICON_STYLE_CLASS).forEach((cls) => document.body.classList.remove(cls));
	const icon_class = prism.ICON_STYLE_CLASS[theme.icon_style];
	if (icon_class) document.body.classList.add(icon_class);

	Object.values(prism.MENU_STYLE_CLASS).forEach((cls) => document.body.classList.remove(cls));
	const menu_class = prism.MENU_STYLE_CLASS[theme.menu_style] || prism.MENU_STYLE_CLASS["Theme Color"];
	document.body.classList.add(menu_class);

	Object.values(prism.BUTTON_STYLE_CLASS).forEach((cls) => document.body.classList.remove(cls));
	document.body.classList.add(prism.BUTTON_STYLE_CLASS[theme.button_style] || prism.BUTTON_STYLE_CLASS.Solid);

	Object.values(prism.HOVER_EFFECT_CLASS).forEach((cls) => document.body.classList.remove(cls));
	document.body.classList.add(prism.HOVER_EFFECT_CLASS[theme.hover_effect] || prism.HOVER_EFFECT_CLASS.Lift);

	Object.values(prism.FIELD_STYLE_CLASS).forEach((cls) => document.body.classList.remove(cls));
	document.body.classList.add(prism.FIELD_STYLE_CLASS[theme.field_style] || prism.FIELD_STYLE_CLASS.Outlined);

	Object.values(prism.CORNER_STYLE_CLASS).forEach((cls) => cls && document.body.classList.remove(cls));
	const corner_class = prism.CORNER_STYLE_CLASS[theme.corner_style];
	if (corner_class) document.body.classList.add(corner_class);

	Object.values(prism.CHECKBOX_STYLE_CLASS).forEach((cls) => cls && document.body.classList.remove(cls));
	const checkbox_class = prism.CHECKBOX_STYLE_CLASS[theme.checkbox_style];
	if (checkbox_class) document.body.classList.add(checkbox_class);

	// Desktop background image sits behind the app icon grid — icon tiles
	// keep their own theme-colored fill (set elsewhere) and labels get a
	// dedicated backdrop (CSS), so an arbitrary photo never fights legibility.
	// The overlay opacity is a plain color wash (not background-blend-mode),
	// so it scales predictably from "photo as-is" (0%) to "fully hidden"
	// (100%) regardless of how bright/dark the photo itself is.
	if (theme.desktop_bg_image) {
		const overlay_opacity = (theme.desktop_bg_overlay_opacity ?? 40) / 100;
		root.style.setProperty("--prism-desktop-bg-image", `url("${theme.desktop_bg_image}")`);
		root.style.setProperty("--prism-desktop-bg-overlay-color", prism.rgba(theme.background_color, overlay_opacity));
		document.body.classList.add("prism-desktop-image-bg");
	} else {
		root.style.removeProperty("--prism-desktop-bg-image");
		root.style.removeProperty("--prism-desktop-bg-overlay-color");
		document.body.classList.remove("prism-desktop-image-bg");
	}

	// Glass surfaces (Glass button/field style, Glass menu style) all share
	// one opacity knob instead of each hardcoding its own alpha — 65% is the
	// recommended default (legible text over the blur without looking flat).
	const glass_alpha = (theme.glass_opacity ?? 65) / 100;
	root.style.setProperty("--prism-glass-bg", prism.rgba(theme.primary_color, glass_alpha * 0.18));
	root.style.setProperty("--prism-glass-border", prism.rgba(theme.primary_color, glass_alpha * 0.28));
	root.style.setProperty("--prism-glass-surface", prism.rgba(theme.is_dark_mode ? "#000000" : "#ffffff", glass_alpha * 0.5));

	document.body.classList.toggle("prism-dark-theme", !!theme.is_dark_mode);
	document.body.classList.add("prism-theme-active");
};

prism.clear_theme = function () {
	const root = document.documentElement;
	[
		"--primary",
		"--btn-primary",
		"--prism-accent-gradient",
		"--prism-on-primary",
		"--navbar-bg",
		"--prism-on-navbar",
		"--prism-on-navbar-muted",
		"--surface-menu-bar",
		"--prism-on-sidebar",
		"--prism-on-sidebar-muted",
		"--sidebar-hover-color",
		"--sidebar-active-color",
		"--highlight-color",
		"--subtle-fg",
		"--bg-color",
		"--fg-color",
		"--control-bg",
		"--btn-default-hover-bg",
		"--prism-icon-hue-rotate",
		"--prism-icon-saturate",
		"--prism-desktop-bg",
		"--prism-desktop-bg-image",
		"--prism-desktop-bg-overlay-color",
		"--prism-glass-bg",
		"--prism-glass-border",
		"--prism-glass-surface",
		"--text-color",
		"--text-muted",
		"--icon-stroke",
		"--prism-font",
		"--border-radius",
		"--border-radius-sm",
		"--border-radius-md",
		"--border-radius-lg",
	].forEach((prop) => root.style.removeProperty(prop));
	Object.values(prism.ICON_STYLE_CLASS).forEach((cls) => document.body.classList.remove(cls));
	Object.values(prism.MENU_STYLE_CLASS).forEach((cls) => document.body.classList.remove(cls));
	Object.values(prism.BUTTON_STYLE_CLASS).forEach((cls) => document.body.classList.remove(cls));
	Object.values(prism.HOVER_EFFECT_CLASS).forEach((cls) => document.body.classList.remove(cls));
	Object.values(prism.FIELD_STYLE_CLASS).forEach((cls) => document.body.classList.remove(cls));
	Object.values(prism.CORNER_STYLE_CLASS).forEach((cls) => cls && document.body.classList.remove(cls));
	Object.values(prism.CHECKBOX_STYLE_CLASS).forEach((cls) => cls && document.body.classList.remove(cls));
	document.body.classList.remove("prism-theme-active", "prism-dark-theme", "prism-bg-gradient", "prism-desktop-image-bg");
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
	if (prism.base_theme.app_overrides && Object.keys(prism.base_theme.app_overrides).length) {
		prism.watch_app_overrides();
	}
}
