import { getProfile, saveProfile, nest, invalidateProfileCache } from "./profile.js";
import { NikHudConfigApp } from "../features/settings-panel/app.js";
import { exportHudConfig } from "../features/settings-panel/option-schema.js";
import { hud } from "./runtime.js";
import { socket } from "./socket.js";
import { combatantMatches, userOwnsCombatant } from "./combat-ownership.js";
import { isLegendaryPlaceholderTurn, legendaryCombatantOf } from "./legendary-placeholders.js";
import { dnd5eDefinition } from "../providers/dnd5e/provider.js";
import { shadowdarkDefinition } from "../providers/shadowdark/provider.js";
import { providerRegistry } from "../providers/registry.js";
import { MODULE_ID } from "./ids.js";
import { toggleHudVisibility } from "./visibility.js";
import { mayMirror } from "./mirror-guard.js";
import { MIRRORED_OPTIONS, defaultOf } from "./setting-schema.js";
import { registerResetMarker } from "./settings-reset.js";

// ── Declarative setting tables ──────────────────────────

/** Stored defaults. The layout starts empty: the active system's starter layout fills it on first load. */
const profileDefaults = () => nest(exportHudConfig({}));

/** Client-only storage objects: [key, label]. */
const CLIENT_STORES = [
	["hudPlacement", "Client Position Overrides"],
	["portraitChoice", "Client Portrait Choice"],
	["drawerToggles", "Client Drawer Toggles"],
];

const SETTING_TYPES = { boolean: Boolean, number: Number, string: String };

function registerMirrored(spec) {
	const i18n = `NAH.Settings.${spec.label}`;
	const choices = spec.choices
		? Object.fromEntries(Object.keys(spec.choices).map((k) => [k, `${i18n}.${spec.choices[k]}`]))
		: undefined;

	game.settings.register(MODULE_ID, spec.key, {
		name: `${i18n}.Name`,
		hint: `${i18n}.Hint`,
		scope: spec.scope,
		config: false,
		type: SETTING_TYPES[spec.type],
		default: defaultOf(spec),
		...(choices && { choices }),
		...(spec.range && { range: spec.range }),
		onChange: (value) => {
			// World settings fire onChange on every connected client; only the active GM mirrors them.
			if (mayMirror(spec, { game })) {
				const profile = getProfile();
				if (profile[spec.key] !== value) {
					profile[spec.key] = value;
					saveProfile(profile);
				}
			}
			if (spec.refresh) hud.requestRefresh();
		},
	});
}

function registerStorage() {
	registerResetMarker();
	game.settings.register(MODULE_ID, "hudProfile", {
		name: "Global Action HUD Config",
		scope: "world",
		config: false,
		type: Object,
		default: profileDefaults(),
		onChange: () => {
			invalidateProfileCache();
			hud.requestRefresh();
		},
	});

	// Writes that already applied themselves on screen (dock moved by hand) pass `skipRefresh`.
	const repaintUnlessDragging = (_value, options) => {
		if (options?.skipRefresh || document.getElementById(hud.DOCK_ID)?._justDragged) return;
		hud.requestRefresh();
	};
	for (const [key, name] of CLIENT_STORES) {
		game.settings.register(MODULE_ID, key, { name, scope: "client", config: false, type: Object, default: {}, onChange: repaintUnlessDragging });
	}
}

const CONFIG_MENU_KEY = "settingsMenu";
const DEFAULT_PRECEDENCE = () => CONST.KEYBINDING_PRECEDENCE.NORMAL;

function registerUserFacing() {
	game.settings.register(MODULE_ID, "disableHUD", {
		name: "NAH.Settings.DisableHud.Name",
		hint: "NAH.Settings.DisableHud.Hint",
		scope: "user",
		config: true,
		type: Boolean,
		default: false,
		onChange: (disabled) => (disabled ? hud.hideHud() : hud.refresh()),
	});

	game.settings.registerMenu(MODULE_ID, CONFIG_MENU_KEY, {
		name: "NAH.Settings.ConfigMenu.Name",
		label: "NAH.Settings.ConfigMenu.Label",
		hint: "NAH.Settings.ConfigMenu.Hint",
		icon: "fas fa-cogs",
		type: NikHudConfigApp,
		restricted: false,
	});

	for (const spec of MIRRORED_OPTIONS) {
		if (!spec.system || game.system.id === spec.system) registerMirrored(spec);
	}
}

