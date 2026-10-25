import { MODULE_ID } from "./ids.js";

/**
 * Reads a module-scoped flag from an actor.
 * @param {Actor} actor
 * @param {string} flagKey
 * @returns {any}
 */
export function getActorFlag(actor, flagKey) {
	if (!actor?.getFlag) return undefined;
	return actor.getFlag(MODULE_ID, flagKey);
}

/**
 * Updates a module-scoped flag on an actor document.
 * @param {Actor} actor
 * @param {string} flagKey
 * @param {any} value
 * @returns {Promise<Actor|undefined>}
 */
async function setActorFlag(actor, flagKey, value) {
	if (!actor?.setFlag) return;
	return actor.setFlag(MODULE_ID, flagKey, value);
}

/**
 * Synchronizes flag modifications between base actors and active canvas tokens.
 * @private
 */
export async function syncActorFlagWithLinkedTokens(actor, key, value) {
	if (actor.isToken) {
		const baseActor = game.actors?.get(actor.id) || actor.baseActor;
		if (baseActor && (baseActor.isOwner || game.user.isGM)) {
			await setActorFlag(baseActor, key, value);
			await setActorFlag(actor, key, value);

			for (const token of canvas.tokens?.placeables ?? []) {
				if (token.actor?.isToken && token.actor.id === baseActor.id && token.actor !== actor) {
					setActorFlag(token.actor, key, value).catch(() => {});
				}
			}
			return;
		}
	}
	await setActorFlag(actor, key, value);
}

