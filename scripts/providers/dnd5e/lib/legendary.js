import { _readActivationType } from "./activation.js";
import { _getActivities } from "./activities.js";

/**
 * Checks if an item is a Legendary Resistance feature.
 */
export function _isLegendaryResistanceItem(item) {
	if (!item) return false;
	const id = (item.identifier || "").toLowerCase();
	if (id === "legendary-resistance" || id.startsWith("legendary-resistance")) return true;
	const name = (item.name || "").trim().toLowerCase();
	if (/^legendary resistance(\b|$)/i.test(name)) return true;

	const activities = _getActivities(item);
	if (activities.some((a) => a.consumption?.targets?.some((t) => t.type === "attribute" && t.target?.includes("legres")))) {
		return true;
	}
	return false;
}

/**
 * Checks if an item is a Legendary Action feature or action.
 */
export function _isLegendaryActionItem(item) {
	if (!item) return false;
	if (_isLegendaryResistanceItem(item)) return false;

	const name = (item.name || "").trim();
	if (/^legendary actions?$/i.test(name)) return false;

	const activationType = _readActivationType(item);
	if (activationType === "legendary") return true;

	const activities = _getActivities(item);
	if (activities.some((a) => a.activation?.type === "legendary" || a.consumption?.targets?.some((t) => t.type === "attribute" && t.target?.includes("legact")))) {
		return true;
	}
	return false;
}

/** dnd5e's activation category for legendary, mythic and lair actions. */
const MONSTER_CATEGORY = "DND5E.ACTIVATION.Category.Monster";

/**
 * The item's activation type when dnd5e files it under the Monster category ("legendary", "mythic",
 * "lair"), from its activities or its own activation data. "" otherwise.
 */
export function _monsterActivationType(item) {
	const types = [..._getActivities(item).map((a) => a.activation?.type), item?.system?.activation?.type];
	const config = globalThis.CONFIG?.DND5E?.activityActivationTypes ?? {};
	return types.find((type) => type && config[type]?.group === MONSTER_CATEGORY) ?? "";
}

/**
 * Checks if an item is any legendary item: legendary resistance, a legendary action, or another
 * Monster-category action (mythic, lair). These are listed in the Legendary menu only.
 */
export function _isLegendaryItem(item) {
	if (!item) return false;
	return _isLegendaryResistanceItem(item) || _isLegendaryActionItem(item) || Boolean(_monsterActivationType(item));
}

/**
 * Checks if a creature/actor possesses legendary actions and/or legendary resistance.
 */
export function _actorHasLegendary(actor) {
	if (!actor) return false;
	// NPCs carry legact / legres; `value` is derived from max and spent, so max decides.
	const { legact, legres } = actor.system?.resources ?? {};
	if (legact?.max > 0 || legres?.max > 0) return true;

	if (actor.items) {
		for (const item of actor.items) {
			if (_isLegendaryItem(item)) return true;
		}
	}
	return false;
}

