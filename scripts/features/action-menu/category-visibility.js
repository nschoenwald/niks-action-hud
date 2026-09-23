import { MODULE_ID } from "../../constants.js";
import { getSubMenuDataSync } from "./registry.js";

export function getCustomMenuIndex(categoryId) {
	if (!categoryId?.startsWith("custom-")) return -1;
	const index = Number.parseInt(categoryId.slice("custom-".length), 10);
	return Number.isInteger(index) && index >= 0 ? index : -1;
}

export function hasSubMenuEntries(data) {
	if (!data || !data.items) return false;
	const { items } = data;

	if (Array.isArray(items)) {
		return items.some((item) => !item?.isHeader);
	}

	if (typeof items === "object") {
		for (const tabValue of Object.values(items)) {
			if (!tabValue) continue;
			if (Array.isArray(tabValue)) {
				if (tabValue.some((item) => !item?.isHeader)) return true;
			} else if (typeof tabValue === "object") {
				for (const subTabValue of Object.values(tabValue)) {
					if (Array.isArray(subTabValue) && subTabValue.some((item) => !item?.isHeader)) {
						return true;
					}
				}
			}
		}
		return false;
	}

	return false;
}

export function categoryHasEntries(ActionMenu, actor, category) {
	if (!actor || !category) return false;

	// Non-submenu categories (e.g. 'sheet', 'system') are not submenus
	if (category.type && category.type !== "submenu") {
		return true;
	}

	const categoryId = category.id;
	if (!categoryId) return false;

	const data = getSubMenuDataSync(ActionMenu, actor, categoryId, category);
	if (!data) {
		const cached = ActionMenu?._asyncSubMenuDataCache?.get(`${actor.id}:${categoryId}`);
		if (cached !== undefined) {
			return hasSubMenuEntries(cached);
		}
		return true;
	}

	return hasSubMenuEntries(data);
}

export function isActionMenuCategoryVisible(
	category,
	customMenu = [],
	inCombat = false,
	options = {},
) {
	const index = getCustomMenuIndex(category?.id);
	const visibility = category?._tabVisibility
		|| (index >= 0 ? customMenu?.[index]?.tabVisibility : null)
		|| "always";

	if (visibility === "combatOnly") return inCombat;
	if (visibility === "hideInCombat") return !inCombat;
	if (visibility === "never") return false;

	// In edit mode, always display categories so the user can interact and configure them
	if (typeof globalThis !== "undefined" && globalThis.ActionHUD?.isEditMode) return true;

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

export function canRestoreActionMenuCategory(
	categoryId,
	categories,
	customMenu = [],
	inCombat = false,
	options = {},
) {
	return (Array.isArray(categories) ? categories : []).some((category) =>
		String(category?.id) === String(categoryId) &&
		isActionMenuCategoryVisible(category, customMenu, inCombat, options),
	);
}
