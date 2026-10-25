/**
 * Pins feature: the actor's ordered favorites list (stored as an actor flag).
 */

import { FLAGS } from "../../core/ids.js";
import { getActorFlag, syncActorFlagWithLinkedTokens } from "../../core/actor-flags.js";
import { parseRef, documentIdOf } from "../../core/action-ref.js";
import { placePin } from "./ordering.js";

/**
 * Whether a stored favorite id still means something for this actor: a system action the current
 * provider handles, an owned item, or a document uuid. Anything else (ids written by older
 * versions, items that no longer exist) is dropped on read and disappears at the next write.
 */
function isLiveFavorite(actor, id) {
	if (typeof id !== "string" || !id) return false;
	const { kind } = parseRef(id);
	if (kind !== "item") return Boolean(window.NikHUD?.provider?.def?.handlers?.[kind]);
	return Boolean(actor.items?.get(documentIdOf(id) ?? "")) || id.includes(".");
}

/** The favorites stored on `actor`, minus ids that no longer resolve. */
export function liveFavorites(actor) {
	const stored = getActorFlag(actor, FLAGS.FAVORITES);
	return Array.isArray(stored) ? stored.filter((id) => isLiveFavorite(actor, id)) : [];
}

/**
 * Retrieves the list of favorited action/item identifiers for the current actor.
 * @param {object} shell
 * @returns {string[]}
 */
export function listFavorites(shell) {
	const activeActor = shell?.currentActor;
	if (!activeActor) return [];

	if (activeActor.isToken) {
		const baseActor = game.actors?.get(activeActor.id) || activeActor.baseActor;
		if (baseActor && Array.isArray(getActorFlag(baseActor, FLAGS.FAVORITES))) return liveFavorites(baseActor);
	}

	return liveFavorites(activeActor);
}

/**
 * Toggles an item ID in the actor's favorites list.
 * @param {object} shell
 * @param {string} itemId
 */
export async function toggleFavorite(shell, itemId) {
	const activeActor = shell?.currentActor;
	if (!activeActor || !itemId) return;

	const currentFavorites = listFavorites(shell);
	const isAlreadyFavorite = currentFavorites.includes(itemId);
	const nextFavorites = isAlreadyFavorite
		? currentFavorites.filter((id) => id !== itemId)
		: [...currentFavorites, itemId];

	await syncActorFlagWithLinkedTokens(activeActor, FLAGS.FAVORITES, nextFavorites);
	shell.requestRefresh();
}

/**
 * Adds an item ID to the end of the favorites.
 * @param {object} shell
 * @param {string} itemId
 * @returns {Promise<boolean>}
 */
export async function addFavorite(shell, itemId) {
	const activeActor = shell?.currentActor;
	if (!activeActor || !itemId) return false;

	const currentFavorites = [...listFavorites(shell)];
	if (currentFavorites.includes(itemId)) return false;
	currentFavorites.push(itemId);

	await syncActorFlagWithLinkedTokens(activeActor, FLAGS.FAVORITES, currentFavorites);
	shell.requestRefresh();
	return true;
}

/**
 * Removes an item ID from favorites.
 * @param {object} shell
 * @param {string} itemId
 * @param {Actor} [actor=null]
 */
export async function removeFavorite(shell, itemId, actor = null) {
	const targetActor = actor || shell?.currentActor;
	if (!targetActor || !itemId) return;
	if (!targetActor.isOwner && !game.user.isGM) return;

	const existingFavorites = liveFavorites(targetActor);
	if (!existingFavorites.includes(itemId)) return;

	const updated = existingFavorites.filter((id) => id !== itemId);
	await syncActorFlagWithLinkedTokens(targetActor, FLAGS.FAVORITES, updated);

	if (shell?.currentActor?.id === targetActor.id) {
		shell.requestRefresh();
	}
}

/**
 * Move a favorite next to another one (before it, or after it when `after`).
 * @returns {Promise<boolean>} true when the order changed and was saved.
 */
export async function movePin(shell, pinId, anchorId, after = false, actor = null) {
	const owner = actor || shell?.currentActor;
	if (!owner || !pinId || !anchorId) return false;

	const current = liveFavorites(owner);
	const next = placePin(current, pinId, anchorId, after);
	if (next === current) return false;

	await syncActorFlagWithLinkedTokens(owner, FLAGS.FAVORITES, next);
	if (shell?.currentActor?.id === owner.id) shell.requestRefresh();
	return true;
}

