/**
 * Gating: decides whether a ribbon category is shown right now
 * (legendary actors, empty drawers).
 */

import { loadDrawerSync } from "./registry.js";
import { hasActionRows } from "../../providers/shared/drawer-model.js";
import { readSetting } from "../../core/setting-read.js";

export function categoryHasEntries(hud, actor, category) {
	if (!actor || !category) return false;
	if (!category.id) return false;

	const data = loadDrawerSync(hud, actor, category.id, category);
	if (data) return hasActionRows(data);

	// Providers that only answer asynchronously: fall back to the last known answer.
	const cached = hud?._drawerCache?.get(`${actor.id}:${category.id}`);
	return cached === undefined ? true : hasActionRows(cached);
}

function hideEmptyEnabled(options) {
	if (options.hideEmptyDrawers !== undefined) return Boolean(options.hideEmptyDrawers);
	try {
		const value = readSetting("hideEmptyDrawers");
		return typeof value === "boolean" ? value : true;
	} catch (_e) {
		return true;
	}
}

export function shouldShowCategory(category, options = {}) {
	const hud = options.hud || window.NikHUD?.shell;
	const actor = options.actor || hud?.currentActor;

	if (category?.sectionId === "legendary" && actor && hud?.provider?.actorHasLegendary && !hud.provider.actorHasLegendary(actor)) {
		return false;
	}

	if (category?.sectionId && hud && actor && hideEmptyEnabled(options) && !categoryHasEntries(hud, actor, category)) {
		return false;
	}
	return true;
}
