import {
	areFavoriteOrdersEqual,
	reorderFavoriteIds,
} from "./favorites.js";
import { MODULE_ID } from "../../constants.js";

const getActorFlag = (actor, key) => {
	if (!actor) return undefined;
	return actor.getFlag?.(MODULE_ID, key);
};

const setActorFlag = async (actor, key, val) => {
	if (!actor) return;
	return actor.setFlag(MODULE_ID, key, val);
};

export const ensureMacroPermission = async (macroOrUuid) => {
	if (game.user.isGM) return true;

	let macro = macroOrUuid;
	let uuid = macroOrUuid;

	if (typeof macroOrUuid === "string") {
		macro = (await fromUuid(macroOrUuid)) || game.macros.get(macroOrUuid);
		uuid = macro?.uuid || macroOrUuid;
	} else {
		uuid = macro?.uuid || macro?.id;
	}

	if (!macro) return false;

	if (macro.testUserPermission(game.user, "LIMITED")) return true;

	try {
		const socket = window.ActionHUD?.socket;
		const result = await socket?.executeAsGM(
			"grantMacroPermission",
			uuid,
			game.user.id
		);
		return result?.success ?? false;
	} catch (err) {
		console.warn("Nik's Action HUD | Failed to request macro permission:", err);
		ui.notifications.warn(
			game.i18n.localize("IBHUD.Notifications.MacroPermissionFailed") ||
				"Failed to get macro permission. Is a GM connected?"
		);
		return false;
	}
};

export const getFavorites = (ActionMenu) => {
	const actor = ActionMenu?.currentActor;
	if (!actor) return [];

	if (actor.isToken) {
		const baseActor = game.actors?.get(actor.id) || actor.baseActor;
		if (baseActor) {
			const baseFavs = getActorFlag(baseActor, "favorites");
			if (Array.isArray(baseFavs)) return baseFavs;
		}
	}

	return getActorFlag(actor, "favorites") || [];
};

export const toggleFavorite = async (ActionMenu, itemId) => {
	const actor = ActionMenu?.currentActor;
	if (!actor) return;

	const favs = getFavorites(ActionMenu);
	let newFavs = [];

	if (favs.includes(itemId)) {
		newFavs = favs.filter((id) => id !== itemId);
	} else {
		newFavs = [...favs, itemId];
	}

	if (actor.isToken) {
		const baseActor = game.actors?.get(actor.id) || actor.baseActor;
		if (baseActor && (baseActor.isOwner || game.user.isGM)) {
			await setActorFlag(baseActor, "favorites", newFavs);
			await setActorFlag(actor, "favorites", newFavs);

			if (canvas.tokens?.placeables) {
				for (const token of canvas.tokens.placeables) {
					if (
						token.actor &&
						token.actor.isToken &&
						token.actor.id === baseActor.id &&
						token.actor !== actor
					) {
						setActorFlag(token.actor, "favorites", newFavs).catch(() => {});
					}
				}
			}

			ActionMenu.refresh();
			return;
		}
	}

	await setActorFlag(actor, "favorites", newFavs);
	ActionMenu.refresh();
};

export const addPersonalItem = async (ActionMenu, catIndex, tabIndex, itemData) => {
	const actor = ActionMenu?.currentActor;
	if (!actor) return;

	const key = `${catIndex}-${tabIndex}`;
	const personalMap = getActorFlag(actor, "personalMap") || {};

	if (!personalMap[key]) personalMap[key] = [];

	if (personalMap[key].some((i) => i.id === itemData.id)) return;

	if (itemData.type === "Macro" && itemData.id) {
		await ensureMacroPermission(itemData.id);
	}

	personalMap[key].push(itemData);

	await setActorFlag(actor, "personalMap", personalMap);
	ui.notifications.info(`Added personal macro: ${itemData.name}`);
	ActionMenu.refresh();
};

export const addMacro = async (ActionMenu, macro) => {
	const actor = ActionMenu?.currentActor;
	if (!actor || !macro) return;

	const existingMacros = getActorFlag(actor, "macros") || [];
	if (existingMacros.includes(macro.id)) return;

	await ensureMacroPermission(macro);

	existingMacros.push(macro.id);

	await setActorFlag(actor, "macros", existingMacros);
	ActionMenu.refresh();
};

