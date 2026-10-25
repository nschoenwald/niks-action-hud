/**
 * Option schema for the settings panel: which flat profile fields the panel edits,
 * their types and fallbacks, and how a draft object is loaded from / exported to a profile.
 */

import { readDockPosition } from "../dock/geometry.js";
import { sectionCategoryId } from "../../core/category-id.js";
import { isDrawerNav } from "../../core/drawer-nav.js";
import { SETTING_SCHEMA, defaultOf } from "../../core/setting-schema.js";

// ── Coercion ────────────────────────────────────────────

export const coerceNumber = (value, fallback = 0) => {
	const n = Number.parseFloat(value);
	return Number.isNaN(n) || !Number.isFinite(n) ? fallback : n;
};

export const coerceBoolean = (value, fallback = false) => {
	if (value == null) return fallback;
	return [true, "true", 1, "1"].includes(value);
};

export const coerceString = (value, fallback = "") => {
	if (typeof value === "string") return value;
	return value ? String(value) : fallback;
};

const COERCERS = { number: coerceNumber, boolean: coerceBoolean, string: coerceString };

// ── Field tables ────────────────────────────────────────

const fieldsOf = (group) => SETTING_SCHEMA.filter((spec) => spec.group === group).map((spec) => ({
	key: spec.key,
	type: spec.type,
	get fallback() { return defaultOf(spec); },
}));

export const APPEARANCE_FIELDS = Object.freeze(fieldsOf("appearance"));

export const BEHAVIOR_FIELDS = Object.freeze(fieldsOf("behavior"));

const ALL_FIELDS = [...APPEARANCE_FIELDS, ...BEHAVIOR_FIELDS];

// ── Structured values ───────────────────────────────────

const DEFAULT_DOCK = Object.freeze({ corner: "bottom-left", x: 240, y: 20 });

/** The stored dock position (see `readDockPosition`), or the default one. */
export const normalizeDockPosition = (position) => readDockPosition(position, DEFAULT_DOCK);


/**
 * System categories only (entries without a system section are dropped), each with an id. A valid
 * `nav` choice ("top" | "side") is kept; anything else is removed so the system default applies.
 */
function normalizeLayoutCategories(categories = []) {
	if (!Array.isArray(categories)) return [];
	return categories.filter((entry) => entry?.sectionId).map((original) => {
		const category = foundry.utils.deepClone(original);
		if (!String(category.id ?? "").trim()) category.id = sectionCategoryId(category.sectionId);
		if (!isDrawerNav(category.nav)) delete category.nav;
		delete category.view;
		return category;
	});
}

// ── Draft <-> profile ───────────────────────────────────

/** Fill `draft` from a profile-like object. */
export function loadHudConfig(draft, rawSource = {}) {
	const source = rawSource ?? {};
	for (const { key, type, fallback } of ALL_FIELDS) draft[key] = COERCERS[type](source[key], fallback);
	draft.dockPosition = normalizeDockPosition(source.dockPosition);
	draft.layoutCategories = normalizeLayoutCategories(source.layoutCategories);
}

/** Produce the clean profile-shaped object saved from a draft. */
export function exportHudConfig(draft) {
	const profile = Object.fromEntries(ALL_FIELDS.map(({ key, fallback }) => [key, draft[key] ?? fallback]));
	profile.dockPosition = normalizeDockPosition(draft.dockPosition);
	profile.layoutCategories = normalizeLayoutCategories(draft.layoutCategories);
	return profile;
}

