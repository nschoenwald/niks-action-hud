import { MODULE_ID } from "../../constants.js";

import {
	insertCategoriesByAnchors,
	normalizeAdapterPlacement,
} from "./category-placement.js";
import {
	applyAdapterCategoryOverride,
	getAdapterCategoryOverride,
} from "./adapter-category-overrides.js";

export const registerActionMenuCategory = (ActionMenu, category, options = {}) => {
	if (!category || !category.id) {
		throw new Error("Nik's Action HUD | Action menu category requires an id.");
	}
	const entry = {
		category,
		priority: Number.isFinite(options.priority) ? options.priority : 0,
		order: ActionMenu._registrationOrder++,
		override: options.override === true,
		isCompatible:
			typeof options.isCompatible === "function" ? options.isCompatible : null,
		source: options.source || options.id || "unknown",
	};
	ActionMenu._categoryEntries.push(entry);
	return entry;
};

export const registerActionMenuSubMenu = (
	ActionMenu,
	categoryId,
	provider,
	options = {},
) => {
	if (!categoryId) {
		throw new Error("StylishHUD | categoryId is required for submenu.");
	}
	if (typeof provider !== "function") {
		throw new Error("StylishHUD | submenu provider must be a function.");
	}
	const entry = {
		categoryId: String(categoryId),
		provider,
		priority: Number.isFinite(options.priority) ? options.priority : 0,
		order: ActionMenu._registrationOrder++,
		isCompatible:
			typeof options.isCompatible === "function" ? options.isCompatible : null,
		source: options.source || options.id || "unknown",
	};
	const entries = ActionMenu._subMenuEntries.get(entry.categoryId) || [];
	entries.push(entry);
	ActionMenu._subMenuEntries.set(entry.categoryId, entries);
	return entry;
};

export const getRegisteredActionMenuCategories = (ActionMenu) => {
	return [...ActionMenu._categoryEntries];
};

export const getRegisteredActionMenuSubMenus = (ActionMenu) => {
	return Array.from(ActionMenu._subMenuEntries.entries());
};

const resolveCategoryEntries = (ActionMenu, actor) => {
	return ActionMenu._categoryEntries.filter((entry) => {
		if (!entry.isCompatible) return true;
		try {
			return entry.isCompatible({ actor }) !== false;
		} catch (error) {
			console.warn(
				"StylishHUD | Action menu category compatibility failed:",
				error,
			);
			return false;
		}
	});
};

const mergeCategories = (baseCategories, extraEntries) => {
	const baseEntries = baseCategories.map((category, index) => ({
		category,
		priority: 0,
		order: index,
		override: false,
	}));
	let mergedEntries = [...baseEntries];
	extraEntries.forEach((entry) => {
		if (entry.override) {
			mergedEntries = mergedEntries.filter(
				(item) => item.category.id !== entry.category.id,
			);
		}
		mergedEntries.push(entry);
	});
	return mergedEntries
		.sort((a, b) => {
			if (a.priority !== b.priority) return b.priority - a.priority;
			return a.order - b.order;
		})
		.map((entry) => entry.category);
};

const isCustomCategoryVisible = (visibility, actor) => {
	if (!visibility || !visibility.mode || visibility.mode === "all") return true;
	if (!actor) return true;

	const actorType = actor.type;
	const actorId = actor.id;
	const types = visibility.actorTypes || [];
	const ids = visibility.actorIds || [];
	const isMatched = types.includes(actorType) || ids.includes(actorId);

	if (visibility.mode === "only") return isMatched;
	if (visibility.mode === "except") return !isMatched;

	return true;
};

const buildMissingCustomCategories = (actor, existingIds) => {
	const config = game.settings.get(MODULE_ID, "configuration") || {};
	const customMenu = Array.isArray(config.customMenu) ? config.customMenu : [];

	return customMenu
		.map((cat, index) => ({
			category: {
				id: `custom-${index}`,
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
				cssClass: `btn-custom-${index}`,
				systemId: cat.systemId || null,
				_visibility: cat.visibility,
			},
			placement: normalizeAdapterPlacement(cat.adapterPlacement),
			legacyPosition: cat.adapterInsertPosition,
			order: index,
		}))
		.filter((entry) => !entry.category.systemId)
		.filter((entry) => !existingIds.has(entry.category.id))
		.filter((entry) =>
			isCustomCategoryVisible(entry.category._visibility, actor),
		);
};

