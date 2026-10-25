/**
 * Attacks section: weapons for player characters, attack entries for NPCs.
 */

import { singlePane } from "../../shared/drawer-model.js";
import { npcAttackRow, weaponRow } from "./rows.js";
import { collatorFor } from "../../../core/text.js";

const byName = (a, b) => collatorFor().compare(a.name, b.name);

/** Drawer payload for the attacks section. */
export function buildAttacks(actor, menuData) {
	let items;
	if (actor.type === "NPC") {
		items = actor.items
			.filter((item) => item.type === "NPC Attack" || item.type === "NPC Special Attack" || item.system?.isWeapon)
			.sort(byName)
			.map((attack) => npcAttackRow(attack, actor));
	} else {
		// Equipped weapons first, then alphabetical.
		items = actor.items
			.filter((item) => item.system?.isWeapon)
			.sort((a, b) => (b.system.equipped ? 1 : 0) - (a.system.equipped ? 1 : 0) || byName(a, b))
			.map((weapon) => weaponRow(weapon, actor));
	}

	return singlePane(menuData?.label || game.i18n?.localize?.("NAH.Categories.Attacks") || "Attacks", items);
}
