import { MODULE_ID } from "../../constants.js";

import { addMacro, addPersonalItem } from "./actions.js";

export const onDrop = async (ActionMenu, event) => {
	event.preventDefault();
	event.stopPropagation();

	const container = document.getElementById(ActionMenu.SUB_ID);
	if (container) container.classList.remove("drag-hover");

	const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
	if (!data || !data.type) return;

	const $container = $(container);
	const activeCatId = $container.data("active-cat");
	const menuData =
		$container.data("menu-data") ||
		(await ActionMenu.adapter?.getSubMenuData(ActionMenu.currentActor, activeCatId));

	if (!activeCatId) return;

	const isCustomCategory = activeCatId.startsWith("custom-");
	const isUtilityMacroTab =
		String(ActionMenu.activeTab) === "macro" &&
		menuData?.items?.macro?.all &&
		menuData?.subTabLabels?.macro?.all;

	if (!isCustomCategory && !isUtilityMacroTab) return;

	if (isUtilityMacroTab) {
		let macro = null;
		if (data.type === "Macro") {
			macro = await Macro.fromDropData(data);
		} else if (data.type === "Item") {
			macro = await ActionMenu.adapter.createSystemMacro(data);
		}

		if (macro) {
			await addMacro(ActionMenu, macro);
		}
		return;
	}

	if (isCustomCategory) {
		const catIndex = parseInt(activeCatId.replace("custom-", ""));
		let tabIndex = 0;

		if (
			ActionMenu.activeSubTab &&
			String(ActionMenu.activeSubTab).startsWith("tab-")
		) {
			tabIndex = parseInt(
				String(ActionMenu.activeSubTab).replace("tab-", ""),
			);
		} else if (
			ActionMenu.activeTab &&
			String(ActionMenu.activeTab).startsWith("tab-")
		) {
			tabIndex = parseInt(String(ActionMenu.activeTab).replace("tab-", ""));
		} else if (ActionMenu.activeTab) {
			const config = game.settings.get(MODULE_ID, "configuration");
			const category = config.customMenu[catIndex];
			if (category && category.tabs) {
				const foundIdx = category.tabs.findIndex((t) => {
					const slug = (t.label || "General")
						.replace(/\s+/g, "_")
						.toLowerCase();
					return slug === ActionMenu.activeTab;
				});
				if (foundIdx > -1) tabIndex = foundIdx;
			}
		}

			let finalItem = null;
		if (data.type === "Macro") {
			const macro = await Macro.fromDropData(data);
			if (macro?.uuid) {
				finalItem = {
					id: macro.uuid,
					name: macro.name,
					img: macro.img,
					type: "Macro",
				};
			}
		} else if (data.type === "Item") {
			const macro = await ActionMenu.adapter.createSystemMacro(data);
			if (macro?.uuid) {
				finalItem = {
					id: macro.uuid,
					name: macro.name,
					img: macro.img,
					type: "Macro",
				};
			}
		}

		if (finalItem?.id) {
			await addPersonalItem(ActionMenu, catIndex, tabIndex, finalItem);
		}
		return;
	}
};
