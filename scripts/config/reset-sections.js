import {
	GLOBAL_MENU_BEHAVIOR_FIELDS,
	GLOBAL_THEME_FONT_LAYOUT_FIELDS,
	loadAMElementData,
	loadGlobalImageFields,
	resetExcludedActorTypes,
	resetGlobalResponsiveFields,
	resetGlobalScaleFields,
	resetGlobalSimpleFields,
} from "./schema.js";

export const RESET_SCOPE_IDS = Object.freeze({
	TRACKING: "tracking",
	COMMON: "common",
	CARD: "card",
	ACTION_MENU: "actionmenu",
	MENU: "menu",
	EFFECTS: "effects",
	PORTRAIT: "portrait",
	ALL: "all",
});

export const GLOBAL_RESET_SECTION_IDS = Object.freeze([
	RESET_SCOPE_IDS.TRACKING,
	RESET_SCOPE_IDS.COMMON,
	RESET_SCOPE_IDS.CARD,
	RESET_SCOPE_IDS.ACTION_MENU,
	RESET_SCOPE_IDS.MENU,
	RESET_SCOPE_IDS.EFFECTS,
]);

export const ACTOR_RESET_SECTION_IDS = Object.freeze([
	RESET_SCOPE_IDS.TRACKING,
	RESET_SCOPE_IDS.CARD,
	RESET_SCOPE_IDS.PORTRAIT,
]);

const COMMON_THEME_FIELDS = new Set([
	"theme",
	"fontFamily",
	"fontFamilySub",
]);
const CARD_THEME_FIELDS = new Set(["layoutMode"]);
const ACTION_MENU_THEME_FIELDS = new Set(["actionMenuFont"]);

const COMMON_BEHAVIOR_FIELDS = new Set([
	"actionMenuVisibility",
]);
const CARD_BEHAVIOR_FIELDS = new Set(["collapseCards"]);
const ACTION_MENU_BEHAVIOR_FIELDS = new Set([
	"enableActionMenu",
	"actionMenuUseTokenImg",
	"actionMenuEmphasizeFirstButton",
	"closeMenuOnUse",
	"hideEmptySubmenus",
	"dnd5eGroupActionsByActivation",
]);

const ACTOR_PORTRAIT_FIELDS = Object.freeze([
	"portraitVariants",
	"activePortraitVariantId",
	"voicePortraitVariantId",
]);

const clonePlain = (value) => {
	if (Array.isArray(value)) return value.map(clonePlain);
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [key, clonePlain(entry)]),
		);
	}
	return value;
};

const resetSchemaFieldSubset = (tempData, fields, keys) => {
	for (const field of fields) {
		if (keys.has(field.key)) tempData[field.key] = clonePlain(field.fallback);
	}
};

const setActorSettings = (tempData, actorId, settings) => {
	if (Object.keys(settings).length > 0) tempData.actorSettings[actorId] = settings;
	else delete tempData.actorSettings[actorId];
};

export function resetGlobalSection(tempData, scope, defaults = {}) {
	switch (scope) {
		case RESET_SCOPE_IDS.TRACKING:
			tempData.globalAttributes = clonePlain(defaults.globalAttributes || []);
			return true;

		case RESET_SCOPE_IDS.COMMON:
			resetSchemaFieldSubset(
				tempData,
				GLOBAL_THEME_FONT_LAYOUT_FIELDS,
				COMMON_THEME_FIELDS,
			);
			resetSchemaFieldSubset(
				tempData,
				GLOBAL_MENU_BEHAVIOR_FIELDS,
				COMMON_BEHAVIOR_FIELDS,
			);
			resetExcludedActorTypes(tempData);
			return true;

		case RESET_SCOPE_IDS.CARD:
			resetSchemaFieldSubset(
				tempData,
				GLOBAL_THEME_FONT_LAYOUT_FIELDS,
				CARD_THEME_FIELDS,
			);
			resetSchemaFieldSubset(
				tempData,
				GLOBAL_MENU_BEHAVIOR_FIELDS,
				CARD_BEHAVIOR_FIELDS,
			);
			tempData.globalPos = { bottom: 50, left: 10, unit: "px" };
			resetGlobalScaleFields(tempData);
			tempData.positionMode = "anchor";
			resetGlobalResponsiveFields(tempData);
			resetGlobalSimpleFields(tempData);
			tempData.portraitLayers = [];
			tempData.cardBgLayers = [];
			loadGlobalImageFields(tempData, {});
			return true;

		case RESET_SCOPE_IDS.ACTION_MENU:
			resetSchemaFieldSubset(
				tempData,
				GLOBAL_THEME_FONT_LAYOUT_FIELDS,
				ACTION_MENU_THEME_FIELDS,
			);
			resetSchemaFieldSubset(
				tempData,
				GLOBAL_MENU_BEHAVIOR_FIELDS,
				ACTION_MENU_BEHAVIOR_FIELDS,
			);
			tempData.actionMenuScale = 1;
			tempData.actionMenuPos = { anchorX: "right", anchorY: "bottom", offsetX: 40, offsetY: 40 };
			tempData.amMenuLayers = [];
			tempData.amSubMenuLayers = [];
			loadAMElementData(tempData, {});
			return true;

		case RESET_SCOPE_IDS.MENU:
			tempData.customMenu = clonePlain(defaults.customMenu || []);
			tempData.adapterCategoryOverrides = {};
			return true;

		case RESET_SCOPE_IDS.EFFECTS:
			tempData.statusEffects = clonePlain(defaults.statusEffects || []);
			return true;

		case RESET_SCOPE_IDS.ALL:
			for (const section of GLOBAL_RESET_SECTION_IDS) {
				resetGlobalSection(tempData, section, defaults);
			}
			return true;

		default:
			return false;
	}
}

export function resetActorSection(tempData, actorId, scope) {
	if (!tempData.actorSettings) tempData.actorSettings = {};
	if (!tempData.actorAttributes) tempData.actorAttributes = {};
	if (!tempData.imageRules) tempData.imageRules = {};

	switch (scope) {
		case RESET_SCOPE_IDS.TRACKING:
			delete tempData.actorAttributes[actorId];
			return true;

		case RESET_SCOPE_IDS.CARD: {
			const current = tempData.actorSettings[actorId] || {};
			const portraitSettings = {};
			for (const key of ACTOR_PORTRAIT_FIELDS) {
				if (Object.hasOwn(current, key)) {
					portraitSettings[key] = clonePlain(current[key]);
				}
			}
			setActorSettings(tempData, actorId, portraitSettings);
			delete tempData.imageRules[actorId];
			return true;
		}

		case RESET_SCOPE_IDS.PORTRAIT: {
			const settings = clonePlain(tempData.actorSettings[actorId] || {});
			for (const key of ACTOR_PORTRAIT_FIELDS) delete settings[key];
			setActorSettings(tempData, actorId, settings);
			return true;
		}

		case RESET_SCOPE_IDS.ALL:
			delete tempData.actorSettings[actorId];
			delete tempData.actorAttributes[actorId];
			delete tempData.imageRules[actorId];
			return true;

		default:
			return false;
	}
}
