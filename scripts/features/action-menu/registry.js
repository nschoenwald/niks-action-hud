import { MODULE_ID } from "../../constants.js";
import { insertCategoriesByAnchors, normalizeAdapterPlacement } from "./category-placement.js";
import { applyAdapterCategoryOverride, getAdapterCategoryOverride } from "./adapter-category-overrides.js";

/**
 * Action Menu category and submenu provider registry.
 * Discovers, merges, and overrides categories for the active actor.
 */

export function registerActionMenuCategory(ActionMenu, category, options = {}) {
	if (!category?.id) throw new Error("ActionHUD: Category must specify an id.");

	const entry = {
		category,
		priority: Number.isFinite(options.priority) ? options.priority : 0,
		order: ActionMenu._registrationOrder++,
		override: options.override === true,
		isCompatible: typeof options.isCompatible === "function" ? options.isCompatible : null,
		source: options.source || "unknown",
	};
	ActionMenu._categoryEntries.push(entry);
	return entry;
}

export function registerActionMenuSubMenu(ActionMenu, categoryId, provider, options = {}) {
	if (!categoryId) throw new Error("ActionHUD: categoryId is required for submenu registration.");
	if (typeof provider !== "function") throw new Error("ActionHUD: submenu provider must be a function.");

	const entry = {
		categoryId: String(categoryId),
		provider,
		priority: Number.isFinite(options.priority) ? options.priority : 0,
		order: ActionMenu._registrationOrder++,
		isCompatible: typeof options.isCompatible === "function" ? options.isCompatible : null,
		source: options.source || "unknown",
	};

	const list = ActionMenu._subMenuEntries.get(entry.categoryId) || [];
	list.push(entry);
	ActionMenu._subMenuEntries.set(entry.categoryId, list);
	return entry;
}

export function getRegisteredActionMenuCategories(ActionMenu) {
	return [...ActionMenu._categoryEntries];
}

export function getRegisteredActionMenuSubMenus(ActionMenu) {
	return Array.from(ActionMenu._subMenuEntries.entries());
}

function resolveEligibleCategoryEntries(ActionMenu, actor) {
	return ActionMenu._categoryEntries.filter((e) => !e.isCompatible || e.isCompatible({ actor }) !== false);
}

function mergeCategoryLists(baseList, extras) {
	const base = baseList.map((cat, idx) => ({ category: cat, priority: 0, order: idx, override: false }));
	let merged = [...base];

	for (const extra of extras) {
		if (extra.override) {
			merged = merged.filter((it) => it.category.id !== extra.category.id);
		}
		merged.push(extra);
	}

	return merged
		.sort((a, b) => b.priority - a.priority || a.order - b.order)
		.map((entry) => entry.category);
}

function checkCustomCatVisibility(visibility, actor) {
	if (!visibility || !visibility.mode || visibility.mode === "all" || !actor) return true;
	const match = (visibility.actorTypes || []).includes(actor.type) || (visibility.actorIds || []).includes(actor.id);
	return visibility.mode === "only" ? match : !match;
}

function assembleMissingCustomCategories(actor, existingIds) {
	const config = game.settings.get(MODULE_ID, "configuration") || {};
	const customMenu = Array.isArray(config.customMenu) ? config.customMenu : [];

	return customMenu
		.map((cat, idx) => ({
			category: {
				id: `custom-${idx}`,
				label: cat.label,
				icon: cat.icon,
				img: cat.img,
				buttonImg: cat.buttonImg,
				buttonScale: cat.buttonScale ?? 1.0,
				buttonX: cat.buttonX ?? 0,
				buttonY: cat.buttonY ?? 0,
				buttonFrameLayers: cat.buttonFrameLayers || [],
				buttonFrameColor: cat.buttonFrameColor || "",
				fontFamily: cat.fontFamily || "",
				textColor: cat.textColor || "",
				type: "submenu",
				cssClass: `btn-custom-${idx}`,
				systemId: cat.systemId || null,
				_visibility: cat.visibility,
			},
			placement: normalizeAdapterPlacement(cat.adapterPlacement),
			order: idx,
		}))
		.filter((e) => !e.category.systemId && !existingIds.has(e.category.id) && checkCustomCatVisibility(e.category._visibility, actor));
}

