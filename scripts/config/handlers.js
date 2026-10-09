/**
 * Action handlers for Nik's Action HUD Configuration.
 * Exclusively designed for Foundry V14.
 */

import { MODULE_ID } from "../constants.js";
import { ActionMenu } from "../features/action-menu.js";
import { captureInputData } from "./capture.js";
import { exportHudConfig, loadHudConfig } from "./schema.js";
import { resetSection, RESET_SCOPES } from "./reset-sections.js";
import { triggerPreview } from "./preview.js";
import { exportThemeZip, importThemeZip } from "./theme-export.js";
import { applyActionMenuPresetData, buildActionMenuPresetData } from "./action-menu-presets.js";
import { isThemeAvailable } from "./constants.js";

// ── Save Handler ─────────────────────────────────────────

export const onSave = async (app, event, target) => {
	app.isSaving = true;
	try {
		captureInputData(app, app.element);
		const cleanConfig = exportHudConfig(app.tempData);

		if (game.user.isGM) {
			await game.settings.set(MODULE_ID, "configuration", cleanConfig);
			if (game.settings.settings.has(`${MODULE_ID}.dnd5eAutoFavoriteNpcActions`) && cleanConfig.dnd5eAutoFavoriteNpcActions !== undefined) {
				await game.settings.set(MODULE_ID, "dnd5eAutoFavoriteNpcActions", cleanConfig.dnd5eAutoFavoriteNpcActions);
			}
			if (game.settings.settings.has(`${MODULE_ID}.dnd5eAutoFavoriteNpcMax`) && cleanConfig.dnd5eAutoFavoriteNpcMax !== undefined) {
				await game.settings.set(MODULE_ID, "dnd5eAutoFavoriteNpcMax", cleanConfig.dnd5eAutoFavoriteNpcMax);
			}
		} else {
			// Non-GMs cannot save world-level settings; save client-level overrides instead
			if (cleanConfig.enableActionMenu !== undefined) {
				await game.settings.set(MODULE_ID, "disableHUD", !cleanConfig.enableActionMenu);
			}

			const clientPos = foundry.utils.deepClone(
				game.settings.get(MODULE_ID, "clientPositions") || {},
			);
			if (cleanConfig.actionMenuScale !== undefined) {
				clientPos.actionMenuScale = cleanConfig.actionMenuScale;
			}
			await game.settings.set(MODULE_ID, "clientPositions", clientPos);

			if (cleanConfig.actorSettings) {
				try {
					const clientOverrides = foundry.utils.deepClone(
						game.settings.get(MODULE_ID, "clientActorOverrides") || {},
					);
					for (const [actorId, actorCfg] of Object.entries(cleanConfig.actorSettings)) {
						if (!clientOverrides[actorId]) clientOverrides[actorId] = {};
						clientOverrides[actorId].actorSettings = actorCfg;
					}
					await game.settings.set(MODULE_ID, "clientActorOverrides", clientOverrides);
				} catch (e) {
					console.warn("Nik's Action HUD | Could not save clientActorOverrides:", e);
				}
			}
		}

		// Client-level settings sync (applicable to both GM and players)
		if (game.settings.settings.has(`${MODULE_ID}.hideEmptySubmenus`) && cleanConfig.hideEmptySubmenus !== undefined) {
			await game.settings.set(MODULE_ID, "hideEmptySubmenus", cleanConfig.hideEmptySubmenus);
		}
		if (game.settings.settings.has(`${MODULE_ID}.fadeWhenIdle`) && cleanConfig.fadeWhenIdle !== undefined) {
			await game.settings.set(MODULE_ID, "fadeWhenIdle", cleanConfig.fadeWhenIdle);
		}
		if (game.settings.settings.has(`${MODULE_ID}.actionMenuSubmenuSide`) && cleanConfig.actionMenuSubmenuSide !== undefined) {
			await game.settings.set(MODULE_ID, "actionMenuSubmenuSide", cleanConfig.actionMenuSubmenuSide);
		}
		if (game.settings.settings.has(`${MODULE_ID}.tooltipPosition`) && cleanConfig.tooltipPosition !== undefined) {
			await game.settings.set(MODULE_ID, "tooltipPosition", cleanConfig.tooltipPosition);
		}
		if (game.settings.settings.has(`${MODULE_ID}.dnd5eShowUnpreparedRituals`) && cleanConfig.dnd5eShowUnpreparedRituals !== undefined) {
			await game.settings.set(MODULE_ID, "dnd5eShowUnpreparedRituals", cleanConfig.dnd5eShowUnpreparedRituals);
		}

		const savedMsg = game.i18n.localize("NAH.Config.Saved") || "Nik's Action HUD configuration saved.";
		ui.notifications.info(savedMsg);

		if (ActionMenu.refresh) ActionMenu.refresh();

		await app.close();
	} catch (err) {
		console.error("Nik's Action HUD | Error saving configuration:", err);
		ui.notifications.error("Failed to save configuration.");
	} finally {
		app.isSaving = false;
	}
};

