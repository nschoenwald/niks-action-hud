import { readFormValues } from "./form-reader.js";

export const activateTab = (app, tabName, render = false) => {
	app.activeTab = tabName;
	const container = app.element;
	if (!container) return;

	for (const nav of container.querySelectorAll(".hud-nav-item")) {
		nav.classList.toggle("active", nav.dataset.tab === tabName);
	}

	// "All settings" shows every pane one after another instead of a single one.
	container.querySelector(".hud-content-pane")?.classList.toggle("is-all", tabName === "all");

	for (const pane of container.querySelectorAll(".hud-tab-pane")) {
		pane.classList.toggle("active", pane.dataset.tab === tabName);
	}
	if (tabName !== app._shownTab) {
		container.querySelector(".hud-content-pane")?.scrollTo({ top: 0 });
		app._shownTab = tabName;
	}

	if (render) {
		app._readFormValues(container);
		app.render();
	}
};

/** Take the draft as it is after the first form read as the "saved" state to compare against. */
export const captureChangeBaseline = (app) => {
	if (!app.element) return;
	readFormValues(app, app.element);
	app.draft.rebase();
};

export const refreshConfigStatus = (app) => {
	const root = app.element;
	if (!root) return;

	root.querySelectorAll("[data-cfg-count]").forEach((counter) => {
		const group = counter.closest(".hud-cfg-group");
		if (!group) return;
		const total = counter.dataset.cfgCount === "checked"
			? group.querySelectorAll(".hud-chip input:checked").length
			: group.querySelectorAll(".hud-cfg-row").length;
		counter.textContent = `· ${total}`;
	});

	const themeName = root.querySelector("[data-active-theme-name]");
	const activeTheme = root.querySelector(".hud-theme-card.active .hud-theme-title");
	if (themeName && activeTheme) themeName.textContent = activeTheme.firstChild?.textContent?.trim() ?? "";

	const summary = root.querySelector(".hud-footer-summary");
	if (!summary) return;
	const changes = app.draft.changeCount;
	summary.textContent = changes === 0
		? game.i18n.localize("NAH.Panel.Footer.NoChanges")
		: game.i18n.format(changes === 1 ? "NAH.Panel.Footer.ChangesOne" : "NAH.Panel.Footer.ChangesMany", { count: changes });
};
