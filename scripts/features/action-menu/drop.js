import { MODULE_ID, DOM_IDS } from "../../constants.js";
import { addMacro, addPersonalItem } from "./actions.js";

/**
 * Resolves drop payload into a normalized macro entry.
 * @param {object} payload - Parsed drag-and-drop payload from Foundry
 * @param {object} adapter - Active system adapter instance
 * @returns {Promise<{id: string, name: string, img: string, type: string}|null>}
 */
async function resolveDroppedMacro(payload, adapter) {
	if (payload.type === "Macro") {
		const doc = await Macro.fromDropData(payload);
		if (!doc?.uuid) return null;
		return { id: doc.uuid, name: doc.name, img: doc.img, type: "Macro" };
	}
	if (payload.type === "Item" && adapter?.createSystemMacro) {
		const doc = await adapter.createSystemMacro(payload);
		if (!doc?.uuid) return null;
		return { id: doc.uuid, name: doc.name, img: doc.img, type: "Macro" };
	}
	return null;
}

/**
 * Determines target tab index for custom menu category drops.
 * @param {string|number} activeTab - Currently active tab key
 * @param {string|number} activeSubTab - Currently active sub-tab key
 * @param {number} categoryIndex - Parsed custom category index
 * @returns {number} 0-based tab index
 */
function resolveTargetTabIndex(activeTab, activeSubTab, categoryIndex) {
	const subStr = String(activeSubTab || "");
	const tabStr = String(activeTab || "");

	if (subStr.startsWith("tab-")) {
		return parseInt(subStr.slice(4), 10) || 0;
	}
	if (tabStr.startsWith("tab-")) {
		return parseInt(tabStr.slice(4), 10) || 0;
	}
	if (activeTab) {
		const config = game.settings.get(MODULE_ID, "configuration") || {};
		const categoryDef = config.customMenu?.[categoryIndex];
		if (Array.isArray(categoryDef?.tabs)) {
			const idx = categoryDef.tabs.findIndex((t) => {
				const slug = (t.label || "General").replace(/\s+/g, "_").toLowerCase();
				return slug === activeTab;
			});
			if (idx > -1) return idx;
		}
	}
	return 0;
}

/**
 * Handles drop event onto action submenu containers.
 * @param {typeof import("../action-menu.js").ActionMenu} ActionMenu
 * @param {DragEvent} event
 */
export async function onDrop(ActionMenu, event) {
	event.preventDefault();
	event.stopPropagation();

	const subContainer = document.getElementById(ActionMenu.SUB_ID) || document.getElementById(DOM_IDS.SUBMENU);
	subContainer?.classList.remove("drag-hover");

	const dragPayload = TextEditor.getDragEventData ? TextEditor.getDragEventData(event) : null;
	if (!dragPayload?.type) return;

	const targetCategory = subContainer?.dataset?.activeCat;
	if (!targetCategory) return;

	const menuInfo = ActionMenu._currentSubMenuData || (await ActionMenu.adapter?.getSubMenuData(ActionMenu.currentActor, targetCategory));

	const isCustom = targetCategory.startsWith("custom-");
	const isMacroTab =
		String(ActionMenu.activeTab) === "macro" &&
		menuInfo?.items?.macro?.all &&
		menuInfo?.subTabLabels?.macro?.all;

	if (!isCustom && !isMacroTab) return;

	if (isMacroTab) {
		let macroDoc = null;
		if (dragPayload.type === "Macro") {
			macroDoc = await Macro.fromDropData(dragPayload);
		} else if (dragPayload.type === "Item") {
			macroDoc = await ActionMenu.adapter?.createSystemMacro(dragPayload);
		}
		if (macroDoc) {
			await addMacro(ActionMenu, macroDoc);
		}
		return;
	}

	if (isCustom) {
		const catIdx = parseInt(targetCategory.replace("custom-", ""), 10);
		const tabIdx = resolveTargetTabIndex(ActionMenu.activeTab, ActionMenu.activeSubTab, catIdx);
		const itemEntry = await resolveDroppedMacro(dragPayload, ActionMenu.adapter);
		if (itemEntry?.id) {
			await addPersonalItem(ActionMenu, catIdx, tabIdx, itemEntry);
		}
	}
}
