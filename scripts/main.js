import { SettingsManager } from "./settings.js";
import { ActionMenu } from "./features/action-menu.js";
import { MODULE_ID } from "./constants.js";
import { defaultRegistry } from "./systems/defaults.js";
import { registerAutoFavoriteNpcHook } from "./systems/dnd5e/auto-favorite.js";
import { isThemeAvailable, getDefaultTheme } from "./config/constants.js";

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

	static _isEndingTurn = false;

	static async endTurn(actorId = null, tokenId = null) {
		if (ActionHUD._isEndingTurn) return;
		ActionHUD._isEndingTurn = true;
		try {
			const combat = (tokenId && canvas.tokens?.get(tokenId)?.combatant?.combat)
				|| ActionMenu.currentToken?.combatant?.combat
				|| game.combat
				|| game.combats?.active
				|| null;

			if (!combat || !combat.started) {
				console.warn("Nik's Action HUD | No active combat encounter to end turn.");
				return;
			}

			const currentCombatant = combat.combatant;
			if (!currentCombatant) {
				console.warn("Nik's Action HUD | No active combatant in combat.");
				return;
			}

			// Verify that the active combatant matches target actor/token if specified
			if (actorId || tokenId) {
				const matchesActor = actorId && (currentCombatant.actorId === actorId || currentCombatant.actor?.id === actorId);
				const matchesToken = tokenId && currentCombatant.tokenId === tokenId;
				if (!matchesActor && !matchesToken) {
					console.warn("Nik's Action HUD | Active combatant does not match specified actor/token.");
					return;
				}
			}

			// Validate ownership: must be GM or owner of the active combatant
			if (!game.user.isGM && !currentCombatant.isOwner && !currentCombatant.actor?.isOwner) {
				ui.notifications?.warn(game.i18n.localize("NAH.UI.NoPermission") || "You do not have permission to perform this action.");
				return;
			}

			// If GM, advance turn directly
			if (game.user.isGM) {
				await combat.nextTurn();
				return;
			}

			// Non-GM player: request turn advancement via native GM socket dispatcher
			const socket = ActionHUD.socket;
			if (socket && game.users.activeGM) {
				try {
					const res = await socket.executeAsGM("endCombatTurn", {
						combatId: combat.id,
						combatantId: currentCombatant.id,
						actorId: currentCombatant.actorId,
						round: combat.round,
						turn: combat.turn,
					});
					if (res?.success) return;
					if (res?.error) {
						console.warn("Nik's Action HUD | Failed to end combat turn via GM socket:", res.error);
					}
				} catch (err) {
					console.error("Nik's Action HUD | Error ending combat turn via socket:", err);
				}
			}

			// Fallback: try direct call in case permissions permit it
			try {
				await combat.nextTurn();
			} catch (err) {
				console.error("Nik's Action HUD | Failed to advance combat turn directly:", err);
				if (!game.users.activeGM) {
					ui.notifications?.warn("Cannot pass turn: No active GM connected to update the combat tracker.");
				}
			}
		} finally {
			setTimeout(() => {
				ActionHUD._isEndingTurn = false;
			}, 400);
		}
	}
}

// Assign global reference for API
window.ActionHUD = ActionHUD;
window.ActionHUD.actionMenu = ActionMenu;
ActionMenu.endTurn = ActionHUD.endTurn;

Hooks.once("init", () => {
	ActionHUD.initialize();
});

Hooks.once("ready", async () => {
	const config = game.settings.get(MODULE_ID, "configuration") || {};

	if (game.user.isGM) {
		const currentConfig = game.settings.get(MODULE_ID, "configuration") || {};
		const isFirstLoad = !currentConfig._seededDefaults;
		let updatedConfig = null;

		if (isFirstLoad) {
			const adapter = window.ActionHUD?.adapter;
			updatedConfig = { ...currentConfig };
			const missingMenu = !Array.isArray(currentConfig.customMenu) || currentConfig.customMenu.length === 0;
			if (missingMenu) {
				updatedConfig.customMenu = defaultRegistry.getDefaultLayout(game.system.id, adapter);
			}
			if (isThemeAvailable("carolingian") && (!updatedConfig.theme || updatedConfig.theme === "arcanum" || updatedConfig.theme === "rift" || !isThemeAvailable(updatedConfig.theme))) {
				updatedConfig.theme = "carolingian";
			} else if (!isThemeAvailable(updatedConfig.theme)) {
				updatedConfig.theme = getDefaultTheme();
			}
			updatedConfig._seededDefaults = true;
			updatedConfig._carolingianDefaultApplied = isThemeAvailable("carolingian");
		} else if (isThemeAvailable("carolingian") && !currentConfig._carolingianDefaultApplied && (currentConfig.theme === "arcanum" || currentConfig.theme === "rift" || !isThemeAvailable(currentConfig.theme))) {
			// If Carolingian UI is newly available and world was on default theme or legacy theme, default to Carolingian on first load with crlngn-ui
			updatedConfig = { ...currentConfig, theme: "carolingian", _carolingianDefaultApplied: true };
		} else if (!isThemeAvailable(currentConfig.theme)) {
			// Migrate legacy/removed theme to current default
			updatedConfig = { ...currentConfig, theme: getDefaultTheme() };
		}

		if (updatedConfig) {
			await game.settings.set(MODULE_ID, "configuration", updatedConfig);
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
	Hooks.on("combatTurn", onCombatChange);
	Hooks.on("combatRound", onCombatChange);
	Hooks.on("canvasReady", () => {
		try {
			if (game.settings.get(MODULE_ID, "disableHUD")) return;
		} catch (_e) {}
		ActionMenu.refresh();
	});
	Hooks.on("updateUser", (user) => {
		if (user.id === game.user.id) ActionMenu.refresh();
	});

	registerAutoFavoriteNpcHook();
});

export { ActionHUD };
