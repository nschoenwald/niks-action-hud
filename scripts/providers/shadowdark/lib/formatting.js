/**
 * Formats a Weapon item's damage formula (die plus ability modifier) into a readable string.
 * @param {Item} weapon
 * @param {Actor} [actor=null]
 * @returns {string}
 */
export function formatWeaponDamage(weapon, actor = null) {
	if (!weapon?.system?.isWeapon) return "";
	const sys = weapon.system;

	let baseDie = sys.getDamageFormula();
	if (!baseDie) return "";
	if (/^d\d+/i.test(baseDie)) {
		baseDie = `1${baseDie}`;
	}

	let mod = 0;
	if (actor?.system?.abilities) {
		const strMod = Number(actor.system.abilities.str?.mod ?? 0);
		const dexMod = Number(actor.system.abilities.dex?.mod ?? 0);
		const isRanged = sys.type === "ranged" || sys.range === "far";
		if (sys.isFinesse) {
			mod = Math.max(strMod, dexMod);
		} else if (isRanged) {
			mod = dexMod;
		} else {
			mod = strMod;
		}
	}

	if (mod > 0) return `${baseDie}+${mod}`;
	if (mod < 0) return `${baseDie}${mod}`;
	return baseDie;
}

/**
 * Formats a range key into localized short ("C") or full ("Close") text.
 * @param {string} rangeKey
 * @param {{ short?: boolean }} [options] - `short: false` for the full name (hover cards); rows use the short form.
 * @returns {string}
 */
export function formatRange(rangeKey, { short = true } = {}) {
	if (!rangeKey) return "";
	const tables = short ? ["RANGES_SHORT", "SPELL_RANGES", "RANGES"] : ["RANGES", "SPELL_RANGES", "RANGES_SHORT"];
	for (const table of tables) {
		const key = CONFIG.SHADOWDARK?.[table]?.[rangeKey];
		if (key) return game.i18n?.localize?.(key) || rangeKey;
	}
	return String(rangeKey);
}

/**
 * Formats a spell duration (`{ type, value }`) into a readable label.
 * @param {{ type: string, value: string }} duration
 * @returns {string}
 */
export function formatDuration(duration) {
	const type = duration?.type;
	if (!type) return "";
	const typeLabel = CONFIG.SHADOWDARK.SPELL_DURATIONS[type];
	const localizedType = typeLabel ? (game.i18n?.localize?.(typeLabel) || type) : type;

	if (["instant", "focus", "permanent"].includes(type)) {
		return localizedType;
	}

	const val = duration.value;
	return val ? `${val} ${localizedType}` : localizedType;
}
