/**
 * Favorites resolution: display data and uses for pinned actions.
 */

import { MODULE_ID } from "../../../core/ids.js";
import { parseRef } from "../../../core/action-ref.js";
import { _activityHasUses, _getSingleActivityUses, _hasItemUses } from "../lib/activities.js";
import { actorHasAvailableSpellSlots } from "../lib/spell-slots.js";
import { _resolveFeatureUses } from "../lib/uses.js";

/**
 * Retrieve uses data for a favorited action or item (DnD5e 6.x).
 * Checks item-level limited uses first, then single activity uses,
 * as well as explicit activity IDs and linked item macros.
 * @param {Actor} actor
 * @param {string} itemId
 * @param {Item|Object|null} [item=null]
 * @returns {{ value: number, max: number|null, label: string, isDepleted: boolean }|null}
 */
export function getFavoriteUses(actor, itemId, item = null) {
	if (!actor || !itemId) return null;

	let targetItem = item;
	let targetActivity = null;

	const { kind, args } = parseRef(itemId);

	if (kind === "activity") {
		targetItem = actor.items?.get(args[0]) || targetItem;
		targetActivity = targetItem?.system?.activities?.get(args[1]) || null;
		if (targetActivity && _activityHasUses(targetActivity)) {
			return _formatFavoriteUses(targetActivity.uses, targetActivity, targetItem, actor);
		}
		if (targetItem && _hasItemUses(targetItem)) {
			return _formatFavoriteUses(targetItem.system?.uses, null, targetItem, actor);
		}
	}

	// A macro created from an actor's item reports that item's uses.
	if (kind === "macro") {
		const macro = fromUuidSync(args[0], { strict: false }) || game.macros?.get(args[0]);
		const sourceId = macro?.flags?.[MODULE_ID]?.sourceId;
		const linked = sourceId ? fromUuidSync(sourceId, { strict: false }) : null;
		if (linked?.actor?.id === actor.id) targetItem = linked;
	}

	// 4. Resolve standard actor item
	if (!targetItem || !targetItem.system) {
		targetItem = actor.items?.get(itemId);
	}

	if (!targetItem || !targetItem.system) return null;

	// 5. Item-level limited uses attached directly to the item
	if (_hasItemUses(targetItem)) {
		return _formatFavoriteUses(targetItem.system.uses, null, targetItem, actor);
	}

	// 6. Exactly one activity with activity uses on the item
	const singleActivity = _getSingleActivityUses(targetItem);
	if (singleActivity && _activityHasUses(singleActivity)) {
		return _formatFavoriteUses(singleActivity.uses, singleActivity, targetItem, actor);
	}

	// 7. Legendary action / feature uses resolution (via _resolveFeatureUses)
	const resolved = _resolveFeatureUses(targetItem, actor);
	if (resolved?.hasUses) {
		const maxStr = resolved.max !== null && resolved.max !== undefined ? `/${resolved.max}` : "";
		return {
			value: resolved.value ?? 0,
			max: resolved.max ?? null,
			label: resolved.hasRecharge
				? (resolved.value >= 1 ? "1/1" : "0/1")
				: `${resolved.value ?? 0}${maxStr}`,
			isDepleted: Boolean(resolved.isDepleted),
			hasRecharge: Boolean(resolved.hasRecharge),
		};
	}

	return null;
}

export function _formatFavoriteUses(uses, activity = null, targetItem = null, actor = null) {
	if (!uses) return null;

	// Recharge: these uses (item or activity) recover on a recharge roll
	if (uses.recovery.some((r) => r.period === "recharge")) {
		const isCharged = uses.value >= 1;
		const value = isCharged ? 1 : 0;
		let isDepleted = !isCharged;
		if (isDepleted && actor) {
			const isSpell = targetItem?.type === "spell" || activity?.type === "cast";
			if (isSpell) {
				const spellLevel = targetItem?.system?.level ?? activity?.spell?.level ?? 1;
				if (actorHasAvailableSpellSlots(actor, spellLevel)) {
					isDepleted = false;
				}
			}
		}
		return {
			value,
			max: 1,
			label: isCharged ? "1/1" : "0/1",
			isDepleted,
			hasRecharge: true,
		};
	}

	// dnd5e prepares `max` (evaluated) and `value` (max - spent, clamped)
	const maxNum = Number(uses.max) || 0;
	const hasValidMax = maxNum > 0;
	const value = uses.value;

	if (!hasValidMax && value <= 0) return null;

	const label = hasValidMax ? `${value}/${maxNum}` : `${value}`;
	let isDepleted = hasValidMax ? value <= 0 : false;
	if (isDepleted && actor) {
		const isSpell = targetItem?.type === "spell" || activity?.type === "cast";
		if (isSpell) {
			const spellLevel = targetItem?.system?.level ?? activity?.spell?.level ?? 1;
			if (actorHasAvailableSpellSlots(actor, spellLevel)) {
				isDepleted = false;
			}
		}
	}

	return {
		value,
		max: hasValidMax ? maxNum : null,
		label,
		isDepleted,
	};
}
