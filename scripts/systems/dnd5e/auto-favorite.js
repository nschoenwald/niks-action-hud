import { MODULE_ID } from "../../constants.js";
import { _getActivities } from "./helpers.js";

export const TARGET_ACTIVITY_TYPES = new Set(["attack", "damage", "save"]);

/**
 * Checks whether an item or feature has attack, damage, or save activities (DnD5e v6).
 * @param {Item} item
 * @returns {boolean}
 */
export function hasAttackDamageOrSaveActivity(item) {
	if (!item) return false;
	if (item.favoritable === false || item.flags?.[MODULE_ID]?.favoritable === false) return false;

	const activities = _getActivities(item);
	return activities.some((act) => TARGET_ACTIVITY_TYPES.has(act?.type));
}

/**
 * Extracts the activation type string from an item's activities (DnD5e v6).
 * Prioritizes attack/damage/save activities, then any activity on the item.
 * @param {Item} item
 * @returns {string}
 */
export function getItemActivationType(item) {
	if (!item) return "";
	const activities = _getActivities(item);
	const targetActivities = activities.filter((act) => TARGET_ACTIVITY_TYPES.has(act?.type));

	for (const act of targetActivities) {
		const type = act?.activation?.type;
		if (type) return type;
	}

	for (const act of activities) {
		const type = act?.activation?.type;
		if (type) return type;
	}

	return "";
}

/**
 * Maps activation type to numerical rank for sorting:
 * 1: action
 * 2: bonus action
 * 3: reaction
 * 4: legendary action
 * 5: others
 * @param {string} activationType
 * @returns {number}
 */
export function getActionTimeRank(activationType) {
	const type = String(activationType ?? "").toLowerCase().trim();
	switch (type) {
		case "action":
			return 1;
		case "bonus":
		case "bonusaction":
		case "bonus action":
			return 2;
		case "reaction":
			return 3;
		case "legendary":
		case "legendaryaction":
		case "legendary action":
			return 4;
		default:
			return 5;
	}
}

/**
 * Auto-favorites qualifying items/features on an NPC token when placed on canvas,
 * if the NPC has no favorites set yet and has maxLimit or fewer qualifying items.
 *
 * @param {TokenDocument} tokenDoc
 * @param {object} [options={}]
 * @param {string} [userId=game.user.id]
 */
export async function autoFavoriteNpcToken(tokenDoc, options = {}, userId = game.user.id) {
	if (game.system?.id !== "dnd5e") return;

	// Check world setting toggle
	const isEnabled = game.settings?.settings?.has(`${MODULE_ID}.dnd5eAutoFavoriteNpcActions`)
		? Boolean(game.settings.get(MODULE_ID, "dnd5eAutoFavoriteNpcActions"))
		: (game.settings?.get?.(MODULE_ID, "configuration")?.dnd5eAutoFavoriteNpcActions ?? true);
	if (!isEnabled) return;

	// Single client authority check: active GM or triggering user if no active GM
	const shouldHandle = game.users?.activeGM
		? game.users.activeGM.isSelf
		: (game.user?.id === userId && tokenDoc?.actor?.isOwner);
	if (!shouldHandle) return;

	const actor = tokenDoc?.actor || (tokenDoc?.actorId ? game.actors?.get(tokenDoc.actorId) : null);
	if (!actor || actor.type !== "npc") return;

	// Check if that NPC has not favorites set yet
	const baseActor = actor.isToken ? (game.actors?.get(actor.id) || actor.baseActor) : null;
	const tokenFavs = actor.getFlag?.(MODULE_ID, "favorites");
	const baseFavs = baseActor?.getFlag?.(MODULE_ID, "favorites");

	const hasFavorites = (Array.isArray(tokenFavs) && tokenFavs.length > 0)
		|| (Array.isArray(baseFavs) && baseFavs.length > 0);
	if (hasFavorites) return;

	if (!actor.items || typeof actor.items.filter !== "function") return;

	// Filter for items or features with attack, damage or save activities
	const qualifyingItems = actor.items.filter((item) => hasAttackDamageOrSaveActivity(item));

	// Configurable max limit (default 5)
	const rawMax = game.settings?.settings?.has(`${MODULE_ID}.dnd5eAutoFavoriteNpcMax`)
		? game.settings.get(MODULE_ID, "dnd5eAutoFavoriteNpcMax")
		: (game.settings?.get?.(MODULE_ID, "configuration")?.dnd5eAutoFavoriteNpcMax ?? 5);
	const maxLimit = Math.max(1, Number(rawMax) || 5);

	// Must have between 1 and maxLimit items
	if (qualifyingItems.length === 0 || qualifyingItems.length > maxLimit) return;

	// Sort by action time: action -> bonus action -> reaction -> legendary action -> others
	qualifyingItems.sort((a, b) => {
		const rankA = getActionTimeRank(getItemActivationType(a));
		const rankB = getActionTimeRank(getItemActivationType(b));
		if (rankA !== rankB) return rankA - rankB;
		return (a.sort ?? 0) - (b.sort ?? 0);
	});

	const favoriteIds = qualifyingItems.map((item) => item.id);

	// Persist favorites to token actor and base actor
	try {
		await actor.setFlag(MODULE_ID, "favorites", favoriteIds);
	} catch (err) {
		console.warn(`Nik's Action HUD | Failed to set favorites on token actor ${actor.id}:`, err);
	}

	if (baseActor && !baseActor.pack && !baseActor.compendium && (baseActor.isOwner || game.user?.isGM)) {
		try {
			await baseActor.setFlag(MODULE_ID, "favorites", favoriteIds);
		} catch (err) {
			console.warn(`Nik's Action HUD | Failed to set favorites on base actor ${baseActor.id}:`, err);
		}
	}

	// Synchronize any other unlinked tokens of the same base actor on canvas
	if (canvas?.tokens?.placeables) {
		for (const placeable of canvas.tokens.placeables) {
			const tokActor = placeable.actor;
			if (
				tokActor &&
				tokActor.isToken &&
				tokActor.id === (baseActor?.id ?? actor.id) &&
				tokActor !== actor
			) {
				tokActor.setFlag(MODULE_ID, "favorites", favoriteIds).catch(() => {});
			}
		}
	}

	// Refresh action menu if displaying this actor
	const currentActor = window.ActionHUD?.actionMenu?.currentActor;
	if (currentActor?.id === actor.id || currentActor?.id === baseActor?.id) {
		window.ActionHUD?.actionMenu?.refresh?.();
	}
}

/**
 * Registers the createToken hook for NPC auto-favoriting.
 */
export function registerAutoFavoriteNpcHook() {
	Hooks.on("createToken", (tokenDoc, options, userId) => {
		void autoFavoriteNpcToken(tokenDoc, options, userId);
	});
}