export function getActionCategories(ActionMenu, actor) {
	const base = ActionMenu.adapter?.getActionCategories ? ActionMenu.adapter.getActionCategories(actor) : [];
	const extras = resolveEligibleCategoryEntries(ActionMenu, actor);
	const config = game.settings.get(MODULE_ID, "configuration") || {};
	const overrides = config.adapterCategoryOverrides || {};

	const merged = mergeCategoryLists(base, extras)
		.map((cat) => applyAdapterCategoryOverride(cat, overrides))
		.filter((cat) => checkCustomCatVisibility(cat?._visibility, actor));

	const idSet = new Set(merged.map((c) => c.id));
	const categories = insertCategoriesByAnchors(merged, assembleMissingCustomCategories(actor, idSet));

	Hooks.callAll(`${MODULE_ID}.modifyActionMenuCategories`, categories, actor);
	return categories;
}

function resolveProviderForCategory(ActionMenu, actor, categoryId) {
	const list = ActionMenu._subMenuEntries?.get(String(categoryId)) || [];
	const valid = list.filter((e) => !e.isCompatible || e.isCompatible({ actor, categoryId }) !== false);
	return valid.sort((a, b) => b.priority - a.priority || a.order - b.order)[0]?.provider || null;
}

function getStoredCustomSubMenu(ActionMenu, actor, categoryId) {
	const str = String(categoryId || "");
	if (!str.startsWith("custom-")) return null;
	const idx = Number.parseInt(str.slice("custom-".length), 10);
	if (Number.isNaN(idx)) return null;

	const config = game.settings.get(MODULE_ID, "configuration") || {};
	const data = config.customMenu?.[idx];
	if (!data || data.systemId) return null;
	return ActionMenu.adapter?._getCustomSubMenuData ? ActionMenu.adapter._getCustomSubMenuData(actor, data, idx) : null;
}

export function getSubMenuDataSync(ActionMenu, actor, categoryId, category = null) {
	const provider = resolveProviderForCategory(ActionMenu, actor, categoryId);
	let data = null;

	if (provider) {
		try {
			const res = provider(actor, categoryId);
			if (res && typeof res.then !== "function") data = res;
		} catch (_e) {}
	}
	if (!data) data = getStoredCustomSubMenu(ActionMenu, actor, categoryId);
	if (!data && ActionMenu.adapter?.getSubMenuDataSync) {
		data = ActionMenu.adapter.getSubMenuDataSync(actor, categoryId, category);
	}
	if (data) {
		const config = game.settings.get(MODULE_ID, "configuration") || {};
		const override = getAdapterCategoryOverride(config.adapterCategoryOverrides, categoryId);
		if (override?.label) data = { ...data, title: override.label };
	}
	return data;
}

export async function getSubMenuData(ActionMenu, actor, categoryId, category = null) {
	const provider = resolveProviderForCategory(ActionMenu, actor, categoryId);
	let data = null;

	if (provider) {
		try {
			data = await provider(actor, categoryId);
		} catch (_e) {}
	}
	if (!data) data = getStoredCustomSubMenu(ActionMenu, actor, categoryId);
	if (!data && ActionMenu.adapter?.getSubMenuData) {
		data = await ActionMenu.adapter.getSubMenuData(actor, categoryId, category);
	}
	if (data) {
		const config = game.settings.get(MODULE_ID, "configuration") || {};
		const override = getAdapterCategoryOverride(config.adapterCategoryOverrides, categoryId);
		if (override?.label) data = { ...data, title: override.label };

		if (actor?.id) {
			if (!ActionMenu._asyncSubMenuDataCache) ActionMenu._asyncSubMenuDataCache = new Map();
			ActionMenu._asyncSubMenuDataCache.set(`${actor.id}:${categoryId}`, data);
		}
		Hooks.callAll(`${MODULE_ID}.modifyActionMenuData`, data, actor, categoryId);
	}
	return data;
}
