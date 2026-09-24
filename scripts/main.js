import { SettingsManager } from "./settings.js";
import { ActionMenu } from "./features/action-menu.js";
import { MODULE_ID } from "./constants.js";
import { defaultRegistry } from "./systems/defaults.js";

class ActionHUD {
	static ID = MODULE_ID;
	static actionMenu = ActionMenu;
	static socket = null;
	static adapter = null;
	static settingsManager = SettingsManager;
	static _isSavingConfig = false;

	static toggleEditMode(enable) {
		ActionMenu.toggleEditMode(enable);
	}

	static previewUpdate(editId, data) {
		ActionMenu.previewUpdate(data);
	}

	static get isVisible() {
		try {
			const isHudDisabled = game.settings.get(MODULE_ID, "disableHUD");
			if (isHudDisabled) return false;
			const root = document.getElementById(ActionMenu.ROOT_ID);
			if (!root) return false;
			return !root.classList.contains("collapsed") && root.style.display !== "none";
		} catch {
			return true;
		}
	}

	static initialize() {
		SettingsManager.initialize();
	}

	static refresh() {
		try {
			if (game.settings.get(MODULE_ID, "disableHUD")) {
				ActionMenu.hideMenu();
				const root = document.getElementById(ActionMenu.ROOT_ID);
				if (root) root.remove();
				return;
			}
		} catch (_e) {}
		ActionMenu.refresh();
	}

	static showHUD() {
		try {
			if (game.settings.get(MODULE_ID, "disableHUD")) return;
		} catch (_e) {}
		ActionMenu.refresh();
	}

	static hideHUD() {
		ActionMenu.hideMenu();
	}

	static async toggleHUD(toggled) {
		if (toggled) {
			ActionMenu.refresh();
		} else {
			ActionMenu.hideMenu();
		}
	}

	static async useItem(itemId, event = null) {
		const current = ActionMenu.currentActor;
		if (!current) return;
		if (ActionHUD.adapter?.useItem) {
			return ActionHUD.adapter.useItem(current, itemId, event);
		}
		return ActionMenu.useItem(itemId, event);
	}
}

// Assign global reference for API
window.ActionHUD = ActionHUD;
window.ActionHUD.actionMenu = ActionMenu;

Hooks.once("init", () => {
	ActionHUD.initialize();
});

Hooks.once("ready", async () => {
	// Migrate legacy client-scoped localStorage disableHUD to user-scoped setting
	try {
		const legacyVal = window.localStorage.getItem(`${MODULE_ID}.disableHUD`);
		if (legacyVal !== null) {
			const parsed = JSON.parse(legacyVal);
			if (parsed === true && !game.settings.get(MODULE_ID, "disableHUD")) {
				await game.settings.set(MODULE_ID, "disableHUD", true);
			}
			window.localStorage.removeItem(`${MODULE_ID}.disableHUD`);
		}
	} catch (_e) {}

	const config = game.settings.get(MODULE_ID, "configuration") || {};

	if (game.user.isGM) {
		const currentConfig = game.settings.get(MODULE_ID, "configuration") || {};
		if (!currentConfig._seededDefaults) {
			const missingMenu = !Array.isArray(currentConfig.customMenu) || currentConfig.customMenu.length === 0;
			if (missingMenu) {
				const adapter = window.ActionHUD?.adapter;
				const seededConfig = { ...currentConfig };
				seededConfig.customMenu = defaultRegistry.getDefaultLayout(game.system.id, adapter);
				seededConfig._seededDefaults = true;
				await game.settings.set(MODULE_ID, "configuration", seededConfig);
			}
		}
	}

	let resizeTimeout;
	window.addEventListener("resize", () => {
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			if (ActionHUD.isVisible) {
				ActionHUD.refresh();
			}
		}, 150);
	});

	// Combat state monitoring
	const onCombatChange = () => {
		try {
			if (game.settings.get(MODULE_ID, "disableHUD")) return;
		} catch (_e) {}
		const config = game.settings.get(MODULE_ID, "configuration") || {};
		const visibility = config.actionMenuVisibility || "always";

		if (visibility === "combatOnly") {
			const inCombat = Boolean(game.combat?.started ?? game.combat);
			if (inCombat) {
				ActionMenu.refresh();
			} else {
				ActionMenu.hideMenu();
			}
		} else if (visibility !== "never") {
			ActionMenu.refresh();
		}
	};

	Hooks.on("createCombat", onCombatChange);
	Hooks.on("updateCombat", onCombatChange);
	Hooks.on("deleteCombat", onCombatChange);
	Hooks.on("canvasReady", () => {
		try {
			if (game.settings.get(MODULE_ID, "disableHUD")) return;
		} catch (_e) {}
		ActionMenu.refresh();
	});
	Hooks.on("updateUser", (user) => {
		if (user.id === game.user.id) ActionMenu.refresh();
	});
});

export { ActionHUD };
