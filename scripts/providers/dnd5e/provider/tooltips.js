/**
 * Hover card data for items, activities, checks, saves, skills, tools and rests.
 */

import { text } from "../../../core/text.js";
import { dd } from "../lib/text.js";
import { parseRef } from "../../../core/action-ref.js";
import { _activityHasUses, _getActivities } from "../lib/activities.js";
import { _getItemDamage } from "../lib/damage.js";
import { _formatDuration, _concentrationDurationLabel } from "../lib/duration.js";
import { _describeReach } from "../lib/range.js";
import { _resolveFeatureUses } from "../lib/uses.js";
import { _formatFavoriteUses, getFavoriteUses } from "./favorites.js";

/** "3rd" in English; the plain number elsewhere (the translated text adds its own wording). */
function ordinalOf(level) {
	if (game.i18n?.lang && game.i18n.lang !== "en") return String(level);
	const suffix = level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th";
	return `${level}${suffix}`;
}

/**
 * Build rich tooltip data for an item or action in DnD5e 6.x.
 * @param {Actor} actor
 * @param {Item|Object} item
 * @returns {Promise<Object|null>}
 */
export async function buildTooltipData(actor, itemOrId) {
	if (!actor || !itemOrId) return null;

	// 6. Items & Activities
	let item = typeof itemOrId === "object" ? itemOrId : null;
	let activity = null;
	if (!item && typeof itemOrId === "string") {
		const { kind, args } = parseRef(itemOrId);
		if (kind === "activity") {
			item = actor.items?.get(args[0]);
			activity = item?.system?.activities?.get(args[1]);
		} else {
			const cleanId = itemOrId.split("_")[0];
			item = actor.items?.get(cleanId) || actor.items?.getName(cleanId);
		}
	}

	if (!item) return null;

	const name = activity?.name || item.name || dd("ActionFallback", "Action");
	const img = activity?.img || item.img || "icons/svg/item-bag.svg";

	let subtitle = item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : "Item";
	if (item.type === "spell") {
		const lvl = item.system?.level ?? 0;
		const school = CONFIG.DND5E?.spellSchools?.[item.system?.school]?.label || "";
		subtitle = lvl === 0 ? (school ? dd("CantripSchool", "Cantrip ({school})", { school }) : dd("Cantrip", "Cantrip")) : dd("SpellLevel", "{ordinal}-level {school}", { ordinal: ordinalOf(lvl), school });
	} else if (item.type === "weapon") {
		subtitle = item.system?.type?.label || "Weapon";
	} else if (item.type === "feat") {
		subtitle = item.system?.type?.label || "Feature";
	}

	const badges = [];
	let usesData = null;
	if (activity && _activityHasUses(activity)) {
		usesData = _formatFavoriteUses(activity.uses, activity, item, actor);
	} else {
		usesData = getFavoriteUses(actor, typeof itemOrId === "string" ? itemOrId : item.id, item);
	}
	if (!usesData) {
		const resolved = _resolveFeatureUses(item, actor);
		if (resolved?.hasUses) {
			const maxStr = resolved.max !== null && resolved.max !== undefined ? `/${resolved.max}` : "";
			usesData = {
				value: resolved.value ?? 0,
				max: resolved.max ?? null,
				label: resolved.hasRecharge
					? (resolved.value >= 1 ? "1/1" : "0/1")
					: `${resolved.value ?? 0}${maxStr}`,
				isDepleted: Boolean(resolved.isDepleted),
				hasRecharge: Boolean(resolved.hasRecharge),
			};
		}
	}
	if (usesData?.label) {
		badges.push({ label: usesData.label, className: usesData.isDepleted ? "unprepared" : "prepared" });
	}
	if (item.system?.properties?.has("ritual")) {
		badges.push({ label: dd("Ritual", "Ritual"), className: "ritual" });
	}
	if (item.system?.quantity > 1) {
		badges.push({ label: `x${item.system.quantity}`, className: "prepared" });
	}

	const specs = [];
	const tactical = [];
	const properties = [];

	const range = _describeReach(item);
	if (range) specs.push({ icon: "fas fa-ruler", label: dd("Range", "Range"), value: range });

	const actDisplay = activity?.labels?.activation || item.labels?.activation;
	if (actDisplay) specs.push({ icon: "fas fa-clock", label: dd("Activation", "Activation"), value: actDisplay });

	// Concentration is part of the duration ("Concentration, up to 1 minute") rather than a badge.
	const duration = _concentrationDurationLabel(item, activity) || _formatDuration(item, activity);
	if (duration) specs.push({ icon: "fas fa-hourglass-half", label: dd("Duration", "Duration"), value: duration });

	const activities = _getActivities(item);
	const primaryAtk = activity?.type === "attack" ? activity : activities.find((a) => a.type === "attack");
	const toHit = primaryAtk?.labels?.toHit || item.labels?.toHit;
	if (toHit) specs.push({ icon: "fas fa-crosshairs", label: dd("ToHit", "To Hit"), value: toHit });

	const dmg = _getItemDamage(item, actor);
	if (dmg?.damageText || dmg?.damageFormula) {
		tactical.push({
			icon: "fas fa-burst",
			label: dd("Damage", "Damage"),
			value: dmg.damageText || dmg.damageFormula,
			valueHtml: dmg.damageHtml || null,
			class: "damage",
		});
	}

	const saveActivity = activity?.type === "save" ? activity : activities.find((a) => a.type === "save");
	if (saveActivity) {
		// dnd5e labels the save ("DC 15 Dexterity") once it has a DC
		const saveText = saveActivity.labels?.save;
		if (saveText) {
			tactical.push({ icon: "fas fa-shield-alt", label: dd("Save", "Save"), value: saveText, class: "save" });
		}
	}

	// Weapon / item property pills
	const props = item.system?.properties;
	if (props instanceof Set) {
		for (const pKey of props) {
			if (pKey === "mgc" && item.type === "spell") continue; // every spell is magical
			const pConfig = CONFIG.DND5E?.itemProperties?.[pKey];
			if (pConfig?.label) {
				properties.push({ label: pConfig.label });
			}
		}
	}
	if (item.system?.mastery) {
		const mKey = item.system.mastery;
		const mLabel = CONFIG.DND5E?.weaponMasteries?.[mKey]?.label || mKey;
		properties.push({ label: mLabel, class: "mastery", title: "Weapon Mastery" });
	}
	if (item.system?.attunement) {
		const attLabel = item.system.attuned ? "Attuned" : "Requires Attunement";
		properties.push({ label: attLabel, class: item.system.attuned ? "attuned" : "attunement" });
	}

	const description = activity?.description?.value || item.system?.description?.value || "";

	return {
		title: name,
		subtitle,
		icon: img,
		item,
		badges,
		specs,
		tactical,
		properties,
		description,
		footer: text("NAH.Tooltips.Card.UseFooter", "Left-Click to Use"),
	};
}