export const removePersonalItem = async (
	ActionMenu,
	catIndex,
	tabIndex,
	itemIndex,
) => {
	const actor = ActionMenu?.currentActor;
	if (!actor) return;

	const key = `${catIndex}-${tabIndex}`;
	const personalMap = foundry.utils.deepClone(
		getActorFlag(actor, "personalMap") || {},
	);
	if (personalMap[key]) {
		personalMap[key].splice(itemIndex, 1);
		if (personalMap[key].length === 0) {
			delete personalMap[key];
		}
		await setActorFlag(actor, "personalMap", personalMap);
		ActionMenu.refresh();
	}
};

export const openItem = async (ActionMenu, itemId) => {
	if (!ActionMenu?.currentActor) return;

	const actor = ActionMenu.currentActor;
	let realId = String(itemId || "");
	if (realId.includes(":")) {
		const parts = realId.split(":");
		realId = parts[1] || parts[0];
	}
	realId = realId.split("_")[0];

	let item = actor.items?.get(realId);
	if (!item && typeof fromUuidSync === "function") {
		try {
			item = fromUuidSync(itemId) || fromUuidSync(realId);
		} catch (e) {}
	}
	if (!item && typeof fromUuid === "function") {
		try {
			item = (await fromUuid(itemId)) || (await fromUuid(realId));
		} catch (e) {}
	}

	if (item?.sheet) {
		item.sheet.render(true);
		return item;
	}
};

export const editResource = openItem;

export const editMacro = async (ActionMenu, macroId) => {
	if (!ActionMenu.currentActor) return;
	const { editMacro: editMacroDialog } = await import("./dialogs.js");
	await editMacroDialog(ActionMenu, macroId);
};

export const editCustomMacro = async (ActionMenu, macroId, personalMeta) => {
	if (!ActionMenu.currentActor) return;
	const { editMacro: editMacroDialog } = await import("./dialogs.js");
	await editMacroDialog(ActionMenu, macroId, {
		onDelete: async () => {
			await removePersonalItem(
				ActionMenu,
				personalMeta.catIdx,
				personalMeta.tabIdx,
				personalMeta.itemIdx,
			);
		},
	});
};

export const editGlobalMacro = async (ActionMenu, macroId, globalMeta) => {
	if (!game.user.isGM) {
		ui.notifications.warn("Only the GM can edit global macro flavor text.");
		return;
	}

	const normalizedId = macroId.startsWith("macro-")
		? macroId.replace(/^macro-/, "")
		: macroId;

	let macro = null;
	if (typeof fromUuidSync === "function") macro = fromUuidSync(normalizedId);
	if (!macro) macro = game.macros.get(normalizedId);

	const config = game.settings.get(MODULE_ID, "configuration");
	const savedItem = config.customMenu?.[globalMeta.catIdx]?.tabs?.[globalMeta.tabIdx]?.items?.[globalMeta.itemIdx];
	const currentFlavor = savedItem?.flavor || "";

	const { DialogV2 } = foundry.applications.api;
	const { HTMLProseMirrorElement } = foundry.applications.elements;

	const editorHtml = HTMLProseMirrorElement.create({
		name: "flavorText",
		value: currentFlavor,
		toggled: false,
	}).outerHTML;

	const content = `
		<div class="ib-dialog-content sah-edit-macro-content" style="display:flex; flex-direction:column; gap:15px; padding:5px; height:100%; min-height:360px; box-sizing:border-box;">
			<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #444; padding-bottom:5px;">
				<label style="font-weight:bold; font-size:1.1em;">${macro?.name || "Macro"}</label>
				<span style="font-size:0.8em; color:#aaa;">Edit Global Flavor</span>
			</div>
			
			<div style="flex:1; display:flex; flex-direction:column; gap:5px; min-height:260px;">
				<label style="font-weight:bold; color:#ccc;">Flavor Text / Description</label>
				<div style="flex:1; min-height:240px; height:100%;">
					${editorHtml}
				</div>
			</div>
		</div>
	`;

	const result = await new Promise((resolve) => {
		const dialog = new DialogV2({
			window: {
				title: "Edit Global Flavor",
				icon: "fas fa-edit",
				width: 420,
				height: 560,
				resizable: true,
				classes: ["sah-edit-macro-dialog"],
			},
			content: content,
			buttons: [
				{
					action: "save",
					label: "Save",
					icon: "fas fa-save",
					callback: (event, button, dlg) => {
						const root = dlg?.element ?? dlg;
						const editor = root.querySelector('prose-mirror[name="flavorText"]');
						const flavor = editor?.value ?? editor?.getAttribute("value") ?? editor?.innerHTML ?? "";
						resolve({ action: "save", flavor: flavor });
					}
				},
				{
					action: "delete",
					label: "Remove from Menu",
					icon: "fas fa-trash",
					callback: () => {
						resolve({ action: "delete" });
					}
				}
			],
		});

		dialog.addEventListener("close", () => resolve(null), { once: true });

		dialog.addEventListener("render", () => {
			requestAnimationFrame(() => {
				if (dialog.element) dialog.setPosition({ width: 420, height: 560 });
			});
		}, { once: true });
		dialog.render({ force: true });
	});

	if (!result) return;

	if (result.action === "delete") {
		await removeCustomItem(
			ActionMenu,
			globalMeta.catIdx,
			globalMeta.tabIdx,
			globalMeta.itemIdx,
		);
	} else if (result.action === "save") {
		const freshConfig = game.settings.get(MODULE_ID, "configuration");
		const customMenu = foundry.utils.deepClone(freshConfig.customMenu);
		const targetItem = customMenu?.[globalMeta.catIdx]?.tabs?.[globalMeta.tabIdx]?.items?.[globalMeta.itemIdx];
		if (targetItem) {
			if (result.flavor.trim()) {
				targetItem.flavor = result.flavor;
			} else {
				delete targetItem.flavor;
			}
			await game.settings.set(MODULE_ID, "configuration", {
				...freshConfig,
				customMenu,
			});
			if (window.ActionHUD?.actionMenu) window.ActionHUD.actionMenu.refresh();
		}
	}
};

