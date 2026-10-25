/**
 * Abilities section: class abilities, talents and boons for characters; features for NPCs.
 */

import { sd } from "../lib/text.js";
import { createRow, segment } from "../../shared/row-model.js";
import { classAbilityRow } from "./rows.js";
import { pane } from "../../shared/drawer-model.js";
import { collatorFor } from "../../../core/text.js";

const labelSegments = (text) => (text ? [segment.label(text)] : []);

function npcFeatureRow(feature) {
	const description = (feature.system?.description || "").replace(/<[^>]*>?/gm, "").trim();
	return createRow({
		id: feature.id,
		name: feature.name,
		icon: feature.img || "icons/creatures/abilities/dragon-breath-purple.webp",
		segments: labelSegments(sd("Trait", "Trait")),
		description: description ? description.slice(0, 80) : sd("NpcFeature", "NPC Feature"),
	});
}

function talentRow(talent) {
	const group = talent.system?.talentClass
		? game.i18n?.localize?.(`SHADOWDARK.talent.class.${talent.system.talentClass}`) || talent.system.talentClass
		: sd("Talent", "Talent");
	return createRow({ id: talent.id, name: talent.name, icon: talent.img || "icons/sundries/books/book-worn-brown-grey.webp", segments: labelSegments(group), description: talent.name });
}

function boonRow(boon) {
	const type = boon.system?.boonType
		? game.i18n?.localize?.(CONFIG.SHADOWDARK?.BOON_TYPES?.[boon.system.boonType]) || boon.system.boonType
		: sd("Boon", "Boon");
	return createRow({ id: boon.id, name: boon.name, icon: boon.img || "icons/skills/social/diplomacy-writing-letter.webp", segments: labelSegments(type), description: boon.name });
}

/** Drawer payload for the abilities section. */
export function buildAbilities(actor, menuData) {
	const groups = actor.type === "NPC"
		? [["features", "Features", actor.items.filter((i) => i.type === "NPC Feature").sort((a, b) => collatorFor().compare(a.name, b.name)).map(npcFeatureRow)]]
		: [
			["class_abilities", "Class Abilities", actor.items.filter((i) => i.type === "Class Ability").map(classAbilityRow)],
			["talents", "Talents", actor.items.filter((i) => i.type === "Talent").map(talentRow)],
			["boons", "Boons", actor.items.filter((i) => i.type === "Boon").map(boonRow)],
		];
	// NPC features always get their pane (even when empty); character groups only when present.
	const present = actor.type === "NPC" ? groups : groups.filter(([, , rows]) => rows.length);
	return {
		title: menuData?.label || game.i18n?.localize?.("NAH.Categories.Features") || "Abilities",
		panes: present.map(([id, label, rows]) => pane(id, label, rows)),
	};
}
