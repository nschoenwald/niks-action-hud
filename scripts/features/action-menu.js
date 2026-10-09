import { MODULE_ID, DOM_IDS, CSS_CLASSES } from "../constants.js";
import { DEFAULT_EXCLUDED_ACTOR_TYPES } from "../config/constants.js";

import {
	registerActionMenuCategory,
	registerActionMenuSubMenu,
	getRegisteredActionMenuCategories,
	getRegisteredActionMenuSubMenus,
	getActionCategories,
	getSubMenuData,
} from "./action-menu/registry.js";
import {
	buildListItems,
	renderMain as renderMainModule,
	renderSubMenu as renderSubMenuModule,
	renderPlaceholder as renderPlaceholderModule,
} from "./action-menu/renderer.js";
import {
	getFavorites as getFavoritesModule,
	toggleFavorite as toggleFavoriteModule,
	addPersonalItem as addPersonalItemModule,
	addMacro as addMacroModule,
	removePersonalItem as removePersonalItemModule,
	addItemToCustomMenu as addItemToCustomMenuModule,
	removeCustomItem as removeCustomItemModule,
	removeMacro as removeMacroModule,
	openSheet as openSheetModule,
	runSystemAction as runSystemActionModule,
	useItem as useItemModule,
	switchTab as switchTabModule,
	switchSubTab as switchSubTabModule,
	removeFavorite as removeFavoriteModule,
	reorderFavorites as reorderFavoritesModule,
	editCustomMacro as editCustomMacroModule,
} from "./action-menu/actions.js";

import { normalizeFavoriteViewOptions } from "./action-menu/favorites.js";

import { onDrop as onDropModule } from "./action-menu/drop.js";
import {
	bindSubMenuEvents as bindSubMenuEventsModule,
	bindRootEvents as bindRootEventsModule,
	checkEditMode as checkEditModeModule,
} from "./action-menu/events.js";
import {
	findMenuItemData as findMenuItemDataModule,
	showTooltip as showTooltipModule,
	hideTooltip as hideTooltipModule,
	moveTooltip as moveTooltipModule,
} from "./action-menu/tooltip.js";
import { filterList as filterListModule } from "./action-menu/search.js";
import {
	toggleEditMode as toggleEditModeModule,
	enableDrag as enableDragModule,
	enableLongPressDrag as enableLongPressDragModule,
	previewUpdate as previewUpdateModule,
} from "./action-menu/drag.js";
import {
	editSpellSlots as editSpellSlotsModule,
	restoreItem as restoreItemModule,
	openFavoriteDialog as openFavoriteDialogModule,
} from "./action-menu/dialogs.js";
import { canRestoreActionMenuCategory, categoryHasEntries } from "./action-menu/category-visibility.js";

import {
	openItem as openItemModule,
	editMacro as editMacroModule,
	editGlobalMacro as editGlobalMacroModule,
} from "./action-menu/actions.js";

const getSubMenuWrapper = (container, categoryId) => {
	if (!container) return null;
	const el = container instanceof HTMLElement ? container : container[0];
	if (!el) return null;
	return el.querySelector(`.nah-sub-menu-wrapper[data-category="${categoryId}"]`);
};

export class ActionMenu {
	static ROOT_ID = DOM_IDS.DOCK;
	static ID = DOM_IDS.MENU;
	static SUB_ID = DOM_IDS.SUBMENU;

	static currentActor = null;
	static currentToken = null;
	static subMenuRenderGeneration = 0;
	static activeTab = null;
	static activeSubTab = null;
	static _categoryEntries = [];
	static _subMenuEntries = new Map();
	static _registrationOrder = 0;
	static _currentSubMenuData = null;

	static isCollapsed = false;

	static toggleCollapse() {
		ActionMenu.isCollapsed = !ActionMenu.isCollapsed;
		const menu = document.getElementById(ActionMenu.ID);
		const btnIcon = document.querySelector(
			`#${ActionMenu.ROOT_ID} .${CSS_CLASSES.COLLAPSE_BTN} i`,
		);

		if (ActionMenu.isCollapsed) {
			menu?.classList.add("is-collapsed");
			btnIcon?.classList.remove("fa-caret-down");
			btnIcon?.classList.add("fa-caret-right");
		} else {
			menu?.classList.remove("is-collapsed");
			btnIcon?.classList.remove("fa-caret-right");
			btnIcon?.classList.add("fa-caret-down");
		}
	}

