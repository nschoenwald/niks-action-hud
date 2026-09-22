/* scripts/config.js */
import { MODULE_ID } from "./constants.js";
import { getThemes } from "./config/constants.js";
import {
	applyGlobalOverrides,
	calculateActorStyle,
	getActorAttributes,
	getCombinedAttributes,
	getDefaultStatusEffects,
	getDefaultStyle,
	getImageRules,
	getTrackableAttributes,
	initializeTempData,
	prepareActorList,
	prepareContext,
	prepareSelectableAttributes,
	prepareSystemEffects,
	prepareThemeList,
	prepareUiOptions,
} from "./config/context.js";
import {
	captureActorSettings,
	captureAttributes,
	captureGlobalSettings,
	captureInputData,
	captureMenuBuilder,
	captureStatusEffects,
	captureRules,
} from "./config/capture.js";
import {
	bindActorListListeners,
	bindAttributeLookups,
	bindDragDrop,
	bindEffectListeners,
	bindFilePickers,
	bindFontListeners,
	bindGlobalListeners,
	bindMenuListeners,
	bindMenuPreviewListeners,
	bindNavigationListeners,
	bindOptColorListeners,
	bindPresetListeners,
	bindStyleListeners,
	bindThemeListeners,
	bindTrackingListeners,
} from "./config/listeners.js";
import {
	onAddAttr,
	onAddCategory,
	onAddEffect,
	onAddRule,
	onAddPortraitVariant,
	onAddGlobalPortraitLayer,
	onAddActorPortraitLayer,
	onAddGlobalCardBgLayer,
	onAddActorCardBgLayer,
	onAddAMLayer,
	onAddBtnFrameLayer,
	onAddBadgeCondition,
	onAddQualitativeStage,
	onAddResourceThresholdStage,
	onAddSubCategory,
	onDeleteConfigPreset,
	onDeleteActionMenuPreset,
	onDrop,
	onEditLayout,
	onExportConfigPresetFile,
	onExportPreset,
	onExportTheme,
	onImportConfigPresetFile,
	onImportPreset,
	onImportTheme,
	onLoadConfigPreset,
	onLoadActionMenuPreset,
	onRemoveAttr,
	onRemoveBadgeCondition,
	onRemoveQualitativeStage,
	onRemoveResourceThresholdStage,
	onRemoveCategory,
	onRemoveEffect,
	onRemoveItem,
	onRemoveRule,
	onRemovePortraitVariant,
	onRemoveGlobalPortraitLayer,
	onRemoveActorPortraitLayer,
	onRemoveGlobalCardBgLayer,
	onRemoveActorCardBgLayer,
	onRemoveAMLayer,
	onRemoveBtnFrameLayer,
	onRemoveSubCategory,
	onReset,
	onSave,
	onSaveConfigPreset,
	onSaveActionMenuPreset,
	onSelectTarget,
	onToggleActor,
	onDeselectAllActors,
	onReorderRosterActor,
	onSaveActorPreset,
	onApplyActorPresetClick,
	onDeleteActorPreset,
	onSaveActorGroup,
	onLoadActorGroup,
	onRenameActorGroup,
	onDeleteActorGroup,
} from "./config/handlers.js";
import {
	switchTab,
	tryAutoLabel,
	updateGlobalLabel,
	updateInputIfEmpty,
} from "./config/helpers.js";
import { triggerPreview, triggerPreviewGlobal } from "./config/preview.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
let themes = null;

const ensureRaIconClass = (iconClass) => {
	if (!iconClass) return "";
	const trimmed = iconClass.trim();
	if (trimmed.startsWith("ra-") && !trimmed.includes("ra ")) {
		return `ra ${trimmed}`;
	}
	return trimmed;
};

if (globalThis.Handlebars?.helpers?.raIconClass == null) {
	globalThis.Handlebars?.registerHelper("raIconClass", ensureRaIconClass);
}

if (globalThis.Handlebars?.helpers?.includes == null) {
	globalThis.Handlebars?.registerHelper("includes", (arr, value) => {
		return Array.isArray(arr) && arr.includes(value);
	});
}

if (globalThis.Handlebars?.helpers?.join == null) {
	globalThis.Handlebars?.registerHelper("join", (arr, separator) => {
		return Array.isArray(arr) ? arr.join(separator) : "";
	});
}

