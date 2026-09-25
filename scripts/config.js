/**
 * Nik's Action HUD Configuration Dialog
 * Exclusively designed for Foundry V14.
 */

import { MODULE_ID } from "./constants.js";
import { getThemes } from "./config/constants.js";
import { prepareContext, initializeTempData } from "./config/context.js";
import { captureInputData } from "./config/capture.js";
import {
	bindNavigationListeners,
	bindInputLiveListeners,
	bindFilePickers,
	bindDragDrop,
} from "./config/listeners.js";
import {
	onSave,
	onSelectTheme,
	onSelectAnchor,
	onReset,
	onToggleCollapseCategory,
	onAddCategory,
	onRemoveCategory,
	onAddSubCategory,
	onRemoveSubCategory,
	onRemoveItem,
	onAddBtnFrameLayer,
	onRemoveBtnFrameLayer,
	onSaveConfigPreset,
	onLoadConfigPreset,
	onDeleteConfigPreset,
	onSaveActionMenuPreset,
	onLoadActionMenuPreset,
	onDeleteActionMenuPreset,
	onExportConfigPresetFile,
	onImportConfigPresetFile,
	onExportTheme,
	onImportTheme,
} from "./config/handlers.js";
import { switchTab } from "./config/helpers.js";
import { triggerPreview } from "./config/preview.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

let themes = null;

// Register required Handlebars helpers for icons and arrays
if (globalThis.Handlebars?.helpers?.raIconClass == null) {
	globalThis.Handlebars?.registerHelper("raIconClass", (iconClass) => {
		if (!iconClass) return "";
		const trimmed = String(iconClass).trim();
		if (trimmed.startsWith("ra-") && !trimmed.includes("ra ")) {
			return `ra ${trimmed}`;
		}
		return trimmed;
	});
}

if (globalThis.Handlebars?.helpers?.includes == null) {
	globalThis.Handlebars?.registerHelper("includes", (arr, value) => {
		return Array.isArray(arr) && arr.includes(value);
	});
}

if (globalThis.Handlebars?.helpers?.eq == null) {
	globalThis.Handlebars?.registerHelper("eq", (a, b) => a === b);
}

const CONFIG_TEMPLATES = [
	`modules/${MODULE_ID}/templates/config/main.hbs`,
	`modules/${MODULE_ID}/templates/config/tabs/general.hbs`,
	`modules/${MODULE_ID}/templates/config/tabs/appearance.hbs`,
	`modules/${MODULE_ID}/templates/config/tabs/menu-builder.hbs`,
	`modules/${MODULE_ID}/templates/config/tabs/presets.hbs`,
];

Hooks.once("init", () => {
	loadTemplates(CONFIG_TEMPLATES);
});

export class ActionHUDConfig extends HandlebarsApplicationMixin(ApplicationV2) {
	static get DEFAULT_OPTIONS() {
		return {
			tag: "form",
			id: "niks-action-config",
			classes: ["niks-action-config-app"],
			window: {
				title: "NIKS_ACTION_HUD.Config.Title",
				icon: "fas fa-cogs",
				resizable: true,
			},
			position: {
				width: 1060,
				height: 780,
			},
			actions: {
				save: ActionHUDConfig.prototype._onSave,
				selectTheme: ActionHUDConfig.prototype._onSelectTheme,
				selectAnchor: ActionHUDConfig.prototype._onSelectAnchor,
				reset: ActionHUDConfig.prototype._onReset,
				toggleCollapseCategory: ActionHUDConfig.prototype._onToggleCollapseCategory,
				addCategory: ActionHUDConfig.prototype._onAddCategory,
				removeCategory: ActionHUDConfig.prototype._onRemoveCategory,
				addSubCategory: ActionHUDConfig.prototype._onAddSubCategory,
				removeSubCategory: ActionHUDConfig.prototype._onRemoveSubCategory,
				removeItem: ActionHUDConfig.prototype._onRemoveItem,
				addBtnFrameLayer: ActionHUDConfig.prototype._onAddBtnFrameLayer,
				removeBtnFrameLayer: ActionHUDConfig.prototype._onRemoveBtnFrameLayer,
				saveConfigPreset: ActionHUDConfig.prototype._onSaveConfigPreset,
				loadConfigPreset: ActionHUDConfig.prototype._onLoadConfigPreset,
				deleteConfigPreset: ActionHUDConfig.prototype._onDeleteConfigPreset,
				saveActionMenuPreset: ActionHUDConfig.prototype._onSaveActionMenuPreset,
				loadActionMenuPreset: ActionHUDConfig.prototype._onLoadActionMenuPreset,
				deleteActionMenuPreset: ActionHUDConfig.prototype._onDeleteActionMenuPreset,
				exportConfigPresetFile: ActionHUDConfig.prototype._onExportConfigPresetFile,
				importConfigPresetFile: ActionHUDConfig.prototype._onImportConfigPresetFile,
				exportTheme: ActionHUDConfig.prototype._onExportTheme,
				importTheme: ActionHUDConfig.prototype._onImportTheme,
			},
		};
	}

