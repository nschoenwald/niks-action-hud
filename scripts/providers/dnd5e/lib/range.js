/** Range text for action rows and when it is worth showing, built on the labels and unit tables dnd5e prepares. */

/** dnd5e's config for a scalar length unit (ft, m, mi, …), or null for self / touch / special ranges. */
const lengthUnit = (units) => CONFIG.DND5E.movementUnits[units] ?? null;

/**
 * Text describing an item's range ("30 ft", "80/320 ft", "Touch"): the label dnd5e prepares. Spells label
 * their own range, weapons theirs when they have a real one (not plain melee reach), and every other item
 * takes the range of its first activity. "" when there is none.
 * @param {Item} item
 * @returns {string}
 */
export function _describeReach(item) {
	return item.labels?.range || "";
}

/**
 * Whether a row should show the range: not for an ordinary 5-foot (1.5 m) reach with no long range,
 * since every melee action has that.
 * @param {Item} item
 * @param {string} reachText  What `_describeReach` returned.
 */
export function _shouldShowReach(item, reachText) {
	if (!reachText) return false;
	const range = item.system?.range ?? {};
	const unit = lengthUnit(range.units);
	if (!unit || range.long) return true;
	const feet = (Number(range.value) || 0) * (Number(unit.conversion) || 1);
	return feet > 5;
}
