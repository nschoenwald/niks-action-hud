/**
 * Central schema and normalization definitions for Nik's Action HUD.
 * Exclusively designed for Foundry V14.
 */
import { AM_ELEMENTS } from "./constants.js";

export { AM_ELEMENTS };

// ── Primitive Coercion Helpers ──────────────────────────

export function coerceNumber(value, fallback = 0) {
	if (value === "" || value === null || value === undefined) return fallback;
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
}

export function coerceNullableNumber(value) {
	if (value === "" || value === null || value === undefined) return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

export function coerceBoolean(value, fallback = false) {
	if (value === undefined || value === null) return fallback;
	return value === true || value === "true" || value === "1" || value === 1;
}

export function coerceString(value, fallback = "") {
	return typeof value === "string" ? value : (value ? String(value) : fallback);
}

// ── Layer Utilities ──────────────────────────────────────

export function injectContentMarker(layers = [], contentZ = 50) {
	const validLayers = Array.isArray(layers) ? [...layers] : [];
	const sorted = validLayers.sort((a, b) => (b.zIndex ?? 10) - (a.zIndex ?? 10));

	let markerPlaced = false;
	const result = [];
	const targets = Array.isArray(contentZ) ? contentZ : [contentZ];

	for (const layer of sorted) {
		const z = layer.zIndex ?? 10;
		for (const target of targets) {
			if (!markerPlaced && z < target) {
				result.push({ _contentMarker: true, zIndex: target });
				markerPlaced = true;
			}
		}
		result.push(layer);
	}

	if (!markerPlaced) {
		const fallbackZ = targets[0] ?? 50;
		result.push({ _contentMarker: true, zIndex: fallbackZ });
	}

	return result;
}

export function resolveLayerContext(customLayers = [], defaultLayers = [], defaultZ = 10, contentZ = 50) {
	const source = Array.isArray(customLayers) && customLayers.length > 0
		? customLayers
		: (Array.isArray(defaultLayers) ? defaultLayers : []);
	return injectContentMarker([...source], contentZ);
}

// ── Field Schema Definitions ─────────────────────────────

export const APPEARANCE_FIELDS = Object.freeze([
	{ key: "theme", type: "string", fallback: "rift" },
	{ key: "actionMenuFont", type: "string", fallback: "" },
	{ key: "actionMenuScale", type: "number", fallback: 1.0 },
	{ key: "actionMenuUseTokenImg", type: "boolean", fallback: false },
	{ key: "actionMenuEmphasizeFirstButton", type: "boolean", fallback: true },
	{ key: "responsiveEnabled", type: "boolean", fallback: true },
	{ key: "responsiveBaseWidth", type: "number", fallback: 1920 },
	{ key: "responsiveBaseHeight", type: "number", fallback: 1080 },
	{ key: "responsiveScaleMin", type: "number", fallback: 0.7 },
	{ key: "responsiveScaleMax", type: "number", fallback: 1.3 },
]);

export const BEHAVIOR_FIELDS = Object.freeze([
	{ key: "enableActionMenu", type: "boolean", fallback: true },
	{ key: "gmHudHidden", type: "boolean", fallback: false },
	{ key: "actionMenuVisibility", type: "string", fallback: "always" },
	{ key: "closeMenuOnUse", type: "boolean", fallback: false },
	{ key: "hideEmptySubmenus", type: "boolean", fallback: true },
	{ key: "dnd5eGroupActionsByActivation", type: "boolean", fallback: false },
	{ key: "actionMenuSubmenuSide", type: "string", fallback: "auto" },
	{ key: "tooltipPosition", type: "string", fallback: "anchor" },
	{ key: "excludedActorTypes", type: "string", fallback: "" },
]);

// ── Extraction and Sanitization ──────────────────────────

export function normalizeActionMenuPos(pos) {
	if (!pos || typeof pos !== "object") {
		return { anchorX: "right", anchorY: "bottom", offsetX: 40, offsetY: 40 };
	}
	return {
		anchorX: pos.anchorX === "left" ? "left" : "right",
		anchorY: pos.anchorY === "top" ? "top" : "bottom",
		offsetX: Math.max(0, coerceNumber(pos.offsetX, 40)),
		offsetY: Math.max(0, coerceNumber(pos.offsetY, 40)),
	};
}

export function loadHudConfig(tempData, source = {}) {
	for (const f of APPEARANCE_FIELDS) {
		if (f.type === "number") tempData[f.key] = coerceNumber(source[f.key], f.fallback);
		else if (f.type === "boolean") tempData[f.key] = coerceBoolean(source[f.key], f.fallback);
		else tempData[f.key] = coerceString(source[f.key], f.fallback);
	}

	for (const f of BEHAVIOR_FIELDS) {
		if (f.type === "number") tempData[f.key] = coerceNumber(source[f.key], f.fallback);
		else if (f.type === "boolean") tempData[f.key] = coerceBoolean(source[f.key], f.fallback);
		else tempData[f.key] = coerceString(source[f.key], f.fallback);
	}

	tempData.actionMenuPos = normalizeActionMenuPos(source.actionMenuPos);
	tempData.customMenu = Array.isArray(source.customMenu) ? foundry.utils.deepClone(source.customMenu) : [];
	tempData.adapterCategoryOverrides = source.adapterCategoryOverrides && typeof source.adapterCategoryOverrides === "object"
		? foundry.utils.deepClone(source.adapterCategoryOverrides)
		: {};

	// Image theme layers
	tempData.amMenuLayers = Array.isArray(source.amMenuLayers) ? foundry.utils.deepClone(source.amMenuLayers) : [];
	tempData.amSubMenuLayers = Array.isArray(source.amSubMenuLayers) ? foundry.utils.deepClone(source.amSubMenuLayers) : [];

	for (const el of AM_ELEMENTS) {
		tempData[`${el.id}Layers`] = Array.isArray(source[`${el.id}Layers`]) ? foundry.utils.deepClone(source[`${el.id}Layers`]) : [];
		tempData[`${el.id}Scale`] = coerceNumber(source[`${el.id}Scale`], 1);
		tempData[`${el.id}X`] = coerceNumber(source[`${el.id}X`], 0);
		tempData[`${el.id}Y`] = coerceNumber(source[`${el.id}Y`], 0);
		tempData[`${el.id}Color`] = coerceString(source[`${el.id}Color`], "");
		tempData[`${el.id}FontFamily`] = coerceString(source[`${el.id}FontFamily`], "");
		tempData[`${el.id}TextColor`] = coerceString(source[`${el.id}TextColor`], "");
	}
}

export function exportHudConfig(tempData) {
	const out = {};

	for (const f of APPEARANCE_FIELDS) {
		out[f.key] = tempData[f.key] ?? f.fallback;
	}

	for (const f of BEHAVIOR_FIELDS) {
		out[f.key] = tempData[f.key] ?? f.fallback;
	}

	out.actionMenuPos = normalizeActionMenuPos(tempData.actionMenuPos);
	out.customMenu = Array.isArray(tempData.customMenu) ? foundry.utils.deepClone(tempData.customMenu) : [];
	out.adapterCategoryOverrides = tempData.adapterCategoryOverrides && typeof tempData.adapterCategoryOverrides === "object"
		? foundry.utils.deepClone(tempData.adapterCategoryOverrides)
		: {};

	out.amMenuLayers = Array.isArray(tempData.amMenuLayers) ? foundry.utils.deepClone(tempData.amMenuLayers) : [];
	out.amSubMenuLayers = Array.isArray(tempData.amSubMenuLayers) ? foundry.utils.deepClone(tempData.amSubMenuLayers) : [];

	for (const el of AM_ELEMENTS) {
		out[`${el.id}Layers`] = Array.isArray(tempData[`${el.id}Layers`]) ? foundry.utils.deepClone(tempData[`${el.id}Layers`]) : [];
		out[`${el.id}Scale`] = coerceNumber(tempData[`${el.id}Scale`], 1);
		out[`${el.id}X`] = coerceNumber(tempData[`${el.id}X`], 0);
		out[`${el.id}Y`] = coerceNumber(tempData[`${el.id}Y`], 0);
		out[`${el.id}Color`] = coerceString(tempData[`${el.id}Color`], "");
		out[`${el.id}FontFamily`] = coerceString(tempData[`${el.id}FontFamily`], "");
		out[`${el.id}TextColor`] = coerceString(tempData[`${el.id}TextColor`], "");
	}

	return out;
}

export function getAMElementContext(tempData) {
	return AM_ELEMENTS.map((el) => {
		const layers = (tempData[`${el.id}Layers`] || []).slice().sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
		return {
			...el,
			layers: injectContentMarker(layers, 50),
			scale: tempData[`${el.id}Scale`] ?? 1,
			x: tempData[`${el.id}X`] ?? 0,
			y: tempData[`${el.id}Y`] ?? 0,
			color: tempData[`${el.id}Color`] || "",
			fontFamily: tempData[`${el.id}FontFamily`] || "",
			textColor: tempData[`${el.id}TextColor`] || "",
		};
	});
}
