import { MODULE_ID } from "../constants.js";
/* scripts/features/action-menu.js */

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
	previewAMImages as previewAMImagesModule,
} from "./action-menu/drag.js";
import {
	editSpellSlots as editSpellSlotsModule,
	restoreItem as restoreItemModule,
} from "./action-menu/dialogs.js";
import { canRestoreActionMenuCategory, categoryHasEntries } from "./action-menu/category-visibility.js";

import {
	openItem as openItemModule,
	editMacro as editMacroModule,
	editGlobalMacro as editGlobalMacroModule,
} from "./action-menu/actions.js";

const getSubMenuWrapper = (container, categoryId) =>
	container
		.children(".ib-sub-menu-wrapper")
		.filter((_, element) =>
			$(element).attr("data-category") === String(categoryId),
		)
		.first();

export class ActionMenu {
	static ROOT_ID = "ib-action-root";
	static ID = "ib-action-menu";
	static SUB_ID = "ib-sub-menu-container";

	static currentActor = null;
	static subMenuRenderGeneration = 0;
	static activeTab = null; // 상위 탭 (Entry ID)
	static activeSubTab = null; // 하위 탭 (Spell Rank)
	static _categoryEntries = [];
	static _subMenuEntries = new Map();
	static _registrationOrder = 0;

	static isCollapsed = false; // 메인 메뉴 접힘 상태