	static registerActionMenuCategory(category, options = {}) {
		return registerActionMenuCategory(ActionMenu, category, options);
	}

	static registerActionMenuSubMenu(categoryId, provider, options = {}) {
		return registerActionMenuSubMenu(ActionMenu, categoryId, provider, options);
	}

	static getRegisteredActionMenuCategories() {
		return getRegisteredActionMenuCategories(ActionMenu);
	}

	static getRegisteredActionMenuSubMenus() {
		return getRegisteredActionMenuSubMenus(ActionMenu);
	}

	static _getActionCategories(actor) {
		return getActionCategories(ActionMenu, actor);
	}

	static _getSubMenuData(actor, categoryId) {
		return getSubMenuData(ActionMenu, actor, categoryId);
	}

	static initialize() {
		Hooks.on("controlToken", () => ActionMenu.refresh());
		Hooks.on("createCombatant", () => ActionMenu.refresh());
		Hooks.on("updateCombatant", () => ActionMenu.refresh());
		Hooks.on("deleteCombatant", () => ActionMenu.refresh());
		Hooks.on("updateToken", (tokenDoc) => {
			if (
				ActionMenu.currentActor &&
				(tokenDoc.actorId === ActionMenu.currentActor.id ||
					tokenDoc.id === ActionMenu.currentToken?.id ||
					tokenDoc.id === ActionMenu.currentToken?.document?.id)
			) {
				ActionMenu.refresh();
			}
		});

		// Refresh HUD on actor property updates
		Hooks.on("updateActor", (actor) => {
			if (ActionMenu.currentActor && actor.id === ActionMenu.currentActor.id) {
				ActionMenu.refresh();
			}
		});

		// Detect Item Changes (inventory, spells, consumables)
		const refreshItem = (item) => {
			const actor = item.parent || item.actor;
			if (
				ActionMenu.currentActor &&
				actor &&
				actor.id === ActionMenu.currentActor.id
			) {
				ActionMenu.refresh();
			}
		};

		Hooks.on("createItem", refreshItem);
		Hooks.on("updateItem", refreshItem);
		Hooks.on("deleteItem", (item) => {
			const actor = item.parent || item.actor;
			if (actor) {
				void removeFavoriteModule(ActionMenu, item.id, actor);
			}
			refreshItem(item);
		});

		Hooks.on("deleteMacro", (macro) => {
			const favoriteIds = [];
			if (macro?.id) favoriteIds.push(`macro-${macro.id}`);
			if (macro?.uuid) favoriteIds.push(`macro-${macro.uuid}`);

			game.actors?.forEach((actor) => {
				favoriteIds.forEach((favoriteId) => {
					void removeFavoriteModule(ActionMenu, favoriteId, actor);
				});
			});
		});

		Hooks.callAll(`${MODULE_ID}.registerActionMenu`, ActionMenu);
	}

	static get adapter() {
		return window.ActionHUD?.adapter;
	}

