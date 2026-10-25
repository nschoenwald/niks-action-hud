/**
 * NPC auto-favorite rules for Shadowdark (see features/pins/auto-pin.js): attacks (and weapons)
 * first, then special attacks, then spells.
 */

const isAttack = (item) => item?.type === "NPC Attack" || Boolean(item?.system?.isWeapon);

/** 1: attack, 2: special attack, 3: spell, 0: does not qualify. */
function rank(item) {
	if (isAttack(item)) return 1;
	if (item?.type === "NPC Special Attack") return 2;
	if (item?.type === "Spell") return 3;
	return 0;
}

/** Qualifying items in rank order, then in the sheet's order. */
function candidates(actor) {
	return actor.items
		.filter((item) => rank(item) > 0)
		.sort((a, b) => rank(a) - rank(b) || (a.sort ?? 0) - (b.sort ?? 0));
}

export const shadowdarkAutoPin = Object.freeze({
	isNpc: (actor) => actor.type === "NPC",
	candidates,
	isAttack,
});
