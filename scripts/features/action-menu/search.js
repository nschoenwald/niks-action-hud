import { buildListItems } from "./renderer.js";
import { getSubMenuData, getActionCategories } from "./registry.js";
import { isActionMenuCategoryVisible } from "./category-visibility.js";
import { MODULE_ID } from "../../constants.js";

/**
 * Resolve items for the currently active tab or subtab within submenu data.
 */
function getActiveTabItems(ActionMenu, data) {
	if (!data?.items) return [];

	if (data.hasSubTabs) {
		const subData = data.items[ActionMenu.activeTab];
		if (!subData) {
			const firstKey = Object.keys(data.items)[0];
			const firstSub = firstKey ? data.items[firstKey] : null;
			return firstSub ? (firstSub[ActionMenu.activeSubTab] || Object.values(firstSub)[0] || []) : [];
		}
		if (ActionMenu.activeSubTab !== null && subData[ActionMenu.activeSubTab]) {
			return subData[ActionMenu.activeSubTab];
		}
		return Object.values(subData)[0] || [];
	}

	if (data.hasTabs) {
		if (ActionMenu.activeTab && data.items[ActionMenu.activeTab]) {
			return data.items[ActionMenu.activeTab];
		}
		return Object.values(data.items)[0] || [];
	}

	return Array.isArray(data.items) ? data.items : [];
}

/**
 * Extract all action/item objects from category submenu data,
 * handling flat arrays, 1-level tabs, and 2-level subtabs.
 */
function extractItemsFromCategoryData(data) {
	if (!data?.items) return [];
	const items = [];
	if (Array.isArray(data.items)) {
		items.push(...data.items);
	} else if (typeof data.items === "object" && data.items !== null) {
		for (const tabVal of Object.values(data.items)) {
			if (!tabVal) continue;
			if (Array.isArray(tabVal)) {
				items.push(...tabVal);
			} else if (typeof tabVal === "object" && tabVal !== null) {
				for (const subVal of Object.values(tabVal)) {
					if (Array.isArray(subVal)) {
						items.push(...subVal);
					}
				}
			}
		}
	}
	return items;
}

/**
 * Generate a deduplication key for an item.
 */
function dedupeKey(item) {
	if (item.id) return `id:${item.id}`;
	if (item.uuid) return `uuid:${item.uuid}`;
	return `name:${item.name || ""}:${item.type || ""}`;
}

/**
 * Filter submenu items in real-time based on search input.
 * Searches across all eligible actor submenus and clusters results by category header.
 * Native DOM implementation with fast responsive caching and instant list restoration.
 */
