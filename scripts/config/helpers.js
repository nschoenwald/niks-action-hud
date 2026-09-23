import { MODULE_ID } from "../constants.js";

/**
 * Tab switching helper with permission checks for Nik's Action HUD.
 */
export const switchTab = (app, tabName, render = false) => {
	const styleRole = game.settings.get(MODULE_ID, "styleConfigRole") ?? 1;
	const menuRole = game.settings.get(MODULE_ID, "menuConfigRole") ?? 4;
	const canEditStyle = game.user.role >= styleRole;
	const canEditMenu = game.user.role >= menuRole;

	if ((tabName === "appearance" || tabName === "imageStudio") && !canEditStyle) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	if (tabName === "menu" && !canEditMenu) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
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
