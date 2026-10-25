/**
 * Visual and audio alerts when an actor's combat turn begins.
 */

import { MODULE_ID, DOM_IDS } from "../../core/ids.js";
import { combatantMatches } from "../../core/combat-ownership.js";

let pendingAlert = null;
let alertTimer = null;

const TURN_SOUND_SRC = "sounds/combat/epic-turn-1hit.ogg";

/**
 * Record a combat turn change from updateCombat hook.
 * @param {Combat} combat
 * @param {object} changed
 */
export function onCombatTurnUpdate(combat, changed) {
	if (!combat?.started) return;
	if (!("turn" in changed) && !("round" in changed) && !changed.started) return;

	const activeCombatant = combat.combatant;
	if (!activeCombatant) return;

	const turnKey = `${combat.id}:${combat.round}:${combat.turn}:${activeCombatant.id}`;
	if (pendingAlert?.turnKey === turnKey) return;

	pendingAlert = {
		turnKey,
		combatantId: activeCombatant.id,
		actorId: activeCombatant.actorId || activeCombatant.actor?.id || null,
		tokenId: activeCombatant.tokenId || activeCombatant.token?.id || null,
		isNpc: Boolean(activeCombatant.actor?.type === "npc" || !activeCombatant.actor?.hasPlayerOwner),
	};
}

/** Reset combat alert state on combat deletion or scene change. */
export function clearTurnAlert() {
	pendingAlert = null;
	clearTimeout(alertTimer);
	const root = document.getElementById(DOM_IDS.DOCK);
	root?.classList.remove("is-turn-alert");
}

/** Play the local turn audio alert if configured. */
function playTurnSound() {
	try {
		const helper = foundry.audio?.AudioHelper || globalThis.AudioHelper;
		const soundSrc = CONFIG.Combat?.sounds?.epic?.yourTurn?.[0] || TURN_SOUND_SRC;
		helper?.play?.({ src: soundSrc, volume: 0.5, autoplay: true }, false);
	} catch (err) {
		console.warn(`[${MODULE_ID}] Could not play turn alert sound:`, err);
	}
}

/**
 * Check if the current dock matches the pending turn alert and execute the visual + audio alert.
 * Called in paintDock().
 * @param {HTMLElement} root
 * @param {object} headerModel
 */
export function triggerTurnAlertIfPending(root, headerModel) {
	if (!pendingAlert || !headerModel?.isActiveTurn) return;

	const matches = combatantMatches(
		{ actorId: pendingAlert.actorId, tokenId: pendingAlert.tokenId, id: pendingAlert.combatantId },
		headerModel.actorId,
		headerModel.tokenId
	);
	if (!matches) return;

	const isGM = Boolean(game.user?.isGM);
	const isNpc = Boolean(pendingAlert.isNpc);

	const visualEnabled = game.settings.settings?.has(`${MODULE_ID}.combatTurnAlert`)
		? game.settings.get(MODULE_ID, "combatTurnAlert")
		: true;
	const soundEnabled = game.settings.settings?.has(`${MODULE_ID}.combatTurnSound`)
		? game.settings.get(MODULE_ID, "combatTurnSound")
		: false;
	const npcEnabled = game.settings.settings?.has(`${MODULE_ID}.combatTurnNpc`)
		? game.settings.get(MODULE_ID, "combatTurnNpc")
		: false;

	// GM handling for NPCs: only alert if GM enabled combatTurnNpc
	if (isGM && isNpc && !npcEnabled) {
		pendingAlert = null;
		return;
	}

	// Visual alert: radiant sweep, wake from idle fade, banner pulse
	if (visualEnabled) {
		root.classList.remove("faded-ui");
		root.classList.remove("is-turn-alert");
		// Trigger reflow to restart CSS animation if back-to-back
		void root.offsetWidth;
		root.classList.add("is-turn-alert");

		clearTimeout(alertTimer);
		alertTimer = setTimeout(() => {
			root.classList.remove("is-turn-alert");
		}, 1600);
	}

	// Sound alert (players always get audio if enabled; GMs get audio on PCs or opted-in NPCs)
	if (soundEnabled) {
		const allowSound = !isGM || !isNpc || npcEnabled;
		if (allowSound) playTurnSound();
	}

	pendingAlert = null;
}
