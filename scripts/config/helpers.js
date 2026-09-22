import { MODULE_ID } from "../constants.js";
export const tryAutoLabel = (app, pathInput, pathValue, sourceText = null) => {
	const pathName = pathInput.name;
	const labelName = pathName.replace(".path", ".label");
	const labelInput = app.element.querySelector(`input[name="${labelName}"]`);

	if (!labelInput) return;

	const currentLabel = labelInput.value.trim();
	if (currentLabel !== "" && currentLabel !== "NEW") return;

	let newLabel = "";

	if (sourceText) {
		const match = sourceText.match(/\(([^)]+)\)/);
		if (match) {
			newLabel = match[1];
		} else {
			newLabel = sourceText.trim();
		}
	}

	if ((!newLabel || newLabel.length > 10) && pathValue) {
		const parts = pathValue.split(".");
		const lastPart = parts[parts.length - 1];
		if (lastPart) {
			if (lastPart.length <= 4) {
				newLabel = lastPart.toUpperCase();
			} else {
				newLabel = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
			}
		}
	}

	if (newLabel) {
		labelInput.value = newLabel;
		labelInput.dispatchEvent(new Event("change", { bubbles: true }));
	}
};

export const updateInputIfEmpty = (app, name, value) => {
	const input = app.element.querySelector(`input[name="${name}"]`);
	if (input && (input.value === "0" || input.value === "")) {
		input.value = value;
	}
};

export const switchTab = (app, tabName, render = true) => {
	const styleRole = game.settings.get(MODULE_ID, "styleConfigRole") ?? 4;
	const menuRole = game.settings.get(MODULE_ID, "menuConfigRole") ?? 4;
	const canEditTracking = game.user.role >= styleRole;
	const canEditStyle = game.user.role >= styleRole;
	const canEditMenu = game.user.role >= menuRole;

	if (tabName === "tracking" && !canEditTracking) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	if ((tabName === "common" || tabName === "card" || tabName === "actionmenu") && !canEditStyle) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	if (tabName === "portrait" && !canEditStyle) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	if (tabName === "menu" && !canEditMenu) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	if (tabName === "effects" && !game.user.isGM) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}

	app.activeTab = tabName;

	const navs = app.element.querySelectorAll(".sheet-tabs .item");
	navs.forEach((nav) => {
		if (nav.dataset.tab === tabName) nav.classList.add("active");
		else nav.classList.remove("active");
	});

	const contents = app.element.querySelectorAll(".tab-content");
	contents.forEach((content) => {
		if (content.dataset.tab === tabName) {
			content.classList.add("active");
			content.style.display = "block";
		} else {
			content.classList.remove("active");
			content.style.display = "none";
		}
	});

	if (render) {
		app._captureInputData(app.element);
		app.render();
	}
};

export const updateGlobalLabel = (app, target) => {
	const name = target.name;

	if (name.includes("Top") || name.includes("Left") || name.includes("Gap")) {
		return;
	}

	let suffix = "%";
	let isScale = false;

	if (name === "globalScale" || name === "actionMenuScale") {
		suffix = "x";
		isScale = true;
	}

	const span = target.nextElementSibling;
	if (span && span.classList.contains("range-val")) {
		let displayVal = target.value;

		if (isScale) {
			displayVal = Number(target.value).toFixed(2);
		}

		span.textContent = `${displayVal}${suffix}`;
	}
};
