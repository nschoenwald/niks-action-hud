import { createSectionRegistry } from "../section-registry.js";
import { buildAttacks } from "./sections/attacks.js";
import { buildSpells } from "./sections/spells.js";
import { buildAbilities } from "./sections/abilities.js";
import { buildGear } from "./sections/gear.js";
import { buildChecks } from "./sections/checks.js";

/**
 * Section table for Shadowdark: plain data, resolved by the shared section registry.
 */
const SHADOWDARK_SECTION_SPECS = [
	{ id: "attacks", builder: "attacks", ribbon: { labelKey: "NAH.Categories.Attacks", fallback: "Attacks", icon: "fas fa-swords", nav: "top" } },
	{ id: "spells", builder: "spells", ribbon: { labelKey: "NAH.Categories.Spells", fallback: "Spells", icon: "fas fa-hand-sparkles", nav: "side" } },
	{ id: "talents", aliases: ["features"], builder: "abilities", ribbon: { labelKey: "NAH.Categories.Features", fallback: "Abilities", icon: "fas fa-star", nav: "top" } },
	{ id: "inventory", aliases: ["items"], builder: "gear", ribbon: { labelKey: "NAH.Categories.Items", fallback: "Inventory", icon: "fas fa-backpack", nav: "top" } },
	{ id: "checks", aliases: ["abilities"], builder: "checks", ribbon: { labelKey: "NAH.Shadowdark.Checks", fallback: "Checks", icon: "fas fa-dice-d20", nav: "top" } },
];

export const shadowdarkSections = createSectionRegistry(
	SHADOWDARK_SECTION_SPECS,
	{ attacks: buildAttacks, spells: buildSpells, abilities: buildAbilities, gear: buildGear, checks: buildChecks },
	{ requireActor: true },
);
