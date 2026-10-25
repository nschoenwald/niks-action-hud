/**
 * Layout operations: actions taken from the HUD on a row or the actor (open a sheet, use an item).
 */

import { parseRef, documentIdOf } from "../../core/action-ref.js";
import { safeFromUuidSync, safeFromUuid } from "../../providers/base.js";

// ── Delegates to the provider ───────────────────────────

export function openSheet(hud) {
	hud?.currentActor?.sheet?.render(true);
}

export function useItem(hud, itemId, event) {
	if (hud?.provider?.useItem && hud.currentActor) hud.provider.useItem(hud.currentActor, itemId, event);
}

// ── Opening sheets ──────────────────────────────────────

async function locateDocument(actor, itemId, docId) {
	const owned = actor.items?.get(docId) || (docId.includes(".") ? actor.items?.get(docId.split(".").pop()) : null);
	if (owned) return owned;

	let found = safeFromUuidSync(docId) || safeFromUuidSync(itemId) || (await safeFromUuid(docId)) || (await safeFromUuid(itemId));
	if (found && actor.items && (found.actor !== actor || found.actor?.id !== actor.id)) {
		found = actor.items.get(found.id) || actor.items.getName(found.name) || found;
	}
	if (found) return found;

	const target = parseRef(itemId);
	if (target.kind === "macro") {
		const [macroId] = target.args;
		const macro = safeFromUuidSync(macroId) || (await safeFromUuid(macroId)) || game.macros?.get(macroId);
		if (macro) return macro;
	}
	return actor.items?.getName(docId);
}

export async function openItem(hud, itemId) {
	const actor = hud?.currentActor;
	if (!actor || !itemId) return;

	const doc = await locateDocument(actor, itemId, documentIdOf(itemId) ?? String(itemId));
	if (!doc?.sheet) return;
	doc.sheet.render(true);
	return doc;
}
