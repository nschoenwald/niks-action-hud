/** Portrait interactions: click, double-click centring and the context menu. */

import { setPortraitChoice } from "../../core/portrait-choice.js";
import { readProfile } from "../../core/profile.js";
import { loc } from "./constants.js";
import { hud } from "./context.js";
import { portraitFromTokenFor } from "./models.js";

// ── Portrait interactions ───────────────────────────────

const DOUBLE_CLICK_MS = 230;
let portraitClickTimer = null;

/** A single click opens the sheet; waiting briefly lets a double-click centre the camera instead. */
export function schedulePortraitClick(event) {
	if (event.detail > 1) return;
	clearTimeout(portraitClickTimer);
	portraitClickTimer = setTimeout(() => hud.openSheet(), DOUBLE_CLICK_MS);
}

/** Drop a pending single-click (a double-click is about to centre the camera instead). */
export function cancelPendingPortraitClick() {
	clearTimeout(portraitClickTimer);
}

export function centerOnToken() {
	const current = hud.currentToken;
	const placeable = current?.center ? current : hud.currentActor?.getActiveTokens?.()[0];
	if (placeable?.center) canvas.animatePan({ x: placeable.center.x, y: placeable.center.y, duration: 400 });
}

async function togglePortraitSource() {
	const actor = hud.currentActor;
	if (!actor) return;
	const current = portraitFromTokenFor(actor, readProfile());
	await setPortraitChoice(actor.id, current ? "portrait" : "token");
	hud.refresh();
}

/** Right-click menu of the portrait, as a Foundry ContextMenu delegated from the dock root. */
export function createPortraitMenu(root) {
	const usingToken = () => portraitFromTokenFor(hud.currentActor, readProfile());
	const entries = [
		{ name: loc("Portrait.OpenSheet", "Open character sheet"), icon: "fa-solid fa-file-lines", callback: () => hud.openSheet() },
		{ name: loc("Portrait.CenterOnToken", "Center on token"), icon: "fa-solid fa-crosshairs", callback: centerOnToken },
		{ name: loc("Portrait.UseActorArt", "Use actor art"), icon: "fa-solid fa-user", condition: usingToken, callback: togglePortraitSource },
		{ name: loc("Portrait.UseTokenArt", "Use token art"), icon: "fa-solid fa-chess-pawn", condition: () => !usingToken(), callback: togglePortraitSource },
		{ name: loc("Portrait.HideHud", "Hide HUD"), icon: "fa-solid fa-eye-slash", callback: () => hud.hideHud() },
	];
	return new foundry.applications.ux.ContextMenu(root, ".nah-portrait-frame[data-action]", entries, { jQuery: false, fixed: true });
}
