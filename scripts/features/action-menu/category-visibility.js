import { MODULE_ID } from "../../constants.js";
import { getSubMenuDataSync } from "./registry.js";

/**
 * Category visibility coordinator for Nik's Action HUD.
 * Evaluates empty submenu state, combat conditions, and legendary qualifications.
 */

export function getCustomMenuIndex(categoryId) {
	if (!categoryId?.startsWith("custom-")) return -1;
	const idx = Number.parseInt(categoryId.slice("custom-".length), 10);
	return Number.isInteger(idx) && idx >= 0 ? idx : -1;
}

export function hasSubMenuEntries(data) {
	if (!data?.items) return false;
	const { items } = data;

	if (Array.isArray(items)) {
		return items.some((it) => !it?.isHeader);
	}

	if (typeof items === "object" && items !== null) {
		for (const tabVal of Object.values(items)) {
			if (!tabVal) continue;
			if (Array.isArray(tabVal)) {
				if (tabVal.some((it) => !it?.isHeader)) return true;
			} else if (typeof tabVal === "object") {
				for (const subVal of Object.values(tabVal)) {
					if (Array.isArray(subVal) && subVal.some((it) => !it?.isHeader)) return true;
				}
			}
		}
	}
	return false;
}

export function categoryHasEntries(ActionMenu, actor, category) {
	if (!actor || !category) return false;
	if (category.type && category.type !== "submenu") return true;

	const categoryId = category.id;
	if (!categoryId) return false;

	const data = getSubMenuDataSync(ActionMenu, actor, categoryId, category);
	if (!data) {
		const cached = ActionMenu?._asyncSubMenuDataCache?.get(`${actor.id}:${categoryId}`);
		if (cached !== undefined) return hasSubMenuEntries(cached);
		return true;
	}

	return hasSubMenuEntries(data);
}

export function isActionMenuCategoryVisible(category, customMenu = [], inCombat = false, options = {}) {
	const index = getCustomMenuIndex(category?.id);
	const customCat = index >= 0
		? customMenu?.[index]
		: (category?.systemId ? customMenu?.find((c) => c.systemId === category.systemId) : null);

	const visibility = category?._tabVisibility || customCat?.tabVisibility || "always";

	if (visibility === "combatOnly") return inCombat;
	if (visibility === "hideInCombat") return !inCombat;
	if (visibility === "never") return false;

	if (typeof globalThis !== "undefined" && globalThis.ActionHUD?.isEditMode) return true;

	// Legendary actions check
	if (category?.systemId === "legendary") {
		const actionMenu = options.ActionMenu || window.ActionHUD?.actionMenu;
		const actor = options.actor || actionMenu?.currentActor;
		if (actor && actionMenu?.adapter?.actorHasLegendary && !actionMenu.adapter.actorHasLegendary(actor)) {
			return false;
		}
	}

	let hideEmpty = true;
	if (options.hideEmptySubmenus !== undefined) {
		hideEmpty = Boolean(options.hideEmptySubmenus);
	} else {
		try {
			const settingVal = game.settings.get(MODULE_ID, "hideEmptySubmenus");
			if (typeof settingVal === "boolean") hideEmpty = settingVal;
		} catch (_e) {
			hideEmpty = true;
		}
	}

	if (hideEmpty) {
		const actionMenu = options.ActionMenu || window.ActionHUD?.actionMenu;
		const actor = options.actor || actionMenu?.currentActor;
		if (actionMenu && actor) {
			const isSubmenu = !category?.type || category.type === "submenu";
			if (isSubmenu && !categoryHasEntries(actionMenu, actor, category)) {
				return false;
			}
		}
	}

	return true;
}

export function canRestoreActionMenuCategory(categoryId, categories = [], customMenu = [], inCombat = false, options = {}) {
	return (Array.isArray(categories) ? categories : []).some(
		(cat) => String(cat?.id) === String(categoryId) && isActionMenuCategoryVisible(cat, customMenu, inCombat, options)
	);
}