	static refresh() {
		ActionMenu.hideTooltip(true);

		const root = document.getElementById(ActionMenu.ROOT_ID);
		const container = document.getElementById(ActionMenu.SUB_ID);
		let lastActiveCat = null;
		let lastSearchQuery = "";
		let capturedSearchInput = null;

		if (container && container.classList.contains("active")) {
			lastActiveCat = container.dataset.activeCat;
			const activeWrapper = getSubMenuWrapper(container, lastActiveCat);
			capturedSearchInput = activeWrapper?.querySelector(".nah-search-input");
			lastSearchQuery = String(capturedSearchInput?.value || "");
		}

		const restoreSubMenu = () => {
			if (!lastActiveCat) return;
			if (container) container.dataset.activeCat = lastActiveCat;
			ActionMenu.renderSubMenu(lastActiveCat)
				.then(async (isCurrentRender) => {
					if (!isCurrentRender) return;
					if (String(container?.dataset?.activeCat) !== String(lastActiveCat)) return;
					if (
						capturedSearchInput &&
						String(capturedSearchInput.value || "") !== lastSearchQuery
					) return;
					if (!lastSearchQuery) return;
					const activeWrapper = getSubMenuWrapper(container, lastActiveCat);
					const input = activeWrapper?.querySelector(".nah-search-input");
					if (input) {
						input.value = lastSearchQuery;
						await filterListModule(ActionMenu, lastSearchQuery);
					}
				})
				.catch((error) => {
					console.warn("Nik's Action HUD | Could not restore sub-menu:", error);
				});
		};

		const shouldHide = () => {
			if (root) {
				root.classList.add("am-hidden");
				root.classList.remove("has-active-submenu");
			}
			if (container) container.classList.remove("active");
		};
		const shouldDestroy = () => {
			root?.remove();
		};

		try {
			if (game.settings.get(MODULE_ID, "disableHUD")) {
				ActionMenu.currentActor = null;
				ActionMenu.currentToken = null;
				shouldDestroy();
				return;
			}
		} catch (_e) {}

		const config =
			game.settings.get(MODULE_ID, "configuration") || {};

		if (config.enableActionMenu === false) {
			ActionMenu.currentActor = null;
			ActionMenu.currentToken = null;
			shouldDestroy();
			return;
		}
		if (config.gmHudHidden && game.user.isGM) {
			ActionMenu.currentActor = null;
			ActionMenu.currentToken = null;
			shouldDestroy();
			return;
		}

		const visibilityOverrides =
			game.settings.get(MODULE_ID, "clientVisibility") || {};
		const actionGlobal = config.actionMenuVisibility || "always";
		const visibility = actionGlobal === "always"
			? (visibilityOverrides.actionMenuVisibility || "always")
			: actionGlobal;
		const inCombat = game.combat?.started ?? false;
		if (visibility === "never") {
			ActionMenu.currentActor = null;
			ActionMenu.currentToken = null;
			shouldDestroy();
			return;
		}
		if (visibility === "combatOnly" && !inCombat) {
			ActionMenu.currentActor = null;
			ActionMenu.currentToken = null;
			shouldDestroy();
			return;
		}

		const rawExcluded = config.excludedActorTypes !== undefined
			? config.excludedActorTypes
			: DEFAULT_EXCLUDED_ACTOR_TYPES;
		const excludedTypes = (rawExcluded || "")
			.split(",")
			.map((t) => t.trim().toLowerCase())
			.filter(Boolean);

		const controlled = canvas.tokens?.controlled || [];
		const onlyExcludedTokens = controlled.length > 0 && controlled.every((t) => excludedTypes.includes(t.actor?.type?.toLowerCase()));
		const hasNoControlled = controlled.length === 0;

		let token = controlled[0];
		if (
			canvas.tokens &&
			(hasNoControlled || onlyExcludedTokens)
		) {
			const userActor = game.user?.character
				|| (!game.user?.isGM ? (game.actors?.find((a) => a.isOwner && a.type === "character") || game.actors?.find((a) => a.isOwner)) : null);

			if (userActor) {
				const activeTokens = typeof userActor.getActiveTokens === "function" ? userActor.getActiveTokens() : [];
				const activeToken = activeTokens[0]
					|| canvas.tokens.placeables?.find((t) => t.actor?.id === userActor.id || t.document?.actorId === userActor.id);

				token = activeToken || {
					actor: userActor,
					name: userActor.prototypeToken?.name || userActor.name,
					document: {
						name: userActor.prototypeToken?.name || userActor.name,
						texture: { src: userActor.prototypeToken?.texture?.src || userActor.img || CONST.DEFAULT_TOKEN || "icons/svg/mystery-man.svg" },
						ring: userActor.prototypeToken?.ring,
						flags: userActor.prototypeToken?.flags,
					},
					ring: userActor.prototypeToken?.ring,
				};
			}
		}

		const isEditMode = window.ActionHUD?.isEditMode ?? false;

		if (!token || !token.actor) {
			ActionMenu.currentActor = null;
			ActionMenu.currentToken = null;
			shouldHide();
			if (isEditMode) {
				try {
					ActionMenu.renderPlaceholder();
				} catch (err) {
					console.error("ActionHUD | Action Menu Placeholder Render Error:", err);
				}
			}
			return;
		}

		if (excludedTypes.includes(token.actor.type?.toLowerCase())) {
			ActionMenu.currentActor = null;
			ActionMenu.currentToken = null;
			shouldHide();
			return;
		}

		if (token.actor.getFlag(MODULE_ID, "hideActionMenu")) {
			ActionMenu.currentActor = null;
			ActionMenu.currentToken = null;
			shouldHide();
			return;
		}

		ActionMenu.currentActor = token.actor;
		ActionMenu.currentToken = token;
		if (!ActionMenu.currentActor) return;
		if (lastActiveCat) {
			const categories = getActionCategories(ActionMenu, ActionMenu.currentActor);
			if (!canRestoreActionMenuCategory(
				lastActiveCat,
				categories,
				config.customMenu,
				inCombat,
				{ ActionMenu, actor: ActionMenu.currentActor },
			)) {
				lastActiveCat = null;
				if (container) {
					delete container.dataset.activeCat;
					container.classList.remove("active");
				}
				root?.classList.remove("has-active-submenu");
			}
		}

		root?.classList.remove("am-hidden");

		if (root && !root.classList.contains("is-placeholder")) {
			try {
				ActionMenu.renderMain();
			} catch (err) {
				console.error("Nik's Action HUD | Action Menu Render Error:", err);
			}
			if (lastActiveCat) {
				restoreSubMenu();
			}
			return;
		}

		shouldDestroy();

		try {
			ActionMenu.renderMain();
		} catch (err) {
			console.error("Nik's Action HUD | Action Menu Render Error:", err);
		}

		if (lastActiveCat) {
			restoreSubMenu();
		}
	}

