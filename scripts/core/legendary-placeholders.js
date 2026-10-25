/**
 * Integration with Nik's DnD5e Tweaks "Legendary Action Placeholders": combat turns inserted after each
 * player's turn that stand for the legendary actions creatures may take. The placeholder combatant has
 * no actor, so the HUD offers its "pass" control on the creatures with legendary actions instead.
 */

import { combatantMatches } from "./combat-ownership.js";

const TWEAKS_ID = "niks-dnd5e-tweaks";

/** Whether a combatant is a legendary action placeholder. */
export function isLegendaryPlaceholder(combatant) {
	return Boolean(combatant?.flags?.[TWEAKS_ID]?.isLegendaryPlaceholder);
}

/** Whether Nik's DnD5e Tweaks is active with its placeholders turned on. */
function placeholdersEnabled() {
	if (!game.modules.get(TWEAKS_ID)?.active) return false;
	if (!game.settings.settings.has(`${TWEAKS_ID}.enableLegendaryActionPlaceholders`)) return false;
	return Boolean(game.settings.get(TWEAKS_ID, "enableLegendaryActionPlaceholders"));
}

/** Whether the combat is currently on a legendary action placeholder turn. */
export function isLegendaryPlaceholderTurn(combat) {
	return Boolean(combat?.started && placeholdersEnabled() && isLegendaryPlaceholder(combat.combatant));
}

/**
 * The combatant in `combat` for the given actor/token that can take legendary actions (dnd5e
 * `resources.legact.max` above 0, not defeated), or null.
 * @param {Combat} combat
 * @param {string|null} actorId
 * @param {string|null} tokenId
 * @returns {Combatant|null}
 */
export function legendaryCombatantOf(combat, actorId = null, tokenId = null) {
	if (!combat?.combatants || (!actorId && !tokenId)) return null;
	return combat.combatants.find((combatant) => !isLegendaryPlaceholder(combatant)
		&& !combatant.isDefeated
		&& combatantMatches(combatant, actorId, tokenId)
		&& Number(combatant.actor?.system?.resources?.legact?.max) > 0) ?? null;
}