function registerKeybindings() {
	game.keybindings.register(MODULE_ID, "toggleHudVisibility", {
		name: "NAH.Keybindings.ToggleVisibility.Name",
		hint: "NAH.Keybindings.ToggleVisibility.Hint",
		editable: [{ key: "KeyH", modifiers: ["Shift"] }],
		onDown: () => toggleHudVisibility(hud, game.settings.get(MODULE_ID, "disableHUD")),
		restricted: false,
		precedence: DEFAULT_PRECEDENCE(),
	});
}

// ── Remote actions ──────────────────────────────────────

/** The requested combat, or an error when it is not running or the turn moved since the request. */
function requestedCombat(data) {
	const combat = (data?.combatId ? game.combats.get(data.combatId) : null) || game.combat || game.combats?.active;
	if (!combat?.started) return { error: "Combat not active" };
	const active = combat.combatant;
	if (!active) return { error: "No active combatant in combat" };

	const stale = [
		[data?.combatantId && active.id !== data.combatantId, "Combat turn has already advanced"],
		[Number.isInteger(data?.round) && data.round !== combat.round, "Combat round has already changed"],
		[Number.isInteger(data?.turn) && data.turn !== combat.turn, "Combat turn has already changed"],
	].find(([isStale]) => isStale);
	return stale ? { error: stale[1] } : { combat, active };
}

/** Validate a player's request to end the active turn, then advance the combat as GM. */
async function endTurnForPlayer(data, callerUserId) {
	if (!game.user.isGM) return { success: false, error: "Only a GM can end a turn for a player" };

	const { combat, active, error } = requestedCombat(data);
	if (error) return { success: false, error };

	// callerUserId is the server-verified socket sender
	const requester = callerUserId ? game.users.get(callerUserId) : null;
	if (!requester) return { success: false, error: "Unknown requesting user" };
	if (!userOwnsCombatant(requester, active)) return { success: false, error: "User does not own the active combatant" };
	if (!combatantMatches(active, data?.actorId, data?.tokenId)) {
		return { success: false, error: "Active combatant does not match the request" };
	}

	await combat.nextTurn();
	return { success: true };
}

/**
 * Validate a player's request to pass a legendary action placeholder turn (Nik's DnD5e Tweaks): the
 * combat must be on a placeholder and the player must own a creature in it with legendary actions.
 */
async function passLegendaryTurnForPlayer(data, callerUserId) {
	if (!game.user.isGM) return { success: false, error: "Only a GM can pass a turn for a player" };

	const { combat, error } = requestedCombat(data);
	if (error) return { success: false, error };
	if (!isLegendaryPlaceholderTurn(combat)) return { success: false, error: "Not a legendary action placeholder turn" };

	const requester = callerUserId ? game.users.get(callerUserId) : null;
	if (!requester) return { success: false, error: "Unknown requesting user" };
	const legendary = legendaryCombatantOf(combat, data?.actorId, data?.tokenId);
	if (!legendary || !userOwnsCombatant(requester, legendary)) {
		return { success: false, error: "User does not own a creature with legendary actions in this combat" };
	}

	await combat.nextTurn();
	return { success: true };
}

function registerProviders() {
	const providers = [
		["dnd5e", dnd5eDefinition],
		["shadowdark", shadowdarkDefinition],
	];
	for (const [gameSystemId, ProviderClass] of providers) providerRegistry.registerProvider(gameSystemId, ProviderClass);
	window.NikHUD.provider = providerRegistry.instantiateProvider(game.system.id);
}

export class ModuleSettingsRegistrar {
	static initialize() {
		registerStorage();
		registerUserFacing();
		registerKeybindings();

		hud.initialize();

		window.NikHUD.socket = socket;
		socket.register("endCombatTurn", endTurnForPlayer);
		socket.register("passLegendaryTurn", passLegendaryTurnForPlayer);

		registerProviders();
	}
}
