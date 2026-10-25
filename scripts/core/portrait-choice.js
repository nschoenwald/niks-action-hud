/**
 * Portrait art chosen on this client, per actor ("token" or "portrait"). Overrides the world's
 * Portrait source setting for that actor only.
 */

import { updateClientStore } from "./client-store.js";
import { readSetting } from "./setting-read.js";

const PORTRAIT_CHOICE_SETTING = "portraitChoice";

/** This client's choice for the actor, or null when it follows the world setting. */
export function portraitChoiceFor(actorId) {
	try {
		const choice = readSetting(PORTRAIT_CHOICE_SETTING)?.[actorId];
		return choice === "token" || choice === "portrait" ? choice : null;
	} catch (_err) {
		return null;
	}
}

export function setPortraitChoice(actorId, choice) {
	return updateClientStore(PORTRAIT_CHOICE_SETTING, (choices) => {
		choices[actorId] = choice;
	});
}
