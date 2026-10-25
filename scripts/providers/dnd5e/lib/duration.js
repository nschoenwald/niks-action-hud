import { dd } from "./text.js";
import { _getActivities } from "./activities.js";

/**
 * Duration data and labels that apply to `item` used through `activity`.
 * - An activity that overrides its duration has its own.
 * - Otherwise an item with a duration of its own (spells) uses that. A linked cast activity (a spell granted
 *   by a wand) lives on another item, whose duration dnd5e copied into it, so the spell's data wins.
 * - Items without one (features, gear) take it from their activity, or from the first activity that has an
 *   activation, which is where dnd5e's item labels come from.
 */
function durationSource(item, activity) {
	const from = (owner) => ({ duration: owner.duration ?? null, labels: owner.labels ?? {} });
	if (activity?.duration?.override) return from(activity);
	if (item?.system?.duration) return { duration: item.system.duration, labels: item.labels ?? {} };
	const source = activity ?? _getActivities(item).find((a) => "activation" in a && !a.isHidden);
	return source ? from(source) : { duration: null, labels: {} };
}

/** Short forms for dnd5e's scalar time units (`CONFIG.DND5E.timeUnits`). */
const SHORT_UNITS = Object.freeze({
	second: (n) => `${n}s`,
	turn: (n) => `${n} turn`,
	round: (n) => `${n} rnd`,
	minute: (n) => `${n}m`,
	hour: (n) => `${n}h`,
	day: (n) => `${n}d`,
	week: (n) => `${n}w`,
	month: (n) => `${n} mo`,
	year: (n) => `${n}y`,
});

/**
 * Return a shortened version of the spell's duration for display in the subline.
 * Instantaneous spells return an empty string.
 * Examples:
 * - 1 minute -> "1m"
 * - 8 hours -> "8h"
 * - 1 round -> "1 rnd"
 * - Until dispelled -> "Disp"
 * - Instantaneous -> ""
 *
 * @param {Item} item
 * @param {Activity|null} [activity=null]
 * @returns {string}
 */
export function _formatDuration(item, activity = null) {
	if (!item) return "";
	const { duration } = durationSource(item, activity);
	const units = duration?.units;
	if (!units || units === "inst") return "";

	const short = SHORT_UNITS[units];
	if (short) return short(duration.value || 1);

	switch (units) {
		case "perm": return dd("Perm", "Perm");
		case "disp": return dd("Disp", "Disp");
		case "dstr": return dd("DispTrig", "Disp/Trig");
		case "spec": return duration.special || dd("Special", "Special");
		default: return "";
	}
}

/**
 * Return a human-readable duration label for tooltips (dnd5e's own label, "" for instantaneous).
 * @param {Item} item
 * @param {Activity|null} [activity=null]
 * @returns {string}
 */
export function _getDurationLabel(item, activity = null) {
	if (!item) return "";
	const { duration, labels } = durationSource(item, activity);
	if (!duration?.units || duration.units === "inst") return "";
	return labels.duration ?? "";
}

/** Whether casting or using this needs concentration (the spell's property, or the activity's / item's duration flag). */
function requiresConcentration(item, activity) {
	return Boolean(item?.system?.properties?.has?.("concentration") || activity?.duration?.concentration || item?.system?.duration?.concentration);
}

/**
 * "Concentration, up to 1 minute" for anything that needs concentration, using the dnd5e system's own
 * localized label; "" when no concentration is needed.
 * @param {Item} item
 * @param {Activity|null} [activity=null]
 * @returns {string}
 */
export function _concentrationDurationLabel(item, activity = null) {
	if (!requiresConcentration(item, activity)) return "";
	return durationSource(item, activity).labels.concentrationDuration || dd("Concentration", "Concentration");
}