export const onSelectTheme = (app, event, target) => {
	const themeId = target.dataset.themeId || target.closest("[data-theme-id]")?.dataset?.themeId;
	if (!themeId || !isThemeAvailable(themeId)) return;

	app.tempData.theme = themeId;

	// Keep hidden input in sync so form captures don't overwrite with old value
	const hiddenInput = app.element.querySelector('input[name="theme"]');
	if (hiddenInput) hiddenInput.value = themeId;

	const cards = app.element.querySelectorAll(".hud-theme-card");
	cards.forEach((card) => {
		if (card.dataset.themeId === themeId) {
			card.classList.add("active");
			const radio = card.querySelector(".hud-theme-radio i");
			if (radio) radio.className = "fas fa-check-circle";
		} else {
			card.classList.remove("active");
			const radio = card.querySelector(".hud-theme-radio i");
			if (radio) radio.className = "fas fa-circle";
		}
	});

	triggerPreview(app);
};

// ── Reset Handler ────────────────────────────────────────

export const onReset = async (app, event, target) => {
	const scope = target.dataset.scope || RESET_SCOPES.ALL;

	const confirm = await foundry.applications.api.DialogV2.confirm({
		window: { title: game.i18n.localize("NAH.Config.ResetConfirmTitle") || "Reset Configuration" },
		content: `<p>${game.i18n.format("NAH.Config.ResetConfirmMessage", { scope: scope.toUpperCase() }) || `Are you sure you want to reset ${scope} settings to defaults?`}</p>`,
		modal: true,
	});

	if (!confirm) return;

	captureInputData(app, app.element);
	resetSection(app.tempData, scope);
	triggerPreview(app);
	await app.render();
};

// ── Menu Builder Handlers ────────────────────────────────

export const onToggleCollapseCategory = (app, event, target) => {
	const catRow = target.closest(".hud-category-card");
	if (!catRow) return;

	const catIndex = Number(catRow.dataset.catIndex);
	const adapterId = catRow.dataset.adapterId;

	if (adapterId) {
		if (!app._collapsedAdapterCategories) app._collapsedAdapterCategories = new Set();
		if (app._collapsedAdapterCategories.has(adapterId)) {
			app._collapsedAdapterCategories.delete(adapterId);
			catRow.classList.remove("collapsed");
		} else {
			app._collapsedAdapterCategories.add(adapterId);
			catRow.classList.add("collapsed");
		}
		return;
	}

	if (!Number.isNaN(catIndex) && app.tempData.customMenu?.[catIndex]) {
		const cat = app.tempData.customMenu[catIndex];
		if (!app._collapsedMenuCategories) app._collapsedMenuCategories = new WeakSet();
		if (app._collapsedMenuCategories.has(cat)) {
			app._collapsedMenuCategories.delete(cat);
			catRow.classList.remove("collapsed");
		} else {
			app._collapsedMenuCategories.add(cat);
			catRow.classList.add("collapsed");
		}
	}
};

export const onAddCategory = async (app, event, target) => {
	captureInputData(app, app.element);
	if (!Array.isArray(app.tempData.customMenu)) app.tempData.customMenu = [];

	app.tempData.customMenu.push({
		id: `custom_${Date.now()}`,
		label: "New Category",
		icon: "fas fa-star",
		type: "submenu",
		useSidebar: true,
		tabs: [
			{
				label: "General",
				items: [],
			},
		],
		buttonFrameLayers: [],
	});

	await app.render();
};

export const onRemoveCategory = async (app, event, target) => {
	const catRow = target.closest("[data-cat-index]");
	if (!catRow) return;
	const index = Number(catRow.dataset.catIndex);
	if (Number.isNaN(index)) return;

	captureInputData(app, app.element);
	if (Array.isArray(app.tempData.customMenu)) {
		app.tempData.customMenu.splice(index, 1);
	}
	await app.render();
};

export const onAddSubCategory = async (app, event, target) => {
	const catRow = target.closest("[data-cat-index]");
	if (!catRow) return;
	const index = Number(catRow.dataset.catIndex);
	if (Number.isNaN(index)) return;

	captureInputData(app, app.element);
	const cat = app.tempData.customMenu?.[index];
	if (cat) {
		if (!Array.isArray(cat.tabs)) cat.tabs = [];
		cat.tabs.push({
			label: "New Tab",
			items: [],
		});
	}
	await app.render();
};

