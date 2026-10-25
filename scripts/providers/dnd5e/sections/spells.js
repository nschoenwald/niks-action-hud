/**
 * Spells section: spellbook groups (cantrips to 9, pact, innate) plus spells granted by items.
 */

import { dd } from "../lib/text.js";
import { createRow, segment, usesBadge } from "../../shared/row-model.js";
import { emptyDrawer, heading, withOverview } from "../../shared/drawer-model.js";
import { _describeActivation } from "../lib/activation.js";
import { _hasItemUses, _activityHasUses } from "../lib/activities.js";
import { _getItemDamage } from "../lib/damage.js";
import { _formatDuration, _getDurationLabel } from "../lib/duration.js";
import { _describeReach, _shouldShowReach } from "../lib/range.js";
import { _resolveFeatureUses } from "../lib/uses.js";
import { drawerToggle, isDrawerToggleOn } from "../../../core/drawer-toggles.js";
import { readSetting } from "../../../core/setting-read.js";
import { collatorFor } from "../../../core/text.js";

const t = (key, fallback) => game.i18n?.localize?.(key) || fallback;

// ── Tiers ───────────────────────────────────────────────

const slotSummary = (slots) => {
	const max = Number(slots?.max) || 0;
	const value = Number(slots?.value) || 0;
	return { max, value, text: max > 0 ? ` (${value}/${max})` : "" };
};

/**
 * The spell groups of an actor in display order, each `{ id, label, heading, rows: [] }`:
 * cantrips, levels 1–9 (label with remaining/max slots), pact (only with pact slots), innate, item-granted.
 */
function spellGroups(actor) {
	const groups = [{ id: "0", label: dd("Cantrips", "Cantrips"), rows: [] }];
	for (let level = 1; level <= 9; level++) {
		const { text } = slotSummary(actor.system.spells?.[`spell${level}`]);
		groups.push({ id: String(level), label: dd("LvlTab", "LVL {level}{slots}", { level, slots: text }), heading: dd("LevelHeader", "Level {level}{slots}", { level, slots: text }), rows: [] });
	}
	const pact = slotSummary(actor.system.spells?.pact);
	if (pact.max > 0) groups.push({ id: "pact", label: dd("PactTab", "Pact{slots}", { slots: pact.text }), heading: dd("PactHeader", "Pact Magic{slots}", { slots: pact.text }), rows: [] });
	groups.push({ id: "innate", label: dd("Innate", "Innate"), heading: dd("InnateHeader", "Innate Spells"), rows: [] });
	groups.push({ id: "item", label: t("NAH.Tabs.Items", "Items"), rows: [] });
	return groups;
}

/** Id of the group a spell belongs to. */
function groupIdFor(spell, level, linkedActivity, cachedFor, hasPact) {
	if (cachedFor || linkedActivity) return "item";
	const method = spell.system.method || "spell";
	if (method === "pact" && hasPact) return "pact";
	if (method === "innate" || method === "atwill") return "innate";
	return String(level);
}

// ── Preparation filter and wizard rituals ───────────────

/** Drawer toggle that lists unprepared spells too (off by default, per player). */
const UNPREPARED_TOGGLE = "dnd5e.unpreparedSpells";

/** A leveled spell of the actor's own spellbook that uses preparation and is not prepared. */
function isUnpreparedSpell(spell) {
	if (spell.system.level <= 0 || !spell.system.canPrepare) return false;
	if (spell.getFlag("dnd5e", "cachedFor") || spell.system.linkedActivity) return false;
	return !(spell.system.prepared > 0);
}

const showsUnpreparedRituals = () => Boolean(readSetting("dnd5eShowUnpreparedRituals"));

/** Wizards (classes are keyed by identifier) and Ritual Adepts can cast rituals from their spellbook without preparing them. */
function isWizardActor(actor) {
	if (!actor) return false;
	if (actor.classes?.wizard) return true;
	return Boolean(actor.itemTypes?.feat?.some((feat) => feat.identifier === "ritual-adept" || feat.name.toLowerCase() === "ritual adept"));
}

/** A ritual spell that belongs to the actor's wizard spellbook. */
function isWizardRitual(spell, actor) {
	if (!spell.system.properties.has("ritual")) return false;
	const classId = spell.system.classIdentifier;
	if (classId) return classId === "wizard";
	// `sourceItem` names the granting item ("class:wizard") even when that item is not on the actor
	if (spell.system.sourceItem?.toLowerCase().includes("wizard")) return true;
	if (spell.system.spellLists.has("class:wizard")) return true;
	// No explicit class: with a single spellcasting class the spell is part of that spellbook.
	return Object.keys(actor?.spellcastingClasses || {}).length <= 1;
}

