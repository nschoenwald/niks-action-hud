/**
 * Features and Legendary sections: class/race/background features and monster legendary actions.
 * Both use the same row so they show identical sub-line info.
 */

import { readProfile } from "../../../core/profile.js";
import { createRow, segment } from "../../shared/row-model.js";
import { emptyDrawer, singlePane, withOverview } from "../../shared/drawer-model.js";
import { _describeActivation, _readActivationType } from "../lib/activation.js";
import { _getItemDamage } from "../lib/damage.js";
import { _isLegendaryItem } from "../lib/legendary.js";
import { _describeReach, _shouldShowReach } from "../lib/range.js";
import { _resolveFeatureUses } from "../lib/uses.js";
import { collatorFor } from "../../../core/text.js";

const t = (key, fallback) => game.i18n?.localize?.(key) || fallback;
const localizedIfPresent = (key, fallback) => (game.i18n?.has?.(key) ? game.i18n.localize(key) : "") || fallback;

// ── Tabs from the system's activation types ─────────────

/** dnd5e's category for ordinary action-economy costs; each of its types keeps a tab of its own. */
const STANDARD_CATEGORY = "DND5E.ACTIVATION.Category.Standard";

/**
 * Tabs for usable features, read from `CONFIG.DND5E.activityActivationTypes` in the system's own order.
 * Standard types (action, bonus action, reaction) and types without a category each get a tab; every other
 * type shares one tab per dnd5e category (Time, Rest, Combat, Monster, Vehicle). Returns the tab list and a
 * lookup from activation type to tab id.
 */
function activationTabs() {
	const tabs = new Map();
	const tabOfType = new Map();
	for (const [type, config] of Object.entries(globalThis.CONFIG?.DND5E?.activityActivationTypes ?? {})) {
		const category = config?.group;
		const ownTab = !category || category === STANDARD_CATEGORY;
		const id = ownTab ? type : `category-${category.split(".").pop().toLowerCase()}`;
		tabOfType.set(type.toLowerCase(), id);
		if (tabs.has(id)) continue;
		const label = localizedIfPresent(ownTab ? config?.label : category, type);
		tabs.set(id, { id, label, heading: ownTab ? localizedIfPresent(config?.header, label) : label });
	}
	tabs.set("other", { id: "other", label: localizedIfPresent("DND5E.ActionOther", "Other") });
	return { tabs: [...tabs.values()], tabOfType };
}

// ── Rows ────────────────────────────────────────────────

function featureSegments(feat, actor, activationType) {
	const segments = [];
	const badge = _describeActivation(activationType);
	if (badge) segments.push(segment.activation(badge.classType, badge.label, badge.title));

	const { damageParts, damageDisplay } = _getItemDamage(feat, actor);
	for (const part of damageParts) segments.push(segment.damage(part.formula, part.types, damageDisplay));

	const reach = _describeReach(feat);
	if (_shouldShowReach(feat, reach)) segments.push(segment.range(reach));
	return { segments, hasDamage: damageParts.length > 0 };
}

/**
 * A feature counts as usable when the system gives it something to do (an activity) or it tracks
 * limited uses (recharge included); everything else is listed as passive.
 */
const isUsable = (feat, resolved) => (feat.system?.activities?.size ?? 0) > 0 || Boolean(resolved?.hasUses);

/** Row for a feature, its activation type and whether it is usable. */
function featureEntry(feat, actor) {
	const resolved = _resolveFeatureUses(feat, actor);
	const activationType = _readActivationType(feat) || resolved?.activationType || "";

	const { segments, hasDamage } = featureSegments(feat, actor, activationType);
	const row = createRow({
		id: feat.id,
		name: feat.name,
		icon: feat.img,
		uses: resolved?.badge,
		segments,
		description: feat.system.description?.value || "",
		isDepleted: resolved?.isDepleted || false,
		subtleInfo: !hasDamage,
		isFeature: true,
	});
	return { row, activationType, usable: isUsable(feat, resolved) };
}

const byName = (a, b) => collatorFor().compare(a.name, b.name);

// ── Sections ────────────────────────────────────────────

/** Usable features as one "Actions" tab, or spread over the activation tabs when grouping is on. */
function usableTabs(entries) {
	if (readProfile().dnd5eGroupByActivation === false) {
		return [{ id: "actions", label: t("NAH.Tabs.Actions", "Actions"), rows: entries.map((entry) => entry.row).sort(byName) }];
	}
	const { tabs, tabOfType } = activationTabs();
	const rowsByTab = new Map(tabs.map((tab) => [tab.id, []]));
	for (const { row, activationType } of entries) {
		rowsByTab.get(tabOfType.get(activationType.toLowerCase()) ?? "other").push(row);
	}
	return tabs.map((tab) => ({ ...tab, rows: rowsByTab.get(tab.id).sort(byName) }));
}

/** Drawer payload for the features section. */
export function buildFeatures(actor) {
	if (!actor?.items) return emptyDrawer("Features");

	// Class, subclass, background and species items are containers; their granted features are feat items.
	const entries = actor.items.filter((item) => item.type === "feat").map((feat) => featureEntry(feat, actor));
	const groups = [
		...usableTabs(entries.filter((entry) => entry.usable)),
		{ id: "traits", label: t("NAH.Tabs.Passive", "Passive"), rows: entries.filter((entry) => !entry.usable).map((entry) => entry.row).sort(byName) },
	].map((group) => ({ ...group, heading: (group.heading ?? group.label).replace(/<[^>]*>/g, "").trim() }));
	const overviewLabel = t("NAH.UI.AllFeatures", "") || t("NAH.UI.All", "") || "All Features";
	return { title: t("DND5E.Features", "FEATURES"), panes: withOverview(groups, overviewLabel) };
}

/** Drawer payload for the legendary section (legendary actions and resistances). */
export function buildLegendary(actor) {
	const rows = actor?.items ? actor.items.filter((item) => _isLegendaryItem(item)).map((item) => featureEntry(item, actor).row) : [];
	return singlePane("LEGENDARY", rows);
}