export const addItemToCustomMenu = async (
	ActionMenu,
	catIndex,
	tabIndex,
	itemData,
) => {
	const config = game.settings.get(MODULE_ID, "configuration");
	const customMenu = foundry.utils.deepClone(config.customMenu);

	if (customMenu && customMenu[catIndex]) {
		if (!customMenu[catIndex].tabs) customMenu[catIndex].tabs = [];
		if (!customMenu[catIndex].tabs[tabIndex]) {
			customMenu[catIndex].tabs[tabIndex] = { label: "Main", items: [] };
		}

		customMenu[catIndex].tabs[tabIndex].items.push(itemData);

		await game.settings.set(MODULE_ID, "configuration", {
			...config,
			customMenu,
		});

		ui.notifications.info(`Added '${itemData.name}' to menu.`);
		ActionMenu.refresh();
	} else {
		console.error("ActionHUD | Custom menu structure error.");
	}
};

export const removeCustomItem = async (
	ActionMenu,
	catIndex,
	tabIndex,
	itemIndex,
) => {
	if (!game.user.isGM) return;

	const config = game.settings.get(MODULE_ID, "configuration");
	const customMenu = foundry.utils.deepClone(config.customMenu);

	if (customMenu?.[catIndex]?.tabs?.[tabIndex]?.items) {
		customMenu[catIndex].tabs[tabIndex].items.splice(itemIndex, 1);
		await game.settings.set(MODULE_ID, "configuration", {
			...config,
			customMenu,
		});
		ActionMenu.refresh();
	}
};

export const removeMacro = async (ActionMenu, macroId) => {
	const actor = ActionMenu?.currentActor;
	if (!actor) return;
	const existingMacros = getActorFlag(actor, "macros") || [];
	const newMacros = existingMacros.filter((id) => id !== macroId);

	await setActorFlag(actor, "macros", newMacros);

	const overrides = getActorFlag(actor, "macro-overrides") || {};
	if (overrides[macroId]) {
		const newOverrides = { ...overrides };
		delete newOverrides[macroId];
		await setActorFlag(actor, "macro-overrides", newOverrides);
	}

	const favoriteIds = [`macro-${macroId}`];
	let macro = null;
	if (typeof macroId === "string") {
		macro = (await fromUuid(macroId)) || game.macros.get(macroId);
	}
	if (macro?.id && macro.id !== macroId) favoriteIds.push(`macro-${macro.id}`);
	if (macro?.uuid && macro.uuid !== macroId)
		favoriteIds.push(`macro-${macro.uuid}`);

	for (const favoriteId of favoriteIds) {
		await removeFavorite(ActionMenu, favoriteId, actor);
	}

	ui.notifications.info(game.i18n.localize("IBHUD.Notifications.MacroDeleted"));
	ActionMenu.refresh();
};

export const openSheet = (ActionMenu, tabName) => {
	if (ActionMenu.currentActor)
		ActionMenu.currentActor.sheet.render(true, { tab: tabName });
};