export const onRemoveSubCategory = async (app, event, target) => {
	const subRow = target.closest("[data-tab-index]");
	const catRow = target.closest("[data-cat-index]");
	if (!subRow || !catRow) return;
	const catIndex = Number(catRow.dataset.catIndex);
	const tabIndex = Number(subRow.dataset.tabIndex);
	if (Number.isNaN(catIndex) || Number.isNaN(tabIndex)) return;

	captureInputData(app, app.element);
	const cat = app.tempData.customMenu?.[catIndex];
	if (cat?.tabs?.[tabIndex]) {
		cat.tabs.splice(tabIndex, 1);
	}
	await app.render();
};

export const onRemoveItem = async (app, event, target) => {
	const itemRow = target.closest("[data-item-index]");
	const subRow = target.closest("[data-tab-index]");
	const catRow = target.closest("[data-cat-index]");
	if (!itemRow || !subRow || !catRow) return;

	const catIndex = Number(catRow.dataset.catIndex);
	const tabIndex = Number(subRow.dataset.tabIndex);
	const itemIndex = Number(itemRow.dataset.itemIndex);

	captureInputData(app, app.element);
	const items = app.tempData.customMenu?.[catIndex]?.tabs?.[tabIndex]?.items;
	if (Array.isArray(items)) {
		items.splice(itemIndex, 1);
	}
	await app.render();
};

export const onAddBtnFrameLayer = async (app, event, target) => {
	const catRow = target.closest("[data-cat-index]");
	const adapterId = target.dataset.adapterId;

	captureInputData(app, app.element);

	if (adapterId) {
		if (!app.tempData.adapterCategoryOverrides) app.tempData.adapterCategoryOverrides = {};
		if (!app.tempData.adapterCategoryOverrides[adapterId]) app.tempData.adapterCategoryOverrides[adapterId] = {};
		const override = app.tempData.adapterCategoryOverrides[adapterId];
		if (!Array.isArray(override.buttonFrameLayers)) override.buttonFrameLayers = [];
		override.buttonFrameLayers.push({ src: "", zIndex: 10, opacity: 1, blend: "normal" });
	} else if (catRow) {
		const index = Number(catRow.dataset.catIndex);
		const cat = app.tempData.customMenu?.[index];
		if (cat) {
			if (!Array.isArray(cat.buttonFrameLayers)) cat.buttonFrameLayers = [];
			cat.buttonFrameLayers.push({ src: "", zIndex: 10, opacity: 1, blend: "normal" });
		}
	}
	await app.render();
};

export const onRemoveBtnFrameLayer = async (app, event, target) => {
	const catRow = target.closest("[data-cat-index]");
	const adapterId = target.dataset.adapterId;
	const index = Number(target.dataset.index);
	if (Number.isNaN(index)) return;

	captureInputData(app, app.element);

	if (adapterId) {
		const layers = app.tempData.adapterCategoryOverrides?.[adapterId]?.buttonFrameLayers;
		if (Array.isArray(layers)) layers.splice(index, 1);
	} else if (catRow) {
		const catIndex = Number(catRow.dataset.catIndex);
		const layers = app.tempData.customMenu?.[catIndex]?.buttonFrameLayers;
		if (Array.isArray(layers)) layers.splice(index, 1);
	}
	await app.render();
};

// ── Presets Handlers ─────────────────────────────────────

export const onSaveConfigPreset = async (app, event, target) => {
	if (!game.user.isGM) {
		ui.notifications.warn("Only the GM can save world configuration presets.");
		return;
	}

	const input = app.element.querySelector('input[name="newConfigPresetName"]');
	const name = input?.value?.trim();
	if (!name) {
		ui.notifications.warn("Please enter a preset name.");
		return;
	}

	captureInputData(app, app.element);
	const cleanConfig = exportHudConfig(app.tempData);
	const presets = game.settings.get(MODULE_ID, "configurationPresets") || {};
	presets[name] = cleanConfig;

	await game.settings.set(MODULE_ID, "configurationPresets", presets);
	ui.notifications.info(`Configuration preset "${name}" saved.`);
	if (input) input.value = "";
	await app.render();
};

export const onLoadConfigPreset = async (app, event, target) => {
	const select = app.element.querySelector('select[name="loadConfigPresetSelect"]');
	const name = select?.value;
	if (!name) return;

	const presets = game.settings.get(MODULE_ID, "configurationPresets") || {};
	const preset = presets[name];
	if (!preset) return;

	loadHudConfig(app.tempData, preset);
	triggerPreview(app);
	ui.notifications.info(`Configuration preset "${name}" loaded.`);
	await app.render();
};