	static toggleCollapse() {
		ActionMenu.isCollapsed = !ActionMenu.isCollapsed;
		const menu = $(`#${ActionMenu.ID}`);
		const btn = $(`#${ActionMenu.ROOT_ID} .ib-collapse-btn i`);

		if (ActionMenu.isCollapsed) {
			menu.addClass("is-collapsed");
			btn.removeClass("fa-caret-down").addClass("fa-caret-right");
		} else {
			menu.removeClass("is-collapsed");
			btn.removeClass("fa-caret-right").addClass("fa-caret-down");
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
		Hooks.on("updateCombat", () => ActionMenu.refresh());
		Hooks.on("createCombat", () => ActionMenu.refresh());
		Hooks.on("deleteCombat", () => ActionMenu.refresh());
		Hooks.on("createCombatant", () => ActionMenu.refresh());
		Hooks.on("updateCombatant", () => ActionMenu.refresh());
		Hooks.on("deleteCombatant", () => ActionMenu.refresh());
		Hooks.on("canvasReady", () => ActionMenu.refresh());
		Hooks.on("updateUser", (user) => {
			if (user.id === game.user.id) ActionMenu.refresh();
		});

		// 액터 정보 변경 시 갱신 (HP, AC, Spell Slot 등)
		Hooks.on("updateActor", (actor) => {
			if (ActionMenu.currentActor && actor.id === ActionMenu.currentActor.id)
				ActionMenu.refresh();
		});

		// Detect Item Changes (Consumable usage, equipment change, etc.)
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

		const root = $(`#${ActionMenu.ROOT_ID}`);
		const container = $(`#${ActionMenu.SUB_ID}`);
		let lastActiveCat = null;
		let lastSearchQuery = "";
		let capturedSearchInput = $();
		if (container.length && container.hasClass("active")) {
			lastActiveCat = container.data("active-cat");
			const activeWrapper = getSubMenuWrapper(container, lastActiveCat);
			capturedSearchInput = activeWrapper.find(".ib-search-input").first();
			lastSearchQuery = String(
				capturedSearchInput.val() || "",
			);
		}

		const restoreSubMenu = () => {
			if (!lastActiveCat) return;
			container.data("active-cat", lastActiveCat);
			ActionMenu.renderSubMenu(lastActiveCat)
				.then(async (isCurrentRender) => {
					if (!isCurrentRender) return;
					if (String(container.data("active-cat")) !== String(lastActiveCat)) return;
					if (
						capturedSearchInput.length &&
						String(capturedSearchInput.val() || "") !== lastSearchQuery
					) return;
					if (!lastSearchQuery) return;
					const activeWrapper = getSubMenuWrapper(container, lastActiveCat);
					activeWrapper.find(".ib-search-input").first().val(lastSearchQuery);
					await filterListModule(ActionMenu, lastSearchQuery);
				})
				.catch((error) => {
					console.warn("Nik's Action HUD | Could not restore sub-menu:", error);
				});
		};

		const shouldHide = () => { root.addClass("am-hidden"); container.removeClass("active"); };
		const shouldDestroy = () => { root.remove(); };

		try {
			if (game.settings.get(MODULE_ID, "disableHUD")) {
				shouldDestroy();
				return;
			}
		} catch (_e) {}

		const config =
			game.settings.get(MODULE_ID, "configuration") || {};

		if (config.enableActionMenu === false) { shouldDestroy(); return; }
		if (config.gmHudHidden && game.user.isGM) { shouldDestroy(); return; }

		const visibilityOverrides =
			game.settings.get(MODULE_ID, "clientVisibility") || {};
		const actionGlobal = config.actionMenuVisibility || "always";
		const visibility = actionGlobal === "always"
			? (visibilityOverrides.actionMenuVisibility || "always")
			: actionGlobal;
		const inCombat = game.combat?.started ?? false;
		if (visibility === "never") { shouldDestroy(); return; }
		if (visibility === "combatOnly" && !inCombat) { shouldDestroy(); return; }

		const controlled = canvas.tokens?.controlled || [];
		const onlyGroupTokens = controlled.length > 0 && controlled.every((t) => t.actor?.type === "group");
		const hasNoControlled = controlled.length === 0;

		let token = controlled[0];
		if (
			canvas.tokens &&
			(hasNoControlled || onlyGroupTokens)
		) {
			const userActor = game.user?.character
				|| (!game.user?.isGM ? (game.actors?.find((a) => a.isOwner && a.type === "character") || game.actors?.find((a) => a.isOwner)) : null);

			if (userActor) {
				const activeTokens = userActor.getActiveTokens ? userActor.getActiveTokens() : [];
				const activeToken = activeTokens[0]
					|| canvas.tokens.placeables?.find((t) => t.actor?.id === userActor.id || t.document?.actorId === userActor.id);

				token = activeToken || {
					actor: userActor,
					name: userActor.prototypeToken?.name || userActor.name,
					document: {
						name: userActor.prototypeToken?.name || userActor.name,
						texture: { src: userActor.prototypeToken?.texture?.src || userActor.img },
					},
				};
			}
		}

		const isEditMode = window.ActionHUD?.isEditMode ?? false;

		if (!token || !token.actor) {
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

		const excludedTypes = (config.excludedActorTypes || "")
			.split(",")
			.map((t) => t.trim())
			.filter((t) => t !== "");

		if (excludedTypes.includes(token.actor.type)) { shouldHide(); return; }

		if (token.actor.getFlag(MODULE_ID, "hideActionMenu")) { shouldHide(); return; }

		ActionMenu.currentActor = token.actor;
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
				container.removeData("active-cat");
				container.removeClass("active");
			}
		}

		root.removeClass("am-hidden");

		if (root.length && !root.hasClass("is-placeholder")) {
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

		const container = $(`#${ActionMenu.SUB_ID}`);
		const categoryId = container.data("active-cat");
		const activeWrapper = getSubMenuWrapper(container, categoryId);
		const query = String(
			activeWrapper.find(".ib-search-input").first().val() || "",
		);
		const options = ActionMenu.getFavoriteViewOptions();
		options[option] = !options[option];

		await game.settings.set(
			MODULE_ID,
			"favoriteViewOptions",
			options,
		);

		if (!categoryId || !container.hasClass("active")) return;

		const isCurrentRender = await ActionMenu.renderSubMenu(categoryId);
		if (
			!isCurrentRender ||
			String(container.data("active-cat")) !== String(categoryId)
		) return;
		const updatedWrapper = getSubMenuWrapper(container, categoryId);
		const input = updatedWrapper.find(".ib-search-input").first();
		input.val(query);
		if (query) await filterListModule(ActionMenu, query);
		input.focus();
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
	 * 서브 메뉴 컨테이너(커스텀 메뉴 드롭존) 이벤트 연결
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
		const container = $(`#${ActionMenu.SUB_ID}`);
		if (
			container.data("active-cat") === categoryId &&
			container.hasClass("active")
		) {
			container.removeClass("active");
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
				container.removeClass("active");
				container.removeData("active-cat");
				ActionMenu.hideTooltip(true);
				return;
			}
		}

		// 탭 초기화
		ActionMenu.activeTab = null;
		ActionMenu.activeSubTab = null;

		container.data("active-cat", categoryId);
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

	// --- 편집 모드 및 드래그 ---

	static toggleEditMode(enable) {
		toggleEditModeModule(ActionMenu, enable);
	}
	static _enableDrag(element) {
		enableDragModule(ActionMenu, element);
	}

	static previewUpdate(data) {
		previewUpdateModule(ActionMenu, data);
	}

	static previewAMImages(data) {
		previewAMImagesModule(ActionMenu, data);
	}

	static _findMenuItemData(itemId) {
		return findMenuItemDataModule(ActionMenu, itemId);
	}

	// [TOOLTIP] 툴팁 표시
	static async showTooltip(itemId, event) {
		await showTooltipModule(ActionMenu, itemId, event);
	}

	// [TOOLTIP] 툴팁 숨기기
	static hideTooltip(force = false) {
		hideTooltipModule(force);
	}

	// [TOOLTIP] 마우스 따라다니기
	static moveTooltip(event) {
		moveTooltipModule(ActionMenu, event);
	}

	// [SEARCH] 리스트 필터링
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

	static showMenu() {
		try {
			if (game.settings.get(MODULE_ID, "disableHUD")) return;
		} catch (_e) {}
		const root = $(`#${ActionMenu.ROOT_ID}`);
		if (root.length) {
			root.show();
		}
	}

	static hideMenu() {
		const root = $(`#${ActionMenu.ROOT_ID}`);
		if (root.length) {
			root.hide();
		}
		const subMenu = $(`#${ActionMenu.SUB_ID}`);
		if (subMenu.length) {
			subMenu.removeClass("active");
		}
		ActionMenu.hideTooltip(true);
	}

	static previewButton(cIdx, data) {
		const btn = $(`#${ActionMenu.ID} .btn-custom-${cIdx}`);
		if (!btn.length) return;

		if (!data.buttonImg || data.buttonImg.trim() === "") {
			btn.removeClass("is-custom-btn");
			btn.find(".ib-custom-bg").remove();
			return;
		}

		btn.addClass("is-custom-btn");

		let img = btn.find(".ib-custom-bg");
		if (!img.length) {
			btn.prepend(`<img class="ib-custom-bg" src="${data.buttonImg}">`);
			img = btn.find(".ib-custom-bg");
		} else {
			if (img.attr("src") !== data.buttonImg) {
				img.attr("src", data.buttonImg);
			}
		}

		img.css({
			"--img-scale": data.buttonScale,
			"--img-x": `${data.buttonX}px`,
			"--img-y": `${data.buttonY}px`,
		});
	}
}

window.ActionHUD = window.ActionHUD || {};
window.ActionHUD.actionMenu = ActionMenu;