	static PARTS = {
		main: {
			template: `modules/${MODULE_ID}/templates/config/main.hbs`,
		},
	};

	static get THEMES() {
		if (!themes) themes = getThemes();
		return themes;
	}

	get title() {
		return game.i18n?.has?.("NIKS_ACTION_HUD.Config.Title")
			? game.i18n.localize("NIKS_ACTION_HUD.Config.Title")
			: "Nik's Action HUD Configuration";
	}

	constructor(options = {}) {
		super(options);
		this.activeTab = "general";
		this.isSaving = false;
		this.isInitialized = false;
		this.tempData = {};
		this._collapsedMenuCategories = new WeakSet();
		this._collapsedAdapterCategories = new Set();
	}

	async _render(context, options) {
		await loadTemplates(CONFIG_TEMPLATES);
		return super._render(context, options);
	}

	async _prepareContext(options) {
		return prepareContext(this, options);
	}

	_initializeTempData(globalConfig) {
		initializeTempData(this, globalConfig);
	}

	_captureInputData(formElement) {
		captureInputData(this, formElement);
	}

	_switchTab(tabName, render = false) {
		switchTab(this, tabName, render);
	}

	_onRender(context, options) {
		super._onRender(context, options);

		bindNavigationListeners(this);
		bindInputLiveListeners(this);
		bindFilePickers(this);
		bindDragDrop(this);

		this._switchTab(this.activeTab, false);
		triggerPreview(this);
	}

	async close(options = {}) {
		if (!this.isSaving && window.ActionHUD?.actionMenu) {
			try {
				window.ActionHUD.actionMenu.refresh();
			} catch (e) {
				console.error("Nik's Action HUD | Error during refresh on close:", e);
			}
		}
		return super.close(options);
	}

	/* --- Action Delegations --- */
	async _onSave(event, target) { await onSave(this, event, target); }
	_onSelectTheme(event, target) { onSelectTheme(this, event, target); }
	_onSelectAnchor(event, target) { onSelectAnchor(this, event, target); }
	async _onReset(event, target) { await onReset(this, event, target); }
	_onToggleCollapseCategory(event, target) { onToggleCollapseCategory(this, event, target); }
	async _onAddCategory(event, target) { await onAddCategory(this, event, target); }
	async _onRemoveCategory(event, target) { await onRemoveCategory(this, event, target); }
	async _onAddSubCategory(event, target) { await onAddSubCategory(this, event, target); }
	async _onRemoveSubCategory(event, target) { await onRemoveSubCategory(this, event, target); }
	async _onRemoveItem(event, target) { await onRemoveItem(this, event, target); }
	async _onAddBtnFrameLayer(event, target) { await onAddBtnFrameLayer(this, event, target); }
	async _onRemoveBtnFrameLayer(event, target) { await onRemoveBtnFrameLayer(this, event, target); }
	async _onSaveConfigPreset(event, target) { await onSaveConfigPreset(this, event, target); }
	async _onLoadConfigPreset(event, target) { await onLoadConfigPreset(this, event, target); }
	async _onDeleteConfigPreset(event, target) { await onDeleteConfigPreset(this, event, target); }
	async _onSaveActionMenuPreset(event, target) { await onSaveActionMenuPreset(this, event, target); }
	async _onLoadActionMenuPreset(event, target) { await onLoadActionMenuPreset(this, event, target); }
	async _onDeleteActionMenuPreset(event, target) { await onDeleteActionMenuPreset(this, event, target); }
	_onExportConfigPresetFile(event, target) { onExportConfigPresetFile(this, event, target); }
	async _onImportConfigPresetFile(event, target) { await onImportConfigPresetFile(this, event, target); }
	async _onExportTheme(event, target) { await onExportTheme(this); }
	async _onImportTheme(event, target) { await onImportTheme(this); }
}
