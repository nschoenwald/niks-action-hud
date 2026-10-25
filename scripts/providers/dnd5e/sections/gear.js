/**
 * Inventory section: weapons, armor (incl. clothing), gear, tools, consumables and everything else (other).
 */

import { dd } from "../lib/text.js";
import { createRow, segment } from "../../shared/row-model.js";
import { emptyDrawer, withOverview } from "../../shared/drawer-model.js";

/** Equipment the Armor pane takes: the system's armor types (light, medium, heavy, natural, shield) plus clothing. */
function isArmorOrClothing(item) {
	const kind = item.system?.type?.value;
	return kind === "clothing" || Object.hasOwn(CONFIG.DND5E.armorTypes, kind ?? "");
}

/**
 * Panes in order: [id, label, does the item belong here]. Each item goes to the first pane that takes it;
 * "Other" takes whatever is left (loot, containers, physical item types added by other modules).
 */
const CATEGORIES = [
	["weapon", () => dd("Weapons", "Weapons"), (item) => item.type === "weapon"],
	["armor", () => dd("Armor", "Armor"), (item) => item.type === "equipment" && isArmorOrClothing(item)],
	["gear", () => dd("Gear", "Gear"), (item) => item.type === "equipment"],
	["tool", () => dd("Tools", "Tools"), (item) => item.type === "tool"],
	["consumable", () => dd("Consumables", "Consumables"), (item) => item.type === "consumable"],
	["other", () => dd("Other", "Other"), () => true],
];

/** Whether an item is part of the inventory: its data model uses dnd5e's physical-item template (types added by other modules included). */
function isPhysical(item) {
	return Boolean(item.system?.constructor?._schemaTemplates?.includes(dnd5e.dataModels.item.PhysicalItemTemplate));
}
const t = (key, fallback) => game.i18n?.localize?.(key) || fallback;

/** Quantity, plus an equip toggle for items that can be equipped. */
function gearRow(item) {
	const segments = [segment.quantity(item.system.quantity ?? 1)];
	if (typeof item.system.equipped === "boolean") segments.push(segment.equip(item.id, item.system.equipped));
	return createRow({
		id: item.id,
		name: item.name,
		icon: item.img,
		segments,
		description: item.system.description?.value || "",
	});
}

const isStocked = (item) => !(item.type === "consumable" || item.type === "loot") || (item.system.quantity ?? 1) > 0;

/** Drawer payload for the inventory section. */
export function buildGear(actor) {
	if (!actor?.items) return emptyDrawer("Gear");

	const groups = CATEGORIES.map(([id, label]) => ({ id, label: label(), rows: [] }));
	for (const item of actor.items) {
		if (!isPhysical(item) || !isStocked(item)) continue;
		const index = CATEGORIES.findIndex(([, , belongs]) => belongs(item));
		groups[index].rows.push(gearRow(item));
	}
	const overviewLabel = t("NAH.UI.AllGear", "") || t("NAH.UI.All", "") || "Everything";
	return { title: "Gear", panes: withOverview(groups, overviewLabel) };
}