	/**
	 * Get favorites list (Item IDs) from actor flags
	 */
	static getFavorites() {
		return getFavoritesModule(ActionMenu);
	}

	static async toggleFavorite(itemId) {
		await toggleFavoriteModule(ActionMenu, itemId);
	}

	static async removeFavorite(itemId) {
		await removeFavoriteModule(ActionMenu, itemId);
	}

	static async reorderFavorites(
		sourceId,
		targetId = null,
		insertAfter = false,
		actor = null,
	) {
		return reorderFavoritesModule(
			ActionMenu,
			sourceId,
			targetId,
			insertAfter,
			actor,
		);
	}

	static getFavoriteViewOptions() {
		try {
			return normalizeFavoriteViewOptions(
				game.settings.get(MODULE_ID, "favoriteViewOptions"),
			);
		} catch (_error) {
			return normalizeFavoriteViewOptions();
		}
	}

	static async toggleFavoriteView(option) {
		if (option !== "sortFirst" && option !== "only") return;

		const container = document.getElementById(ActionMenu.SUB_ID);
		const categoryId = container?.dataset?.activeCat;
		const activeWrapper = getSubMenuWrapper(container, categoryId);
		const searchInput = activeWrapper?.querySelector(".nah-search-input");
		const query = String(searchInput?.value || "");
		const options = ActionMenu.getFavoriteViewOptions();
		options[option] = !options[option];

		await game.settings.set(
			MODULE_ID,
			"favoriteViewOptions",
			options,
		);

		if (!categoryId || !container?.classList.contains("active")) return;

		const isCurrentRender = await ActionMenu.renderSubMenu(categoryId);
		if (
			!isCurrentRender ||
			String(container?.dataset?.activeCat) !== String(categoryId)
		) return;
		const updatedWrapper = getSubMenuWrapper(container, categoryId);
		const input = updatedWrapper?.querySelector(".nah-search-input");
		if (input) {
			input.value = query;
			if (query) await filterListModule(ActionMenu, query);
			input.focus();
		}
	}

	static renderMain() {
		renderMainModule(ActionMenu);
	}

	static renderPlaceholder() {
		renderPlaceholderModule(ActionMenu);
	}

	/* =========================================
	   INTERNAL HELPERS (Event Binding)
	   ========================================= */

	/**
	 * Bind submenu container events
	 */
	static _bindSubMenuEvents() {
		bindSubMenuEventsModule(ActionMenu);
	}

