/**
 * Spells section: spells by tier, plus spells carried in wands and scrolls.
 */

import { sd } from "../lib/text.js";
import { ref } from "../../../core/action-ref.js";
import { createRow, segment } from "../../shared/row-model.js";
import { spellRow } from "./rows.js";
import { pane } from "../../shared/drawer-model.js";
import { collatorFor } from "../../../core/text.js";

const byName = (a, b) => collatorFor(game.i18n?.lang).compare(a.name, b.name);
const spellUuidName = (uuid) => (uuid ? uuid.split(".").pop().replace(/-/g, " ") : "Spell");
const lookup = (uuid) => (uuid ? fromUuidSync(uuid) : null);

function wandRows(wand) {
	const icon = wand.img || "icons/weapons/wands/wand-gem-violet.webp";
	const broken = Boolean(wand.system.broken);
	const contained = wand.system.spells;
	if (!contained.length) {
		return [createRow({ id: wand.id, name: wand.name, icon, segments: [segment.label(broken ? sd("Broken", "Broken") : sd("Wand", "Wand"))], description: broken ? sd("Broken", "Broken") : sd("Empty", "Empty"), isDepleted: broken })];
	}
	return contained.map((entry) => {
		const lost = Boolean(entry.lost || broken);
		const doc = lookup(entry.uuid);
		return createRow({
			id: ref.wandSpell(wand.id, entry.uuid),
			name: `${wand.name}: ${doc?.name || spellUuidName(entry.uuid)}`,
			icon,
			segments: [segment.label(lost ? sd("Lost", "LOST") : sd("Cast", "Cast"))],
			description: lost ? sd("SpellLostBroken", "Spell Lost / Broken") : (doc ? sd("TierWandSpell", "Tier {tier} • Wand Spell", { tier: doc.system?.tier || 1 }) : sd("WandSpell", "Wand Spell")),
			isDepleted: lost,
			lost,
		});
	});
}

function scrollRow(scroll) {
	const doc = lookup(scroll.system?.spellUuid);
	return createRow({
		id: scroll.id,
		name: doc?.name ? `${scroll.name}: ${doc.name}` : scroll.name,
		icon: scroll.img || "icons/sundries/scrolls/scroll-runed-brown-purple.webp",
		segments: [segment.label(sd("Scroll", "Scroll"))],
		description: doc ? sd("TierScroll", "Tier {tier} • Single Use Scroll", { tier: doc.system?.tier || 1 }) : sd("ScrollGeneric", "Single Use Spell Scroll"),
	});
}

/** Drawer payload for the spells section. */
export function buildSpells(actor, menuData) {
	const panes = [];

	const spells = actor.items
		.filter((item) => item.type === "Spell")
		.sort(byName);

	if (spells.length) panes.push(pane("all", sd("AllSpells", "All Spells"), spells.map(spellRow)));

	const tiers = [...new Set(spells.map((spell) => spell.system?.tier || 1))].sort((a, b) => a - b);
	for (const tier of tiers) {
		panes.push(pane(`tier_${tier}`, sd("Tier", "Tier {tier}", { tier }), spells.filter((spell) => (spell.system?.tier || 1) === tier).map(spellRow)));
	}

	const visible = (item) => item.system?.isIdentified || game.user.isGM;
	const wands = actor.items.filter((item) => item.system?.isWand && visible(item));
	const scrolls = actor.items.filter((item) => item.system?.isScroll && visible(item));
	if (wands.length) panes.push(pane("wands", sd("Wands", "Wands"), wands.flatMap(wandRows)));
	if (scrolls.length) panes.push(pane("scrolls", sd("Scrolls", "Scrolls"), scrolls.map(scrollRow)));

	return { title: menuData?.label || game.i18n?.localize?.("NAH.Categories.Spells") || "Spells", panes };
}
