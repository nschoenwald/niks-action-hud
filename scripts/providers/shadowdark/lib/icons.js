/**
 * Returns a short evocative description for an ability check.
 * @param {string} abilityKey
 * @returns {string}
 */
export function getAbilityDescription(abilityKey) {
	const map = {
		str: "Brawn, muscle power, athletics, melee force, lifting, and breaking.",
		dex: "Agility, reflexes, stealth, acrobatics, balance, and ranged finesse.",
		con: "Endurance, stamina, vitality, resisting poisons, hazards, and cold.",
		int: "Memory, lore, reason, ancient languages, deductive logic, and arcane knowledge.",
		wis: "Perception, insight, instincts, vigilance, and holy intuition.",
		cha: "Presence, willpower, leadership, intimidation, charm, and patron pacts.",
	};
	return map[abilityKey?.toLowerCase()] || "Roll a d20 ability check against difficulty.";
}

const SHADOWDARK_ABILITY_ICONS = {
	str: "icons/magic/control/buff-strength-muscle-damage.webp",
	dex: "icons/skills/movement/feet-winged-sandals-tan.webp",
	con: "icons/magic/life/heart-glowing-red.webp",
	int: "icons/skills/trades/academics-investigation-puzzles.webp",
	wis: "icons/tools/navigation/compass-worn-copper.webp",
	cha: "icons/magic/control/control-influence-crown-gold.webp",
};

/**
 * Returns the icon path for a given ability key.
 * @param {string} abilityKey
 * @returns {string}
 */
export function getAbilityIcon(abilityKey) {
	return SHADOWDARK_ABILITY_ICONS[abilityKey?.toLowerCase()] || "icons/svg/d20-highlight.svg";
}
