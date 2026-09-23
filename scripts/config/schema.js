/**
 * Central schema for all global configuration fields.
 * ─────────────────────────────────────────────────────
 * Add / remove a field HERE → automatically reflected in:
 *   context.js          (initializeTempData, prepareContext)
 *   capture.js          (captureGlobalSettings, captureAttributes)
 *   handlers.js         (onSave)
 *   templates.js        (stat fallback)
 *   preview-renderer.js (live CSS variable preview via cssVar)
 *
 * NEVER scatter field definitions across multiple files again.
 */

// ── Helpers ──────────────────────────────────────────

function _num(value, fallback) {
	if (value === "" || value === null || value === undefined) return fallback;
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
}

function _str(value, fallback) {
	return (typeof value === "string" && value) ? value : fallback;
}

export function coerceNullableNumber(value) {
	if (value === "" || value === null || value === undefined) return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

const CONDITIONS_LAYOUTS = new Set(["horizontal", "vertical", "hidden"]);

export function normalizeConditionsLayout(value, fallback = "horizontal") {
	const safeFallback = CONDITIONS_LAYOUTS.has(fallback) ? fallback : "horizontal";
	return CONDITIONS_LAYOUTS.has(value) ? value : safeFallback;
}

function _optionalNum(value) {
	if (value === "" || value === null || value === undefined) return undefined;
	const n = Number(value);
	return Number.isFinite(n) ? n : undefined;
}

function _nullableStr(value) {
	if (value === "" || value === null || value === undefined) return null;
	return String(value);
}

export const GLOBAL_SIMPLE_FIELDS = [
	{ key: "conditionsX", type: "number", fallback: 0, contextKey: "globalConditionsX" },
	{ key: "conditionsY", type: "number", fallback: 0, contextKey: "globalConditionsY" },
	{ key: "globalConditionsZ", type: "number", fallback: 5 },
	{ key: "conditionsLayout", type: "conditions-layout", fallback: "horizontal", contextKey: "globalConditionsLayout" },
	{ key: "globalBarsX", type: "number", fallback: 0 },
	{ key: "globalBarsY", type: "number", fallback: 0 },
	{ key: "globalBarsZ", type: "number", fallback: 5 },
	{ key: "globalDotsX", type: "number", fallback: 0 },
	{ key: "globalDotsY", type: "number", fallback: 0 },
	{ key: "globalDotsZ", type: "number", fallback: 5 },
	{ key: "globalNumbersX", type: "number", fallback: 0 },
	{ key: "globalNumbersY", type: "number", fallback: 0 },
	{ key: "globalNumbersZ", type: "number", fallback: 5 },
	{ key: "globalBadgesX", type: "number", fallback: 0 },
	{ key: "globalBadgesY", type: "number", fallback: 0 },
	{ key: "globalBadgesZ", type: "number", fallback: 150 },
	{ key: "endTurnX", type: "number", fallback: 0, contextKey: "globalEndTurnX" },
	{ key: "endTurnY", type: "number", fallback: 0, contextKey: "globalEndTurnY" },
	{ key: "globalNameX", type: "number", fallback: 0 },
	{ key: "globalNameY", type: "number", fallback: 0 },
	{ key: "globalNameZ", type: "number", fallback: 5 },
	{ key: "globalNameScale", type: "number", fallback: 1.0 },
	{ key: "globalNameRotation", type: "number", fallback: 0 },
	{ key: "globalNameColor", type: "string", fallback: "" },
	{ key: "globalPortraitX", type: "number", fallback: 0 },
	{ key: "globalPortraitY", type: "number", fallback: 0 },
	{ key: "globalPortraitScale", type: "number", fallback: 1.0 },
	{ key: "globalFormat", type: "nullable-string", fallback: null },
	{ key: "globalCollapseSize", type: "nullable-number", fallback: null },
	{ key: "globalCollapseWidth", type: "nullable-number", fallback: null },
	{ key: "globalCollapseHeight", type: "nullable-number", fallback: null },
	{ key: "globalCollapseBorderRadius", type: "nullable-number", fallback: null },
	{ key: "globalCollapseBorderColor", type: "nullable-string", fallback: null },
	{ key: "globalCollapseBgColor", type: "nullable-string", fallback: null },
	{ key: "globalCollapsePortraitX", type: "nullable-number", fallback: null },
	{ key: "globalCollapsePortraitY", type: "nullable-number", fallback: null },
	{ key: "globalCollapsePortraitScale", type: "nullable-number", fallback: null },
	{ key: "globalBarScale", type: "number", fallback: 1 },
	{ key: "globalCardWidth", type: "nullable-number", fallback: null, cssVar: "--card-width", unit: "px", nullable: true, perActorKey: "cardWidth" },
	{ key: "globalCardHeight", type: "nullable-number", fallback: null, cssVar: "--card-height", unit: "px", nullable: true, perActorKey: "cardHeight" },
	{ key: "globalPortraitWidth", type: "nullable-number", fallback: null, cssVar: "--portrait-width", unit: "px", nullable: true, perActorKey: "portraitWidth" },
	{ key: "globalPortraitHeight", type: "nullable-number", fallback: null, cssVar: "--portrait-height", unit: "px", nullable: true, perActorKey: "portraitHeight" },
	{ key: "globalPortraitClipShape", type: "string", fallback: "none" },
	{ key: "globalPortraitClipSize", type: "number", fallback: 100 },
	{ key: "globalPortraitClipX", type: "number", fallback: 50 },
	{ key: "globalPortraitClipY", type: "number", fallback: 50 },
	{ key: "globalPortraitClipRadius", type: "number", fallback: 0 },
	{ key: "globalPortraitClipCustom", type: "string", fallback: "" },
];

const _coerceSimpleFieldValue = (value, field) => {
	switch (field.type) {
		case "number":
			return _num(value, field.fallback);
		case "conditions-layout":
			return normalizeConditionsLayout(value, field.fallback);
		case "string":
			return _str(value, field.fallback);
		case "nullable-number":
			return coerceNullableNumber(value);
		case "nullable-string":
			return _nullableStr(value);
		default:
			return value ?? field.fallback;
	}
};

export function loadGlobalSimpleFields(tempData, globalConfig) {
	for (const field of GLOBAL_SIMPLE_FIELDS) {
		tempData[field.key] = _coerceSimpleFieldValue(globalConfig[field.key], field);
	}
}

export function captureGlobalSimpleFields(tempData, formData) {
	for (const field of GLOBAL_SIMPLE_FIELDS) {
		if (formData[field.key] === undefined) continue;
		tempData[field.key] = _coerceSimpleFieldValue(formData[field.key], field);
	}
}

export function getGlobalSimplePreviewData(tempData) {
	const data = {};
	for (const field of GLOBAL_SIMPLE_FIELDS) {
		data[field.key] = _coerceSimpleFieldValue(tempData[field.key], field);
	}
	return data;
}

export function getGlobalSimpleSaveData(tempData) {
	const data = {};
	for (const field of GLOBAL_SIMPLE_FIELDS) {
		data[field.key] = _coerceSimpleFieldValue(tempData[field.key], field);
	}
	return data;
}

export function getGlobalSimpleContext(tempData) {
	const data = {};
	for (const field of GLOBAL_SIMPLE_FIELDS) {
		data[field.contextKey || field.key] = _coerceSimpleFieldValue(tempData[field.key], field);
	}
	return data;
}

export function getGlobalSimpleFieldKeys() {
	return GLOBAL_SIMPLE_FIELDS.map((field) => field.key);
}

export function resetGlobalSimpleFields(tempData) {
	for (const field of GLOBAL_SIMPLE_FIELDS) {
		tempData[field.key] = field.fallback;
	}
}

export const GLOBAL_THEME_FONT_LAYOUT_FIELDS = [
	{ key: "theme", type: "string", fallback: "rift" },
	{ key: "fontFamily", type: "string", fallback: "" },
	{ key: "fontFamilySub", type: "string", fallback: "" },
	{ key: "actionMenuFont", type: "string", fallback: "" },
	{ key: "layoutMode", type: "string", fallback: "stack" },
];

const _coerceThemeFieldValue = (value, field) => {
	switch (field.type) {
		case "boolean":
			return value === true;
		case "string":
			return _str(value, field.fallback);
		default:
			return value ?? field.fallback;
	}
};

export function loadGlobalThemeFontLayoutFields(tempData, globalConfig) {
	for (const field of GLOBAL_THEME_FONT_LAYOUT_FIELDS) {
		tempData[field.key] = _coerceThemeFieldValue(globalConfig[field.key], field);
	}
}

export function captureGlobalThemeFontLayoutFields(tempData, formData) {
	for (const field of GLOBAL_THEME_FONT_LAYOUT_FIELDS) {
		if (formData[field.key] === undefined) continue;
		tempData[field.key] = _coerceThemeFieldValue(formData[field.key], field);
	}
}

export function getGlobalThemeFontLayoutContext(tempData) {
	const data = {};
	for (const field of GLOBAL_THEME_FONT_LAYOUT_FIELDS) {
		data[field.key] = _coerceThemeFieldValue(tempData[field.key], field);
	}
	return data;
}

export function getGlobalThemeFontLayoutSaveData(tempData) {
	const data = {};
	for (const field of GLOBAL_THEME_FONT_LAYOUT_FIELDS) {
		data[field.key] = _coerceThemeFieldValue(tempData[field.key], field);
	}
	return data;
}

export function getGlobalThemeFontLayoutPreviewData(tempData) {
	return getGlobalThemeFontLayoutContext(tempData);
}

export function resetGlobalThemeFontLayoutFields(tempData) {
	for (const field of GLOBAL_THEME_FONT_LAYOUT_FIELDS) {
		tempData[field.key] = field.fallback;
	}
}

export const GLOBAL_RESPONSIVE_FIELDS = [
	{ key: "responsiveEnabled", type: "boolean", fallback: true },
	{ key: "responsiveBaseWidth", type: "number", fallback: 1920 },
	{ key: "responsiveBaseHeight", type: "number", fallback: 1080 },
	{ key: "responsiveScaleMin", type: "number", fallback: 0.7 },
	{ key: "responsiveScaleMax", type: "number", fallback: 1.3 },
];

const _coerceResponsiveFieldValue = (value, field) => {
	switch (field.type) {
		case "boolean":
			return value === true;
		case "number":
			return _num(value, field.fallback);
		default:
			return value ?? field.fallback;
	}
};

export function loadGlobalResponsiveFields(tempData, globalConfig) {
	for (const field of GLOBAL_RESPONSIVE_FIELDS) {
		tempData[field.key] = _coerceResponsiveFieldValue(globalConfig[field.key], field);
	}
}

export function captureGlobalResponsiveFields(tempData, formData) {
	for (const field of GLOBAL_RESPONSIVE_FIELDS) {
		if (formData[field.key] === undefined) continue;
		tempData[field.key] = _coerceResponsiveFieldValue(formData[field.key], field);
	}
}

export function getGlobalResponsivePreviewData(tempData) {
	const data = {};
	for (const field of GLOBAL_RESPONSIVE_FIELDS) {
		data[field.key] = _coerceResponsiveFieldValue(tempData[field.key], field);
	}
	return data;
}

export function getGlobalResponsiveSaveData(tempData) {
	const data = {};
	for (const field of GLOBAL_RESPONSIVE_FIELDS) {
		data[field.key] = _coerceResponsiveFieldValue(tempData[field.key], field);
	}
	return data;
}

export function resetGlobalResponsiveFields(tempData) {
	for (const field of GLOBAL_RESPONSIVE_FIELDS) {
		tempData[field.key] = field.fallback;
	}
}

export const GLOBAL_MENU_BEHAVIOR_FIELDS = [
	{ key: "enableActionMenu", type: "boolean", fallback: true },
	{ key: "actionMenuUseTokenImg", type: "boolean", fallback: false },
	{ key: "actionMenuEmphasizeFirstButton", type: "boolean", fallback: true },
	{ key: "closeMenuOnUse", type: "boolean", fallback: false },
	{ key: "hideEmptySubmenus", type: "boolean", fallback: true },
	{ key: "dnd5eGroupActionsByActivation", type: "boolean", fallback: false },
	{ key: "collapseCards", type: "boolean", fallback: false },
	{ key: "actionMenuVisibility", type: "string", fallback: "always" },
];

const _coerceMenuBehaviorFieldValue = (value, field) => {
	switch (field.type) {
		case "boolean":
			return value === undefined || value === null ? field.fallback : value === true;
		case "string":
			return _str(value, field.fallback);
		default:
			return value ?? field.fallback;
	}
};

export function loadGlobalMenuBehaviorFields(tempData, globalConfig) {
	for (const field of GLOBAL_MENU_BEHAVIOR_FIELDS) {
		tempData[field.key] = _coerceMenuBehaviorFieldValue(globalConfig[field.key], field);
	}
}

export function captureGlobalMenuBehaviorFields(tempData, formData) {
	for (const field of GLOBAL_MENU_BEHAVIOR_FIELDS) {
		if (formData[field.key] === undefined) continue;
		tempData[field.key] = _coerceMenuBehaviorFieldValue(formData[field.key], field);
	}
}

export function getGlobalMenuBehaviorContext(tempData) {
	const data = {};
	for (const field of GLOBAL_MENU_BEHAVIOR_FIELDS) {
		data[field.key] = _coerceMenuBehaviorFieldValue(tempData[field.key], field);
	}
	return data;
}

export function getGlobalMenuBehaviorSaveData(tempData) {
	const data = {};
	for (const field of GLOBAL_MENU_BEHAVIOR_FIELDS) {
		data[field.key] = _coerceMenuBehaviorFieldValue(tempData[field.key], field);
	}
	return data;
}

export function getGlobalMenuBehaviorPreviewData(tempData) {
	return getGlobalMenuBehaviorContext(tempData);
}

export function resetGlobalMenuBehaviorFields(tempData) {
	for (const field of GLOBAL_MENU_BEHAVIOR_FIELDS) {
		tempData[field.key] = field.fallback;
	}
}

// ── Global scale / gap ──────────────────────────────

export const GLOBAL_SCALE_FIELDS = [
	{ key: "globalScale", type: "number", fallback: 1.0 },
	{ key: "globalGap", type: "number", fallback: 10 },
];

export function loadGlobalScaleFields(tempData, globalConfig) {
	for (const field of GLOBAL_SCALE_FIELDS) {
		tempData[field.key] = _num(globalConfig[field.key], field.fallback);
	}
}

export function captureGlobalScaleFields(tempData, formData) {
	for (const field of GLOBAL_SCALE_FIELDS) {
		if (formData[field.key] === undefined || formData[field.key] === "") continue;
		tempData[field.key] = _num(formData[field.key], tempData[field.key]);
	}
}

export function getGlobalScaleSaveData(tempData) {
	const data = {};
	for (const field of GLOBAL_SCALE_FIELDS) {
		data[field.key] = _num(tempData[field.key], field.fallback);
	}
	return data;
}

export function getGlobalScaleContext(tempData) {
	const data = {};
	for (const field of GLOBAL_SCALE_FIELDS) {
		data[field.key] = _num(tempData[field.key], field.fallback);
	}
	return data;
}

export function resetGlobalScaleFields(tempData) {
	for (const field of GLOBAL_SCALE_FIELDS) {
		tempData[field.key] = field.fallback;
	}
}

// ── Excluded actor types ────────────────────────────

export const EXCLUDED_ACTOR_TYPES_DEFAULT = "loot, group, vehicle";

export function loadExcludedActorTypes(tempData, globalConfig) {
	tempData.excludedActorTypes =
		globalConfig.excludedActorTypes ?? EXCLUDED_ACTOR_TYPES_DEFAULT;
}

export function captureExcludedActorTypes(tempData, formData) {
	const excludedTypes = [];
	Object.keys(formData).forEach((key) => {
		if (key.startsWith("excludedTypes.") && formData[key] === true) {
			excludedTypes.push(key.replace("excludedTypes.", ""));
		}
	});

	if (excludedTypes.length > 0) {
		tempData.excludedActorTypes = excludedTypes.join(", ");
	} else if (formData.excludedActorTypes !== undefined) {
		tempData.excludedActorTypes = String(formData.excludedActorTypes ?? "");
	} else {
		tempData.excludedActorTypes = "";
	}
}

export function getExcludedActorTypesSaveData(tempData) {
	return {
		excludedActorTypes: String(tempData.excludedActorTypes ?? ""),
	};
}

export function resetExcludedActorTypes(tempData) {
	tempData.excludedActorTypes = EXCLUDED_ACTOR_TYPES_DEFAULT;
}

export const ATTRIBUTE_SCALE_FIELDS = [
	{ key: "barScale", defaultValue: undefined },
	{ key: "dotScale", defaultValue: 1 },
	{ key: "numberScale", defaultValue: 1 },
	{ key: "badgeScale", defaultValue: 1 },
	{ key: "labelFontSize", defaultValue: undefined },
	{ key: "valueFontSize", defaultValue: undefined },
];

export function captureAttributeScaleFields(formData, index) {
	const data = {};
	for (const field of ATTRIBUTE_SCALE_FIELDS) {
		data[field.key] = _optionalNum(formData[`attributes.${index}.${field.key}`]);
	}
	return data;
}

export function getAttributeScaleDefaults() {
	const data = {};
	for (const field of ATTRIBUTE_SCALE_FIELDS) {
		if (field.defaultValue !== undefined) {
			data[field.key] = field.defaultValue;
		}
	}
	return data;
}

export const ATTRIBUTE_TEXT_COLOR_FIELDS = [
	{ key: "textColor", type: "string", defaultValue: "#000000" },
	{ key: "textStrokeColor", type: "string", defaultValue: "#ffffff" },
	{ key: "labelColor", type: "string", defaultValue: "" },
	{ key: "valueColor", type: "string", defaultValue: "" },
];

export function captureAttributeTextColorFields(formData, index) {
	const data = {};
	for (const field of ATTRIBUTE_TEXT_COLOR_FIELDS) {
		data[field.key] = formData[`attributes.${index}.${field.key}`] || field.defaultValue;
	}
	return data;
}

export function getAttributeTextColorDefaults() {
	const data = {};
	for (const field of ATTRIBUTE_TEXT_COLOR_FIELDS) {
		data[field.key] = field.defaultValue;
	}
	return data;
}

export const ATTRIBUTE_VISIBILITY_FIELDS = [
	{ key: "gmOnly", defaultValue: false },
	{ key: "ownerOnly", defaultValue: false },
	{ key: "combatOnly", defaultValue: false },
	{ key: "hideInCombat", defaultValue: false },
	{ key: "qualitativeDisplay", defaultValue: false },
	{ key: "thresholdColor", defaultValue: false },
	{ key: "showThresholdMarkers", defaultValue: false },
	{ key: "segmentedBar", defaultValue: false },
	{ key: "compactVisible", defaultValue: false },
	{ key: "compactIconOnly", defaultValue: false },
	{ key: "hitFeedback", defaultValue: false },
	{ key: "barLabelVertical", defaultValue: false },
	{ key: "barValueVertical", defaultValue: false },
];

const _coerceAttributeVisibilityValue = (value) =>
	value === true || value === "on" || value === "true";

export function captureAttributeVisibilityFields(formData, index) {
	const data = {};
	for (const field of ATTRIBUTE_VISIBILITY_FIELDS) {
		data[field.key] = _coerceAttributeVisibilityValue(
			formData[`attributes.${index}.${field.key}`],
		);
	}
	return data;
}

export function getAttributeVisibilityDefaults() {
	const data = {};
	for (const field of ATTRIBUTE_VISIBILITY_FIELDS) {
		data[field.key] = field.defaultValue;
	}
	return data;
}

export const ATTRIBUTE_QUALITATIVE_FIELDS = [
	{ key: "qualWoundedAt", type: "number", defaultValue: 75 },
	{ key: "qualBloodiedAt", type: "number", defaultValue: 50 },
	{ key: "qualCriticalAt", type: "number", defaultValue: 25 },
	{ key: "qualHealthyLabel", type: "string", defaultValue: "" },
	{ key: "qualWoundedLabel", type: "string", defaultValue: "" },
	{ key: "qualBloodiedLabel", type: "string", defaultValue: "" },
	{ key: "qualCriticalLabel", type: "string", defaultValue: "" },
	{ key: "qualDeadLabel", type: "string", defaultValue: "" },
	{ key: "qualHealthyColor", type: "string", defaultValue: "#4ade80" },
	{ key: "qualWoundedColor", type: "string", defaultValue: "#fbbf24" },
	{ key: "qualBloodiedColor", type: "string", defaultValue: "#f97316" },
	{ key: "qualCriticalColor", type: "string", defaultValue: "#ef4444" },
	{ key: "qualDeadColor", type: "string", defaultValue: "#6b7280" },
];

export function captureAttributeQualitativeFields(formData, index) {
	const data = {};
	for (const f of ATTRIBUTE_QUALITATIVE_FIELDS) {
		const raw = formData[`attributes.${index}.${f.key}`];
		data[f.key] = f.type === "number"
			? (raw === "" || raw === undefined ? f.defaultValue : Number(raw))
			: String(raw ?? f.defaultValue);
	}
	return data;
}

export function getAttributeQualitativeDefaults() {
	const data = {};
	for (const f of ATTRIBUTE_QUALITATIVE_FIELDS) {
		data[f.key] = f.defaultValue;
	}
	return data;
}

export const ATTRIBUTE_LINKED_BAR_FIELDS = [
	{ key: "linkedResourcePath", defaultValue: "" },
	{ key: "linkedResourceMaxPath", defaultValue: "" },
	{ key: "linkedResourceLabel", defaultValue: "" },
];

export function captureAttributeLinkedBarFields(formData, index, existingAttr = {}) {
	const data = {};
	for (const field of ATTRIBUTE_LINKED_BAR_FIELDS) {
		data[field.key] = String(
			formData[`attributes.${index}.${field.key}`] ?? existingAttr[field.key] ?? field.defaultValue,
		).trim();
	}
	const rawMode = formData[`attributes.${index}.linkedBarMode`] ?? existingAttr.linkedBarMode;
	data.linkedBarMode = rawMode === "danger"
		? "danger"
		: "remaining";
	return data;
}

export function getAttributeLinkedBarDefaults() {
	const data = {};
	for (const field of ATTRIBUTE_LINKED_BAR_FIELDS) {
		data[field.key] = field.defaultValue;
	}
	data.linkedBarMode = "remaining";
	return data;
}

export function resolveAttributeLinkedBarContext(attr = {}) {
	return {
		...getAttributeLinkedBarDefaults(),
		...attr,
		linkedBarMode: attr.linkedBarMode === "danger" ? "danger" : "remaining",
		isLinkedBarDanger: attr.linkedBarMode === "danger",
	};
}

export const ATTRIBUTE_THRESHOLD_COLOR_FIELDS = [
	{ key: "thresholdWoundedAt", type: "number", defaultValue: 75 },
	{ key: "thresholdBloodiedAt", type: "number", defaultValue: 50 },
	{ key: "thresholdCriticalAt", type: "number", defaultValue: 25 },
	{ key: "thresholdHealthyColor", type: "string", defaultValue: "#22c55e" },
	{ key: "thresholdWoundedColor", type: "string", defaultValue: "#eab308" },
	{ key: "thresholdBloodiedColor", type: "string", defaultValue: "#f97316" },
	{ key: "thresholdCriticalColor", type: "string", defaultValue: "#ef4444" },
	{ key: "thresholdDeadColor", type: "string", defaultValue: "#6b7280" },
];

const DEFAULT_QUALITATIVE_STAGE_DATA = [
	{ label: "Dead", threshold: 0, color: "#6b7280" },
	{ label: "Critical", threshold: 25, color: "#ef4444" },
	{ label: "Bloodied", threshold: 50, color: "#f97316" },
	{ label: "Wounded", threshold: 75, color: "#fbbf24" },
	{ label: "Healthy", threshold: 100, color: "#4ade80" },
];

const DEFAULT_RESOURCE_THRESHOLD_STAGE_DATA = [
	{ label: "Dead", threshold: 0, color: "#6b7280" },
	{ label: "Critical", threshold: 25, color: "#ef4444" },
	{ label: "Bloodied", threshold: 50, color: "#f97316" },
	{ label: "Wounded", threshold: 75, color: "#eab308" },
	{ label: "Healthy", threshold: 100, color: "#22c55e" },
];

const _cloneStageList = (stages) => stages.map((stage) => ({ ...stage }));

const _coerceStage = (stage, fallback) => ({
	label: String(stage?.label ?? fallback.label ?? "").trim(),
	threshold: Number.isFinite(Number(stage?.threshold))
		? Number(stage.threshold)
		: fallback.threshold,
	color: String(stage?.color || fallback.color || "#ffffff"),
});

const _sortStages = (stages) =>
	stages.slice().sort((a, b) => Number(a.threshold) - Number(b.threshold));

const _captureAttributeStages = (formData, index, key, defaults, existingStages = null) => {
	const stages = [];
	let maxIndex = -1;
	const prefix = `attributes.${index}.${key}.`;
	for (const formKey of Object.keys(formData)) {
		if (!formKey.startsWith(prefix)) continue;
		const remainder = formKey.slice(prefix.length);
		const match = remainder.match(/^(\d+)\./);
		if (match) maxIndex = Math.max(maxIndex, Number(match[1]));
	}
	if (maxIndex < 0) {
		return Array.isArray(existingStages) && existingStages.length > 0
			? existingStages.map((stage, index) =>
				_coerceStage(stage, defaults[Math.min(index, defaults.length - 1)]),
			)
			: _cloneStageList(defaults);
	}

	for (let i = 0; i <= maxIndex; i++) {
		const fallback = defaults[Math.min(i, defaults.length - 1)];
		stages.push(_coerceStage({
			label: formData[`attributes.${index}.${key}.${i}.label`],
			threshold: formData[`attributes.${index}.${key}.${i}.threshold`],
			color: formData[`attributes.${index}.${key}.${i}.color`],
		}, fallback));
	}
	return stages;
};

export function getAttributeQualitativeStageDefaults() {
	return _cloneStageList(DEFAULT_QUALITATIVE_STAGE_DATA);
}

export function getAttributeResourceThresholdStageDefaults() {
	return _cloneStageList(DEFAULT_RESOURCE_THRESHOLD_STAGE_DATA);
}

export function getNewAttributeStageDefault(type = "qualitative") {
	return type === "resource"
		? { label: "New Stage", threshold: 50, color: "#ffffff" }
		: { label: "New Stage", threshold: 50, color: "#ffffff" };
}

export function resolveAttributeQualitativeStages(attr = {}) {
	if (Array.isArray(attr.qualitativeStages) && attr.qualitativeStages.length > 0) {
		return _sortStages(attr.qualitativeStages.map((stage, index) =>
			_coerceStage(stage, DEFAULT_QUALITATIVE_STAGE_DATA[Math.min(index, DEFAULT_QUALITATIVE_STAGE_DATA.length - 1)]),
		));
	}

	return _sortStages([
		{ label: attr.qualDeadLabel || "Dead", threshold: 0, color: attr.qualDeadColor || "#6b7280" },
		{ label: attr.qualCriticalLabel || "Critical", threshold: attr.qualCriticalAt ?? 25, color: attr.qualCriticalColor || "#ef4444" },
		{ label: attr.qualBloodiedLabel || "Bloodied", threshold: attr.qualBloodiedAt ?? 50, color: attr.qualBloodiedColor || "#f97316" },
		{ label: attr.qualWoundedLabel || "Wounded", threshold: attr.qualWoundedAt ?? 75, color: attr.qualWoundedColor || "#fbbf24" },
		{ label: attr.qualHealthyLabel || "Healthy", threshold: 100, color: attr.qualHealthyColor || "#4ade80" },
	]);
}

export function resolveAttributeResourceThresholdStages(attr = {}) {
	if (Array.isArray(attr.resourceThresholdStages) && attr.resourceThresholdStages.length > 0) {
		return _sortStages(attr.resourceThresholdStages.map((stage, index) =>
			_coerceStage(stage, DEFAULT_RESOURCE_THRESHOLD_STAGE_DATA[Math.min(index, DEFAULT_RESOURCE_THRESHOLD_STAGE_DATA.length - 1)]),
		));
	}

	return _sortStages([
		{ label: "Dead", threshold: 0, color: attr.thresholdDeadColor || "#6b7280" },
		{ label: "Critical", threshold: attr.thresholdCriticalAt ?? 25, color: attr.thresholdCriticalColor || "#ef4444" },
		{ label: "Bloodied", threshold: attr.thresholdBloodiedAt ?? 50, color: attr.thresholdBloodiedColor || "#f97316" },
		{ label: "Wounded", threshold: attr.thresholdWoundedAt ?? 75, color: attr.thresholdWoundedColor || "#eab308" },
		{ label: "Healthy", threshold: 100, color: attr.thresholdHealthyColor || "#22c55e" },
	]);
}

export function captureAttributeQualitativeStages(formData, index, existingStages = null) {
	return _captureAttributeStages(
		formData,
		index,
		"qualitativeStages",
		DEFAULT_QUALITATIVE_STAGE_DATA,
		existingStages,
	);
}

export function captureAttributeResourceThresholdStages(formData, index, existingStages = null) {
	return _captureAttributeStages(
		formData,
		index,
		"resourceThresholdStages",
		DEFAULT_RESOURCE_THRESHOLD_STAGE_DATA,
		existingStages,
	);
}

export function captureAttributeThresholdColorFields(formData, index) {
	const data = {};
	for (const f of ATTRIBUTE_THRESHOLD_COLOR_FIELDS) {
		const raw = formData[`attributes.${index}.${f.key}`];
		data[f.key] = f.type === "number"
			? (raw === "" || raw === undefined ? f.defaultValue : Number(raw))
			: String(raw || f.defaultValue);
	}
	return data;
}

export function getAttributeThresholdColorDefaults() {
	const data = {};
	for (const f of ATTRIBUTE_THRESHOLD_COLOR_FIELDS) {
		data[f.key] = f.defaultValue;
	}
	data.qualitativeStages = getAttributeQualitativeStageDefaults();
	data.resourceThresholdStages = getAttributeResourceThresholdStageDefaults();
	return data;
}

export const ATTRIBUTE_ICON_FIELDS = [
	{ key: "iconImg", defaultValue: "" },
];

export function normalizeAttributeIconClass(value) {
	const trimmed = value?.trim() || "";
	if (trimmed.startsWith("ra-") && !trimmed.includes("ra ")) {
		return `ra ${trimmed}`;
	}
	return trimmed;
}

export function captureAttributeIconFields(formData, index) {
	const data = {
		icon: normalizeAttributeIconClass(formData[`attributes.${index}.icon`]),
	};
	for (const field of ATTRIBUTE_ICON_FIELDS) {
		data[field.key] = formData[`attributes.${index}.${field.key}`]?.trim() || field.defaultValue;
	}
	return data;
}

export function getAttributeIconDefaults(defaultIcon = "") {
	const data = {
		icon: defaultIcon,
	};
	for (const field of ATTRIBUTE_ICON_FIELDS) {
		data[field.key] = field.defaultValue;
	}
	return data;
}

export const ATTRIBUTE_META_FIELDS = [
	{ key: "path", defaultValue: "", type: "trim-string" },
	{ key: "maxPath", defaultValue: "", type: "trim-string" },
	{ key: "label", defaultValue: "", type: "trim-string" },
	{ key: "style", defaultValue: "bar", type: "string" },
	{ key: "color", defaultValue: "", type: "raw" },
	{ key: "x", defaultValue: 0, type: "number-zero" },
	{ key: "y", defaultValue: 0, type: "number-zero" },
];

export const ATTRIBUTE_POSITION_FIELDS = [
	{ key: "barLabelX", defaultValue: 0 },
	{ key: "barLabelY", defaultValue: 0 },
	{ key: "barValueX", defaultValue: 0 },
	{ key: "barValueY", defaultValue: 0 },
	{ key: "barLabelRotation", defaultValue: 0 },
	{ key: "barValueRotation", defaultValue: 0 },
	{ key: "numberLabelX", defaultValue: 0 },
	{ key: "numberLabelY", defaultValue: 0 },
	{ key: "numberValueX", defaultValue: 0 },
	{ key: "numberValueY", defaultValue: 0 },
];

const _coerceAttributeMetaValue = (value, field) => {
	switch (field.type) {
		case "trim-string":
			return value?.trim();
		case "string":
			return value || field.defaultValue;
		case "raw":
			return value;
		case "number-zero":
			return Number(value) || 0;
		default:
			return value ?? field.defaultValue;
	}
};

export function captureAttributeMetaFields(formData, index) {
	const data = {};
	for (const field of ATTRIBUTE_META_FIELDS) {
		data[field.key] = _coerceAttributeMetaValue(
			formData[`attributes.${index}.${field.key}`],
			field,
		);
	}
	return data;
}

export function captureAttributePositionFields(formData, index) {
	const data = {};
	for (const field of ATTRIBUTE_POSITION_FIELDS) {
		data[field.key] = Number(formData[`attributes.${index}.${field.key}`]) || field.defaultValue;
	}
	return data;
}

export function getAttributeMetaDefaults({ type = "bar", defaultColor = "", x = 0, y = 0 } = {}) {
	return {
		path: "",
		maxPath: "",
		label: "",
		style: type,
		color: defaultColor,
		x,
		y,
	};
}

export const ATTRIBUTE_BADGE_CONDITION_FIELDS = [
	{ key: "img", defaultValue: "", type: "trim-string" },
	{ key: "type", defaultValue: "percent", type: "string" },
	{ key: "operator", defaultValue: "lte", type: "string" },
	{ key: "threshold", defaultValue: 0, type: "number-zero" },
];

const _coerceBadgeConditionValue = (value, field) => {
	switch (field.type) {
		case "trim-string":
			return value?.trim() || field.defaultValue;
		case "string":
			return value || field.defaultValue;
		case "number-zero":
			return Number(value) || field.defaultValue;
		default:
			return value ?? field.defaultValue;
	}
};

export function captureAttributeBadgeConditions(formData, index) {
	const conditions = [];
	let maxIndex = -1;
	const prefix = `attributes.${index}.badgeConditions.`;
	for (const key of Object.keys(formData)) {
		if (!key.startsWith(prefix)) continue;
		const remainder = key.slice(prefix.length);
		const match = remainder.match(/^(\d+)\./);
		if (match) maxIndex = Math.max(maxIndex, Number(match[1]));
	}
	for (let i = 0; i <= maxIndex; i++) {
		const condition = {};
		for (const field of ATTRIBUTE_BADGE_CONDITION_FIELDS) {
			condition[field.key] = _coerceBadgeConditionValue(
				formData[`attributes.${index}.badgeConditions.${i}.${field.key}`],
				field,
			);
		}
		conditions.push(condition);
	}
	return conditions;
}

export function getAttributeBadgeConditionDefaults() {
	const condition = {};
	for (const field of ATTRIBUTE_BADGE_CONDITION_FIELDS) {
		condition[field.key] = field.defaultValue;
	}
	return condition;
}

export const LAYER_TYPE_DEFAULTS = {
	portrait: {
		zIndex: 60,
		width: 0,
		height: 0,
		scale: 1.0,
		x: 0,
		y: 0,
		rotation: 0,
		opacity: 1.0,
		blend: "normal",
	},
	cardBg: {
		zIndex: 10,
		width: 0,
		height: 0,
		scale: 1.0,
		x: 0,
		y: 0,
		rotation: 0,
		opacity: 1.0,
		blend: "normal",
	},
	amMenu: {
		zIndex: 10,
		width: 0,
		height: 0,
		scale: 1.0,
		x: 0,
		y: 0,
		rotation: 0,
		opacity: 1.0,
		blend: "normal",
	},
};

export function getLayerDefaults(layerType = "cardBg") {
	return {
		id: foundry.utils.randomID(),
		src: "",
		...(LAYER_TYPE_DEFAULTS[layerType] || LAYER_TYPE_DEFAULTS.cardBg),
	};
}

export const LAYER_KEY_TO_TYPE = {
	portraitLayers: "portrait",
	cardBgLayers: "cardBg",
	amMenuLayers: "amMenu",
	amSubMenuLayers: "amMenu",
	buttonFrameLayers: "amMenu",
};

export function getLayerTypeForKey(layerKey = "cardBgLayers") {
	if (LAYER_KEY_TO_TYPE[layerKey]) return LAYER_KEY_TO_TYPE[layerKey];
	if (layerKey.endsWith("Layers")) return "amMenu";
	return "cardBg";
}

export function getLayerCaptureDefaultZ(layerKey = "cardBgLayers") {
	return LAYER_TYPE_DEFAULTS[getLayerTypeForKey(layerKey)]?.zIndex ?? 10;
}

export function captureLayerRow(formData, layerKey, index) {
	const src = String(formData[`${layerKey}.${index}.src`] || "").trim();
	if (!src) return null;

	const defaults = getLayerDefaults(getLayerTypeForKey(layerKey));
	const numberOrDefault = (field) => {
		const value = formData[`${layerKey}.${index}.${field}`];
		return value === "" || value === undefined ? defaults[field] : Number(value);
	};

	return {
		id: formData[`${layerKey}.${index}.id`] || defaults.id,
		src,
		zIndex: numberOrDefault("zIndex"),
		width: numberOrDefault("width"),
		height: numberOrDefault("height"),
		scale: numberOrDefault("scale"),
		x: numberOrDefault("x"),
		y: numberOrDefault("y"),
		rotation: numberOrDefault("rotation"),
		opacity: numberOrDefault("opacity"),
		blend: formData[`${layerKey}.${index}.blend`] || defaults.blend,
	};
}

export function layerRowsEqual(a, b) {
	return a.id === b.id
		&& a.src === b.src
		&& Number(a.zIndex) === Number(b.zIndex)
		&& Number(a.scale) === Number(b.scale)
		&& Number(a.x) === Number(b.x)
		&& Number(a.y) === Number(b.y)
		&& Number(a.rotation) === Number(b.rotation)
		&& Number(a.opacity) === Number(b.opacity)
		&& Number(a.width || 0) === Number(b.width || 0)
		&& Number(a.height || 0) === Number(b.height || 0)
		&& (a.blend || "normal") === (b.blend || "normal");
}

export function layersMatchGlobal(actorLayers = [], globalLayers = []) {
	if (actorLayers.length !== globalLayers.length) return false;
	return actorLayers.every((actorLayer) => {
		const globalLayer = globalLayers.find((layer) => layer.id === actorLayer.id);
		return globalLayer && layerRowsEqual(actorLayer, globalLayer);
	});
}

export function normalizeActorLayerOverride(actorLayers = [], globalLayers = []) {
	return layersMatchGlobal(actorLayers, globalLayers) ? [] : actorLayers;
}

export function resolveLayerContext(actorLayers = [], globalLayers = [], defaultZ = 10, contentZ = 50) {
	const sourceLayers = Array.isArray(actorLayers) && actorLayers.length > 0
		? actorLayers
		: (Array.isArray(globalLayers) ? globalLayers : []);
	return injectContentMarker(
		[...sourceLayers].sort((a, b) => (b.zIndex ?? defaultZ) - (a.zIndex ?? defaultZ)),
		contentZ,
	);
}

// ── Image-element property templates ─────────────────

const IMG_PROPS = [
	{ suffix: "Img",         type: "string", fallback: "" },
	{ suffix: "ImgX",        type: "number", fallback: 0 },
	{ suffix: "ImgY",        type: "number", fallback: 0 },
	{ suffix: "ImgScale",    type: "number", fallback: 1 },
	{ suffix: "ImgRotation", type: "number", fallback: 0 },
	{ suffix: "ImgOpacity",  type: "number", fallback: 1 },
];

const IMG_PROPS_WITH_SIZE = [
	...IMG_PROPS,
	{ suffix: "ImgW", type: "number", fallback: 0 },
	{ suffix: "ImgH", type: "number", fallback: 0 },
];

// ── Element image groups ─────────────────────────────
// local  = per-attribute key prefix  (stat.barFrameImg)
// global = global config key prefix  (config.globalBarFrameImg)

export const ELEMENT_IMAGE_GROUPS = [
	{ local: "barFrame",  global: "globalBarFrame",  props: IMG_PROPS_WITH_SIZE },
	{ local: "barBg",     global: "globalBarBg",     props: IMG_PROPS_WITH_SIZE },
	{ local: "barFill",   global: "globalBarFill",   props: IMG_PROPS_WITH_SIZE },
	{ local: "dotFilled", global: "globalDotFilled", props: IMG_PROPS },
	{ local: "dotEmpty",  global: "globalDotEmpty",  props: IMG_PROPS },
	{ local: "numberBg",  global: "globalNumberBg",  props: IMG_PROPS_WITH_SIZE },
];

// ── Action Menu element definitions ──────────────────
// Each element stores: ${id}Layers (array), ${id}Width, ${id}Height, ${id}Color

export const AM_ELEMENTS = [
	{ id: "amButton",     label: "Button Frame" },
	{ id: "amMenuHeader", label: "Sub-Menu Header" },
	{ id: "amSidebar",    label: "Sidebar Panel" },
	{ id: "amTab",        label: "Tab Button" },
	{ id: "amQuickSlot",  label: "Quick Slot" },
	{ id: "amIdentity",   label: "Identity Header" },
	{ id: "amPortrait",   label: "Portrait Frame" },
	{ id: "amSideTab",    label: "Side Tab" },
	{ id: "amListItem",   label: "Item Box" },
];

const AM_TEXT_PROPS = ["TextX", "TextY", "TextScale", "TextRotation"];
const AM_TEXT_DEFAULTS = { TextX: 0, TextY: 0, TextScale: 1, TextRotation: 0 };

// ── Public API ───────────────────────────────────────

/**
 * Load global image fields from saved config → tempData.
 * Used in: context.js → initializeTempData
 */
export function loadGlobalImageFields(tempData, globalConfig) {
	for (const group of ELEMENT_IMAGE_GROUPS) {
		for (const prop of group.props) {
			const key = `${group.global}${prop.suffix}`;
			tempData[key] = prop.type === "string"
				? _str(globalConfig[key], prop.fallback)
				: _num(globalConfig[key], prop.fallback);
		}
	}
}

/**
 * Build global image fields for Handlebars template context.
 * Used in: context.js → prepareContext
 */
export function getGlobalImageContext(tempData) {
	const ctx = {};
	for (const group of ELEMENT_IMAGE_GROUPS) {
		for (const prop of group.props) {
			const key = `${group.global}${prop.suffix}`;
			ctx[key] = prop.type === "string"
				? (tempData[key] ?? prop.fallback)
				: _num(tempData[key], prop.fallback);
		}
	}
	return ctx;
}

/**
 * Capture global image fields from form → tempData.
 * Used in: capture.js → captureGlobalSettings
 */
export function captureGlobalImageFields(tempData, formData) {
	for (const group of ELEMENT_IMAGE_GROUPS) {
		for (const prop of group.props) {
			const key = `${group.global}${prop.suffix}`;
			if (formData[key] === undefined) continue;
			tempData[key] = prop.type === "string"
				? _str(formData[key], prop.fallback)
				: _num(formData[key], prop.fallback);
		}
	}
}

/**
 * Build global image fields for saving to game.settings.
 * Used in: handlers.js → onSave
 */
export function getGlobalImageSaveData(tempData) {
	const data = {};
	for (const group of ELEMENT_IMAGE_GROUPS) {
		for (const prop of group.props) {
			const key = `${group.global}${prop.suffix}`;
			data[key] = prop.type === "string"
				? (tempData[key] ?? prop.fallback)
				: _num(tempData[key], prop.fallback);
		}
	}
	return data;
}

export function getGlobalImagePreviewData(tempData) {
	const data = {};
	for (const group of ELEMENT_IMAGE_GROUPS) {
		for (const prop of group.props) {
			const key = `${group.global}${prop.suffix}`;
			data[key] = prop.type === "string"
				? (tempData[key] ?? prop.fallback)
				: _num(tempData[key], prop.fallback);
		}
	}
	return data;
}

/**
 * Apply global fallbacks to a stat object for rendering.
 * Used in: templates.js → createCardHtml stats.forEach
 */
export function applyGlobalImageFallbacks(stat, config) {
	for (const group of ELEMENT_IMAGE_GROUPS) {
		const localImgKey = `${group.local}Img`;
		const hasLocalImg = !!stat[localImgKey];

		for (const prop of group.props) {
			const localKey = `${group.local}${prop.suffix}`;
			const globalKey = `${group.global}${prop.suffix}`;
			if (prop.type === "string") {
				stat[localKey] = stat[localKey] || config[globalKey] || prop.fallback;
			} else if (hasLocalImg) {
				stat[localKey] = _num(
					stat[localKey] ?? config[globalKey] ?? prop.fallback,
					prop.fallback,
				);
			} else {
				stat[localKey] = _num(
					config[globalKey] ?? prop.fallback,
					prop.fallback,
				);
			}
		}
	}
}

/**
 * Parse per-attribute image fields from form data.
 * Used in: capture.js → captureAttributes
 * Returns an object to spread into the attribute.
 */
export function captureAttributeImageFields(formData, index) {
	const data = {};
	for (const group of ELEMENT_IMAGE_GROUPS) {
		for (const prop of group.props) {
			const formKey = `attributes.${index}.${group.local}${prop.suffix}`;
			const dataKey = `${group.local}${prop.suffix}`;
			if (prop.type === "string") {
				data[dataKey] = _str(String(formData[formKey] ?? "").trim(), prop.fallback);
			} else {
				data[dataKey] = _num(formData[formKey], prop.fallback);
			}
		}
	}
	return data;
}

export function getAttributeImageDefaults() {
	const data = {};
	for (const group of ELEMENT_IMAGE_GROUPS) {
		for (const prop of group.props) {
			const dataKey = `${group.local}${prop.suffix}`;
			data[dataKey] = prop.fallback;
		}
	}
	return data;
}

// ── Action Menu element API ──────────────────────────

export function loadAMElementData(tempData, config) {
	for (const el of AM_ELEMENTS) {
		tempData[`${el.id}Layers`] = Array.isArray(config[`${el.id}Layers`])
			? config[`${el.id}Layers`].map((l) => ({ ...l }))
			: [];
		tempData[`${el.id}Color`] = _str(config[`${el.id}Color`], "");
		for (const prop of AM_TEXT_PROPS) {
			tempData[`${el.id}${prop}`] = _num(config[`${el.id}${prop}`], AM_TEXT_DEFAULTS[prop]);
		}
	}
}

export function injectContentMarker(sortedLayers, contentZ = 50) {
	const boundaries = Array.isArray(contentZ) ? [...contentZ].sort((a, b) => b - a) : [contentZ];
	const layers = [];
	let bIdx = 0;
	let realIdx = 0;
	for (const layer of sortedLayers) {
		while (bIdx < boundaries.length && (layer.zIndex || 0) < boundaries[bIdx]) {
			layers.push({ _contentMarker: true, _contentZ: boundaries[bIdx] });
			bIdx++;
		}
		layers.push({ ...layer, _realIndex: realIdx++ });
	}
	while (bIdx < boundaries.length) {
		layers.push({ _contentMarker: true, _contentZ: boundaries[bIdx] });
		bIdx++;
	}
	return layers;
}

export function getAMElementContext(tempData) {
	return AM_ELEMENTS.map((el) => {
		const sorted = (tempData[`${el.id}Layers`] || []).slice().sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
		return {
			id: el.id,
			label: el.label,
			layers: injectContentMarker(sorted, 50),
			color: tempData[`${el.id}Color`] ?? "",
			textX: _num(tempData[`${el.id}TextX`], 0),
			textY: _num(tempData[`${el.id}TextY`], 0),
			textScale: _num(tempData[`${el.id}TextScale`], 1),
			textRotation: _num(tempData[`${el.id}TextRotation`], 0),
		};
	});
}

export function captureAMElementData(tempData, formData) {
	for (const el of AM_ELEMENTS) {
		const colorKey = `${el.id}Color`;
		if (formData[colorKey] !== undefined) tempData[colorKey] = _str(formData[colorKey], "");
		for (const prop of AM_TEXT_PROPS) {
			const key = `${el.id}${prop}`;
			if (formData[key] !== undefined) tempData[key] = _num(formData[key], AM_TEXT_DEFAULTS[prop]);
		}
	}
}

export function getAMElementSaveData(tempData) {
	const data = {};
	for (const el of AM_ELEMENTS) {
		data[`${el.id}Layers`] = (tempData[`${el.id}Layers`] || []).map((l) => ({ ...l }));
		data[`${el.id}Color`] = _str(tempData[`${el.id}Color`], "");
		for (const prop of AM_TEXT_PROPS) {
			data[`${el.id}${prop}`] = _num(tempData[`${el.id}${prop}`], AM_TEXT_DEFAULTS[prop]);
		}
	}
	return data;
}

export function getAMElementPreviewData(tempData) {
	const data = {};
	for (const el of AM_ELEMENTS) {
		data[`${el.id}Layers`] = tempData[`${el.id}Layers`] || [];
		data[`${el.id}Color`] = _str(tempData[`${el.id}Color`], "");
		for (const prop of AM_TEXT_PROPS) {
			data[`${el.id}${prop}`] = _num(tempData[`${el.id}${prop}`], AM_TEXT_DEFAULTS[prop]);
		}
	}
	return data;
}

export function addAMLayer(tempData, layerKey) {
	if (!Array.isArray(tempData[layerKey])) tempData[layerKey] = [];
	tempData[layerKey].push(getLayerDefaults("amMenu"));
}

export function removeAMLayer(tempData, layerKey, index) {
	if (!Array.isArray(tempData[layerKey])) return;
	tempData[layerKey].splice(index, 1);
}

// ── 이펙트(필터/오버레이/틴트) 기본값 ──────────────────────────

export const EFFECTS_DEFAULTS = {
	filters: { grayscale: 0, sepia: 0, contrast: 100, brightness: 100, saturate: 100, blur: 0 },
	overlay: { path: "", scale: 1.0, x: 0, y: 0, opacity: 1.0, blend: "normal", animation: "" },
	tint: { color: "#000000", alpha: 0, animation: "" },
};

export function getEffectsDefaults() {
	return {
		filters: { ...EFFECTS_DEFAULTS.filters },
		overlay: { ...EFFECTS_DEFAULTS.overlay },
		tint: { ...EFFECTS_DEFAULTS.tint },
	};
}

/**
 * 폼 데이터에서 nested effects 번들(filters/overlay/tint)을 캡처.
 * numGetter(field, fallback) → number, strGetter(field, fallback) → string
 * field는 "filters.grayscale", "overlay.path" 등 2-depth 점 경로.
 */
export function captureEffectsBundle(numGetter, strGetter) {
	return {
		filters: {
			grayscale: numGetter("filters.grayscale", 0),
			sepia: numGetter("filters.sepia", 0),
			contrast: numGetter("filters.contrast", 100),
			brightness: numGetter("filters.brightness", 100),
			saturate: numGetter("filters.saturate", 100),
			blur: numGetter("filters.blur", 0),
		},
		overlay: {
			path: strGetter("overlay.path", ""),
			scale: numGetter("overlay.scale", 1.0),
			x: numGetter("overlay.x", 0),
			y: numGetter("overlay.y", 0),
			opacity: numGetter("overlay.opacity", 1.0),
			blend: strGetter("overlay.blend", "normal"),
			animation: strGetter("overlay.animation", ""),
		},
		tint: {
			color: strGetter("tint.color", "#000000"),
			alpha: numGetter("tint.alpha", 0),
			animation: strGetter("tint.animation", ""),
		},
	};
}

export function mergeEffectsWithDefaults(saved) {
	return {
		filters: { ...EFFECTS_DEFAULTS.filters, ...(saved?.filters || {}) },
		overlay: { ...EFFECTS_DEFAULTS.overlay, ...(saved?.overlay || {}) },
		tint: { ...EFFECTS_DEFAULTS.tint, ...(saved?.tint || {}) },
	};
}

// ── 액터별 포지션 필드 (글로벌 폴백 + 테마 기본값) ─────────────

/**
 * 캡처 타입:
 *   "num"  — numOrGlobal (기본값, 빈 값 → null)
 *   "cmp"  — compare-against-global (글로벌 값과 같으면 undefined)
 *   "str"  — 문자열 (빈 값 → null)
 */
export const ACTOR_POSITION_FIELDS = [
	{ key: "nameX", globalKey: "globalNameX", themeKey: "nameX", fallback: 0, cssVar: "--name-x", unit: "px" },
	{ key: "nameY", globalKey: "globalNameY", themeKey: "nameY", fallback: 0, cssVar: "--name-y", unit: "px" },
	{ key: "nameZ", globalKey: "globalNameZ", themeKey: "nameZ", fallback: 5, cssVar: "--name-z" },
	{ key: "nameScale", globalKey: "globalNameScale", themeKey: "nameScale", fallback: 1.0, cssVar: "--name-scale" },
	{ key: "nameRotation", globalKey: "globalNameRotation", themeKey: "nameRotation", fallback: 0, cssVar: "--name-rotation", unit: "deg" },
	{ key: "nameColor", globalKey: "globalNameColor", fallback: "", capture: "str", cssVar: "--name-color", cssDefault: "inherit" },
	{ key: "barsX", globalKey: "globalBarsX", themeKey: "barsX", fallback: 0, cssVar: "--bars-x", unit: "px" },
	{ key: "barsY", globalKey: "globalBarsY", themeKey: "barsY", fallback: 0, cssVar: "--bars-y", unit: "px" },
	{ key: "barsZ", globalKey: "globalBarsZ", themeKey: "barsZ", fallback: 5, cssVar: "--bars-z" },
	{ key: "dotsX", globalKey: "globalDotsX", themeKey: "dotsX", fallback: 0, cssVar: "--dots-x", unit: "px" },
	{ key: "dotsY", globalKey: "globalDotsY", themeKey: "dotsY", fallback: 0, cssVar: "--dots-y", unit: "px" },
	{ key: "dotsZ", globalKey: "globalDotsZ", themeKey: "dotsZ", fallback: 5, cssVar: "--dots-z" },
	{ key: "numbersX", globalKey: "globalNumbersX", themeKey: "numbersX", fallback: 0, cssVar: "--numbers-x", unit: "px" },
	{ key: "numbersY", globalKey: "globalNumbersY", themeKey: "numbersY", fallback: 0, cssVar: "--numbers-y", unit: "px" },
	{ key: "numbersZ", globalKey: "globalNumbersZ", themeKey: "numbersZ", fallback: 5, cssVar: "--numbers-z" },
	{ key: "badgesX", globalKey: "globalBadgesX", themeKey: "badgesX", fallback: 0, cssVar: "--badges-x", unit: "px" },
	{ key: "badgesY", globalKey: "globalBadgesY", themeKey: "badgesY", fallback: 0, cssVar: "--badges-y", unit: "px" },
	{ key: "badgesZ", globalKey: "globalBadgesZ", themeKey: "badgesZ", fallback: 150, cssVar: "--badges-z" },
	{ key: "conditionsX", globalKey: "conditionsX", themeKey: "conditionsX", fallback: 0, capture: "cmp", cssVar: "--conditions-x", unit: "px" },
	{ key: "conditionsY", globalKey: "conditionsY", themeKey: "conditionsY", fallback: 0, capture: "cmp", cssVar: "--conditions-y", unit: "px" },
	{ key: "conditionsZ", globalKey: "globalConditionsZ", themeKey: "conditionsZ", fallback: 5, cssVar: "--conditions-z" },
	{ key: "conditionsLayout", globalKey: "conditionsLayout", themeKey: "conditionsLayout", fallback: "horizontal", capture: "conditions-layout" },
	{ key: "endTurnX", globalKey: "endTurnX", themeKey: "endTurnX", fallback: 0, capture: "cmp", cssVar: "--end-turn-x", unit: "px" },
	{ key: "endTurnY", globalKey: "endTurnY", themeKey: "endTurnY", fallback: 0, capture: "cmp", cssVar: "--end-turn-y", unit: "px" },
	{ key: "portraitClipShape", globalKey: "globalPortraitClipShape", fallback: "none", capture: "str" },
	{ key: "portraitClipSize", globalKey: "globalPortraitClipSize", fallback: 100 },
	{ key: "portraitClipX", globalKey: "globalPortraitClipX", fallback: 50 },
	{ key: "portraitClipY", globalKey: "globalPortraitClipY", fallback: 50 },
	{ key: "portraitClipRadius", globalKey: "globalPortraitClipRadius", fallback: 0 },
	{ key: "portraitClipCustom", globalKey: "globalPortraitClipCustom", fallback: "", capture: "str" },
];

export function resolveActorPositionFields(savedStyle, config, themeDefaults) {
	const result = {};
	for (const f of ACTOR_POSITION_FIELDS) {
		const value = savedStyle[f.key]
			?? config[f.globalKey]
			?? (f.themeKey ? themeDefaults[f.themeKey] : undefined)
			?? f.fallback;
		result[f.key] = f.capture === "conditions-layout"
			? normalizeConditionsLayout(value, f.fallback)
			: value;
	}
	return result;
}

export function captureActorPositionFields(formData, existingSettings, tempData) {
	const result = {};
	for (const f of ACTOR_POSITION_FIELDS) {
		const raw = formData[f.key];
		const mode = f.capture ?? "num";

		if (mode === "cmp") {
			const globalVal = tempData[f.globalKey] ?? 0;
			if (raw === "" || raw === undefined || raw === null) {
				result[f.key] = undefined;
			} else {
				result[f.key] = Number(raw) === globalVal ? undefined : Number(raw);
			}
		} else if (mode === "conditions-layout") {
			if (raw === undefined) {
				const existing = existingSettings[f.key];
				result[f.key] = existing === undefined || existing === null || existing === ""
					? null
					: normalizeConditionsLayout(existing, f.fallback);
			} else if (raw === "" || raw === null) {
				result[f.key] = null;
			} else {
				result[f.key] = normalizeConditionsLayout(raw, f.fallback);
			}
		} else if (mode === "str") {
			result[f.key] = raw === undefined
				? existingSettings[f.key] ?? null
				: (raw || null);
		} else {
			if (raw === undefined) { result[f.key] = existingSettings[f.key]; continue; }
			if (raw === "" || raw === null) { result[f.key] = null; continue; }
			const n = Number(raw);
			result[f.key] = Number.isFinite(n) ? n : null;
		}
	}
	return result;
}

// ── 액터별 사이즈 필드 (nullable number, 글로벌 폴백) ─────────

export const ACTOR_SIZE_FIELDS = [
	{ key: "cardWidth",      globalKey: "globalCardWidth" },
	{ key: "cardHeight",     globalKey: "globalCardHeight" },
	{ key: "portraitWidth",  globalKey: "globalPortraitWidth" },
	{ key: "portraitHeight", globalKey: "globalPortraitHeight" },
];

export function captureActorSizeFields(formData) {
	const result = {};
	for (const f of ACTOR_SIZE_FIELDS) {
		result[f.key] = coerceNullableNumber(formData[f.key]);
	}
	return result;
}

export function resolveActorSizeFields(savedStyle, config) {
	const result = {};
	for (const f of ACTOR_SIZE_FIELDS) {
		result[f.key] = savedStyle[f.key] ?? config[f.globalKey] ?? null;
	}
	return result;
}

// ── Preview CSS Variable Automation ────────────────────────

export function resolvePortraitClipPath(shape, size, x, y, radius, custom) {
	const s = size ?? 100;
	const cx = x ?? 50;
	const cy = y ?? 50;
	const half = s / 2;
	switch (shape) {
		case "rectangle": {
			const t = Math.max(0, cy - half);
			const r = Math.max(0, 100 - cx - half);
			const b = Math.max(0, 100 - cy - half);
			const l = Math.max(0, cx - half);
			const inset = `${t}% ${r}% ${b}% ${l}%`;
			return radius ? `inset(${inset} round ${radius}px)` : `inset(${inset})`;
		}
		case "circle": return `circle(${half}% at ${cx}% ${cy}%)`;
		case "diamond": return `polygon(${cx}% ${cy - half}%, ${cx + half}% ${cy}%, ${cx}% ${cy + half}%, ${cx - half}% ${cy}%)`;
		case "custom": return custom || "none";
		default: return "none";
	}
}

function _resolveClipFromData(data, prefix) {
	return resolvePortraitClipPath(
		data[`${prefix}ClipShape`],
		data[`${prefix}ClipSize`],
		data[`${prefix}ClipX`],
		data[`${prefix}ClipY`],
		data[`${prefix}ClipRadius`],
		data[`${prefix}ClipCustom`],
	);
}

function _formatCssValue(value, field) {
	const v = value ?? field.fallback;
	if (field.cssDefault && !v && v !== 0) return field.cssDefault;
	return field.unit ? `${v}${field.unit}` : v;
}

/**
 * Global preview: apply schema-driven CSS variables to all cards.
 * Skips cards that have per-actor overrides.
 * @param {jQuery} container  HUD container
 * @param {Object} data       preview data from triggerPreviewGlobal
 */
export function applyGlobalCssPreview(container, data) {
	const posFields = ACTOR_POSITION_FIELDS.filter((f) => f.cssVar);
	const simpleFields = GLOBAL_SIMPLE_FIELDS.filter((f) => f.cssVar);

	const changedPos = posFields.filter((f) => data[f.globalKey] !== undefined);
	const changedSimple = simpleFields.filter((f) => data[f.key] !== undefined);
	if (changedPos.length === 0 && changedSimple.length === 0) return;

	container.find(".ib-card").each((_, el) => {
		const card = $(el);
		const actorId = card.data("actor-id");
		const perActor = data.actorSettings?.[actorId] || {};

		for (const f of changedPos) {
			if (perActor[f.key] != null) continue;
			card.css(f.cssVar, _formatCssValue(data[f.globalKey], f));
		}

		for (const f of changedSimple) {
			if (f.perActorKey && perActor[f.perActorKey] != null) continue;
			if (f.nullable) {
				if (data[f.key]) card.css(f.cssVar, _formatCssValue(data[f.key], f));
				else el.style.removeProperty(f.cssVar);
			} else {
				card.css(f.cssVar, _formatCssValue(data[f.key], f));
			}
		}

		if (perActor.portraitClipShape == null) {
			card.css("--portrait-clip-path", _resolveClipFromData(data, "globalPortrait"));
		}
	});
}

/**
 * Per-actor preview: build cardCss object from schema fields.
 * @param {Object} data  per-actor preview data
 * @returns {Object}     CSS variable map for card.css()
 */
export function buildActorCssPreview(data) {
	const css = {};
	for (const f of ACTOR_POSITION_FIELDS) {
		if (!f.cssVar) continue;
		css[f.cssVar] = _formatCssValue(data[f.key], f);
	}
	css["--portrait-clip-path"] = _resolveClipFromData(data, "portrait");
	return css;
}

/**
 * Per-actor preview: apply nullable dimension fields to a card element.
 * Sets CSS variable if truthy, removes property if empty.
 * @param {HTMLElement} el    card DOM element
 * @param {Object} data       per-actor preview data
 */
export function applyActorNullableCssPreview(el, data) {
	for (const f of ACTOR_SIZE_FIELDS) {
		const globalField = GLOBAL_SIMPLE_FIELDS.find((g) => g.perActorKey === f.key);
		if (!globalField?.cssVar) continue;
		if (data[f.key]) el.style.setProperty(globalField.cssVar, `${data[f.key]}${globalField.unit || ""}`);
		else el.style.removeProperty(globalField.cssVar);
	}
}

export function evaluateBadgeConditions(conditions, value, percent) {
	if (!Array.isArray(conditions) || conditions.length === 0) return null;
	const sorted = [...conditions].sort((a, b) => a.threshold - b.threshold);
	for (const cond of sorted) {
		const compare = cond.type === "value" ? value : percent;
		const t = cond.threshold;
		let match = false;
		switch (cond.operator) {
			case "lte": match = compare <= t; break;
			case "lt":  match = compare < t;  break;
			case "gte": match = compare >= t; break;
			case "gt":  match = compare > t;  break;
			case "eq":  match = compare === t; break;
		}
		if (match && cond.img) return cond.img;
	}
	return null;
}
