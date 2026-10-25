import { readProfile } from "../../core/profile.js";
import { readSetting } from "../../core/setting-read.js";
import { MODULE_ID, FLAGS } from "../../core/ids.js";
import { liveFavorites } from "./pins.js";

/**
 * NPC auto-favorites: when an NPC token is placed and its actor has no favorites yet, pin its
 * qualifying actions. What qualifies (and in which order) comes from the provider's `autoPin`
 * rules; settings, the single-client check and saving the flags are the same for every system.
 */

/** A world option's current value: the registered setting, else the profile, else `fallback`. */
function readOption(key, fallback) {
	if (game.settings?.settings?.has(`${MODULE_ID}.${key}`)) return readSetting(key);
	return readProfile()?.[key] ?? fallback;
}

/** Items the HUD must never pin. */
const isPinnable = (item) => Boolean(item) && item.pinnable !== false && item.flags?.[MODULE_ID]?.pinnable !== false;

/**
 * @param {TokenDocument} tokenDoc
 * @param {string} [userId=game.user.id]  user who created the token
 */
async function autoFavoriteNpcToken(tokenDoc, userId = game.user.id) {
	const rules = window.NikHUD?.provider?.autoPinRules?.();
	if (!rules) return;
	if (readOption("autoFavoriteNpcActions", true) === false) return;

	// Single client authority check: active GM or triggering user if no active GM
	const shouldHandle = game.users?.activeGM
		? game.users.activeGM.isSelf
		: (game.user?.id === userId && tokenDoc?.actor?.isOwner);
	if (!shouldHandle) return;

	const actor = tokenDoc?.actor || (tokenDoc?.actorId ? game.actors?.get(tokenDoc.actorId) : null);
	if (!actor || !rules.isNpc(actor)) return;

	// Check if that NPC has not favorites set yet
	const baseActor = actor.isToken ? (game.actors?.get(actor.id) || actor.baseActor) : null;
	const hasFavorites = liveFavorites(actor).length > 0 || (baseActor && liveFavorites(baseActor).length > 0);
	if (hasFavorites) return;

	if (!actor.items || typeof actor.items.filter !== "function") return;

	// Ordered qualifying items (provider rules)
	let qualifyingItems = rules.candidates(actor).filter(isPinnable);
	if (qualifyingItems.length === 0) return;

	// Configurable max limit (default 6)
	const maxLimit = Math.max(1, Number(readOption("autoFavoriteNpcMax", 6)) || 6);

	// Beyond the limit nothing is favorited, unless attacks are always favorited: then only those are.
	if (qualifyingItems.length > maxLimit) {
		if (readOption("autoFavoriteNpcAttacks", true) === false) return;
		qualifyingItems = qualifyingItems.filter((item) => rules.isAttack(item));
		if (qualifyingItems.length === 0) return;
	}

	const favoriteIds = qualifyingItems.map((item) => item.id);

	// Persist favorites to token actor and base actor
	try {
		await actor.setFlag(MODULE_ID, FLAGS.FAVORITES, favoriteIds);
	} catch (err) {
		console.warn(`Nik's Action HUD | Failed to set favorites on token actor ${actor.id}:`, err);
	}

	if (baseActor && !baseActor.pack && !baseActor.compendium && (baseActor.isOwner || game.user?.isGM)) {
		try {
			await baseActor.setFlag(MODULE_ID, FLAGS.FAVORITES, favoriteIds);
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
				tokActor.setFlag(MODULE_ID, FLAGS.FAVORITES, favoriteIds).catch(() => {});
			}
		}
	}

	// Refresh action menu if displaying this actor
	const currentActor = window.NikHUD?.shell?.currentActor;
	if (currentActor?.id === actor.id || currentActor?.id === baseActor?.id) {
		window.NikHUD?.shell?.requestRefresh?.();
	}
}

/**
 * Registers the createToken hook for NPC auto-favoriting.
 */
export function registerAutoFavoriteNpcHook() {
	Hooks.on("createToken", (tokenDoc, _options, userId) => {
		void autoFavoriteNpcToken(tokenDoc, userId);
	});
}