/**
 * Preparation status of a spell: `hidden` when it should not be listed (leveled, unprepared, not an
 * allowed wizard ritual, unprepared spells toggled off), `unpreparedRitual` when it is listed as a
 * castable ritual, `unprepared` when it is listed only because the unprepared-spells toggle is on.
 */
function preparationStatus(spell, actor, level, isGranted, { showUnprepared, wizardRituals }) {
	// `canPrepare` is the system's own "this casting method uses preparation" flag (false for innate, at-will, ritual-only).
	const canPrepare = spell.system.canPrepare;
	const listed = { hidden: false, unpreparedRitual: false, unprepared: false };
	if (isGranted || level <= 0 || !canPrepare) return listed;
	if (spell.system.prepared > 0) return listed;
	if (wizardRituals && isWizardRitual(spell, actor)) return { ...listed, unpreparedRitual: true };
	return showUnprepared ? { ...listed, unprepared: true } : { ...listed, hidden: true };
}

// ── Item-granted spells ─────────────────────────────────

/** Resolve the activity (and its item) that granted a spell, from its link or its `cachedFor` uuid. */
function resolveGrant(spell, actor) {
	const cachedFor = spell.getFlag("dnd5e", "cachedFor");
	let linkedActivity = spell.system?.linkedActivity ?? null;
	let sourceItem = linkedActivity?.item ?? null;
	if (sourceItem || !cachedFor) return { cachedFor, linkedActivity, sourceItem };

	try {
		const activity = fromUuidSync(cachedFor, { relative: actor, strict: false });
		if (activity?.item) sourceItem = activity.item;
		if (!linkedActivity && activity) linkedActivity = activity;
	} catch (_e) {
		sourceItem = null;
	}
	if (!sourceItem) {
		try {
			const [itemId, , activityId] = (foundry.utils.parseUuid(cachedFor, { relative: actor })?.embedded ?? []).slice(-3);
			sourceItem = actor.items?.get(itemId) ?? null;
			if (!linkedActivity && sourceItem) linkedActivity = sourceItem.system?.activities?.get(activityId) ?? null;
		} catch (_e) {
			sourceItem = null;
		}
	}
	return { cachedFor, linkedActivity, sourceItem };
}

function grantSourceOf(spell, sourceItem) {
	const name = sourceItem?.name || spell.system.source?.custom || t("NAH.Tabs.Items", "") || "Items";
	return { name, img: sourceItem?.img || "icons/svg/item-bag.svg", id: sourceItem?.id || name };
}

// ── Rows ────────────────────────────────────────────────

function usesBadgeOf(spell, linkedActivity, sourceItem, actor) {
	if (linkedActivity && _activityHasUses(linkedActivity)) {
		const { value, max } = linkedActivity.uses ?? {};
		return usesBadge(`[${value ?? 0}${max ? `/${max}` : ""}]`);
	}
	const usesHolder = sourceItem && _hasItemUses(sourceItem) ? sourceItem : (_hasItemUses(spell) ? spell : null);
	const resolved = usesHolder ? _resolveFeatureUses(usesHolder, actor) : null;
	return resolved?.hasUses ? resolved.badge : null;
}

function componentSegments(props, isUnpreparedRitual, isUnprepared) {
	const has = (key) => props.has(key);
	const segments = [];
	const isRitual = has("ritual");

	if (isUnprepared) segments.push(segment.tag("unprepared", t("NAH.Spells.UnpreparedTag", "Unprepared"), t("NAH.Spells.UnpreparedTitle", "Not prepared"), { unprepared: true }));

	if (has("concentration")) segments.push(segment.tag("conc", "C", dd("Concentration", "Concentration")));
	if (isRitual) {
		segments.push(isUnpreparedRitual
			? segment.tag("ritual", t("NAH.Spells.RitualTag", "Ritual"), t("NAH.Spells.UnpreparedRitualTitle", "Ritual Only (Unprepared)"), { unprepared: true })
			: segment.tag("ritual", "R", dd("Ritual", "Ritual")));
	}

	const letters = [has("vocal") && "V", has("somatic") && "S", has("material") && "M"].filter(Boolean);
	if (letters.length) segments.push(segment.components(letters.join(", ")));
	return { segments, isUnpreparedRitual };
}

