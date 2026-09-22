import { MODULE_ID } from "../constants.js";
import {
	createAdapterPlacementForGap,
	insertCategoriesByAnchors,
	normalizeAdapterPlacement,
} from "../features/action-menu/category-placement.js";
import {
	getAdapterCategoryAppearance,
	getAdapterCategoryOverride,
	mergeAdapterCategoryAppearance,
} from "../features/action-menu/adapter-category-overrides.js";
import { defaultRegistry } from "../systems/defaults.js";
import { adapterRegistry } from "../systems/registry.js";
import { ActorPresetManager } from "./preset-manager.js";
import { coerceNullableNumber, getAMElementContext, getGlobalImageContext, getGlobalMenuBehaviorContext, getGlobalScaleContext, getGlobalSimpleContext, getGlobalThemeFontLayoutContext, injectContentMarker, loadAMElementData, loadExcludedActorTypes, loadGlobalImageFields, loadGlobalMenuBehaviorFields, loadGlobalResponsiveFields, loadGlobalScaleFields, loadGlobalSimpleFields, loadGlobalThemeFontLayoutFields, mergeEffectsWithDefaults, resolveActorPositionFields, resolveActorSizeFields, resolveAttributeLinkedBarContext, resolveAttributeQualitativeStages, resolveAttributeResourceThresholdStages, resolveLayerContext } from "./schema.js";

const resolveMenuPreviewActor = (app, targetActors, menuActors) => {
	const explicitActor = app.menuPreviewActorId
		? game.actors?.get(app.menuPreviewActorId)
		: null;
	const controlledActor = globalThis.canvas?.tokens?.controlled?.[0]?.actor || null;
	const fallbackActor = targetActors[0]
		|| (menuActors[0]?.id ? game.actors?.get(menuActors[0].id) : null)
		|| game.actors?.contents?.[0]
		|| null;
	return explicitActor || controlledActor || fallbackActor;
};

const localizeAdapterCategoryLabel = (category) => {
	const label = category?.label || category?.name || category?.id || "";
	return typeof label === "string" ? game.i18n.localize(label) : String(label);
};

const prepareExternalAdapterMenu = async (
	app,
	adapter,
	targetActors,
	menuActors,
	actorTypes,
	enabled,
) => {
	app._adapterCategoryEditorRows = [];
	const emptyPreview = {
		hasExternalAdapterMenu: false,
		adapterMenuPreviewAvailable: false,
		menuPreviewActors: [],
		menuPreviewActorId: "",
		adapterRowsBefore: [],
		adapterMenuTrailingRows: [],
	};
	if (!enabled) return emptyPreview;

	const activeEntry = adapterRegistry.resolveAdapterEntry(game.system.id, {
		system: game.system,
		modules: game.modules,
	});
	if (!activeEntry || activeEntry.source === MODULE_ID) return emptyPreview;

	const previewActor = resolveMenuPreviewActor(app, targetActors, menuActors);
	if (previewActor?.id) app.menuPreviewActorId = previewActor.id;
	const actorChoices = [...menuActors];
	if (previewActor && !actorChoices.some((actor) => actor.id === previewActor.id)) {
		actorChoices.push({
			id: previewActor.id,
			name: previewActor.name,
			type: previewActor.type,
			img: previewActor.img,
		});
	}
	const menuPreviewActors = actorChoices.map((actor) => ({
		...actor,
		selected: actor.id === previewActor?.id,
	}));

	const preview = {
		...emptyPreview,
		hasExternalAdapterMenu: true,
		menuPreviewActors,
		menuPreviewActorId: previewActor?.id || "",
	};
	if (!previewActor || typeof adapter?.getActionCategories !== "function") {
		return preview;
	}

	let suppliedCategories = [];
	try {
		const result = await Promise.resolve(adapter.getActionCategories(previewActor));
		suppliedCategories = Array.isArray(result) ? result : [];
	} catch (error) {
		console.warn(
			"Nik's Action HUD | Could not preview external adapter categories:",
			error,
		);
		return preview;
	}

	const seenIds = new Set();
	const rawAdapterRows = suppliedCategories
		.filter(Boolean)
		.map((category) => {
			const id = String(category.id || "").trim();
			if (!id || seenIds.has(id)) return null;
			seenIds.add(id);
			return {
				...category,
				id,
				label: localizeAdapterCategoryLabel(category),
			};
		})
		.filter(Boolean);
	const adapterRows = rawAdapterRows.map((category, index) => {
		const baseAppearance = getAdapterCategoryAppearance(category);
		const override = getAdapterCategoryOverride(
			app.tempData.adapterCategoryOverrides,
			category.id,
		);
		const appearance = mergeAdapterCategoryAppearance(baseAppearance, override);
		const visibility = appearance.visibility;
		const actorIds = visibility.actorIds || [];
		const actorTypeIds = visibility.actorTypes || [];
		const buttonFrameLayers = (appearance.buttonFrameLayers || [])
			.slice()
			.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

		return {
			id: category.id,
			kind: "adapter",
			_adapterId: category.id,
			_adapterIndex: index,
			_collapsed: app._collapsedAdapterCategories?.has(category.id) || false,
			...appearance,
			_buttonFrameLayers: injectContentMarker(buttonFrameLayers, 50),
			visibility: {
				...visibility,
				_resolvedActors: actorIds.map((id) => {
					const actor = game.actors?.get(id);
					return { id, name: actor?.name || id, img: actor?.img || "" };
				}),
				_allActorTypes: actorTypes.map((type) => ({
					value: type,
					label: type.charAt(0).toUpperCase() + type.slice(1),
					checked: actorTypeIds.includes(type),
				})),
				_menuActors: menuActors,
			},
			_baseAppearance: baseAppearance,
		};
	});
	app._adapterCategoryEditorRows = adapterRows.map((row) => ({
		id: row._adapterId,
		index: row._adapterIndex,
		base: row._baseAppearance,
		effective: getAdapterCategoryAppearance(row),
		source: rawAdapterRows[row._adapterIndex],
	}));

	for (const category of app.tempData.customMenu || []) {
		if (category.systemId) {
			delete category.adapterPlacement;
			delete category.adapterInsertPosition;
			continue;
		}

		let placement = normalizeAdapterPlacement(category.adapterPlacement);
		const legacyPosition = Number(category.adapterInsertPosition);
		if (
			!placement
			&& Number.isInteger(legacyPosition)
			&& legacyPosition >= 1
		) {
			placement = createAdapterPlacementForGap(
				adapterRows,
				legacyPosition - 1,
			);
		}

		if (placement) category.adapterPlacement = placement;
		else delete category.adapterPlacement;
		delete category.adapterInsertPosition;
	}

	const menuEntries = (app.tempData.customMenu || []).map((category, order) => ({
		category: { kind: "category", category },
		placement: category.systemId ? null : category.adapterPlacement,
		order,
	}));
	const mergedRows = insertCategoriesByAnchors(adapterRows, menuEntries);
	const orderedCategories = mergedRows
		.filter((row) => row.kind === "category")
		.map((row) => row.category);
	if (orderedCategories.length === (app.tempData.customMenu || []).length) {
		app.tempData.customMenu = orderedCategories;
	}

	const adapterRowsBefore = [];
	let pendingAdapterRows = [];
	for (const row of mergedRows) {
		if (row.kind === "adapter") {
			pendingAdapterRows.push(row);
			continue;
		}
		adapterRowsBefore.push(pendingAdapterRows);
		pendingAdapterRows = [];
	}

	return {
		...preview,
		adapterMenuPreviewAvailable: adapterRows.length > 0,
		adapterRowsBefore,
		adapterMenuTrailingRows: pendingAdapterRows,
	};
};

