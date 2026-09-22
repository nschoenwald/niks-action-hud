export function canUserSeeCard(user, actor) {
	if (user.isGM) return true;
	if (actor.isOwner) return true;
	return actor.testUserPermission(user, "OBSERVER");
}

export function canUserSeeValue(user, actor) {
	return user.isGM || actor.isOwner;
}

export function isVisibleForCombatState(visibility, inCombat) {
	if (visibility === "combatOnly") return inCombat;
	if (visibility === "never") return false;
	return true;
}
