/**
 * Shadowdark action handlers, one per action kind (see core/action-ref.js).
 */

import { buildMacroCard } from "../../../core/macro-card.js";
import { text } from "../../../core/text.js";
import { safeFromUuid } from "../../base.js";
import { rollOptionsFor } from "./rolls.js";
import { flipEquipped, handleLuck, recoverItem, toggleLight } from "./use-item.js";

const rollInput = (event) => rollOptionsFor(event || window.event || {});

export const ACTION_HANDLERS = {
	luck: { run: ({ actor }) => handleLuck(actor) },

	rollhp: { run: ({ actor }) => actor.system.rollHP?.() },

	check: {
		run: ({ actor, args: [ability], event }) => {
			if (ability === "initiative") {
				return actor.rollInitiative?.({ createCombatants: true, rerollInitiative: true, event: event || window.event || {} });
			}
			return actor.system?.rollStatCheck?.(ability.toLowerCase(), rollInput(event));
		},
	},

	"restore-spell": { run: ({ actor, args: [id] }) => recoverItem(actor, id) },

	equip: { run: ({ actor, args: [id] }) => flipEquipped(actor, id) },

	light: { run: ({ actor, args: [id] }) => toggleLight(actor, id) },

	potion: { run: ({ actor, args: [id] }) => actor.system.usePotion?.(id) },

	"wand-spell": {
		run: ({ actor, args: [wandId, spellUuid], event }) => {
			const wand = actor.items.get(wandId);
			return wand ? actor.system.castSpell(spellUuid, { itemUuid: wand.uuid, ...rollInput(event) }) : undefined;
		},
	},

	macro: {
		tooltip: async ({ args: [id] }) => buildMacroCard(id),
		run: async ({ actor, args: [id] }) => {
			const macro = (await safeFromUuid(id)) || game.macros?.get(id);
			if (macro) return macro.execute({ actor, token: actor.token });
			ui.notifications.warn(text("NAH.Messages.MissingMacro", "Macro not found: {id}", { id }));
			return undefined;
		},
	},
};
