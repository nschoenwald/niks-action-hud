/**
 * Central schema and normalization definitions for Nik's Action HUD.
 * Exclusively designed for Foundry V14.
 */

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

	return out;
}
