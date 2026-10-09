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
import { THEMES, isThemeAvailable, getDefaultTheme, DEFAULT_EXCLUDED_ACTOR_TYPES } from "./constants.js";
import {
	exportHudConfig,
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
			_buttonFrameLayers: buttonFrameLayers,
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
	const defaultFontLabel = game.i18n.localize("NAH.Config.FontDefault") || "Default Font";
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
	if (game.settings?.settings?.has(`${MODULE_ID}.dnd5eAutoFavoriteNpcActions`)) {
		app.tempData.dnd5eAutoFavoriteNpcActions = game.settings.get(MODULE_ID, "dnd5eAutoFavoriteNpcActions");
	}
	if (game.settings?.settings?.has(`${MODULE_ID}.dnd5eAutoFavoriteNpcMax`)) {
		app.tempData.dnd5eAutoFavoriteNpcMax = game.settings.get(MODULE_ID, "dnd5eAutoFavoriteNpcMax");
	}
	if (game.settings?.settings?.has(`${MODULE_ID}.dnd5eShowUnpreparedRituals`)) {
		app.tempData.dnd5eShowUnpreparedRituals = game.settings.get(MODULE_ID, "dnd5eShowUnpreparedRituals");
	}
	if (game.settings?.settings?.has(`${MODULE_ID}.hideEmptySubmenus`)) {
		app.tempData.hideEmptySubmenus = game.settings.get(MODULE_ID, "hideEmptySubmenus");
	}
	if (game.settings?.settings?.has(`${MODULE_ID}.fadeWhenIdle`)) {
		app.tempData.fadeWhenIdle = game.settings.get(MODULE_ID, "fadeWhenIdle");
	}
	if (game.settings?.settings?.has(`${MODULE_ID}.actionMenuSubmenuSide`)) {
		app.tempData.actionMenuSubmenuSide = game.settings.get(MODULE_ID, "actionMenuSubmenuSide");
	}
	if (game.settings?.settings?.has(`${MODULE_ID}.tooltipPosition`)) {
		app.tempData.tooltipPosition = game.settings.get(MODULE_ID, "tooltipPosition");
	}
	app.isInitialized = true;
};

export const prepareContext = async (app, options = {}) => {
	const globalConfig = game.settings.get(MODULE_ID, "configuration") || {};
	if (!app.isInitialized) {
		initializeTempData(app, globalConfig);
	}

	const isGM = game.user.isGM;
	const canConfigure = game.user.can("SETTINGS_MODIFY");
	const canEditStyle = canConfigure;
	const canEditMenu = canConfigure;

	// Determine actor types
	let actorTypes = [];
	if (Array.isArray(game.system.documentTypes?.Actor)) {
		actorTypes = game.system.documentTypes.Actor;
	} else if (game.system.documentTypes?.Actor && typeof game.system.documentTypes.Actor === "object") {
		actorTypes = Object.keys(game.system.documentTypes.Actor);
	}

	const rawExcluded = app.tempData.excludedActorTypes !== undefined
		? app.tempData.excludedActorTypes
		: DEFAULT_EXCLUDED_ACTOR_TYPES;
	const excludedTypesArray = (rawExcluded || "")
		.split(",")
		.map((t) => t.trim().toLowerCase())
		.filter(Boolean);
	const allActorTypes = actorTypes.map((type) => ({
		value: type,
		label: type.charAt(0).toUpperCase() + type.slice(1),
		checked: excludedTypesArray.includes(type.toLowerCase()),
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
		const btnFrameSorted = (cat.buttonFrameLayers || [])
			.slice()
			.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

		const enrichedTabs = (cat.tabs || []).map((tab) => ({
			...tab,
		}));

		return {
			...cat,
			_collapsed: app._collapsedMenuCategories?.has(cat) || false,
			_adapterRowsBefore: adapterMenuPreview.adapterRowsBefore[index] || [],
			tabs: enrichedTabs,
			_buttonFrameLayers: btnFrameSorted,
			buttonFrameColor: cat.buttonFrameColor || "",
		};
	});

	// Visual theme cards metadata
	let currentTheme = app.tempData.theme || getDefaultTheme();
	if (!isThemeAvailable(currentTheme)) {
		currentTheme = getDefaultTheme();
		app.tempData.theme = currentTheme;
	}
	const themeCards = Object.values(THEMES)
		.filter((themeMeta) => isThemeAvailable(themeMeta))
		.map((themeMeta) => {
			let colors = { ...themeMeta.colors };
			if (themeMeta.id === "carolingian" && game.modules?.get("crlngn-ui")?.active) {
				try {
					const rootStyle = getComputedStyle(document.body);
					const hl = rootStyle.getPropertyValue("--color-highlights")?.trim();
					const darkBg = rootStyle.getPropertyValue("--color-dark-bg")?.trim();
					const darkBg90 = rootStyle.getPropertyValue("--color-dark-bg-90")?.trim() || rootStyle.getPropertyValue("--color-dark-bg-85")?.trim();
					const warm = rootStyle.getPropertyValue("--color-warm-1")?.trim();
					if (hl) colors.border = hl;
					if (warm) colors.accent = warm;
					else if (hl) colors.accent = hl;
					if (darkBg) colors.bg = darkBg;
					if (darkBg90) colors.surface = darkBg90;
					else if (darkBg) colors.surface = darkBg;
				} catch (_) {
					// Fall back to predefined theme colors
				}
			}
			return {
				...themeMeta,
				colors,
				label: game.i18n.localize(themeMeta.label) || themeMeta.defaultLabel,
				isActive: themeMeta.id === currentTheme,
			};
		});

	// Sample category buttons for Live Preview Sandbox
	const sampleButtons = [
		{ label: "Attacks", icon: "fas fa-swords" },
		{ label: "Spells", icon: "fas fa-wand-magic-sparkles" },
		{ label: "Features", icon: "fas fa-bolt" },
		{ label: "Abilities", icon: "fas fa-dice-d20" },
		{ label: "Items", icon: "fas fa-box-open" },
	];

	const activeTab = app.activeTab || "general";

	return {
		isGM,
		canConfigure,
		canEditStyle,
		canEditMenu,
		moduleVersion: game.modules.get(MODULE_ID)?.version || "14.8.1",
		isDnd5eSystem: game.system.id === "dnd5e",
		activeTab,
		isGeneralTab: activeTab === "general",
		isAppearanceTab: activeTab === "appearance",
		isMenuTab: activeTab === "menu",
		isPresetsTab: activeTab === "presets",

		// Form field values from tempData
		...app.tempData,

		// Specific enriched values
		theme: currentTheme,
		themeCards,
		fontList: prepareFontList(),
		...prepareUiOptions(),
		allActorTypes,
		excludedTypesArray,

		// Live preview sandbox
		sampleButtons,

		// Menu builder context
		customMenu: enrichedCustomMenu,
		hasExternalAdapterMenu: adapterMenuPreview.hasExternalAdapterMenu,
		adapterMenuPreviewAvailable: adapterMenuPreview.adapterMenuPreviewAvailable,
		menuPreviewActors: adapterMenuPreview.menuPreviewActors,
		menuPreviewActorId: adapterMenuPreview.menuPreviewActorId,
		adapterMenuTrailingRows: adapterMenuPreview.adapterMenuTrailingRows,

		// Presets
		configPresets: Object.keys(game.settings.get(MODULE_ID, "configurationPresets") || {}),
		actionMenuPresets: Object.keys(game.settings.get(MODULE_ID, "actionMenuPresets") || {}),
	};
};
