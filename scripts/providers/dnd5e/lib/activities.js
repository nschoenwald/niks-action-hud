/**
 * Retrieve the primary (first) attack activity on an item.
 * @param {Item} item
 * @returns {Activity|null}
 */
export function _getPrimaryAttackActivity(item) {
	return item?.system?.activities?.getByType("attack")[0] ?? null;
}

/**
 * Retrieve the primary activity on an item if it deals damage.
 * @param {Item} item
 * @returns {Activity|null}
 */
export function _getPrimaryDamageActivity(item) {
	const activities = _getActivities(item);
	if (!activities.length) return null;

	const primary = activities.find((a) => a.type !== "cast") || activities[0];
	if (!primary || primary.type === "heal") return null;

	const hasDamage =
		primary.damage?.parts?.length > 0 ||
		primary.type === "damage" ||
		primary.type === "attack";
	if (hasDamage) return primary;

	try {
		if (primary.getDamageConfig({})?.rolls?.length > 0) return primary;
	} catch (_e) {}

	return null;
}

/**
 * Whether an item has item-level limited uses (dnd5e's own `hasLimitedUses`: a max on the item's uses).
 */
export function _hasItemUses(item) {
	return Boolean(item?.hasLimitedUses);
}

/**
 * Whether an activity tracks uses of its own: a max (as entered or evaluated), a recharge, or a
 * consumption target that spends them.
 */
export function _activityHasUses(activity) {
	const uses = activity?.uses;
	if (!uses) return false;
	return Boolean(
		uses.max
		|| activity._source?.uses?.max
		|| uses.recovery.some((r) => r.period === "recharge")
		|| activity.consumption?.targets?.some((t) => t.type === "activityUses")
	);
}

/**
 * All activities of an item (empty for item types without activities).
 */
export function _getActivities(item) {
	return item?.system?.activities?.contents ?? [];
}

/**
 * Resolves the single activity with uses if an item has NO item uses, but exactly one activity with activity uses.
 * Returns null if the item has item uses, or if there isn't exactly one activity with activity uses.
 */
export function _getSingleActivityUses(item) {
	if (!item || _hasItemUses(item)) return null;
	const activities = _getActivities(item);
	const withUses = activities.filter((a) => a.type !== "cast" && _activityHasUses(a));
	if (withUses.length === 1) {
		return withUses[0];
	}
	return null;
}
