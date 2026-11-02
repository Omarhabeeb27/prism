document.addEventListener("DOMContentLoaded", function () {
	// .for-login/.for-signup/.for-forgot/.for-login-with-email-link cover the
	// password + email-link auth flows; .for-email-login is the passwordless
	// "email login" card; OTP/2FA (#otp_div) and account-lockout messages are
	// injected INTO .for-login's own .page-card at runtime by login.js, so
	// they inherit this theming for free once it's applied — no separate
	// handling needed. .error-page is Frappe's generic error template, used
	// for (among others) the "Session Expired" (401) screen guests land on.
	var login_cards = document.querySelectorAll(
		".for-login .page-card, .for-signup .page-card, .for-forgot .page-card, .for-login-with-email-link .page-card, .for-email-login .page-card"
	);
	var error_page = document.querySelector(".error-page");
	if (!login_cards.length && !error_page) return; // not a page Prism themes

	fetch("/api/method/prism.api.get_login_theme")
		.then((r) => r.json())
		.then((r) => {
			var theme = r.message;
			if (!theme) return;

			if (window.prism && prism.apply_theme) {
				prism.apply_theme(theme);
			}

			if (login_cards.length) {
				document.body.classList.add("prism-login-active");

				// Keeps the logo in its own colours, with an accent mark as the fallback
				// when the file can't load for a guest.
				document.querySelectorAll(".page-card-head .app-logo").forEach(function (img) {
					if (img.closest(".prism-login-logo-badge")) return;
					var badge = document.createElement("div");
					badge.className = "prism-login-logo-badge";
					img.parentNode.insertBefore(badge, img);
					badge.appendChild(img);
					var mark_missing = function () {
						badge.classList.add("is-missing");
					};
					img.addEventListener("error", mark_missing);
					if (img.complete && !img.naturalWidth) mark_missing();
				});

				var LOGIN_STYLE_CLASS = {
					"Centered Card": "",
					"Split Screen": "prism-login-split",
					Minimal: "prism-login-minimal",
					"Glass Floating": "prism-login-glass",
					"Full Gradient": "prism-login-fullgradient",
				};
				Object.keys(LOGIN_STYLE_CLASS).forEach(function (key) {
					if (LOGIN_STYLE_CLASS[key]) document.body.classList.remove(LOGIN_STYLE_CLASS[key]);
				});
				var login_class = LOGIN_STYLE_CLASS[theme.login_style];
				if (login_class) document.body.classList.add(login_class);
			}

			if (error_page) {
				document.body.classList.add("prism-error-page-active");
			}
		})
		.catch(() => {
			/* theming is a progressive enhancement here — never block login on it */
		});
});
