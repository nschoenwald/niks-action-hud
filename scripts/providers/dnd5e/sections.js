/**
 * Nik's Action HUD — D&D 5e Action Menu Provider
 * Prepares system-specific categories, activities, spells, features, inventory, and utility rolls.
 * Built natively for Foundry V14 and DnD5e 6.x.
 */

import { documentIdOf } from "../../core/action-ref.js";
import { createSectionRegistry } from "../section-registry.js";
import { actionRows, emptyDrawer } from "../shared/drawer-model.js";
import { buildAttacks } from "./sections/attacks.js";
import { buildSpells } from "./sections/spells.js";
import { buildFeatures, buildLegendary } from "./sections/features.js";
import { buildGear } from "./sections/gear.js";
import { buildAbilities } from "./sections/abilities.js";

/** Document ids behind the action rows of a drawer. */
const rowIdsOf = (drawer) => new Set(actionRows(drawer).filter((row) => row.id).map((row) => documentIdOf(row.id)));

/**
 * Builds shared within one synchronous pass. The ribbon checks every section in one loop and the
 * inventory check below needs Attacks, Features and Spells again; within a pass the actor cannot
 * change, so each section is built once. The cache is dropped at the next microtask.
 */
let passCache = null;

function inPass(name, build) {
	return (actor) => {
		if (!passCache) {
			passCache = new Map();
			queueMicrotask(() => { passCache = null; });
		}
		let sections = passCache.get(actor);
		if (!sections) passCache.set(actor, sections = new Map());
		if (!sections.has(name)) sections.set(name, build(actor));
		return sections.get(name);
	};
}

const attacksInPass = inPass("attacks", buildAttacks);
const spellsInPass = inPass("spells", buildSpells);
const featuresInPass = inPass("features", buildFeatures);

/**
 * Inventory drawer, unless every item in it is already offered by Attacks, Spells or Features
 * (monsters whose "inventory" is just their natural weapons): then it is reported as empty so
 * the category can be hidden.
 */
function buildGearUnlessRedundant(actor) {
	const gear = buildGear(actor);
	const gearIds = rowIdsOf(gear);
	if (!gearIds.size) return gear;

	const elsewhere = new Set([
		...rowIdsOf(attacksInPass(actor)),
		...rowIdsOf(featuresInPass(actor)),
		...rowIdsOf(spellsInPass(actor)),
	]);
	const redundant = [...gearIds].every((id) => elsewhere.has(id));
	return redundant ? { ...gear, panes: [] } : gear;
}

/**
 * Section table for D&D 5e: plain data, resolved by the shared section registry.
 */
const DND5E_SECTION_SPECS = [
	{ id: "attacks", builder: "attacks", ribbon: { labelKey: "NAH.Categories.Attacks", fallback: "Attacks", icon: "fas fa-swords", nav: "top" } },
	{ id: "spells", builder: "spells", ribbon: { labelKey: "NAH.Categories.Spells", fallback: "Spells", icon: "fas fa-hand-sparkles", nav: "side" } },
	{ id: "features", builder: "features", ribbon: { labelKey: "NAH.Categories.Features", fallback: "Features", icon: "fas fa-star", nav: "top" } },
	{ id: "legendary", builder: "legendary", ribbon: { labelKey: "NAH.Categories.Legendary", fallback: "Legendary", icon: "fas fa-crown", nav: "top" } },
	{ id: "abilities", builder: "abilities", ribbon: { labelKey: "NAH.Categories.Abilities", fallback: "Abilities", icon: "fas fa-dice-d20", nav: "top" } },
	{ id: "items", aliases: ["inventory"], builder: "gear", ribbon: { labelKey: "NAH.Categories.Items", fallback: "Items", icon: "fas fa-backpack", nav: "top" } },
];

export const dnd5eSections = createSectionRegistry(
	DND5E_SECTION_SPECS,
	{
		attacks: attacksInPass,
		spells: spellsInPass,
		features: featuresInPass,
		gear: buildGearUnlessRedundant,
		abilities: buildAbilities,
		legendary: buildLegendary,
	},
	{
		decorate: (result, { menuData }) => ({ ...result, title: menuData?.label || result?.title || "" }),
		fallback: ({ menuData }) => emptyDrawer(menuData?.label ?? ""),
	},
);
