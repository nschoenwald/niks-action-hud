/**
 * Category and drawer resolution: lists the categories offered for an actor and asks the system
 * provider for the data behind a drawer.
 */

import { hudStore } from "../../core/store.js";

export function listCategories(hud, actor) {
	return hud.provider?.listCategories ? hud.provider.listCategories(actor) : [];
}

// ── Per-revision drawer cache ───────────────────────────

/**
 * Drawers built for the current HUD revision. The ribbon's empty-drawer check, the open drawer,
 * search and the favorites picker all ask for the same drawers; each is built once per revision.
 * Anything that can change a drawer's content refreshes the HUD, which bumps the revision.
 * Keyed by the actor object, not its id: unlinked tokens share their base actor's id.
 */
let built = { revision: -1, actor: null, drawers: new Map() };

function drawersFor(actor) {
	const { revision } = hudStore.get();
	if (built.revision !== revision || built.actor !== actor) built = { revision, actor, drawers: new Map() };
	return built.drawers;
}

export function loadDrawerSync(hud, actor, categoryId, category = null) {
	if (!hud.provider?.loadDrawerSync) return null;
	if (!actor) return hud.provider.loadDrawerSync(actor, categoryId, category) ?? null;
	const drawers = drawersFor(actor);
	const key = String(categoryId);
	if (!drawers.has(key)) drawers.set(key, hud.provider.loadDrawerSync(actor, categoryId, category) ?? null);
	return drawers.get(key);
}

export async function loadDrawer(hud, actor, categoryId, category = null) {
	const key = String(categoryId);
	const drawers = actor ? drawersFor(actor) : null;
	let data;
	if (drawers?.has(key)) {
		data = drawers.get(key);
	} else {
		data = hud.provider?.loadDrawer ? await hud.provider.loadDrawer(actor, categoryId, category) : null;
		// Only keep it if no refresh happened while the provider was working.
		if (drawers && drawersFor(actor) === drawers) drawers.set(key, data ?? null);
	}
	if (data && actor?.id) {
		hud._drawerCache ??= new Map();
		hud._drawerCache.set(`${actor.id}:${categoryId}`, data);
	}
	return data;
}
