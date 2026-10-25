/**
 * Moves the schema's mirrored options between the panel draft and the registered settings:
 * their live values seed the draft, and a save or reset writes them back.
 */

import { MODULE_ID } from "../../core/ids.js";
import { MIRRORED_OPTIONS } from "../../core/setting-schema.js";

const isRegistered = (key) => Boolean(game.settings?.settings?.has(`${MODULE_ID}.${key}`));

/** Live values of the mirrored settings that exist, as `{ draftField: value }`. */
export function readMirroredSettings() {
	return Object.fromEntries(
		MIRRORED_OPTIONS.filter(({ key }) => isRegistered(key)).map(({ key }) => [key, game.settings.get(MODULE_ID, key)]),
	);
}

/**
 * Write the mirrored settings from a saved profile.
 * @param {object} profile  Profile-shaped config (`draft.toProfile()`).
 * @param {{ profileLevel?: boolean }} [options]  `profileLevel: false` skips the profile-level fields.
 */
export async function writeMirroredSettings(profile, { profileLevel = true } = {}) {
	for (const { key, scope } of MIRRORED_OPTIONS) {
		if (scope === "world" && !profileLevel) continue;
		if (isRegistered(key) && profile[key] !== undefined) await game.settings.set(MODULE_ID, key, profile[key]);
	}
}
