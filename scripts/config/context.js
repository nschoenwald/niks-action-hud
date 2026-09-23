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
import { adapterRegistry } from "../systems/registry.js";
import { THEMES } from "./constants.js";
import {
	AM_ELEMENTS,
	exportHudConfig,
	getAMElementContext,
	injectContentMarker,
	loadHudConfig,
} from "./schema.js";

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
		console.warn("Nik's Action HUD | Could not preview external adapter categories:", error);
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
		const visibility = appearance.visibility || { mode: "all", actorTypes: [], actorIds: [] };
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
		if (!placement && Number.isInteger(legacyPosition) && legacyPosition >= 1) {
			placement = createAdapterPlacementForGap(adapterRows, legacyPosition - 1);
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

export const prepareFontList = () => {
	const fontSet = new Set(["Teko", "Oswald", "Roboto", "Cinzel", "Montserrat", "Signika"]);
	try {
		const ignoreList = ["Awesome", "Material", "Icon", "Symbol", "fa-", "fas", "far", "fab", "Foundry"];
		document.fonts?.forEach?.((font) => {
			const family = font.family.replace(/['"]/g, "");
			if (ignoreList.some((keyword) => family.toLowerCase().includes(keyword.toLowerCase()))) return;
			if (family.length < 2) return;
			fontSet.add(family);
		});
	} catch (e) {
		console.warn("Nik's Action HUD | Could not enumerate fonts:", e);
	}
	const fontList = Array.from(fontSet).map((f) => ({
		value: f,
		label: f,
	}));
	const defaultFontLabel = game.i18n.has("NIKS_ACTION_HUD.Config.FontDefault")
		? game.i18n.localize("NIKS_ACTION_HUD.Config.FontDefault")
		: (game.i18n.has("IBHUD.Config.FontDefault") ? game.i18n.localize("IBHUD.Config.FontDefault") : "Default Font");
	fontList.unshift({ value: "", label: defaultFontLabel });
	return fontList;
};

export const prepareUiOptions = () => ({
	blendModes: [
		{ value: "normal", label: "Normal" },
		{ value: "multiply", label: "Multiply" },
		{ value: "screen", label: "Screen" },
		{ value: "overlay", label: "Overlay" },
		{ value: "color-dodge", label: "Color Dodge" },
		{ value: "color-burn", label: "Color Burn" },
	],
});

export const initializeTempData = (app, globalConfig) => {
	app.tempData = {};
	loadHudConfig(app.tempData, globalConfig);
	app.isInitialized = true;
};

export const prepareContext = async (app, options = {}) => {
	const globalConfig = game.settings.get(MODULE_ID, "configuration") || {};
	if (!app.isInitialized) {
		initializeTempData(app, globalConfig);
	}

	const isGM = game.user.isGM;
	const styleRole = game.settings.get(MODULE_ID, "styleConfigRole") ?? 1;
	const menuRole = game.settings.get(MODULE_ID, "menuConfigRole") ?? 4;
	const canEditStyle = game.user.role >= styleRole;
	const canEditMenu = game.user.role >= menuRole;

	// Determine actor types
	let actorTypes = [];
	if (Array.isArray(game.system.documentTypes?.Actor)) {
		actorTypes = game.system.documentTypes.Actor;
	} else if (game.system.documentTypes?.Actor && typeof game.system.documentTypes.Actor === "object") {
		actorTypes = Object.keys(game.system.documentTypes.Actor);
	}

	const excludedTypesArray = (app.tempData.excludedActorTypes || "").split(",").map((t) => t.trim()).filter(Boolean);
	const allActorTypes = actorTypes.map((type) => ({
		value: type,
		label: type.charAt(0).toUpperCase() + type.slice(1),
		checked: excludedTypesArray.includes(type),
	}));

	const menuActors = (game.actors?.contents || [])
		.filter((a) => a.hasPlayerOwner || isGM)
		.map((a) => ({ id: a.id, name: a.name, type: a.type, img: a.img }))
		.sort((a, b) => a.name.localeCompare(b.name));

	const targetActors = canvas?.tokens?.controlled?.map((t) => t.actor).filter(Boolean) || [];

	const adapter = window.ActionHUD?.adapter || adapterRegistry.createSystemAdapter(game.system.id);
	const adapterMenuPreview = await prepareExternalAdapterMenu(
		app,
		adapter,
		targetActors,
		menuActors,
		actorTypes,
		canEditMenu,
	);

	// Enrich Custom Menu
	const enrichedCustomMenu = (app.tempData.customMenu || []).map((cat, index) => {
		const vis = cat.visibility || { mode: "all", actorTypes: [], actorIds: [] };
		const catActorTypes = vis.actorTypes || [];
		const resolvedActors = (vis.actorIds || []).map((id) => {
			const actor = game.actors?.get(id);
			return { id, name: actor?.name || id, img: actor?.img || "" };
		});
		const perCatActorTypes = actorTypes.map((type) => ({
			value: type,
			label: type.charAt(0).toUpperCase() + type.slice(1),
			checked: catActorTypes.includes(type),
		}));
		const btnFrameSorted = (cat.buttonFrameLayers || [])
			.slice()
			.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

		const enrichedTabs = (cat.tabs || []).map((tab) => {
			const tVis = tab.visibility || { mode: "all", actorTypes: [], actorIds: [] };
			const tActorTypes = tVis.actorTypes || [];
			const tResolvedActors = (tVis.actorIds || []).map((id) => {
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
					_allActorTypes: actorTypes.map((type) => ({
						value: type,
						label: type.charAt(0).toUpperCase() + type.slice(1),
						checked: tActorTypes.includes(type),
					})),
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

	// Visual theme cards metadata
	const currentTheme = app.tempData.theme || "rift";
	const themeCards = Object.values(THEMES).map((themeMeta) => ({
		...themeMeta,
		label: game.i18n.localize(themeMeta.label) || themeMeta.defaultLabel,
		isActive: themeMeta.id === currentTheme,
	}));

	// Sample category buttons for Live Preview Sandbox
	const sampleButtons = [
		{ label: "Attacks", icon: "fas fa-swords" },
		{ label: "Spells", icon: "fas fa-wand-magic-sparkles" },
		{ label: "Features", icon: "fas fa-bolt" },
		{ label: "Abilities", icon: "fas fa-dice-d20" },
		{ label: "Items", icon: "fas fa-box-open" },
	];

	// Anchor pos helpers
	const currentPos = app.tempData.actionMenuPos || { anchorX: "right", anchorY: "bottom", offsetX: 40, offsetY: 40 };

	const activeTab = app.activeTab || "general";

	return {
		isGM,
		canEditStyle,
		canEditMenu,
		isDnd5eSystem: game.system.id === "dnd5e",
		activeTab,
		isGeneralTab: activeTab === "general",
		isAppearanceTab: activeTab === "appearance",
		isMenuTab: activeTab === "menu",
		isImageStudioTab: activeTab === "imageStudio",
		isPresetsTab: activeTab === "presets",

		// Form field values from tempData
		...app.tempData,

		// Specific enriched values
		theme: currentTheme,
		isImageTheme: currentTheme === "image",
		themeCards,
		fontList: prepareFontList(),
		...prepareUiOptions(),
		allActorTypes,
		excludedTypesArray,

		// Anchor positioning
		isAnchorBottomRight: currentPos.anchorX === "right" && currentPos.anchorY === "bottom",
		isAnchorBottomLeft: currentPos.anchorX === "left" && currentPos.anchorY === "bottom",
		isAnchorTopRight: currentPos.anchorX === "right" && currentPos.anchorY === "top",
		isAnchorTopLeft: currentPos.anchorX === "left" && currentPos.anchorY === "top",
		offsetX: currentPos.offsetX,
		offsetY: currentPos.offsetY,

		// Live preview sandbox
		sampleButtons,

		// Menu builder context
		customMenu: enrichedCustomMenu,
		hasExternalAdapterMenu: adapterMenuPreview.hasExternalAdapterMenu,
		adapterMenuPreviewAvailable: adapterMenuPreview.adapterMenuPreviewAvailable,
		menuPreviewActors: adapterMenuPreview.menuPreviewActors,
		menuPreviewActorId: adapterMenuPreview.menuPreviewActorId,
		adapterMenuTrailingRows: adapterMenuPreview.adapterMenuTrailingRows,

		// Image theme studio context
		amElements: getAMElementContext(app.tempData),
		amMenuLayers: injectContentMarker([...(app.tempData.amMenuLayers || [])].sort((a, b) => (b.zIndex ?? 10) - (a.zIndex ?? 10)), [50, 1]),
		amSubMenuLayers: injectContentMarker([...(app.tempData.amSubMenuLayers || [])].sort((a, b) => (b.zIndex ?? 10) - (a.zIndex ?? 10)), 50),

		// Presets
		configPresets: Object.keys(game.settings.get(MODULE_ID, "configurationPresets") || {}),
		actionMenuPresets: Object.keys(game.settings.get(MODULE_ID, "actionMenuPresets") || {}),
	};
};