function infoSegments(spell, actor, linkedActivity) {
	const segments = [];
	const { damageParts, damageDisplay } = _getItemDamage(spell, actor);
	const reach = _describeReach(spell);

	for (const part of damageParts) segments.push(segment.damage(part.formula, part.types, damageDisplay));
	if (reach && (!damageParts.length || _shouldShowReach(spell, reach))) segments.push(segment.range(reach));

	const duration = _formatDuration(spell, linkedActivity);
	if (duration) segments.push(segment.duration(duration, _getDurationLabel(spell, linkedActivity)));
	return segments;
}

function spellRow(spell, actor, hasPact, listing) {
	const level = spell.system.level;
	const { cachedFor, linkedActivity, sourceItem } = resolveGrant(spell, actor);
	if (cachedFor || linkedActivity) {
		if (linkedActivity && linkedActivity.displayInSpellbook === false) return null;
	}

	const { hidden, unpreparedRitual, unprepared } = preparationStatus(spell, actor, level, Boolean(cachedFor || linkedActivity), listing);
	if (hidden) return null;

	const activation = _describeActivation(spell.system.activation?.type || linkedActivity?.activation?.type || "action");
	const flags = componentSegments(spell.system.properties, unpreparedRitual, unprepared);
	const source = grantSourceOf(spell, sourceItem);

	const row = createRow({
		id: spell.id,
		name: spell.name,
		icon: spell.img,
		uses: usesBadgeOf(spell, linkedActivity, sourceItem, actor),
		segments: [
			...(activation ? [segment.activation(activation.classType, activation.label, activation.title)] : []),
			...flags.segments,
			...infoSegments(spell, actor, linkedActivity),
		],
		level,
		sourceName: source.name,
		sourceImg: source.img,
		sourceId: source.id,
		subtleInfo: true,
		isUnpreparedRitual: flags.isUnpreparedRitual,
		isUnprepared: unprepared,
		description: spell.system.description?.value ?? "",
	});
	return { row, groupId: groupIdFor(spell, level, linkedActivity, cachedFor, hasPact) };
}

/** Item-granted spells grouped under a header per source item. */
function groupBySource(rows, compare) {
	const sorted = [...rows].sort((a, b) =>
		compare(String(a.sourceName || ""), String(b.sourceName || ""))
		|| (Number(a.level) || 0) - (Number(b.level) || 0)
		|| compare(a.name, b.name));

	const grouped = [];
	let lastSource = null;
	for (const row of sorted) {
		const source = row.sourceName || "Items";
		if (source !== lastSource) {
			lastSource = source;
			grouped.push(heading(source, row.sourceImg || "icons/svg/item-bag.svg"));
		}
		grouped.push(row);
	}
	return grouped;
}

// ── Section ─────────────────────────────────────────────

/** Drawer payload for the spells section. */
export function buildSpells(actor) {
	if (!actor?.items) return emptyDrawer("Spells");

	const groups = spellGroups(actor);
	const hasPact = groups.some((group) => group.id === "pact");
	const spells = actor.items.filter((item) => item.type === "spell");
	const showUnprepared = isDrawerToggleOn(UNPREPARED_TOGGLE);
	// Per actor, not per spell: whether unprepared wizard rituals are listed at all.
	const listing = { showUnprepared, wizardRituals: showsUnpreparedRituals() && isWizardActor(actor) };
	const groupsById = new Map(groups.map((group) => [group.id, group]));
	for (const spell of spells) {
		const built = spellRow(spell, actor, hasPact, listing);
		if (!built) continue;
		let group = groupsById.get(built.groupId);
		if (!group) {
			groups.push(group = { id: built.groupId, label: built.groupId, rows: [] });
			groupsById.set(group.id, group);
		}
		group.rows.push(built.row);
	}
	const { compare } = collatorFor();
	for (const group of groups) group.rows.sort((a, b) => compare(a.name, b.name));
	const granted = groupsById.get("item");
	granted.rows = groupBySource(granted.rows, compare);

	const overviewLabel = t("NAH.UI.AllSpells", "") || t("NAH.UI.All", "") || "All";
	// The toggle is offered only when the actor has unprepared spells to show.
	const toggles = spells.some(isUnpreparedSpell)
		? [drawerToggle(UNPREPARED_TOGGLE, {
			icon: showUnprepared ? "fas fa-eye" : "fas fa-eye-slash",
			onTitle: t("NAH.Spells.HideUnprepared", "Hide unprepared spells"),
			offTitle: t("NAH.Spells.ShowUnprepared", "Show unprepared spells"),
		})]
		: [];
	return { title: "Spells", panes: withOverview(groups, overviewLabel), toggles };
}
