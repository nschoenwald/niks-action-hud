import { getProfile, saveProfile } from "./core/profile.js";
import { ModuleSettingsRegistrar } from "./core/settings.js";
import { hud } from "./core/runtime.js";
import { MODULE_ID, isSupportedSystem } from "./core/ids.js";
import { resetStoredSettingsOnce } from "./core/settings-reset.js";
import { registerAutoFavoriteNpcHook } from "./features/pins/auto-pin.js";
import { isThemeAvailable, getDefaultTheme } from "./features/settings-panel/ui-constants.js";
import { socket } from "./core/socket.js";
import { combatantMatches, userOwnsCombatant } from "./core/combat-ownership.js";
import { isLegendaryPlaceholderTurn, legendaryCombatantOf } from "./core/legendary-placeholders.js";
import { onCombatTurnUpdate, clearTurnAlert } from "./features/dock/turn-alert.js";

class NikHUD {
	static shell = hud;
	static socket = socket;
	static provider = null;

	static pushPreview(data) {
		hud.pushPreview(data);
	}

	static get isVisible() {
		try {
			const isHudDisabled = game.settings.get(MODULE_ID, "disableHUD");
			if (isHudDisabled) return false;
			return Boolean(document.getElementById(hud.DOCK_ID));
		} catch {
			return true;
		}
	}

	static initialize() {
		ModuleSettingsRegistrar.initialize();
	}

	static refresh() {
		try {
			if (game.settings.get(MODULE_ID, "disableHUD")) {
				hud.hideHud();
				const root = document.getElementById(hud.DOCK_ID);
				if (root) root.remove();
				return;
			}
		} catch (_e) {}
		hud.refresh();
	}

	static _isEndingTurn = false;

	/** The combat of the shown token, else the viewed or active combat. */
	static _combatFor(tokenId) {
		return (tokenId && canvas.tokens?.get(tokenId)?.combatant?.combat)
			|| hud.currentToken?.combatant?.combat
			|| hud.currentToken?.document?.combatant?.combat
			|| game.combat
			|| game.combats?.active
			|| null;
	}

	/** Run one turn change at a time; repeat clicks within 400 ms of the last one are ignored. */
	static async _guardTurnChange(run) {
		if (NikHUD._isEndingTurn) return;
		NikHUD._isEndingTurn = true;
		try {
			await run();
		} finally {
			setTimeout(() => {
				NikHUD._isEndingTurn = false;
			}, 400);
		}
	}

	/**
	 * Advance the combat past its current turn: directly as GM, else through the GM socket `action` with
	 * `request`, else (no GM connected) directly in case permissions allow it.
	 */
	static async _advanceTurn(combat, action, request) {
		if (game.user.isGM) {
			await combat.nextTurn();
			return;
		}

		const socket = NikHUD.socket;
		if (socket && game.users.activeGM) {
			// A GM is connected: never fall back to a direct call afterwards, since a
			// timed-out or rejected request may still have been (or deliberately not
			// been) processed, and a second nextTurn() could skip a combatant.
			try {
				const res = await socket.runAsGm(action, {
					combatId: combat.id,
					combatantId: combat.combatant.id,
					round: combat.round,
					turn: combat.turn,
					...request,
				});
				if (res?.error) {
					console.warn(`Nik's Action HUD | GM socket request "${action}" failed:`, res.error);
				}
			} catch (err) {
				console.error(`Nik's Action HUD | Error in GM socket request "${action}":`, err);
			}
			return;
		}

		// No GM connected: try a direct call in case permissions permit it
		try {
			await combat.nextTurn();
		} catch (err) {
			console.error("Nik's Action HUD | Failed to advance combat turn directly:", err);
			if (!game.users.activeGM) {
				ui.notifications?.warn("Cannot pass turn: No active GM connected to update the combat tracker.");
			}
		}
	}

	static async endTurn(actorId = null, tokenId = null) {
		return NikHUD._guardTurnChange(async () => {
			const combat = NikHUD._combatFor(tokenId);
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
			// (tokenId is authoritative so duplicate unlinked tokens don't match each other)
			if ((actorId || tokenId) && !combatantMatches(currentCombatant, actorId, tokenId)) {
				console.warn("Nik's Action HUD | Active combatant does not match specified actor/token.");
				return;
			}

			// Validate ownership: must be GM or owner of the active combatant
			if (!userOwnsCombatant(game.user, currentCombatant)) {
				ui.notifications?.warn(game.i18n.localize("NAH.UI.PermissionDenied") || "You do not have permission to perform this action.");
				return;
			}

			await NikHUD._advanceTurn(combat, "endCombatTurn", {
				actorId: currentCombatant.actorId,
				tokenId: currentCombatant.tokenId,
			});
		});
	}

