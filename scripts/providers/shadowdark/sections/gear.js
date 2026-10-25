/**
 * Inventory section: light sources, potions, equipped and carried items, treasure and coins.
 */

import { sd } from "../lib/text.js";
import { createRow, segment } from "../../shared/row-model.js";
import { lightRow, potionRow, equippedRow, carriedRow } from "./rows.js";
import { pane } from "../../shared/drawer-model.js";

function coinsRow(coins) {
	const gold = (coins.gp || 0) + (coins.sp || 0) * 0.1;
	return createRow({
		id: "coins-summary",
		name: sd("Coins", "Coins ({gp} GP, {sp} SP, {cp} CP)", { gp: coins.gp || 0, sp: coins.sp || 0, cp: coins.cp || 0 }),
		icon: "icons/commodities/currency/coins-assorted-mix-copper-silver-gold.webp",
		segments: [segment.label(`${gold} GP`)],
		description: sd("PurseCurrency", "Purse Currency"),
	});
}

function treasureRow(item) {
	const value = item.system?.cost ? `${item.system.cost.gp || 0} GP` : (item.system?.isGem ? sd("Gem", "Gem") : sd("Treasure", "Treasure"));
	return createRow({
		id: item.id,
		name: item.name,
		icon: item.img || "icons/commodities/gems/gem-faceted-navette-red.webp",
		segments: [segment.label(value)],
		description: item.system?.isGem ? sd("Gemstone", "Gemstone") : sd("Valuable", "Valuable"),
	});
}

/** Drawer payload for the inventory section. */
export function buildGear(actor, menuData) {
	const physical = actor.system?.getPhysicalItems ? actor.system.getPhysicalItems() : actor.items.filter((i) => i.system?.isPhysical);
	const isTreasure = (item) => item.system?.treasure || item.system?.isGem;

	const treasures = physical.filter(isTreasure);
	const treasureRows = [...(actor.system?.coins ? [coinsRow(actor.system.coins)] : []), ...treasures.map(treasureRow)];

	const panes = [
		pane("light", sd("LightSources", "Light Sources"), physical.filter((i) => i.system?.light?.isSource).map(lightRow)),
		pane("potions", sd("Potions", "Potions"), actor.items.filter((i) => i.type === "Potion").map(potionRow)),
		pane("equipped", sd("Equipped", "Equipped"), physical.filter((i) => i.system?.equipped).map(equippedRow)),
		pane("carried", sd("Carried", "Carried"), physical.filter((i) => !i.system?.equipped && !isTreasure(i)).map(carriedRow)),
		pane("treasure", sd("Treasure", "Treasure"), treasureRows),
	].filter((candidate) => candidate.rows.length);

	return { title: menuData?.label || game.i18n?.localize?.("NAH.Categories.Items") || "Inventory", panes };
}