export async function filterList(ActionMenu, query) {
	const term = String(query || "").toLowerCase().trim();
	const container = document.getElementById(ActionMenu.SUB_ID);
	if (!container) return;

	const activeCat = container.dataset.activeCat;
	const wrapper = container.querySelector(`.nah-sub-menu-wrapper[data-category="${activeCat}"]`);
	if (!wrapper) return;

	const shell = wrapper.querySelector(".nah-sub-menu");
	if (!shell) return;

	const scrollArea = shell.querySelector(".nah-scroll-area");
	if (!scrollArea) return;

	const tabsContainer = shell.querySelector("#nah-tabs-container");

	// Case 1: Search query was emptied — instantly restore active tab items
	if (!term) {
		if (ActionMenu._searchItemsMap) ActionMenu._searchItemsMap.clear();
		if (tabsContainer) tabsContainer.style.display = "";
		shell.classList.remove("is-searching");
		delete shell.dataset.isSearching;

		let data = ActionMenu._currentSubMenuData;
		if (!data && ActionMenu.currentActor && activeCat) {
			const categories = getActionCategories(ActionMenu, ActionMenu.currentActor) || [];
			const category = categories.find((c) => String(c.id) === String(activeCat)) || null;
			data = await getSubMenuData(ActionMenu, ActionMenu.currentActor, activeCat, category);
			if (data) ActionMenu._currentSubMenuData = data;
		}

		const currentItems = getActiveTabItems(ActionMenu, data);
		let restoredHtml = "";
		if (currentItems.length > 0) {
			restoredHtml = buildListItems(ActionMenu, currentItems);
		} else if (shell.dataset.defaultListHtml) {
			restoredHtml = shell.dataset.defaultListHtml;
		}

		if (restoredHtml) {
			scrollArea.innerHTML = restoredHtml;
			shell.dataset.lastListHtml = restoredHtml;
		} else {
			delete shell.dataset.lastListHtml;
			await ActionMenu.renderSubMenu(activeCat);
		}
		return;
	}

	// Case 2: Active search query — search all action types and cluster by submenu
	shell.classList.add("is-searching");
	shell.dataset.isSearching = "true";
	if (tabsContainer) tabsContainer.style.display = "none";

	const actor = ActionMenu.currentActor;
	if (!actor) return;

	// Sequence counter to prevent async race conditions from rapid typing
	ActionMenu._searchSequence = (ActionMenu._searchSequence || 0) + 1;
	const currentSeq = ActionMenu._searchSequence;

	const allCategories = getActionCategories(ActionMenu, actor) || [];
	const config = game.settings.get(MODULE_ID, "configuration") || {};
	const customMenu = config.customMenu || [];
	const inCombat = Boolean(actor.inCombat);

	// Filter categories that have submenus and are visible to this actor
	const eligibleCategories = allCategories.filter((cat) => {
		if (cat.type && cat.type !== "submenu") return false;
		return isActionMenuCategoryVisible(cat, customMenu, inCombat, {
			ActionMenu,
			actor,
		});
	});

	// Prioritize active submenu category first, followed by remaining categories in order
	const sortedCategories = [...eligibleCategories].sort((a, b) => {
		if (String(a.id) === String(activeCat)) return -1;
		if (String(b.id) === String(activeCat)) return 1;
		return 0;
	});

	// Fetch submenu data for all eligible categories concurrently
	const dataPromises = sortedCategories.map(async (cat) => {
		let catData = null;
		if (String(cat.id) === String(activeCat) && ActionMenu._currentSubMenuData) {
			catData = ActionMenu._currentSubMenuData;
		} else {
			catData = await getSubMenuData(ActionMenu, actor, cat.id, cat);
		}
		return { cat, data: catData };
	});

	const categoryResults = await Promise.all(dataPromises);

	// Discard if a newer search query was initiated while loading
	if (ActionMenu._searchSequence !== currentSeq) return;

	const currentInput = shell.querySelector(".nah-search-input");
	if (currentInput && currentInput.value.toLowerCase().trim() !== term) return;

	if (!ActionMenu._searchItemsMap) ActionMenu._searchItemsMap = new Map();
	ActionMenu._searchItemsMap.clear();

	const clusteredItems = [];
	const normalizedTerm = term.replace(/\s+/g, " ");

	for (const { cat, data: catData } of categoryResults) {
		if (!catData?.items) continue;

		const catItems = extractItemsFromCategoryData(catData);
		const catSeen = new Set();
		const catMatches = [];

		for (const item of catItems) {
			if (!item || item.isHeader) continue;
			const rawName = String(item.name || item.label || item.title || "");
			const cleanName = rawName.replace(/<[^>]*>/g, "").trim().toLowerCase().replace(/\s+/g, " ");

			if (!cleanName.includes(normalizedTerm)) continue;

			const key = dedupeKey(item);
			if (catSeen.has(key)) continue;
			catSeen.add(key);

			catMatches.push(item);
			if (item.id) ActionMenu._searchItemsMap.set(String(item.id), item);
			if (item.uuid) ActionMenu._searchItemsMap.set(String(item.uuid), item);
		}

		if (catMatches.length > 0) {
			const headerName = cat.label || catData.title || "Actions";
			clusteredItems.push({
				isHeader: true,
				name: headerName,
				icon: cat.icon || "",
				img: cat.img || cat.buttonImg || "",
				id: `header-${cat.id}`,
			});
			clusteredItems.push(...catMatches);
		}
	}

	delete shell.dataset.lastListHtml;

	if (!clusteredItems.length) {
		const emptyText = game.i18n.localize("NAH.UI.NoEntries") || "No results found";
		scrollArea.innerHTML = `<div class="nah-list-item"><div class="nah-item-content" style="justify-content:center; color:#888; font-style:italic;">${emptyText}</div></div>`;
	} else {
		scrollArea.innerHTML = buildListItems(ActionMenu, clusteredItems);
	}
}
