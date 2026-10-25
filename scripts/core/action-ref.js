/**
 * Action references: the one place that knows how a HUD action is written down.
 *
 * A reference is a string so it can live in flags, settings, DOM attributes and drag payloads:
 *
 *   "<kind>~<arg>~<arg>"   a system action, e.g. "skill~ath", "ammo~Xk3a~minus"
 *   "<documentId>"         anything without a "~" is an owned item id or a document uuid
 *
 * Producers use the `ref` builders, consumers use `parseRef`. Nothing else should split or
 * prefix-match an action id.
 */

const SEPARATOR = "~";

const build = (kind, ...args) => [kind, ...(args.length ? args : [""]).map((arg) => String(arg ?? ""))].join(SEPARATOR);

/** Builders, one per action kind. */
export const ref = Object.freeze({
	check: (ability) => build("check", ability),
	save: (ability) => build("save", ability),
	skill: (skill) => build("skill", skill),
	tool: (tool) => build("tool", tool),
	initiative: () => build("initiative"),
	rest: (type) => build("rest", type),
	macro: (idOrUuid) => build("macro", idOrUuid),
	equip: (itemId) => build("equip", itemId),
	ammo: (weaponId, command) => build("ammo", weaponId, command),
	activity: (itemId, activityId) => build("activity", itemId, activityId),
	// Shadowdark
	luck: () => build("luck"),
	rollHp: () => build("rollhp"),
	restoreSpell: (spellId) => build("restore-spell", spellId),
	toggleLight: (itemId) => build("light", itemId),
	drinkPotion: (itemId) => build("potion", itemId),
	wandSpell: (wandId, spellUuid) => build("wand-spell", wandId, spellUuid),
});

/**
 * Split an action id.
 * @param {string} id
 * @returns {{ kind: string, args: string[], raw: string }} `kind` is "item" for plain document ids.
 */
export function parseRef(id) {
	const raw = String(id ?? "");
	if (!raw.includes(SEPARATOR)) return { kind: "item", args: [raw], raw };
	const [kind, ...args] = raw.split(SEPARATOR);
	return { kind, args, raw };
}

/** Document id behind an action id: the item of an activity ref, or the id itself for plain ids. */
export function documentIdOf(id) {
	const { kind, args } = parseRef(id);
	if (kind === "activity") return args[0];
	if (kind === "item") return args[0].split("_")[0];
	return null;
}