export const prepareContext = async (app, options) => {
	const globalConfig =
		game.settings.get(MODULE_ID, "configuration") || {};
	const clientPos =
		game.settings.get(MODULE_ID, "clientPositions") || {};

	if (!app.isInitialized) {
		app._initializeTempData(globalConfig, clientPos);
	}

	const isGM = game.user.isGM;
	const isGlobal = app.currentEditId === "global";
	const styleRole = game.settings.get(MODULE_ID, "styleConfigRole") ?? 4;
	const menuRole = game.settings.get(MODULE_ID, "menuConfigRole") ?? 4;
	const canEditTracking = game.user.role >= styleRole;
	const canEditStyle = game.user.role >= styleRole;
	const canEditMenu = game.user.role >= menuRole;
	const canEditEffects = isGM;

	if (isGlobal && !isGM) {
		app._applyGlobalOverrides(clientPos);
	}

	let currentAttributes = [];
	let currentStyle = app._getDefaultStyle();
	let currentImageRules = [];
	let editLabel = game.i18n.localize("IBHUD.Config.GlobalSettings");
	let targetActors = [];
	let displayNameOverride = "";
	let portraitVariants = [];

	if (isGlobal) {
		currentAttributes = app.tempData.globalAttributes;

		if (app.tempData.actors && app.tempData.actors.length > 0) {
			targetActors = app.tempData.actors
				.map((id) => game.actors.get(id))
				.filter((actor) => actor);
		}

		if (targetActors.length === 0) {
			targetActors = game.actors.filter((actor) => actor.hasPlayerOwner);
		}
	} else {
		const actor = game.actors.get(app.currentEditId);
		if (actor) {
			editLabel = actor.name;
			targetActors = [actor];
			currentAttributes = app._getActorAttributes(app.currentEditId);
			currentStyle = app._calculateActorStyle(
				app.currentEditId,
				clientPos,
				globalConfig,
			);
			currentImageRules = app._getImageRules(app.currentEditId);
			displayNameOverride =
				app.tempData.actorSettings?.[app.currentEditId]?.displayName ||
				actor.name;
		const rawVariants = app.tempData.actorSettings?.[app.currentEditId]?.portraitVariants || [];
		const activeVariantId = app.tempData.actorSettings?.[app.currentEditId]?.activePortraitVariantId || rawVariants[0]?.id || null;
		const voiceVariantId = app.tempData.actorSettings?.[app.currentEditId]?.voicePortraitVariantId || null;
		portraitVariants = rawVariants.map((variant) => ({
			...variant,
			isActive: variant.id === activeVariantId,
			isVoice: variant.id === voiceVariantId,
		}));
	}
}

	const actorListData = { actors: [], pagination: {}, tabs: [], searchQuery: "" };
	const selectedRosterActors = [];
	const selectableAttributes = [];
	const availableAttributes = [];
	currentAttributes = [];
	const themeList = app._prepareThemeList();
	const fontList = prepareFontList();
	const amPos = app.tempData.actionMenuPos || { anchorX: "right", anchorY: "bottom", offsetX: 40, offsetY: 40 };

	const excludedTypesArray = (app.tempData.excludedActorTypes || "").split(",").map(t => t.trim());
	let actorTypes = [];
	if (Array.isArray(game.system.documentTypes.Actor)) {
		actorTypes = game.system.documentTypes.Actor;
	} else if (game.system.documentTypes.Actor && typeof game.system.documentTypes.Actor === "object") {
		actorTypes = Object.keys(game.system.documentTypes.Actor);
	}

	const allActorTypes = actorTypes.map(type => ({
		value: type,
		label: type.charAt(0).toUpperCase() + type.slice(1),
		checked: excludedTypesArray.includes(type)
	}));

	const menuActors = (game.actors?.contents || [])
		.filter(a => a.hasPlayerOwner || game.user.isGM)
		.map(a => ({ id: a.id, name: a.name, type: a.type, img: a.img }))
		.sort((a, b) => a.name.localeCompare(b.name));
	const adapterMenuPreview = await prepareExternalAdapterMenu(
		app,
		adapter,
		targetActors,
		menuActors,
		actorTypes,
		isGlobal && canEditMenu,
	);

	const enrichedCustomMenu = (app.tempData.customMenu || []).map((cat, index) => {
		const vis = cat.visibility || { mode: "all", actorTypes: [], actorIds: [] };
		const catActorTypes = vis.actorTypes || [];
		const resolvedActors = (vis.actorIds || []).map(id => {
			const actor = game.actors?.get(id);
			return { id, name: actor?.name || id, img: actor?.img || "" };
		});
		const perCatActorTypes = actorTypes.map(type => ({
			value: type,
			label: type.charAt(0).toUpperCase() + type.slice(1),
			checked: catActorTypes.includes(type),
		}));
		const btnFrameSorted = (cat.buttonFrameLayers || []).slice().sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
		const enrichedTabs = (cat.tabs || []).map(tab => {
			const tVis = tab.visibility || { mode: "all", actorTypes: [], actorIds: [] };
			const tActorTypes = tVis.actorTypes || [];
			const tResolvedActors = (tVis.actorIds || []).map(id => {
				const actor = game.actors?.get(id);
				return { id, name: actor?.name || id, img: actor?.img || "" };
			});
			return {
				...tab,
				visibility: {
					...tVis,
					actorTypes: tActorTypes,
					actorIds: tVis.actorIds || [],
					_resolvedActors: tResolvedActors,
					_allActorTypes: actorTypes.map(type => ({ value: type, label: type.charAt(0).toUpperCase() + type.slice(1), checked: tActorTypes.includes(type) })),
					_menuActors: menuActors,
				},
			};
		});
		return {
			...cat,
			_collapsed: app._collapsedMenuCategories?.has(cat) || false,
			_adapterRowsBefore: adapterMenuPreview.adapterRowsBefore[index] || [],
			tabs: enrichedTabs,
			_buttonFrameLayers: injectContentMarker(btnFrameSorted, 50),
			buttonFrameColor: cat.buttonFrameColor || "",
			visibility: {
				...vis,
				actorTypes: catActorTypes,
				actorIds: vis.actorIds || [],
				_resolvedActors: resolvedActors,
				_allActorTypes: perCatActorTypes,
				_menuActors: menuActors,
			},
		};
	});

	if (!canEditTracking && (canEditStyle || canEditMenu) && app.activeTab === "tracking") {
		app.activeTab = "card";
	}
	if (!canEditStyle && !canEditMenu && canEditTracking && app.activeTab !== "tracking") {
		app.activeTab = "tracking";
	}
	if (app.activeTab === "effects" && !isGM) {
		app.activeTab = "tracking";
	}
	if (app.activeTab === "portrait" && isGlobal) {
		app.activeTab = "card";
	}
	// common and actionmenu are global-only tabs; fall back to card for per-actor
	if ((app.activeTab === "common" || app.activeTab === "actionmenu" || app.activeTab === "menu") && !isGlobal) {
		app.activeTab = "card";
	}
	// Legacy migration: if someone still has "style" stored, redirect
	if (app.activeTab === "style") {
		app.activeTab = isGlobal ? "common" : "card";
	}

	return {
		isGM: isGM,
		isGlobal: isGlobal,
		isDnd5eSystem: game.system.id === "dnd5e",
		canEditTracking: canEditTracking,
		canEditStyle: canEditStyle,
		canEditMenu: canEditMenu,
		canEditEffects: canEditEffects,
		editLabel: editLabel,
		actors: actorListData.actors,
		actorPagination: actorListData.pagination,
		actorTabs: actorListData.tabs,
		actorSearchQuery: actorListData.searchQuery,
		actorGroups: app.tempData.actorGroups || [],
		selectedRosterActors: selectedRosterActors,

		currentAttributes: currentAttributes,
		style: currentStyle,
		rawStyle: isGlobal ? {} : (app.tempData.actorSettings?.[app.currentEditId] || {}),
		imageRules: currentImageRules,
		displayNameOverride,
		customMenu: enrichedCustomMenu,
		menuActors: menuActors,
		hasExternalAdapterMenu: adapterMenuPreview.hasExternalAdapterMenu,
		adapterMenuPreviewAvailable: adapterMenuPreview.adapterMenuPreviewAvailable,
		menuPreviewActors: adapterMenuPreview.menuPreviewActors,
		menuPreviewActorId: adapterMenuPreview.menuPreviewActorId,
		adapterMenuTrailingRows: adapterMenuPreview.adapterMenuTrailingRows,
		portraitVariants,
		voicePortraitVariantId: app.tempData.actorSettings?.[app.currentEditId]?.voicePortraitVariantId || null,

		availableAttributes: availableAttributes,
		selectableAttributes: selectableAttributes,
		themeList: themeList,
		fontList: fontList,

		...getGlobalThemeFontLayoutContext(app.tempData),
		globalPos: app.tempData.globalPos,
		...getGlobalScaleContext(app.tempData),

		...getGlobalMenuBehaviorContext(app.tempData),
		actionMenuScale: app.tempData.actionMenuScale,
		actionMenuPos: amPos,
					configPresets: Object.keys(game.settings.get(MODULE_ID, "configurationPresets") || {}),
		actionMenuPresets: Object.keys(game.settings.get(MODULE_ID, "actionMenuPresets") || {}),
		globalPortraitLayers: resolveLayerContext([], app.tempData.portraitLayers || [], 60, 50),
		globalCardBgLayers: resolveLayerContext([], app.tempData.cardBgLayers || [], 10, 50),
		amMenuLayers: injectContentMarker([...(app.tempData.amMenuLayers || [])].sort((a, b) => (b.zIndex ?? 10) - (a.zIndex ?? 10)), [50, 1]),
		amSubMenuLayers: injectContentMarker([...(app.tempData.amSubMenuLayers || [])].sort((a, b) => (b.zIndex ?? 10) - (a.zIndex ?? 10)), 50),

		...getGlobalSimpleContext(app.tempData),
		...getGlobalImageContext(app.tempData),
		amElements: getAMElementContext(app.tempData),

		excludedActorTypes: app.tempData.excludedActorTypes,
		actorTypes: actorTypes,
		allActorTypes: allActorTypes, // [New]
		excludedTypesArray: excludedTypesArray, // [New]

		statusEffects: app.tempData.statusEffects,
		availableStatusEffects: systemEffects,
		...uiOptions,

		activeTab: app.activeTab,
		isTrackingTab: app.activeTab === "tracking",
		isCommonTab: app.activeTab === "common",
		isCardTab: app.activeTab === "card",
		isActionMenuTab: app.activeTab === "actionmenu",
		isMenuTab: app.activeTab === "menu",
		isEffectsTab: app.activeTab === "effects",
		isPortraitTab: app.activeTab === "portrait",

		worldPresets,
		personalPresets,
		builtinPresets,
	};
};

