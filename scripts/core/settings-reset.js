/**
 * One-time cleanup of stored settings. The first time the active GM loads this version in a world,
 * every world- and user-scoped setting the module stored before (including keys earlier versions
 * used and no longer register) is deleted, so all settings start again from their defaults.
 * A hidden world setting records that the cleanup ran. Client-scoped settings live in each
 * browser's local storage and are not touched.
 */

import { MODULE_ID } from "./ids.js";

const MARKER = "settingsGeneration";
const CURRENT_GENERATION = 2;

export function registerResetMarker() {
	game.settings.register(MODULE_ID, MARKER, { scope: "world", config: false, type: Number, default: 0 });
}

/**
 * Delete the module's stored settings once per world (active GM only).
 * @returns {Promise<number>} How many stored settings were removed.
 */
export async function resetStoredSettingsOnce() {
	if (!game.user?.isActiveGM) return 0;
	if (Number(game.settings.get(MODULE_ID, MARKER)) >= CURRENT_GENERATION) return 0;

	const prefix = `${MODULE_ID}.`;
	const stored = game.settings.storage.get("world").filter((setting) => setting.key.startsWith(prefix));
	if (stored.length) await CONFIG.Setting.documentClass.deleteDocuments(stored.map((setting) => setting.id));
	await game.settings.set(MODULE_ID, MARKER, CURRENT_GENERATION);

	if (stored.length) {
		const message = game.i18n.localize("NAH.Notifications.SettingsReset");
		ui.notifications?.info(message !== "NAH.Notifications.SettingsReset" ? message : "Nik's Action HUD: settings from an earlier version were reset to their defaults.");
	}
	return stored.length;
}