	static _bindRootEvents() {
		bindRootEventsModule(ActionMenu);
	}

	static _checkEditMode() {
		checkEditModeModule(ActionMenu);
	}

	// Logic for Personal Item Drop
	static async _onDrop(event) {
		await onDropModule(ActionMenu, event);
	}

	// Add Personal Item (Flag)
	static async _addPersonalItem(catIndex, tabIndex, itemData) {
		await addPersonalItemModule(ActionMenu, catIndex, tabIndex, itemData);
	}

	static async _addMacro(macro) {
		await addMacroModule(ActionMenu, macro);
	}

	static async removePersonalItem(catIndex, tabIndex, itemIndex) {
		await removePersonalItemModule(ActionMenu, catIndex, tabIndex, itemIndex);
	}

	static async _addItemToCustomMenu(catIndex, tabIndex, itemData) {
		await addItemToCustomMenuModule(ActionMenu, catIndex, tabIndex, itemData);
	}

	static async removeCustomItem(catIndex, tabIndex, itemIndex) {
		await removeCustomItemModule(ActionMenu, catIndex, tabIndex, itemIndex);
	}

	static async removeMacro(macroId) {
		await removeMacroModule(ActionMenu, macroId);
	}

	static categoryHasEntries(categoryId, actor = null) {
		const targetActor = actor || ActionMenu.currentActor;
		if (!targetActor) return false;
		const categories = getActionCategories(ActionMenu, targetActor) || [];
		const category = categories.find((c) => String(c.id) === String(categoryId))
			|| { id: categoryId, type: "submenu" };
		return categoryHasEntries(ActionMenu, targetActor, category);
	}

	static async toggleSubMenu(categoryId) {
		const root = document.getElementById(ActionMenu.ROOT_ID);
		const container = document.getElementById(ActionMenu.SUB_ID);
		if (!container) return;

		if (
			container.dataset.activeCat === String(categoryId) &&
			container.classList.contains("active")
		) {
			container.classList.remove("active");
			root?.classList.remove("has-active-submenu");
			ActionMenu.hideTooltip(true);
			return;
		}

		let hideEmpty = true;
		try {
			const settingVal = game.settings.get(MODULE_ID, "hideEmptySubmenus");
			if (typeof settingVal === "boolean") hideEmpty = settingVal;
		} catch (_e) {
			hideEmpty = true;
		}

		if (hideEmpty && !window.ActionHUD?.isEditMode && ActionMenu.currentActor) {
			if (!ActionMenu.categoryHasEntries(categoryId)) {
				container.classList.remove("active");
				root?.classList.remove("has-active-submenu");
				delete container.dataset.activeCat;
				ActionMenu.hideTooltip(true);
				return;
			}
		}

		// Reset tab states
		ActionMenu.activeTab = null;
		ActionMenu.activeSubTab = null;

		container.dataset.activeCat = String(categoryId);
		await ActionMenu.renderSubMenu(categoryId);
	}

	static _buildListItems(items) {
		return buildListItems(ActionMenu, items);
	}

	static openSheet(tabName) {
		openSheetModule(ActionMenu, tabName);
	}
	static runSystemAction(actionId) {
		runSystemActionModule(ActionMenu, actionId);
	}
	static useItem(itemId, event) {
		useItemModule(ActionMenu, itemId, event);
		ActionMenu.hideTooltip(true);
		const config = game.settings.get(MODULE_ID, "configuration") || {};
		if (config.closeMenuOnUse) {
			const sub = document.getElementById(ActionMenu.SUB_ID);
			if (sub) sub.classList.remove("active");
		}
	}

	// Switch Top-level Tab
	static switchTab(categoryId, tabId) {
		switchTabModule(ActionMenu, categoryId, tabId);
	}

	// Switch Sub-level Tab
	static switchSubTab(categoryId, subTabId) {
		switchSubTabModule(ActionMenu, categoryId, subTabId);
	}

	static async renderSubMenu(categoryId) {
		const generation = ++ActionMenu.subMenuRenderGeneration;
		const result = await renderSubMenuModule(ActionMenu, categoryId, generation);
		if (result === false) return false;
		return generation === ActionMenu.subMenuRenderGeneration;
	}