export const runSystemAction = (ActionMenu, actionId) => {
	ActionMenu.adapter.executeAction(ActionMenu.currentActor, actionId);
};

export const useItem = (ActionMenu, itemId, event) => {
	ActionMenu.adapter.useItem(ActionMenu.currentActor, itemId, event);
};

export const switchTab = async (ActionMenu, categoryId, tabId) => {
	ActionMenu.activeTab = tabId;
	ActionMenu.activeSubTab = null;
	await ActionMenu.renderSubMenu(categoryId);
};

export const switchSubTab = async (ActionMenu, categoryId, subTabId) => {
	ActionMenu.activeSubTab = subTabId;
	await ActionMenu.renderSubMenu(categoryId);
};

export const removeFavorite = async (ActionMenu, itemId, actor = null) => {
	const targetActor = actor || ActionMenu.currentActor;
	if (!targetActor) return;

	if (targetActor.isToken) {
		const baseActor = game.actors?.get(targetActor.id) || targetActor.baseActor;
		if (baseActor && (baseActor.isOwner || game.user.isGM)) {
			const favs =
				getActorFlag(baseActor, "favorites") ||
				getActorFlag(targetActor, "favorites") ||
				[];
			if (favs.includes(itemId)) {
				const newFavs = favs.filter((id) => id !== itemId);
				await setActorFlag(baseActor, "favorites", newFavs);
				await setActorFlag(targetActor, "favorites", newFavs);

				if (canvas.tokens?.placeables) {
					for (const token of canvas.tokens.placeables) {
						if (
							token.actor &&
							token.actor.isToken &&
							token.actor.id === baseActor.id &&
							token.actor !== targetActor
						) {
							setActorFlag(token.actor, "favorites", newFavs).catch(() => {});
						}
					}
				}

				if (ActionMenu.currentActor && targetActor.id === ActionMenu.currentActor.id) {
					ActionMenu.refresh();
				}
				return;
			}
		}
	}

	const favs = getActorFlag(targetActor, "favorites") || [];
	if (!favs.includes(itemId)) return;

	const newFavs = favs.filter((id) => id !== itemId);
	await setActorFlag(targetActor, "favorites", newFavs);

	if (ActionMenu.currentActor && targetActor.id === ActionMenu.currentActor.id) {
		ActionMenu.refresh();
	}
};

export const reorderFavorites = async (
	ActionMenu,
	sourceId,
	targetId = null,
	insertAfter = false,
	actor = null,
) => {
	const targetActor = actor || ActionMenu.currentActor;
	if (!targetActor) return false;

	if (targetActor.isToken) {
		const baseActor = game.actors?.get(targetActor.id) || targetActor.baseActor;
		if (baseActor && (baseActor.isOwner || game.user.isGM)) {
			const favorites =
				getActorFlag(baseActor, "favorites") ||
				getActorFlag(targetActor, "favorites") ||
				[];
			const sourceIndex = favorites.indexOf(sourceId);
			if (sourceIndex >= 0 && targetId !== sourceId) {
				const reordered = [...favorites];
				const [movedId] = reordered.splice(sourceIndex, 1);
				if (targetId === null) {
					reordered.push(movedId);
				} else {
					const targetIndex = reordered.indexOf(targetId);
					if (targetIndex >= 0) {
						const insertIndex = insertAfter ? targetIndex + 1 : targetIndex;
						reordered.splice(insertIndex, 0, movedId);
					} else {
						reordered.push(movedId);
					}
				}

				await setActorFlag(baseActor, "favorites", reordered);
				await setActorFlag(targetActor, "favorites", reordered);

				if (canvas.tokens?.placeables) {
					for (const token of canvas.tokens.placeables) {
						if (
							token.actor &&
							token.actor.isToken &&
							token.actor.id === baseActor.id &&
							token.actor !== targetActor
						) {
							setActorFlag(token.actor, "favorites", reordered).catch(() => {});
						}
					}
				}

				if (ActionMenu.currentActor === targetActor) ActionMenu.refresh();
				return true;
			}
		}
	}

	const favorites = getActorFlag(targetActor, "favorites") || [];
	const reordered = reorderFavoriteIds(
		favorites,
		sourceId,
		targetId,
		insertAfter,
	);
	if (areFavoriteOrdersEqual(favorites, reordered)) return false;

	await setActorFlag(targetActor, "favorites", reordered);
	if (ActionMenu.currentActor === targetActor) ActionMenu.refresh();
	return true;
};
