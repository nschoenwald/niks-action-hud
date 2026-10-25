/**
 * NPC auto-favorite rules for dnd5e 6.x (see features/pins/auto-pin.js): items with an attack,
 * damage or save activity, sorted by action time. A feature whose one activity casts a spell
 * ("Fiery Rays") qualifies through that spell and is pinned instead of the spell's cached copy.
 */

import { _getActivities, _getCastSpell, _isCastSpellOfFeature } from "./lib/activities.js";

const TARGET_ACTIVITY_TYPES = new Set(["attack", "damage", "save"]);

/**
 * Checks whether an item or feature has attack, damage, or save activities (DnD5e v6).
 * @param {Item} item
 * @returns {boolean}
 */
function hasAttackDamageOrSaveActivity(item) {
	return _getActivities(_getCastSpell(item) ?? item).some((act) => TARGET_ACTIVITY_TYPES.has(act?.type));
}

/** Whether an item (or the spell it casts) has an attack activity. */
function hasAttackActivity(item) {
	return _getActivities(_getCastSpell(item) ?? item).some((act) => act?.type === "attack");
}

/**
 * Extracts the activation type string from an item's activities (DnD5e v6).
 * Prioritizes attack/damage/save activities, then any activity on the item.
 * @param {Item} item
 * @returns {string}
 */
function getItemActivationType(item) {
	if (!item) return "";
	const activities = _getActivities(item);
	const targetActivities = activities.filter((act) => TARGET_ACTIVITY_TYPES.has(act?.type));

	for (const act of targetActivities) {
		const type = act?.activation?.type;
		if (type) return type;
	}

	for (const act of activities) {
		const type = act?.activation?.type;
		if (type) return type;
	}

	return "";
}

/**
 * Maps activation type to numerical rank for sorting:
 * 1: action
 * 2: bonus action
 * 3: reaction
 * 4: legendary action
 * 5: others
 * @param {string} activationType
 * @returns {number}
 */
function getActionTimeRank(activationType) {
	// dnd5e activation type keys (CONFIG.DND5E.activityActivationTypes)
	return ({ action: 1, bonus: 2, reaction: 3, legendary: 4 })[activationType] ?? 5;
}

/** Qualifying items, sorted by action time: action -> bonus action -> reaction -> legendary action -> others. */
function candidates(actor) {
	return actor.items
		.filter((item) => hasAttackDamageOrSaveActivity(item) && !_isCastSpellOfFeature(item))
		.sort((a, b) => {
			const rankA = getActionTimeRank(getItemActivationType(a));
			const rankB = getActionTimeRank(getItemActivationType(b));
			if (rankA !== rankB) return rankA - rankB;
			return (a.sort ?? 0) - (b.sort ?? 0);
		});
}

export const dnd5eAutoPin = Object.freeze({
	isNpc: (actor) => actor.type === "npc",
	candidates,
	isAttack: hasAttackActivity,
});