export const onDeleteConfigPreset = async (app, event, target) => {
	if (!game.user.isGM) {
		ui.notifications.warn("Only the GM can delete world configuration presets.");
		return;
	}

	const select = app.element.querySelector('select[name="loadConfigPresetSelect"]');
	const name = select?.value;
	if (!name) return;

	const confirm = await foundry.applications.api.DialogV2.confirm({
		window: { title: "Delete Preset" },
		content: `<p>Delete preset "${name}"?</p>`,
		modal: true,
	});
	if (!confirm) return;

	const presets = game.settings.get(MODULE_ID, "configurationPresets") || {};
	delete presets[name];
	await game.settings.set(MODULE_ID, "configurationPresets", presets);
	ui.notifications.info(`Configuration preset "${name}" deleted.`);
	await app.render();
};

export const onSaveActionMenuPreset = async (app, event, target) => {
	if (!game.user.isGM) {
		ui.notifications.warn("Only the GM can save world action menu presets.");
		return;
	}

	const input = app.element.querySelector('input[name="newActionMenuPresetName"]');
	const name = input?.value?.trim();
	if (!name) return;

	captureInputData(app, app.element);
	const presetData = buildActionMenuPresetData(exportHudConfig(app.tempData));
	const presets = game.settings.get(MODULE_ID, "actionMenuPresets") || {};
	presets[name] = presetData;

	await game.settings.set(MODULE_ID, "actionMenuPresets", presets);
	ui.notifications.info(`Action menu preset "${name}" saved.`);
	if (input) input.value = "";
	await app.render();
};

export const onLoadActionMenuPreset = async (app, event, target) => {
	const select = app.element.querySelector('select[name="loadActionMenuPresetSelect"]');
	const name = select?.value;
	if (!name) return;

	const presets = game.settings.get(MODULE_ID, "actionMenuPresets") || {};
	const preset = presets[name];
	if (!preset) return;

	applyActionMenuPresetData(app.tempData, preset);
	triggerPreview(app);
	ui.notifications.info(`Action menu preset "${name}" loaded.`);
	await app.render();
};

export const onDeleteActionMenuPreset = async (app, event, target) => {
	if (!game.user.isGM) {
		ui.notifications.warn("Only the GM can delete world action menu presets.");
		return;
	}

	const select = app.element.querySelector('select[name="loadActionMenuPresetSelect"]');
	const name = select?.value;
	if (!name) return;

	const confirm = await foundry.applications.api.DialogV2.confirm({
		window: { title: "Delete Preset" },
		content: `<p>Delete preset "${name}"?</p>`,
		modal: true,
	});
	if (!confirm) return;

	const presets = game.settings.get(MODULE_ID, "actionMenuPresets") || {};
	delete presets[name];
	await game.settings.set(MODULE_ID, "actionMenuPresets", presets);
	ui.notifications.info(`Action menu preset "${name}" deleted.`);
	await app.render();
};

export const onExportConfigPresetFile = (app, event, target) => {
	captureInputData(app, app.element);
	const cleanConfig = exportHudConfig(app.tempData);
	const json = JSON.stringify(cleanConfig, null, 2);
	saveDataToFile(json, "application/json", `niks-action-hud-config-${Date.now()}.json`);
};

export const onImportConfigPresetFile = async (app, event, target) => {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = ".json";
	input.onchange = async (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const text = await file.text();
			const imported = JSON.parse(text);
			loadHudConfig(app.tempData, imported);
			triggerPreview(app);
			ui.notifications.info("Configuration imported successfully.");
			await app.render();
		} catch (err) {
			console.error("Nik's Action HUD | Import error:", err);
			ui.notifications.error("Failed to parse imported configuration file.");
		}
	};
	input.click();
};

export const onExportTheme = async (app) => {
	captureInputData(app, app.element);
	const cleanConfig = exportHudConfig(app.tempData);
	await exportThemeZip(cleanConfig, `niks-action-hud-theme-${app.tempData.theme || "custom"}`);
};

export const onImportTheme = async (app) => {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = ".zip";
	input.onchange = async (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const imported = await importThemeZip(file);
			loadHudConfig(app.tempData, imported);
			triggerPreview(app);
			await app.render();
		} catch (err) {
			console.error("Nik's Action HUD | Theme zip import error:", err);
			ui.notifications.error(err.message || "Failed to import theme zip.");
		}
	};
	input.click();
};