	/**
	 * Pass a legendary action placeholder turn (Nik's DnD5e Tweaks) on behalf of a creature with legendary
	 * actions. The placeholder stands for every legendary creature, so this continues to the next turn.
	 */
	static async passLegendaryTurn(actorId = null, tokenId = null) {
		return NikHUD._guardTurnChange(async () => {
			const combat = NikHUD._combatFor(tokenId);
			if (!isLegendaryPlaceholderTurn(combat)) {
				console.warn("Nik's Action HUD | The combat is not on a legendary action placeholder turn.");
				return;
			}

			const legendary = legendaryCombatantOf(combat, actorId, tokenId);
			if (!legendary || !userOwnsCombatant(game.user, legendary)) {
				ui.notifications?.warn(game.i18n.localize("NAH.UI.PermissionDenied") || "You do not have permission to perform this action.");
				return;
			}

			await NikHUD._advanceTurn(combat, "passLegendaryTurn", {
				actorId: legendary.actorId,
				tokenId: legendary.tokenId,
			});
		});
	}
}

// Assign global reference for API
window.NikHUD = NikHUD;

Hooks.once("init", () => {
	if (!isSupportedSystem()) {
		console.info(`${MODULE_ID} | The ${game.system?.id} system is not supported; the Action HUD stays inactive.`);
		return;
	}
	NikHUD.initialize();
});

Hooks.once("ready", async function onReady() {
	if (!isSupportedSystem()) return;
	// Clear settings left by earlier versions before the first-run defaults below are applied.
	await resetStoredSettingsOnce();
	if (game.user.isGM) {
		const currentConfig = getProfile();
		const isFirstLoad = !currentConfig._seeded;
		let updatedConfig = null;

		if (isFirstLoad) {
			const provider = window.NikHUD?.provider;
			updatedConfig = { ...currentConfig };
			const noLayout = !Array.isArray(currentConfig.layoutCategories) || currentConfig.layoutCategories.length === 0;
			if (noLayout) {
				updatedConfig.layoutCategories = provider?.getStarterLayout?.() ?? [];
			}
			if (game.system.id === "shadowdark") {
				updatedConfig.theme = "shadowdark";
				updatedConfig._sdThemeApplied = true;
			} else if (isThemeAvailable("carolingian") && (!updatedConfig.theme || updatedConfig.theme === "arcanum" || !isThemeAvailable(updatedConfig.theme))) {
				updatedConfig.theme = "carolingian";
			} else if (!isThemeAvailable(updatedConfig.theme)) {
				updatedConfig.theme = getDefaultTheme();
			}
			updatedConfig._seeded = true;
			updatedConfig._carolThemeApplied = isThemeAvailable("carolingian");
		} else if (game.system.id === "shadowdark" && !currentConfig._sdThemeApplied && (currentConfig.theme === "arcanum" || !isThemeAvailable(currentConfig.theme))) {
			updatedConfig = { ...currentConfig, theme: "shadowdark", _sdThemeApplied: true };
		} else if (isThemeAvailable("carolingian") && !currentConfig._carolThemeApplied && (currentConfig.theme === "arcanum" || !isThemeAvailable(currentConfig.theme))) {
			// If Carolingian UI is newly available and world was on default theme, default to Carolingian on first load with crlngn-ui
			updatedConfig = { ...currentConfig, theme: "carolingian", _carolThemeApplied: true };
		} else if (!isThemeAvailable(currentConfig.theme)) {
			// Migrate legacy/removed theme to current default
			updatedConfig = { ...currentConfig, theme: getDefaultTheme() };
		}

		if (updatedConfig) {
			await saveProfile( updatedConfig);
		}
	}

	const debouncedViewportRefresh = foundry.utils.debounce(() => {
		if (NikHUD.isVisible) NikHUD.refresh();
	}, 150);
	window.addEventListener("resize", debouncedViewportRefresh, { passive: true });
	// Foundry's Interface Scale is part of the dock's zoom (see dock/layout.js).
	Hooks.on("clientSettingChanged", (key) => {
		if (key === "core.uiConfig") debouncedViewportRefresh();
	});

	// Combat and scene changes: one coalesced repaint per frame (a turn change also updates combatants).
	const refreshUnlessDisabled = () => {
		try {
			if (game.settings.get(MODULE_ID, "disableHUD")) return;
		} catch (_e) {}
		hud.requestRefresh();
	};

	Hooks.on("createCombat", refreshUnlessDisabled);
	Hooks.on("updateCombat", (combat, changed) => {
		onCombatTurnUpdate(combat, changed);
		refreshUnlessDisabled();
	});
	Hooks.on("deleteCombat", () => {
		clearTurnAlert();
		refreshUnlessDisabled();
	});
	Hooks.on("canvasReady", refreshUnlessDisabled);
	Hooks.on("updateUser", (user) => {
		if (user.id === game.user.id) hud.requestRefresh();
	});

	registerAutoFavoriteNpcHook();

	// Render HUD for active user on initial load
	try {
		if (!game.settings.get(MODULE_ID, "disableHUD")) {
			hud.refresh();
		}
	} catch (_e) {
		hud.refresh();
	}
});