export const prepareSystemEffects = () => {
	let systemEffects = [];
	try {
		const raw = CONFIG.statusEffects || {};
		const rawEffects = Array.isArray(raw) ? raw : Object.values(raw);
		systemEffects = rawEffects.map((effect) => {
			const rawLabel = effect.label || effect.name || effect.id;
			return {
				id: effect.id,
				label: game.i18n.localize(rawLabel),
				icon: effect.icon || effect.img || effect.src,
			};
		});
		systemEffects.sort((a, b) => a.label.localeCompare(b.label));
	} catch (err) {
		console.error("Nik's Action HUD | Error loading status effects:", err);
	}
	return systemEffects;
};

export const prepareFontList = () => {
	const fontSet = new Set(["Teko", "Oswald", "Roboto"]);
	try {
		const ignoreList = ["Awesome", "Material", "Icon", "Symbol", "fa-", "fas", "far", "fab", "Foundry"];
		document.fonts.forEach((font) => {
			const family = font.family.replace(/['"]/g, "");
			if (ignoreList.some(keyword => family.toLowerCase().includes(keyword.toLowerCase()))) return;
			if (family.length < 2) return;
			fontSet.add(family);
		});
	} catch (e) {
		console.warn("Nik's Action HUD | Could not enumerate fonts:", e);
	}
	const fontList = Array.from(fontSet).map(f => ({
		value: f,
		label: f,
	}));
	fontList.sort((a, b) => a.label.localeCompare(b.label));
	fontList.unshift({ value: "", label: game.i18n.localize("IBHUD.Config.FontDefault") });
	return fontList;
};

export const prepareUiOptions = () => ({
	blendModes: [
		{
			value: "normal",
			label: game.i18n.localize("IBHUD.Config.BlendModes.Normal"),
		},
		{
			value: "multiply",
			label: game.i18n.localize("IBHUD.Config.BlendModes.Multiply"),
		},
		{
			value: "screen",
			label: game.i18n.localize("IBHUD.Config.BlendModes.Screen"),
		},
		{
			value: "overlay",
			label: game.i18n.localize("IBHUD.Config.BlendModes.Overlay"),
		},
		{
			value: "color-dodge",
			label: game.i18n.localize("IBHUD.Config.BlendModes.ColorDodge"),
		},
		{
			value: "color-burn",
			label: game.i18n.localize("IBHUD.Config.BlendModes.ColorBurn"),
		},
	],
	animationTypes: [
		{
			value: "",
			label: game.i18n.localize("IBHUD.Config.Animations.None"),
		},
		{
			value: "pulse",
			label: game.i18n.localize("IBHUD.Config.Animations.Pulse"),
		},
		{
			value: "heartbeat",
			label: game.i18n.localize("IBHUD.Config.Animations.Heartbeat"),
		},
		{
			value: "flash",
			label: game.i18n.localize("IBHUD.Config.Animations.Flash"),
		},
		{
			value: "shake",
			label: game.i18n.localize("IBHUD.Config.Animations.Shake"),
		},
		{
			value: "glitch",
			label: game.i18n.localize("IBHUD.Config.Animations.Glitch"),
		},
		{
			value: "spin",
			label: game.i18n.localize("IBHUD.Config.Animations.Spin"),
		},
		{
			value: "electric",
			label: game.i18n.localize("IBHUD.Config.Animations.Electric"),
		},
		{
			value: "burn",
			label: game.i18n.localize("IBHUD.Config.Animations.Burn"),
		},
		{
			value: "holy",
			label: game.i18n.localize("IBHUD.Config.Animations.Holy"),
		},
		{
			value: "ice",
			label: game.i18n.localize("IBHUD.Config.Animations.Ice"),
		},
		{
			value: "mirror",
			label: game.i18n.localize("IBHUD.Config.Animations.Mirror"),
		},
	],
});

export const getDefaultStatusEffects = () => [
	{
		id: "dead",
		label: game.i18n.localize("IBHUD.Status.Dead"),
		filters: {
			grayscale: 100,
			brightness: 50,
			contrast: 120,
			blur: 0,
			saturate: 0,
			sepia: 0,
		},
		overlayPath: "icons/svg/skull.svg",
		overlayScale: 1.0,
		overlayX: 0,
		overlayY: 0,
		overlayOpacity: 0.8,
		overlayBlend: "normal",
		animation: "pulse",
		tintColor: "#000000",
		tintAlpha: 0.5,
		tintAnimation: "",
	},
	{
		id: "unconscious",
		label: game.i18n.localize("IBHUD.Status.Unconscious"),
		filters: {
			grayscale: 80,
			brightness: 70,
			contrast: 100,
			blur: 2,
			saturate: 20,
			sepia: 0,
		},
		overlayPath: "",
		overlayOpacity: 1.0,
		overlayBlend: "normal",
		animation: "",
		tintColor: "#000000",
		tintAlpha: 0.3,
	},
	{
		id: "invisible",
		label: game.i18n.localize("IBHUD.Status.Invisible"),
		filters: {
			grayscale: 0,
			brightness: 100,
			contrast: 100,
			blur: 1,
			saturate: 50,
			sepia: 0,
		},
		overlayPath: "",
		overlayOpacity: 0,
		overlayBlend: "normal",
		animation: "",
		tintColor: "#aaffff",
		tintAlpha: 0.2,
	},
	{
		id: "poisoned",
		label: game.i18n.localize("IBHUD.Status.Poisoned"),
		filters: {
			grayscale: 0,
			brightness: 90,
			contrast: 110,
			blur: 0,
			saturate: 120,
			sepia: 30,
		},
		overlayPath: "",
		overlayOpacity: 0,
		overlayBlend: "normal",
		animation: "",
		tintColor: "#00ff00",
		tintAlpha: 0.25,
	},
	{
		id: "burning",
		label: game.i18n.localize("IBHUD.Status.Burning"),
		filters: {
			grayscale: 0,
			brightness: 110,
			contrast: 130,
			blur: 0,
			saturate: 150,
			sepia: 50,
		},
		overlayPath: "icons/svg/fire.svg",
		overlayOpacity: 0.6,
		overlayBlend: "screen",
		animation: "flash",
		tintColor: "#ff4400",
		tintAlpha: 0.3,
	},
];

export const resolveEditableCustomMenu = (customMenu, getDefaultMenu) => {
	const source = Array.isArray(customMenu) && customMenu.length > 0
		? customMenu
		: getDefaultMenu();
	return foundry.utils.deepClone(Array.isArray(source) ? source : []);
};

export const initializeTempData = (app, globalConfig, clientPos) => {

	app.tempData.actors = foundry.utils.deepClone(globalConfig.actors || []);

	if (Array.isArray(globalConfig.globalAttributes)) {
		app.tempData.globalAttributes = foundry.utils.deepClone(globalConfig.globalAttributes);
	} else {
		app.tempData.globalAttributes = defaultRegistry.getDefaultAttributes(
			game.system.id,
			window.ActionHUD?.adapter,
		);
		if (app.tempData.globalAttributes.length === 0) {
			app.tempData.globalAttributes = [
				{
					path: "system.attributes.hp",
					label: game.i18n.localize("IBHUD.Attributes.HP"),
					color: "#e61c34",
					style: "bar",
					icon: "",
					iconImg: "",
				},
			];
		}
	}

	app.tempData.customMenu = resolveEditableCustomMenu(
		globalConfig.customMenu,
		() => defaultRegistry.getDefaultLayout(
			game.system.id,
			window.ActionHUD?.adapter,
		),
	);
	app.tempData.adapterCategoryOverrides = foundry.utils.deepClone(
		globalConfig.adapterCategoryOverrides || {},
	);

	if (Array.isArray(globalConfig.statusEffects)) {
		app.tempData.statusEffects = foundry.utils.deepClone(globalConfig.statusEffects);
	} else {
		app.tempData.statusEffects = defaultRegistry.getDefaultStatusEffects(
			game.system.id,
			window.ActionHUD?.adapter,
		);
	}

	app.tempData.actorAttributes = foundry.utils.deepClone(globalConfig.actorAttributes || {});
	app.tempData.imageRules = foundry.utils.deepClone(globalConfig.imageRules || {});

	const baseActorSettings = globalConfig.actorSettings || {};
	app.tempData.actorSettings = {};

	const clientActorOverrides = !game.user.isGM
		? (game.settings.get(MODULE_ID, "clientActorOverrides") || {})
		: {};

	const positionKeys = ["relativeX", "relativeY", "anchorX", "anchorY", "offsetX", "offsetY", "freeX", "freeY"];
	const allActorIds = new Set([
		...Object.keys(baseActorSettings),
		...Object.keys(clientPos).filter(key =>
			!["global", "positionMode", "actionMenuPos", "actionMenuScale", "freeGroupAnchor"].includes(key) &&
			typeof clientPos[key] === "object" && clientPos[key] !== null
		),
		...Object.keys(clientActorOverrides),
	]);

	for (const actorId of allActorIds) {
		const settings = baseActorSettings[actorId] || {};
		const clientSettings = clientPos[actorId] || {};
		const styleOverrides = clientActorOverrides[actorId]?.actorSettings || {};
		app.tempData.actorSettings[actorId] = {
			...settings,
			...styleOverrides,
			relativeX: clientSettings.relativeX ?? settings.relativeX,
			relativeY: clientSettings.relativeY ?? settings.relativeY,
			anchorX: clientSettings.anchorX ?? settings.anchorX,
			anchorY: clientSettings.anchorY ?? settings.anchorY,
			offsetX: clientSettings.offsetX ?? settings.offsetX,
			offsetY: clientSettings.offsetY ?? settings.offsetY,
			freeX: clientSettings.freeX ?? settings.freeX,
			freeY: clientSettings.freeY ?? settings.freeY,
		};
	}

	if (!game.user.isGM) {
		for (const [actorId, data] of Object.entries(clientActorOverrides)) {
			if (data.actorAttributes) {
				app.tempData.actorAttributes[actorId] = foundry.utils.deepClone(data.actorAttributes);
			}
			if (data.imageRules) {
				app.tempData.imageRules[actorId] = foundry.utils.deepClone(data.imageRules);
			}
		}
	}

	loadGlobalThemeFontLayoutFields(app.tempData, globalConfig);
	loadExcludedActorTypes(app.tempData, globalConfig);
	app.tempData.globalPos = globalConfig.globalPos || { bottom: 50, left: 10, unit: "px" };
	if (!app.tempData.globalPos.unit) {
		app.tempData.globalPos.unit = "px";
	}

	loadGlobalScaleFields(app.tempData, globalConfig);
	if (globalConfig.globalGap === undefined && app.tempData.theme === "rift") {
		app.tempData.globalGap = 0;
	}
	loadGlobalMenuBehaviorFields(app.tempData, globalConfig);
	app.tempData.actionMenuScale = clientPos.actionMenuScale ?? globalConfig.actionMenuScale ?? 1.0;
	app.tempData.actionMenuPos = foundry.utils.deepClone(
		clientPos.actionMenuPos ||
		globalConfig.actionMenuPos ||
		{ anchorX: "right", anchorY: "bottom", offsetX: 40, offsetY: 40 },
	);
	app.tempData.positionMode =
		clientPos.positionMode ?? globalConfig.positionMode ?? "anchor";
	loadGlobalResponsiveFields(app.tempData, globalConfig);



	// Global Card Size
	app.tempData.globalCardWidth = globalConfig.globalCardWidth ?? null;
	app.tempData.globalCardHeight = globalConfig.globalCardHeight ?? null;

	// Global Portrait Size
	app.tempData.globalPortraitWidth = globalConfig.globalPortraitWidth ?? null;
	app.tempData.globalPortraitHeight = globalConfig.globalPortraitHeight ?? null;

	// Global Portrait Layers
	app.tempData.portraitLayers = Array.isArray(globalConfig.portraitLayers)
		? globalConfig.portraitLayers
		: [];

	// Global Card Background Layers
	app.tempData.cardBgLayers = Array.isArray(globalConfig.cardBgLayers)
		? globalConfig.cardBgLayers
		: [];

	// AM Menu Layers
	app.tempData.amMenuLayers = Array.isArray(globalConfig.amMenuLayers)
		? globalConfig.amMenuLayers
		: [];

	// AM Sub-Menu Layers
	app.tempData.amSubMenuLayers = Array.isArray(globalConfig.amSubMenuLayers)
		? globalConfig.amSubMenuLayers
		: [];

	loadGlobalSimpleFields(app.tempData, globalConfig);

	app.tempData.actorGroups = Array.isArray(globalConfig.actorGroups)
		? foundry.utils.deepClone(globalConfig.actorGroups)
		: [];

	// Global Element Scale & Image Defaults
	loadGlobalImageFields(app.tempData, globalConfig);
	loadAMElementData(app.tempData, globalConfig);

	app.isInitialized = true;
};

export const prepareActorList = (app) => {
	const actorListTab = app.actorListTab || "all";
	const actorSearchQuery = (app.actorSearchQuery || "").toLowerCase().trim();
	const actorListPage = app.actorListPage || 0;
	const actorListPageSize = app.actorListPageSize || 20;
	const isGM = game.user.isGM;

	// Filter actors by permission - non-GM users can only see actors they own
	let allActors = game.actors.contents;
	if (!isGM) {
		allActors = allActors.filter((actor) => actor.isOwner);
	}

	const pcActors = allActors.filter((actor) => actor.hasPlayerOwner);
	const npcActors = allActors.filter((actor) => !actor.hasPlayerOwner);

	let filteredActors;
	if (actorListTab === "pc") {
		filteredActors = pcActors;
	} else if (actorListTab === "npc") {
		filteredActors = npcActors;
	} else {
		filteredActors = allActors;
	}

	if (actorSearchQuery) {
		filteredActors = filteredActors.filter((actor) =>
			actor.name.toLowerCase().includes(actorSearchQuery)
		);
	}

	filteredActors.sort((a, b) => a.name.localeCompare(b.name));

	const totalCount = filteredActors.length;
	const totalPages = Math.ceil(totalCount / actorListPageSize);
	const currentPage = Math.min(actorListPage, Math.max(0, totalPages - 1));
	const startIndex = currentPage * actorListPageSize;
	const endIndex = Math.min(startIndex + actorListPageSize, totalCount);
	const pagedActors = filteredActors.slice(startIndex, endIndex);

	const actorList = pagedActors.map((actor) => ({
		id: actor.id,
		name: actor.name,
		img: actor.img,
		checked: app.tempData.actors.includes(actor.id),
		isActive: app.currentEditId === actor.id,
		isNpc: !actor.hasPlayerOwner,
	}));

	return {
		actors: actorList,
		pagination: {
			currentPage,
			totalPages,
			totalCount,
			startIndex: startIndex + 1,
			endIndex,
			hasPrev: currentPage > 0,
			hasNext: currentPage < totalPages - 1,
		},
		tabs: {
			current: actorListTab,
			counts: {
				all: allActors.length,
				pc: pcActors.length,
				npc: npcActors.length,
			},
		},
		searchQuery: app.actorSearchQuery || "",
	};
};

export const getActorAttributes = (app, actorId) => {
	if (!app.tempData.actorAttributes[actorId]) {
		app.tempData.actorAttributes[actorId] = [];
	}
	return app.tempData.actorAttributes[actorId];
};

export const getImageRules = (app, actorId) => {
	if (!app.tempData.imageRules[actorId]) {
		app.tempData.imageRules[actorId] = [];
	}
	return app.tempData.imageRules[actorId].map(rule => ({
		...rule,
		effects: mergeEffectsWithDefaults(rule.effects),
	}));
};

export const calculateActorStyle = (app, actorId, clientPos, globalConfig) => {
	const savedStyle = app.tempData.actorSettings[actorId] || {};
	const myPos = clientPos[actorId] || {};
	const currentTheme = app.tempData.theme || "rift";
	const positionMode =
		clientPos.positionMode ?? globalConfig.positionMode ?? "anchor";
	const globalScale =
		clientPos.global?.scale ?? globalConfig.globalScale ?? 1.0;

	const themeDefaults = app.constructor.THEMES[currentTheme]?.defaults || {};

	const freeGroupAnchor = clientPos.freeGroupAnchor ?? globalConfig.freeGroupAnchor ?? null;
	const hasRelativeX = myPos.relativeX !== undefined || savedStyle.relativeX !== undefined;
	const hasRelativeY = myPos.relativeY !== undefined || savedStyle.relativeY !== undefined;

	let anchorX, anchorY, offsetX, offsetY;
	let groupAnchor = null;
	let relativeX = null;
	let relativeY = null;

	if (freeGroupAnchor && (hasRelativeX || hasRelativeY)) {
		groupAnchor = freeGroupAnchor;
		relativeX = myPos.relativeX ?? savedStyle.relativeX ?? 0;
		relativeY = myPos.relativeY ?? savedStyle.relativeY ?? 0;
		anchorX = "left";
		anchorY = "top";
		offsetX = 0;
		offsetY = 0;
	} else {
		const hasFreeX = myPos.freeX !== undefined && myPos.freeX !== "" && myPos.freeX !== null;
		const hasFreeY = myPos.freeY !== undefined && myPos.freeY !== "" && myPos.freeY !== null;
		const hasSavedFreeX = savedStyle.freeX !== undefined && savedStyle.freeX !== "" && savedStyle.freeX !== null;
		const hasSavedFreeY = savedStyle.freeY !== undefined && savedStyle.freeY !== "" && savedStyle.freeY !== null;

		if (hasFreeX || hasSavedFreeX) {
			anchorX = "left";
			offsetX = hasFreeX ? myPos.freeX : savedStyle.freeX;
		} else {
			anchorX = myPos.anchorX ?? savedStyle.anchorX ?? "left";
			offsetX = myPos.offsetX ?? savedStyle.offsetX ?? 0;
		}

		if (hasFreeY || hasSavedFreeY) {
			anchorY = "top";
			offsetY = hasFreeY ? myPos.freeY : savedStyle.freeY;
		} else {
			anchorY = myPos.anchorY ?? savedStyle.anchorY ?? "top";
			offsetY = myPos.offsetY ?? savedStyle.offsetY ?? 0;
		}
	}

	const hasFreeX = myPos.freeX !== undefined && myPos.freeX !== "" && myPos.freeX !== null;
	const hasFreeY = myPos.freeY !== undefined && myPos.freeY !== "" && myPos.freeY !== null;
	const hasSavedFreeX = savedStyle.freeX !== undefined && savedStyle.freeX !== "" && savedStyle.freeX !== null;
	const hasSavedFreeY = savedStyle.freeY !== undefined && savedStyle.freeY !== "" && savedStyle.freeY !== null;
	const freeX = hasFreeX ? myPos.freeX : (hasSavedFreeX ? savedStyle.freeX : "");
	const freeY = hasFreeY ? myPos.freeY : (hasSavedFreeY ? savedStyle.freeY : "");

	return {
		scale: savedStyle.scale ?? globalConfig.globalPortraitScale ?? themeDefaults.scale ?? 1.0,

		x: myPos.x ?? savedStyle.x ?? globalConfig.globalPortraitX ?? themeDefaults.portraitX ?? 0,
		y: myPos.y ?? savedStyle.y ?? globalConfig.globalPortraitY ?? themeDefaults.portraitY ?? 0,

		...resolveActorPositionFields(savedStyle, globalConfig, themeDefaults),

		customImg: savedStyle.customImg ?? "",
		portraitLayers: resolveLayerContext(savedStyle.portraitLayers, app.tempData.portraitLayers || [], 60, 50),
		cardBgLayers: resolveLayerContext(savedStyle.cardBgLayers, app.tempData.cardBgLayers || [], 10, 50),
		portraitVariants: Array.isArray(savedStyle.portraitVariants)
			? savedStyle.portraitVariants
			: [],
		activePortraitVariantId: savedStyle.activePortraitVariantId ?? null,
		format: savedStyle.format ?? globalConfig.globalFormat ?? themeDefaults.format ?? "popout",
		hideBg: savedStyle.hideBg ?? false,
		collapseCard: savedStyle.collapseCard || "",
		collapseSize: coerceNullableNumber(savedStyle.collapseSize) ?? coerceNullableNumber(globalConfig.globalCollapseSize),
		collapseWidth: coerceNullableNumber(savedStyle.collapseWidth) ?? coerceNullableNumber(globalConfig.globalCollapseWidth),
		collapseHeight: coerceNullableNumber(savedStyle.collapseHeight) ?? coerceNullableNumber(globalConfig.globalCollapseHeight),
		collapseBorderRadius: coerceNullableNumber(savedStyle.collapseBorderRadius) ?? coerceNullableNumber(globalConfig.globalCollapseBorderRadius),
		collapsePortraitX: coerceNullableNumber(savedStyle.collapsePortraitX) ?? coerceNullableNumber(globalConfig.globalCollapsePortraitX),
		collapsePortraitY: coerceNullableNumber(savedStyle.collapsePortraitY) ?? coerceNullableNumber(globalConfig.globalCollapsePortraitY),
		collapsePortraitScale: coerceNullableNumber(savedStyle.collapsePortraitScale) ?? coerceNullableNumber(globalConfig.globalCollapsePortraitScale),
		collapseUseCustomColors: savedStyle.collapseUseCustomColors ?? false,
		collapseBorderColor: savedStyle.collapseUseCustomColors
			? (savedStyle.collapseBorderColor ?? globalConfig.globalCollapseBorderColor ?? null)
			: (globalConfig.globalCollapseBorderColor ?? null),
		collapseBgColor: savedStyle.collapseUseCustomColors
			? (savedStyle.collapseBgColor ?? globalConfig.globalCollapseBgColor ?? null)
			: (globalConfig.globalCollapseBgColor ?? null),

		anchorX,
		anchorY,
		offsetX,
		offsetY,
		freeX,
		freeY,
		zIndex: savedStyle.zIndex ?? "",
		groupAnchor,
		relativeX,
		relativeY,

		cardScale: savedStyle.cardScale ?? 1.0,
		...mergeEffectsWithDefaults(savedStyle),
		...resolveActorSizeFields(savedStyle, globalConfig),
	};

};

export const getCombinedAttributes = (app, actors) => {
	const uniquePaths = new Map();

	for (const actor of actors) {
		const attrs = app._getTrackableAttributes(actor);
		for (const attr of attrs) {
			if (!uniquePaths.has(attr.path)) {
				uniquePaths.set(attr.path, attr);
			}
		}
	}

	return Array.from(uniquePaths.values()).sort((a, b) =>
		(a.label || a.path).localeCompare(b.label || b.path),
	);
};

export const getDefaultStyle = () => ({
	cardScale: 1.0,
	scale: 1.0,
	x: 0,
	y: 0,
	nameX: 0,
	nameY: 0,
	nameScale: 1.0,
	nameRotation: 0,
	barsX: 0,
	barsY: 0,
	dotsX: 0,
	dotsY: 0,
	numbersX: 0,
	numbersY: 0,
	badgesX: 0,
	badgesY: 0,
	conditionsX: 0,
	conditionsY: 0,
	conditionsLayout: "horizontal",
	endTurnX: 0,
	endTurnY: 0,
	customImg: "",
	portraitLayers: [],
	cardBgLayers: [],
	portraitVariants: [],
	activePortraitVariantId: null,
	format: null,
	anchorX: "left",
	anchorY: "top",
	offsetX: 0,
	offsetY: 0,
	zIndex: "",
	hideBg: false,
});

export const prepareSelectableAttributes = (app, isGlobal) => {
	const globalAttrs = app.tempData.globalAttributes || [];
	let list = [];

	if (isGlobal) {
		list = [...globalAttrs];
	} else {
		const actorAttrs = app.tempData.actorAttributes[app.currentEditId] || [];
		list = [...globalAttrs, ...actorAttrs];
	}

	if (list.length === 0) {
		list.push({ label: "HP", path: "system.attributes.hp" });
	}
	return list;
};

export const prepareThemeList = (app) =>
	Object.entries(app.constructor.THEMES).map(([key, data]) => ({
		value: key,
		label: game.i18n.localize(data.label || key),
		isSelected: app.tempData.theme === key,
	}));

export const applyGlobalOverrides = (app, clientPos) => {
	if (clientPos.global) {
		app.tempData.globalPos = clientPos.global.pos || app.tempData.globalPos;
		app.tempData.globalScale =
			clientPos.global.scale || app.tempData.globalScale;
		app.tempData.globalGap = clientPos.global.gap ?? app.tempData.globalGap;
	}
};

export const getTrackableAttributes = (actor) => {
	if (!actor) return [];
	const initiativeEntry = {
		path: "combat.initiative",
		label: "Combat Initiative",
		combatOnly: true,
		hideInCombat: false,
	};

	const defaults = defaultRegistry.getTrackableAttributes(
		game.system.id,
		window.ActionHUD?.adapter,
		{ actor },
	);
	if (defaults.length > 0) {
		if (!defaults.some((attr) => attr.path === initiativeEntry.path)) {
			defaults.push(initiativeEntry);
		}
		return defaults;
	}

	return [
		{
			path: "system.attributes.hp",
			label: game.i18n.localize("IBHUD.Attributes.HP"),
		},
		initiativeEntry,
	];
};
