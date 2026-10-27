import { MODULE_ID } from "./ids.js";

/**
 * Grouped persistence for the HUD profile.
 *
 * Persisted shape:
 *   { schemaVersion, look:{}, behavior:{}, providers:{}, layout:{}, meta:{}, extra:{} }
 * Runtime code works with a flat view ("flat profile") produced by flatten()
 * and converted back with nest() when saving.
 */
const PROFILE_VERSION = 3;

/** [flat key, persisted path] */
const FIELD_PATHS = Object.freeze([
	["theme", "look.theme"],
	["fontFamily", "look.fontFamily"],
	["portraitSource", "look.portraitSource"],
	["buttonShape", "look.buttonShape"],
	["hudOpacity", "look.hudOpacity"],
	["tooltipScale", "look.tooltipScale"],
	["hudEnabled", "behavior.enabled"],
	["hideForGm", "behavior.hideForGm"],
	["closeDrawerOnUse", "behavior.closeDrawerOnUse"],
	["hideEmptyDrawers", "behavior.hideEmptyDrawers"],
	["fadeWhenIdle", "behavior.idleFade"],
	["drawerSide", "behavior.drawerSide"],
	["favoritesLayout", "behavior.favoritesLayout"],
	["minimizeButton", "behavior.minimizeButton"],
	["combatTurnAlert", "behavior.combatTurnAlert"],
	["combatTurnSound", "behavior.combatTurnSound"],
	["combatTurnNpc", "behavior.combatTurnNpc"],
	["hiddenActorTypes", "behavior.hiddenActorTypes"],
	["autoFavoriteNpcActions", "behavior.autoPinNpcActions"],
	["autoFavoriteNpcMax", "behavior.autoPinNpcMax"],
	["autoFavoriteNpcAttacks", "behavior.autoPinNpcAttacks"],
	["dnd5eGroupByActivation", "providers.dnd5e.groupByActivation"],
	["dnd5eShowToolChecks", "providers.dnd5e.toolChecks"],
	["dnd5eAbilityOrder", "providers.dnd5e.abilityOrder"],
	["dnd5eShowUnpreparedRituals", "providers.dnd5e.unpreparedRituals"],
	["dnd5eDamageTypeDisplay", "providers.dnd5e.damageDisplay"],
	["dockPosition", "layout.dock"],
	["layoutCategories", "layout.categories"],
	["_seeded", "meta.seeded"],
	["_sdThemeApplied", "meta.sdThemeApplied"],
	["_carolThemeApplied", "meta.carolThemeApplied"],
]);

const readPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

const writePath = (obj, path, value) => {
	const keys = path.split(".");
	let node = obj;
	for (const key of keys.slice(0, -1)) {
		if (typeof node[key] !== "object" || node[key] === null) node[key] = {};
		node = node[key];
	}
	node[keys.at(-1)] = value;
};

const KNOWN_FLAT = new Set(FIELD_PATHS.map(([key]) => key));

/** Convert a flat profile into the grouped persisted shape. */
export function nest(flat) {
	const normalized = flat ?? {};
	const out = { schemaVersion: PROFILE_VERSION };
	const extra = {};
	for (const [key, value] of Object.entries(normalized)) {
		if (value === undefined || key === "schemaVersion") continue;
		if (KNOWN_FLAT.has(key)) continue;
		extra[key] = value;
	}
	for (const [key, path] of FIELD_PATHS) {
		if (normalized[key] !== undefined) writePath(out, path, foundry.utils.deepClone(normalized[key]));
	}
	if (Object.keys(extra).length) out.extra = foundry.utils.deepClone(extra);
	return out;
}

/** Convert the grouped persisted shape into the flat runtime view. */
function flatten(persisted) {
	const flat = {};
	for (const [key, path] of FIELD_PATHS) {
		const value = readPath(persisted, path);
		if (value !== undefined) flat[key] = foundry.utils.deepClone(value);
	}
	if (persisted?.extra && typeof persisted.extra === "object") {
		Object.assign(flat, foundry.utils.deepClone(persisted.extra));
	}
	return flat;
}

let cached = null;

/** Drop the cached flat profile (called when the stored profile changes). */
export function invalidateProfileCache() {
	cached = null;
}

/**
 * The current profile for reading. The object is shared and cached until the stored profile
 * changes, so it must not be modified; use getProfile() when you need to edit.
 */
export function readProfile() {
	const stored = game.settings.get(MODULE_ID, "hudProfile");
	if (cached?.source === stored) return cached.flat;
	cached = { source: stored, flat: flatten(stored && typeof stored === "object" ? stored : {}) };
	return cached.flat;
}

/** Read the current profile as a flat runtime object (always a fresh copy, safe to edit). */
export function getProfile() {
	const stored = game.settings.get(MODULE_ID, "hudProfile");
	return flatten(stored && typeof stored === "object" ? stored : {});
}

/** Persist a flat runtime profile in the current grouped shape. */
export async function saveProfile(flat) {
	invalidateProfileCache();
	return game.settings.set(MODULE_ID, "hudProfile", nest(flat));
}
