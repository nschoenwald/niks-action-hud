/**
 * Localizes a key only if it exists, otherwise returns the fallback.
 * (game.i18n.localize returns the raw key for missing entries, which is truthy.)
 * @param {string[]|string} keys - One or more i18n keys tried in order.
 * @param {string} fallback
 * @returns {string}
 */
export function _localizeFirst(keys, fallback = "") {
	for (const key of [].concat(keys)) {
		if (key && game.i18n?.has?.(key)) return game.i18n.localize(key);
	}
	return fallback;
}

/**
 * Simplify a roll formula with dnd5e's own `simplifyRollFormula`; the formula unchanged when it cannot be parsed.
 * @param {string} formula
 * @returns {string}
 */
export function _simplifyRollFormula(formula) {
	if (!formula) return "";
	try {
		return dnd5e.dice.simplifyRollFormula(formula, { preserveFlavor: false });
	} catch (_err) {
		return formula;
	}
}

/**
 * Compact a roll formula by stripping whitespace around mathematical operators.
 * e.g. "4d6 + 5" -> "4d6+5", "2d4 + 6d6 + 5" -> "2d4+6d6+5"
 * @param {string} formula
 * @returns {string}
 */
export function _compactFormula(formula) {
	if (!formula) return "";
	return String(formula)
		.replace(/\s*([+\-*/])\s*/g, "$1")
		.replace(/\s*\(\s*/g, "(")
		.replace(/\s*\)\s*/g, ")")
		.trim();
}
