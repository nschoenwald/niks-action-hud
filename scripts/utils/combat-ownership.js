/**
 * Shared helpers for turn-ending logic (client UI, endTurn and GM socket handler).
 */

/**
 * Whether a combatant is the given actor/token. When a tokenId is supplied it is
 * authoritative, so duplicate unlinked tokens of one actor never match each other.
 * @param {Combatant} combatant
 * @param {string|null} actorId
 * @param {string|null} tokenId
 * @returns {boolean}
 */
export function combatantMatches(combatant, actorId = null, tokenId = null) {
	if (!combatant) return false;
	if (tokenId) {
		return combatant.tokenId === tokenId || combatant.token?.id === tokenId;
	}
	if (actorId) {
		return combatant.actorId === actorId
			|| combatant.actor?.id === actorId
			|| combatant.token?.actor?.id === actorId;
	}
	return true;
}

/**
 * Whether a user may end the turn of a combatant (GM, owner, or listed player).
 * @param {User} user
 * @param {Combatant} combatant
 * @returns {boolean}
 */
export function userOwnsCombatant(user, combatant) {
	if (!user || !combatant) return false;
	if (user.isGM) return true;
	const actor = combatant.actor ?? combatant.token?.actor;
	return Boolean(
		combatant.testUserPermission?.(user, "OWNER")
		|| actor?.testUserPermission?.(user, "OWNER")
		|| combatant.players?.some((u) => u.id === user.id)
	);
}
