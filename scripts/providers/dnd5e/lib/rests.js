import { _localizeFirst } from "./formatting.js";

/**
 * Returns all localized display strings for a short or long rest.
 * @param {"short"|"long"} type
 * @returns {{name: string, description: string, subtitle: string, duration: string, tooltip: string, footer: string, durationLabel: string}}
 */
export function _getRestStrings(type) {
	const isLong = type === "long";
	const T = isLong ? "Long" : "Short";
	return {
		name: _localizeFirst([`NAH.Dnd5e.Resting.${T}.Name`, `DND5E.REST.${T}.Label`], isLong ? "Long Rest" : "Short Rest"),
		description: _localizeFirst(`NAH.Dnd5e.Resting.${T}.Desc`, isLong ? "Restore hit points, spell slots and long-rest resources" : "Regain short-rest resources and roll Hit Dice"),
		subtitle: _localizeFirst(`NAH.Dnd5e.Resting.${T}.Subtitle`, isLong ? "Rest (8 Hours)" : "Rest (1 Hour)"),
		duration: _localizeFirst(`NAH.Dnd5e.Resting.${T}.Duration`, isLong ? "8 Hours" : "1 Hour"),
		tooltip: _localizeFirst(`NAH.Dnd5e.Resting.${T}.Tooltip`, isLong
			? "Take a period of extended downtime, at least 8 hours long, during which a character sleeps for at least 6 hours and performs light activity for no more than 2 hours."
			: "Take a period of downtime, at least 1 hour long, during which a character does nothing more strenuous than eating, drinking, reading, and tending to wounds."),
		footer: _localizeFirst("NAH.Dnd5e.Resting.Footer", "Left-Click to Rest"),
		durationLabel: _localizeFirst(["NAH.Dnd5e.Resting.DurationLabel", "DND5E.REST.Duration.Label"], "Duration"),
	};
}
