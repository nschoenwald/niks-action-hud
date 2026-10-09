/**
 * Tab switching helper with permission checks for Nik's Action HUD.
 */
export const switchTab = (app, tabName, render = false) => {
	if (!game.user.can("SETTINGS_MODIFY")) {
		ui.notifications.warn(game.i18n.localize("NAH.UI.NoPermission"));
		return;
	}

	app.activeTab = tabName;

	if (!app.element) return;

	const navs = app.element.querySelectorAll(".hud-nav-item");
	navs.forEach((nav) => {
		if (nav.dataset.tab === tabName) nav.classList.add("active");
		else nav.classList.remove("active");
	});

	const contents = app.element.querySelectorAll(".hud-tab-pane");
	contents.forEach((content) => {
		if (content.dataset.tab === tabName) {
			content.classList.add("active");
		} else {
			content.classList.remove("active");
		}
	});

	if (render) {
		app._captureInputData(app.element);
		app.render();
	}
};

export const updateInputIfEmpty = (app, name, value) => {
	const input = app.element?.querySelector(`input[name="${name}"]`);
	if (input && (input.value === "0" || input.value === "")) {
		input.value = value;
	}
};