export class ActionHUDConfig extends HandlebarsApplicationMixin(
	ApplicationV2,
) {
	static get DEFAULT_OPTIONS() {
		return {
			tag: "form",
			id: "niks-action-config",
			window: {
				title: game.i18n.localize("NIKS_ACTION_HUD.Settings.ActionConfig.Title") || game.i18n.localize("IBHUD.Config.Title"),
				icon: "fas fa-cogs",
				resizable: true,
				width: 950,
				height: 750,
			},
			position: { width: 950, height: 750 },
			actions: {
				addAttr: ActionHUDConfig.prototype._onAddAttr,
				removeAttr: ActionHUDConfig.prototype._onRemoveAttr,
				save: ActionHUDConfig.prototype._onSave,
				selectTarget: ActionHUDConfig.prototype._onSelectTarget,
				toggleActor: ActionHUDConfig.prototype._onToggleActor,
				deselectAllActors: ActionHUDConfig.prototype._onDeselectAllActors,
				reorderRosterActor: ActionHUDConfig.prototype._onReorderRosterActor,
				editLayout: ActionHUDConfig.prototype._onEditLayout,
				reset: ActionHUDConfig.prototype._onReset,
				addRule: ActionHUDConfig.prototype._onAddRule,
				addPortraitVariant: ActionHUDConfig.prototype._onAddPortraitVariant,
				addGlobalPortraitLayer: ActionHUDConfig.prototype._onAddGlobalPortraitLayer,
				addActorPortraitLayer: ActionHUDConfig.prototype._onAddActorPortraitLayer,
				addGlobalCardBgLayer: ActionHUDConfig.prototype._onAddGlobalCardBgLayer,
				addActorCardBgLayer: ActionHUDConfig.prototype._onAddActorCardBgLayer,
				removeRule: ActionHUDConfig.prototype._onRemoveRule,
				removePortraitVariant: ActionHUDConfig.prototype._onRemovePortraitVariant,
				removeGlobalPortraitLayer: ActionHUDConfig.prototype._onRemoveGlobalPortraitLayer,
				removeActorPortraitLayer: ActionHUDConfig.prototype._onRemoveActorPortraitLayer,
				removeGlobalCardBgLayer: ActionHUDConfig.prototype._onRemoveGlobalCardBgLayer,
				removeActorCardBgLayer: ActionHUDConfig.prototype._onRemoveActorCardBgLayer,
				addAMLayer: ActionHUDConfig.prototype._onAddAMLayer,
				removeAMLayer: ActionHUDConfig.prototype._onRemoveAMLayer,
				addBtnFrameLayer: ActionHUDConfig.prototype._onAddBtnFrameLayer,
				removeBtnFrameLayer: ActionHUDConfig.prototype._onRemoveBtnFrameLayer,
				addBadgeCondition: ActionHUDConfig.prototype._onAddBadgeCondition,
				removeBadgeCondition: ActionHUDConfig.prototype._onRemoveBadgeCondition,
				addQualitativeStage: ActionHUDConfig.prototype._onAddQualitativeStage,
				removeQualitativeStage: ActionHUDConfig.prototype._onRemoveQualitativeStage,
				addResourceThresholdStage: ActionHUDConfig.prototype._onAddResourceThresholdStage,
				removeResourceThresholdStage: ActionHUDConfig.prototype._onRemoveResourceThresholdStage,
				addEffect: ActionHUDConfig.prototype._onAddEffect,
				removeEffect: ActionHUDConfig.prototype._onRemoveEffect,
				addCategory: ActionHUDConfig.prototype._onAddCategory,
				removeCategory: ActionHUDConfig.prototype._onRemoveCategory,
				addSubCategory: ActionHUDConfig.prototype._onAddSubCategory,
				removeSubCategory: ActionHUDConfig.prototype._onRemoveSubCategory,
				removeItem: ActionHUDConfig.prototype._onRemoveItem,
				exportPreset: ActionHUDConfig.prototype._onExportPreset,
				importPreset: ActionHUDConfig.prototype._onImportPreset,
				exportTheme: ActionHUDConfig.prototype._onExportTheme,
				importTheme: ActionHUDConfig.prototype._onImportTheme,
				saveConfigPreset: ActionHUDConfig.prototype._onSaveConfigPreset,
				loadConfigPreset: ActionHUDConfig.prototype._onLoadConfigPreset,
				deleteConfigPreset: ActionHUDConfig.prototype._onDeleteConfigPreset,
				saveActionMenuPreset: ActionHUDConfig.prototype._onSaveActionMenuPreset,
				loadActionMenuPreset: ActionHUDConfig.prototype._onLoadActionMenuPreset,
				deleteActionMenuPreset: ActionHUDConfig.prototype._onDeleteActionMenuPreset,
				exportConfigPresetFile: ActionHUDConfig.prototype._onExportConfigPresetFile,
				importConfigPresetFile: ActionHUDConfig.prototype._onImportConfigPresetFile,
				saveActorPreset: ActionHUDConfig.prototype._onSaveActorPreset,
				applyActorPreset: ActionHUDConfig.prototype._onApplyActorPreset,
				deleteActorPreset: ActionHUDConfig.prototype._onDeleteActorPreset,
				saveActorGroup: ActionHUDConfig.prototype._onSaveActorGroup,
				loadActorGroup: ActionHUDConfig.prototype._onLoadActorGroup,
				renameActorGroup: ActionHUDConfig.prototype._onRenameActorGroup,
				deleteActorGroup: ActionHUDConfig.prototype._onDeleteActorGroup,
			},
		};
	}

	static PARTS = {
		content: { template: `modules/${MODULE_ID}/templates/config.hbs` },
	};

	static get THEMES() {
		if (!themes) themes = getThemes();
		return themes;
	}

	constructor(options = {}) {
		super(options);
		this.currentEditId = "global";
		this.activeTab = "actionmenu";
		this.isSaving = false;
		this.actorListTab = "all";
		this.actorSearchQuery = "";
		this.actorListPage = 0;
		this.actorListPageSize = 20;

		this.tempData = {
			actors: [],
			globalAttributes: [],
			actorAttributes: {},
			theme: "rift",
			actorSettings: {},
			globalGap: 10,
			globalPos: { bottom: 50, left: 10, unit: "px" },
			globalScale: 1.0,
			actionMenuPos: { anchorX: "right", anchorY: "bottom", offsetX: 40, offsetY: 40 },
			layoutMode: "stack",
			imageRules: {}, // { actorId: [ { path, threshold, img, scale, x, y }, ... ] }
			customMenu: [], // Menu structure: [{ label, icon, tabs: [{ label, items: [] }] }]
		};
		this.isInitialized = false;
		this._previewTimer = null;
		this._previewGlobalTimer = null;
		this._collapsedMenuCategories = new WeakSet();
		this._collapsedAdapterCategories = new Set();
	}

	async _prepareContext(options) {
		return prepareContext(this, options);
	}

	/**
	 * Helper: Load System Status Effects
	 */
	_prepareSystemEffects() {
		return prepareSystemEffects();
	}

	/**
	 * Helper: Prepare UI Options (Blend modes, etc)
	 */
	_prepareUiOptions() {
		return prepareUiOptions();
	}

	/* ----------------------------------------------------------
	   Helpers
	   ---------------------------------------------------------- */

	// Helper: Get Default Status Effects
	_getDefaultStatusEffects() {
		return getDefaultStatusEffects();
	}

	/**
	 * Initialize Temporary Data
	 */
	_initializeTempData(globalConfig, clientPos) {
		initializeTempData(this, globalConfig, clientPos);
	}

	/**
	 * Prepare Actor List for Sidebar
	 */
	_prepareActorList() {
		return prepareActorList(this);
	}

	/**
	 * Get attributes for specific actor
	 */
	_getActorAttributes(actorId) {
		return getActorAttributes(this, actorId);
	}

	/**
	 * Get image rules for specific actor
	 */
	_getImageRules(actorId) {
		return getImageRules(this, actorId);
	}

	/**
	 * Calculate Actor Style
	 */
	_calculateActorStyle(actorId, clientPos, globalConfig) {
		return calculateActorStyle(this, actorId, clientPos, globalConfig);
	}

	/**
	 * Helper: Combine attributes from multiple actors
	 */
	_getCombinedAttributes(actors) {
		return getCombinedAttributes(this, actors);
	}

	/**
	 * Get Default Style Object
	 */
	_getDefaultStyle() {
		return getDefaultStyle();
	}

	/**
	 * Prepare Selectable Attributes (for Dropdown)
	 */
	_prepareSelectableAttributes(isGlobal) {
		return prepareSelectableAttributes(this, isGlobal);
	}

	/**
	 * Prepare Theme List
	 */
	_prepareThemeList() {
		return prepareThemeList(this);
	}

	/**
	 * Apply Global Overrides
	 */
	_applyGlobalOverrides(clientPos) {
		applyGlobalOverrides(this, clientPos);
	}

	async render(options = {}, _options = {}) {
		const menuRole =
			game.settings.get(MODULE_ID, "menuConfigRole") ?? 4;
		const styleRole =
			game.settings.get(MODULE_ID, "styleConfigRole") ?? 4;
		const hasPermission =
			game.user.role >= menuRole || game.user.role >= styleRole;

		if (!hasPermission) {
			ui.notifications.error(game.i18n.localize("IBHUD.UI.NoPermission"));
			return;
		}

		const activePanel = this.element?.querySelector?.(".tab-content.active");
		if (activePanel) {
			this._savedScrollTop = activePanel.scrollTop;
		}

		return super.render(options, _options);
	}

	async _render(context, options) {
		return super._render(context, options);
	}

	_onRender(context, options) {
		super._onRender(context, options);

		this._bindThemeListeners();
		this._bindFontListeners();
		this._bindGlobalListeners();
		this._bindStyleListeners();
		this._bindFilePickers();
		this._bindNavigationListeners();
		this._bindAttributeLookups();
		this._bindTrackingListeners();
		this._bindDragDrop();
		this._bindMenuListeners();
		this._bindMenuPreviewListeners();
		this._bindActorListListeners();
		this._bindPresetListeners();
		this._bindOptColorListeners();
		this._switchTab(this.activeTab, false);
		this._bindEffectListeners();

		if (this._savedScrollTop != null) {
			const activePanel = this.element?.querySelector?.(".tab-content.active");
			if (activePanel) {
				activePanel.scrollTop = this._savedScrollTop;
			}
			this._savedScrollTop = null;
		}
	}

	/* ----------------------------------------------------------
	   Event Listeners
	   ---------------------------------------------------------- */

	/**
	 * Bind Theme Listeners
	 */
	_bindThemeListeners() {
		bindThemeListeners(this);
	}

	/**
	 * Bind Font Listeners
	 */
	_bindFontListeners() {
		bindFontListeners(this);
	}

	/**
	 * Bind Effect Listeners
	 */
	_bindEffectListeners() {
		bindEffectListeners(this);
	}

	_bindOptColorListeners() {
		bindOptColorListeners(this);
	}

	/**
	 * Bind Global Listeners
	 */
	_bindGlobalListeners() {
		bindGlobalListeners(this);
	}

	/**
	 * Bind Style Listeners
	 */
	_bindStyleListeners() {
		bindStyleListeners(this);
	}

	/**
	 * Bind File Pickers
	 */
	_bindFilePickers() {
		bindFilePickers(this);
	}

	/**
	 * Bind Navigation Tabs
	 */
	_bindNavigationListeners() {
		bindNavigationListeners(this);
	}

	/**
	 * Bind Tracking Listeners
	 */
	_bindTrackingListeners() {
		bindTrackingListeners(this);
	}

	/**
	 * [Tracking] Binds attribute lookup dropdowns to their corresponding inputs.
	 * Handles both value paths (.attr-lookup) and max paths (.attr-lookup-max).
	 */
	_bindAttributeLookups() {
		bindAttributeLookups(this);
	}

	/**
	 * Helper: Auto-label based on path
	 */
	_tryAutoLabel(pathInput, pathValue, sourceText = null) {
		tryAutoLabel(this, pathInput, pathValue, sourceText);
	}



	// Helper: Update input if empty
	_updateInputIfEmpty(name, value) {
		updateInputIfEmpty(this, name, value);
	}

	// Helper: Switch Tab
	_switchTab(tabName, render = true) {
		switchTab(this, tabName, render);
	}

	/**
	 * Trigger Preview
	 * @param {Number|null} focusedIndex Index of rule being edited
	 */
	_triggerPreview(focusedIndex = null) {
		cancelAnimationFrame(this._previewTimer);
		this._previewTimer = requestAnimationFrame(() => {
			triggerPreview(this, focusedIndex);
		});
	}

	/**
	 * Trigger Global Preview
	 * @param {Number|null} focusedEffectIndex Index of effect being edited
	 */
	_triggerPreviewGlobal(focusedEffectIndex = null) {
		cancelAnimationFrame(this._previewGlobalTimer);
		this._previewGlobalTimer = requestAnimationFrame(() => {
			triggerPreviewGlobal(this, focusedEffectIndex);
		});
	}

	/**
	 * Capture Input Data to TempData
	 */
	_captureInputData(formElement) {
		captureInputData(this, formElement);
	}

	/* ----------------------------------------------------------
	   Data Capture Helpers
	   ---------------------------------------------------------- */

	/**
	 * Helper: Capture Attributes
	 */
	_captureAttributes(formData, isGlobal) {
		captureAttributes(this, formData, isGlobal);
	}

	/**
	 * Helper: Capture Global Settings
	 */
	_captureGlobalSettings(formData, isGM) {
		captureGlobalSettings(this, formData, isGM);
	}

	/**
	 * Helper: Capture Status Effects
	 */
	_captureStatusEffects(form) {
		captureStatusEffects(this, form);
	}

	/**
	 * Helper: Capture Menu Builder Data
	 */
	_captureMenuBuilder(formData) {
		captureMenuBuilder(this, formData);
	}

	/**
	 * Helper: Capture Rules
	 */
	_captureRules(formData) {
		captureRules(this, formData);
	}

	/**
	 * Helper: Capture Actor Settings
	 */
	_captureActorSettings(formData) {
		captureActorSettings(this, formData);
	}

	/* --- Actions --- */
	_onToggleActor(event, target) {
		onToggleActor(this, event, target);
	}

	_onDeselectAllActors(event, target) {
		onDeselectAllActors(this, event, target);
	}

	_onReorderRosterActor(event, target) {
		onReorderRosterActor(this, event, target);
	}

	_onSelectTarget(event, target) {
		onSelectTarget(this, event, target);
	}

	_onAddAttr(event, target) {
		onAddAttr(this, event, target);
	}

	_onRemoveAttr(event, target) {
		onRemoveAttr(this, event, target);
	}

	_onAddRule(event, target) {
		onAddRule(this, event, target);
	}

	_onRemoveRule(event, target) {
		onRemoveRule(this, event, target);
	}

	_onAddBadgeCondition(event, target) {
		onAddBadgeCondition(this, event, target);
	}

	_onRemoveBadgeCondition(event, target) {
		onRemoveBadgeCondition(this, event, target);
	}

	_onAddQualitativeStage(event, target) {
		onAddQualitativeStage(this, event, target);
	}

	_onRemoveQualitativeStage(event, target) {
		onRemoveQualitativeStage(this, event, target);
	}

	_onAddResourceThresholdStage(event, target) {
		onAddResourceThresholdStage(this, event, target);
	}

	_onRemoveResourceThresholdStage(event, target) {
		onRemoveResourceThresholdStage(this, event, target);
	}

	_onAddPortraitVariant(event, target) {
		onAddPortraitVariant(this, event, target);
	}

	_onRemovePortraitVariant(event, target) {
		onRemovePortraitVariant(this, event, target);
	}

	_onAddGlobalPortraitLayer(event, target) {
		onAddGlobalPortraitLayer(this, event, target);
	}

	_onRemoveGlobalPortraitLayer(event, target) {
		onRemoveGlobalPortraitLayer(this, event, target);
	}

	_onAddActorPortraitLayer(event, target) {
		onAddActorPortraitLayer(this, event, target);
	}

	_onRemoveActorPortraitLayer(event, target) {
		onRemoveActorPortraitLayer(this, event, target);
	}

	_onAddGlobalCardBgLayer(event, target) {
		onAddGlobalCardBgLayer(this, event, target);
	}

	_onRemoveGlobalCardBgLayer(event, target) {
		onRemoveGlobalCardBgLayer(this, event, target);
	}

	_onAddActorCardBgLayer(event, target) {
		onAddActorCardBgLayer(this, event, target);
	}

	_onRemoveActorCardBgLayer(event, target) {
		onRemoveActorCardBgLayer(this, event, target);
	}

	_onAddAMLayer(event, target) {
		onAddAMLayer(this, event, target);
	}

	_onRemoveAMLayer(event, target) {
		onRemoveAMLayer(this, event, target);
	}

	_onAddBtnFrameLayer(event, target) {
		onAddBtnFrameLayer(this, event, target);
	}

	_onRemoveBtnFrameLayer(event, target) {
		onRemoveBtnFrameLayer(this, event, target);
	}

	/**
	 * Ensure consistency when closing
	 */
	async close(options = {}) {
		cancelAnimationFrame(this._previewTimer);
		cancelAnimationFrame(this._previewGlobalTimer);
		cancelAnimationFrame(this._menuLivePreviewTimer);

		if (this._attrDropdownClickHandler) {
			document.removeEventListener("click", this._attrDropdownClickHandler);
			this._attrDropdownClickHandler = null;
		}
		document.querySelectorAll(".attr-dropdown-menu").forEach((m) => {
			m.remove();
		});

		if (!this.isSaving) {
			if (window.ActionHUD?.actionMenu) {
				try {
					window.ActionHUD.actionMenu.render();
				} catch (e) {
					console.error("Action HUD | Error during refresh:", e);
				}
			}
			if (window.ActionHUD.actionMenu) {
				window.ActionHUD.actionMenu.refresh();
			}
		}

		return super.close(options);
	}

	async _onSave(event, target) {
		await onSave(this, event, target);
	}

	async _onSaveConfigPreset(event, target) { await onSaveConfigPreset(this, event, target); }
	async _onLoadConfigPreset(event, target) { await onLoadConfigPreset(this, event, target); }
	async _onDeleteConfigPreset(event, target) { await onDeleteConfigPreset(this, event, target); }
	async _onSaveActionMenuPreset(event, target) { await onSaveActionMenuPreset(this, event, target); }
	async _onLoadActionMenuPreset(event, target) { await onLoadActionMenuPreset(this, event, target); }
	async _onDeleteActionMenuPreset(event, target) { await onDeleteActionMenuPreset(this, event, target); }
	_onExportConfigPresetFile(event, target) { onExportConfigPresetFile(this, event, target); }
	async _onImportConfigPresetFile(event, target) { await onImportConfigPresetFile(this, event, target); }

	_getTrackableAttributes(actor) {
		return getTrackableAttributes(actor);
	}

	_updateGlobalLabel(target) {
		updateGlobalLabel(this, target);
	}

	async _onEditLayout(event, target) {
		await onEditLayout(this, event, target);
	}

	async _onReset(event, target) {
		await onReset(this, event, target);
	}

	_onAddEffect() {
		onAddEffect(this);
	}

	_onRemoveEffect(event, target) {
		onRemoveEffect(this, event, target);
	}

	/* --- Actions: Menu Builder --- */

	_onAddCategory(event, target) {
		onAddCategory(this, event, target);
	}

	_onRemoveCategory(event, target) {
		onRemoveCategory(this, event, target);
	}

	_onAddSubCategory(event, target) {
		onAddSubCategory(this, event, target);
	}

	_onRemoveSubCategory(event, target) {
		onRemoveSubCategory(this, event, target);
	}

	_onRemoveItem(event, target) {
		onRemoveItem(this, event, target);
	}

	/**
	 * Bind Drag Drop Listeners
	 */
	_bindDragDrop() {
		bindDragDrop(this);
	}

	/**
	 * Handle Drop
	 */
	async _onDrop(event, targetZone) {
		await onDrop(this, event, targetZone);
	}

	/**
	 * Bind Menu Listeners
	 */
	_bindMenuListeners() {
		bindMenuListeners(this);
	}

	/**
	 * Bind Menu Preview Listeners
	 */
	_bindMenuPreviewListeners() {
		bindMenuPreviewListeners(this);
	}

	_bindActorListListeners() {
		bindActorListListeners(this);
	}

	_bindPresetListeners() {
		bindPresetListeners(this);
	}

	async _onExportPreset(event, target) {
		await onExportPreset(this, event, target);
	}

	async _onImportPreset(event, target) {
		await onImportPreset(this, event, target);
	}

	async _onExportTheme(event, target) {
		await onExportTheme(this);
	}

	async _onImportTheme(event, target) {
		await onImportTheme(this);
	}

	async _onSaveActorPreset(event, target) {
		await onSaveActorPreset(this, event, target);
	}

	async _onApplyActorPreset(event, target) {
		await onApplyActorPresetClick(this, event, target);
	}

	async _onDeleteActorPreset(event, target) {
		await onDeleteActorPreset(this, event, target);
	}

	async _onSaveActorGroup(event, target) { await onSaveActorGroup(this, event, target); }
	_onLoadActorGroup(event, target) { onLoadActorGroup(this, event, target); }
	async _onRenameActorGroup(event, target) { await onRenameActorGroup(this, event, target); }
	_onDeleteActorGroup(event, target) { onDeleteActorGroup(this, event, target); }
}