const parseCustomCategoryIndex = (categoryId) => {
	const id = String(categoryId || "");
	if (!id.startsWith("custom-")) return null;
	const index = Number.parseInt(id.slice("custom-".length), 10);
	return Number.isInteger(index) && index >= 0 ? index : null;
};

const getConfigCustomSubMenuData = (ActionMenu, actor, categoryId) => {
	const index = parseCustomCategoryIndex(categoryId);
	if (index === null) return null;

	const config = game.settings.get(MODULE_ID, "configuration") || {};
	const menuData = Array.isArray(config.customMenu)
		? config.customMenu[index]
		: null;
	if (!menuData || menuData.systemId) return null;
	if (typeof ActionMenu.adapter?._getCustomSubMenuData !== "function") return null;

	return ActionMenu.adapter._getCustomSubMenuData(actor, menuData, index);
};

export const getActionCategories = (ActionMenu, actor) => {
	const baseCategories = ActionMenu.adapter?.getActionCategories
		? ActionMenu.adapter.getActionCategories(actor)
		: [];
	const extraEntries = resolveCategoryEntries(ActionMenu, actor);
	const config = game.settings.get(MODULE_ID, "configuration") || {};
	const adapterOverrides = config.adapterCategoryOverrides || {};
	const mergedCategories = mergeCategories(baseCategories, extraEntries)
		.map((category) => applyAdapterCategoryOverride(category, adapterOverrides))
		.filter((category) => isCustomCategoryVisible(category?._visibility, actor));
	const existingIds = new Set(mergedCategories.map((category) => category.id));
	const categories = insertCategoriesByAnchors(
		mergedCategories,
		buildMissingCustomCategories(actor, existingIds),
	);
	Hooks.callAll(
		`${MODULE_ID}.modifyActionMenuCategories`,
		categories,
		actor,
	);
	return categories;
};

const resolveSubMenuProvider = (ActionMenu, actor, categoryId) => {
	const entries = ActionMenu._subMenuEntries.get(String(categoryId)) || [];
	const compatibleEntries = entries.filter((entry) => {
		if (!entry.isCompatible) return true;
		try {
			return entry.isCompatible({ actor, categoryId }) !== false;
		} catch (error) {
			console.warn(
				"Nik's Action HUD | Action menu submenu compatibility failed:",
				error,
			);
			return false;
		}
	});
	if (!compatibleEntries.length) return null;
	return compatibleEntries
		.sort((a, b) => {
			if (a.priority !== b.priority) return b.priority - a.priority;
			return a.order - b.order;
		})[0]
		?.provider;
};

export const getSubMenuData = async (ActionMenu, actor, categoryId) => {
	const provider = resolveSubMenuProvider(ActionMenu, actor, categoryId);
	let data = null;
	if (provider) {
		try {
			data = provider(actor, categoryId);
			// Support async providers
			if (data && typeof data.then === "function") {
				data = await data;
			}
		} catch (error) {
			console.warn("Nik's Action HUD | Submenu provider failed:", error);
			data = null;
		}
	}
	if (!data) {
		data = getConfigCustomSubMenuData(ActionMenu, actor, categoryId);
		if (data && typeof data.then === "function") {
			data = await data;
		}
	}
	if (!data && ActionMenu.adapter?.getSubMenuData) {
		data = await ActionMenu.adapter.getSubMenuData(actor, categoryId);
	}
	if (data) {
		const config = game.settings.get(MODULE_ID, "configuration") || {};
		const override = getAdapterCategoryOverride(
			config.adapterCategoryOverrides,
			categoryId,
		);
		if (Object.prototype.hasOwnProperty.call(override || {}, "label")) {
			data = { ...data, title: override.label };
		}
		Hooks.callAll(
			`${MODULE_ID}.modifyActionMenuData`,
			data,
			actor,
			categoryId,
		);
	}
	return data;
};
