/**
 * Drawer toggles: on/off switches a drawer shows in its header (e.g. "show unprepared spells").
 * Each player's choice is kept in the client store `drawerToggles` as `{ [toggleId]: boolean }`.
 */

import { updateClientStore } from "./client-store.js";
import { readSetting } from "./setting-read.js";

const DRAWER_TOGGLES_SETTING = "drawerToggles";

/** Whether toggle `id` is on (off when never set or the store cannot be read). */
export function isDrawerToggleOn(id) {
	try {
		return readSetting(DRAWER_TOGGLES_SETTING)?.[id] === true;
	} catch (_err) {
		return false;
	}
}

/** Turn toggle `id` on or off; the store's onChange repaints the HUD. */
export function setDrawerToggle(id, on) {
	return updateClientStore(DRAWER_TOGGLES_SETTING, (toggles) => {
		if (on) toggles[id] = true;
		else delete toggles[id];
	});
}

/**
 * A toggle entry for a drawer's `toggles` list.
 * @param {string} id
 * @param {{ icon: string, onTitle: string, offTitle: string }} look  icon class; tooltip while on / off
 */
export function drawerToggle(id, { icon, onTitle, offTitle }) {
	const active = isDrawerToggleOn(id);
	return { id, icon, active, title: active ? onTitle : offTitle };
}
