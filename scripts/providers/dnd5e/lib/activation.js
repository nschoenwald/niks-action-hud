import { _getActivities } from "./activities.js";

/**
 * Activation badges for action rows, derived from dnd5e's `CONFIG.DND5E.activityActivationTypes`:
 * the badge text is the initials of the system's localized type name ("Bonus Action" → "BA"), and the colour
 * follows the system's activation category.
 */

/** Categories whose types keep their own badge colour; other categories share one colour each. */
const OWN_COLOUR_CATEGORIES = new Set(["DND5E.ACTIVATION.Category.Standard", "DND5E.ACTIVATION.Category.Monster"]);

const activationConfig = (type) => globalThis.CONFIG?.DND5E?.activityActivationTypes?.[type] ?? null;

/**
 * Initials of the last two capitalised words: "Bonus Action" → "BA", "Reaction" → "R",
 * "End of a Long Rest" → "LR", "shortRest" → "SR".
 */
function initialsOf(text) {
	const words = String(text).replace(/([a-z])([A-Z])/g, "$1 $2").split(/[\s_-]+/).filter(Boolean);
	const capitalised = words.filter((word) => /^\p{Lu}/u.test(word));
	return (capitalised.length ? capitalised : words).slice(-2).map((word) => word[0]).join("").toUpperCase();
}

/** Colour key for a type: the type itself, or the last part of its dnd5e category ("…Category.Time" → "time"). */
function colourOf(type, config) {
	const category = config?.group;
	if (!config) return "other";
	if (!category || OWN_COLOUR_CATEGORIES.has(category)) return type.toLowerCase();
	return category.split(".").pop().toLowerCase();
}

/**
 * Badge data for an activation type: `{ type, label, classType, title }`, or null when there is none.
 * @param {string} activationType
 */
export function _describeActivation(activationType) {
	if (!activationType || activationType === "none") return null;
	const type = String(activationType);
	const config = activationConfig(type);
	const name = config?.label ? game.i18n?.localize?.(config.label) || type : type;
	return { type: type.toLowerCase(), label: initialsOf(name), classType: colourOf(type, config), title: name };
}

// ── Reading an item's activation type ───────────────────

const usableType = (type) => (type && type !== "none" ? String(type) : "");

/**
 * The item's activation type ("action", "bonus", …): the first activity that names one, else the item's own
 * activation data (spells have it); weapons default to "action". "" when none applies.
 * @param {Item} item
 */
export function _readActivationType(item) {
	if (!item) return "";
	const fromActivities = _getActivities(item).map((activity) => usableType(activity.activation?.type)).find(Boolean);
	return fromActivities
		|| usableType(item.system?.activation?.type)
		|| (item.type === "weapon" ? "action" : "");
}