	// --- Edit Mode and Dragging ---

	static toggleEditMode(enable) {
		toggleEditModeModule(ActionMenu, enable);
	}
	static _enableDrag(element) {
		enableDragModule(ActionMenu, element);
	}

	static previewUpdate(data) {
		previewUpdateModule(ActionMenu, data);
	}

	static _findMenuItemData(itemId) {
		return findMenuItemDataModule(ActionMenu, itemId);
	}

	// Tooltip display
	static async showTooltip(itemId, event) {
		await showTooltipModule(ActionMenu, itemId, event);
	}

	// Hide tooltip
	static hideTooltip(force = false) {
		hideTooltipModule(force);
	}

	// Follow mouse with tooltip
	static moveTooltip(event) {
		moveTooltipModule(ActionMenu, event);
	}

	// List filtering
	static async filterList(query) {
		await filterListModule(ActionMenu, query);
	}

	/**
	 * Open Item Sheet
	 */
	static async openItem(itemId) {
		await openItemModule(ActionMenu, itemId);
	}

	static async editResource(itemId) {
		await openItemModule(ActionMenu, itemId);
	}

	static async editMacro(macroId) {
		await editMacroModule(ActionMenu, macroId);
	}
	static async editCustomMacro(macroId, catIndex, tabIndex, itemIndex) {
		await editCustomMacroModule(ActionMenu, macroId, {
			catIdx: catIndex,
			tabIdx: tabIndex,
			itemIdx: itemIndex,
		});
	}
	static async editGlobalMacro(macroId, catIndex, tabIndex, itemIndex) {
		await editGlobalMacroModule(ActionMenu, macroId, {
			catIdx: catIndex,
			tabIdx: tabIndex,
			itemIdx: itemIndex,
		});
	}

	/**
	 * Edit Spell Slots (Sidebar Tab)
	 */
	static async editSpellSlots(categoryId, tabId) {
		await editSpellSlotsModule(ActionMenu, categoryId, tabId);
	}

	/**
	 * Restore Item
	 * - Restore prepared spell slot or reset frequency
	 */
	static async restoreItem(itemId) {
		await restoreItemModule(ActionMenu, itemId);
	}

	/**
	 * Open Favorite Options Dialog (Right-Click Favorite)
	 */
	static async openFavoriteDialog(favoriteId) {
		await openFavoriteDialogModule(ActionMenu, favoriteId);
	}

	static showMenu() {
		try {
			if (game.settings.get(MODULE_ID, "disableHUD")) return;
		} catch (_e) {}
		const root = document.getElementById(ActionMenu.ROOT_ID);
		if (root) {
			root.style.display = "";
		}
	}

	static hideMenu() {
		const root = document.getElementById(ActionMenu.ROOT_ID);
		if (root) {
			root.style.display = "none";
		}
		const subMenu = document.getElementById(ActionMenu.SUB_ID);
		if (subMenu) {
			subMenu.classList.remove("active");
			root?.classList.remove("has-active-submenu");
		}
		ActionMenu.hideTooltip(true);
	}

	static previewButton(cIdx, data) {
		const btn = document.querySelector(`#${ActionMenu.ID} .btn-custom-${cIdx}`);
		if (!btn) return;

		if (!data.buttonImg || data.buttonImg.trim() === "") {
			btn.classList.remove("is-custom-btn");
			btn.querySelector(".nah-custom-bg")?.remove();
			return;
		}

		btn.classList.add("is-custom-btn");

		let img = btn.querySelector(".nah-custom-bg");
		if (!img) {
			img = document.createElement("img");
			img.className = "nah-custom-bg";
			img.src = data.buttonImg;
			btn.prepend(img);
		} else if (img.getAttribute("src") !== data.buttonImg) {
			img.src = data.buttonImg;
		}

		img.style.setProperty("--img-scale", data.buttonScale);
		img.style.setProperty("--img-x", `${data.buttonX}px`);
		img.style.setProperty("--img-y", `${data.buttonY}px`);
	}
}

window.ActionHUD = window.ActionHUD || {};
window.ActionHUD.actionMenu = ActionMenu;
