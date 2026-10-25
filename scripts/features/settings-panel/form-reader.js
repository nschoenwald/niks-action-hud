/**
 * Reads the settings form back into the panel's draft state (`app.draft.data`).
 */

import { normalizeIconClass } from "../../core/icon-source.js";
import { sectionCategoryId } from "../../core/category-id.js";
import { isDrawerNav } from "../../core/drawer-nav.js";
import { APPEARANCE_FIELDS, BEHAVIOR_FIELDS, coerceNumber, coerceBoolean, coerceString } from "./option-schema.js";

const COERCERS = { number: coerceNumber, boolean: coerceBoolean, string: coerceString };

/** Highest N used by form keys shaped like `<prefix>.N.…` (-1 when none). */
function highestIndex(formData, prefix) {
	const pattern = new RegExp(`^${prefix}\\.(\\d+)\\.`);
	return Object.keys(formData).reduce((max, key) => {
		const hit = pattern.exec(key);
		return hit ? Math.max(max, Number(hit[1])) : max;
	}, -1);
}

// ── Per-category form fields ────────────────────────────

/** [form field, category property, converter] for the appearance inputs of one category. */
const CATEGORY_INPUTS = [
	["label", "label", (v) => String(v).trim()],
	["icon", "icon", normalizeIconClass],
	["img", "img", (v) => String(v).trim()],
];


/** Copy one category's form inputs onto `category`; only fields present in the form are touched. */
function applyCategoryInputs(category, formData, prefix) {
	const field = (name) => formData[`${prefix}.${name}`];

	if (field("sectionId") !== undefined) category.sectionId = String(field("sectionId")).trim();

	const submittedId = field("id") !== undefined ? String(field("id")).trim() : "";
	if (submittedId) category.id = submittedId;
	else if (!category.id && category.sectionId) category.id = sectionCategoryId(category.sectionId);

	for (const [name, prop, convert] of CATEGORY_INPUTS) {
		if (field(name) !== undefined) category[prop] = convert(field(name));
	}
	if (isDrawerNav(field("nav"))) category.nav = field("nav");
}

const readLayoutForm = (app, formData) => {
	const categories = foundry.utils.deepClone(app.draft.data.layoutCategories || []);
	const last = highestIndex(formData, "layoutCategories");

	if (last >= 0) {
		categories.length = Math.min(categories.length, last + 1);
		for (let c = 0; c <= last; c++) {
			const prefix = `layoutCategories.${c}`;
			if (formData[`${prefix}.label`] === undefined && formData[`${prefix}.id`] === undefined) continue;
			categories[c] ??= {};
			applyCategoryInputs(categories[c], formData, prefix);
		}
	}

	app.draft.data.layoutCategories = categories;
};

// ── Whole form ──────────────────────────────────────────

/** Excluded actor types come from the chip checkboxes (or, failing that, boolean form entries). */
function readExcludedTypes(form, formData) {
	const chips = [...(form.querySelectorAll?.('input[name^="hiddenActorTypes."]') ?? [])];
	if (chips.length) {
		return chips.filter((c) => c.checked).map((c) => c.name.replace(/^hiddenActorTypes\./, "")).filter(Boolean).join(",");
	}
	const keys = Object.keys(formData).filter((k) => k.startsWith("hiddenActorTypes."));
	if (!keys.length) return undefined;
	return keys.filter((k) => formData[k] === true).map((k) => k.replace(/^hiddenActorTypes\./, "")).join(",");
}

export const readFormValues = (app, formElement) => {
	const form = formElement?.tagName === "FORM" ? formElement : formElement?.closest("form");
	if (!form) return;

	const formData = new foundry.applications.ux.FormDataExtended(form).object;

	for (const { key, type, fallback } of [...APPEARANCE_FIELDS, ...BEHAVIOR_FIELDS]) {
		if (formData[key] !== undefined) app.draft.data[key] = COERCERS[type](formData[key], fallback);
	}

	const excluded = readExcludedTypes(form, formData);
	if (excluded !== undefined) app.draft.data.hiddenActorTypes = excluded;

	readLayoutForm(app, formData);
	app.draft.notify();
};
