/**
 * Form data capture and normalization for Nik's Action HUD Configuration.
 * Exclusively designed for Foundry V14.
 */

import { APPEARANCE_FIELDS, BEHAVIOR_FIELDS, coerceNumber, coerceBoolean, coerceString } from "./schema.js";

function _findMaxIndex(formData, prefix) {
	let max = -1;
	const regex = new RegExp(`^${prefix}\\.(\\d+)\\.`);
	for (const key of Object.keys(formData)) {
		const match = key.match(regex);
		if (match) max = Math.max(max, Number(match[1]));
	}
	return max;
}

const _normalizeMenuIcon = (value) => {
	const trimmed = String(value || "").trim();
	return trimmed.startsWith("ra-") && !trimmed.includes("ra ") ? `ra ${trimmed}` : trimmed;
};

export const captureAdapterCategoryOverrides = (app, formData) => {
	const editorRows = Array.isArray(app._adapterCategoryEditorRows) ? app._adapterCategoryEditorRows : [];
	if (!editorRows.length) return;

	const overrides = foundry.utils.deepClone(app.tempData.adapterCategoryOverrides || {});
	for (const editorRow of editorRows) {
		const index = editorRow.index;
		const prefix = `adapterMenu.${index}`;
		if (formData[`${prefix}.id`] === undefined) continue;

		const base = editorRow.base || {};
		const next = {};

		const setIfDifferent = (key, value, baseValue) => {
			if (JSON.stringify(value) !== JSON.stringify(baseValue)) next[key] = value;
		};

		setIfDifferent("label", String(formData[`${prefix}.label`] ?? ""), base.label);
		setIfDifferent("icon", _normalizeMenuIcon(formData[`${prefix}.icon`]), _normalizeMenuIcon(base.icon));
		setIfDifferent("img", String(formData[`${prefix}.img`] ?? ""), base.img);
		setIfDifferent("buttonImg", String(formData[`${prefix}.buttonImg`] ?? ""), base.buttonImg);
		setIfDifferent("buttonScale", coerceNumber(formData[`${prefix}.buttonScale`], 1), base.buttonScale ?? 1);
		setIfDifferent("buttonX", coerceNumber(formData[`${prefix}.buttonX`], 0), base.buttonX ?? 0);
		setIfDifferent("buttonY", coerceNumber(formData[`${prefix}.buttonY`], 0), base.buttonY ?? 0);
		setIfDifferent("buttonFrameColor", String(formData[`${prefix}.btnFrameColor`] || ""), base.buttonFrameColor || "");
		setIfDifferent("fontFamily", String(formData[`${prefix}.fontFamily`] || ""), base.fontFamily || "");
		setIfDifferent("textColor", String(formData[`${prefix}.textColor`] || ""), base.textColor || "");

		if (Object.keys(next).length) overrides[editorRow.id] = next;
		else delete overrides[editorRow.id];
	}
	app.tempData.adapterCategoryOverrides = overrides;
};

export const captureMenuBuilder = (app, formData) => {
	const customMenu = foundry.utils.deepClone(app.tempData.customMenu || []);
	const maxCatIndex = _findMaxIndex(formData, "customMenu");

	if (maxCatIndex >= 0) {
		for (let c = 0; c <= maxCatIndex; c++) {
			const catPrefix = `customMenu.${c}`;
			if (formData[`${catPrefix}.label`] === undefined && formData[`${catPrefix}.id`] === undefined) continue;

			if (!customMenu[c]) customMenu[c] = { tabs: [] };
			const cat = customMenu[c];

			if (formData[`${catPrefix}.label`] !== undefined) cat.label = String(formData[`${catPrefix}.label`]).trim();
			if (formData[`${catPrefix}.icon`] !== undefined) cat.icon = _normalizeMenuIcon(formData[`${catPrefix}.icon`]);
			if (formData[`${catPrefix}.img`] !== undefined) cat.img = String(formData[`${catPrefix}.img`]).trim();
			if (formData[`${catPrefix}.buttonImg`] !== undefined) cat.buttonImg = String(formData[`${catPrefix}.buttonImg`]).trim();
			if (formData[`${catPrefix}.buttonScale`] !== undefined) cat.buttonScale = coerceNumber(formData[`${catPrefix}.buttonScale`], 1);
			if (formData[`${catPrefix}.buttonX`] !== undefined) cat.buttonX = coerceNumber(formData[`${catPrefix}.buttonX`], 0);
			if (formData[`${catPrefix}.buttonY`] !== undefined) cat.buttonY = coerceNumber(formData[`${catPrefix}.buttonY`], 0);
			if (formData[`${catPrefix}.btnFrameColor`] !== undefined) cat.buttonFrameColor = String(formData[`${catPrefix}.btnFrameColor`]).trim();
			if (formData[`${catPrefix}.fontFamily`] !== undefined) cat.fontFamily = String(formData[`${catPrefix}.fontFamily`]).trim();
			if (formData[`${catPrefix}.textColor`] !== undefined) cat.textColor = String(formData[`${catPrefix}.textColor`]).trim();

			// Submenus / Tabs
			const maxTabIndex = _findMaxIndex(formData, `${catPrefix}.tabs`);
			if (maxTabIndex >= 0 && Array.isArray(cat.tabs)) {
				for (let t = 0; t <= maxTabIndex; t++) {
					const tabLabel = formData[`${catPrefix}.tabs.${t}.label`];
					if (tabLabel !== undefined && cat.tabs[t]) {
						cat.tabs[t].label = String(tabLabel).trim();
					}
				}
			}
		}
	}

	app.tempData.customMenu = customMenu;
	captureAdapterCategoryOverrides(app, formData);
};

export const captureInputData = (app, formElement) => {
	const form = formElement?.tagName === "FORM" ? formElement : formElement?.closest("form");
	if (!form) return;

	const formData = new foundry.applications.ux.FormDataExtended(form).object;

	// 1. Appearance Fields
	for (const f of APPEARANCE_FIELDS) {
		if (formData[f.key] !== undefined) {
			if (f.type === "number") app.tempData[f.key] = coerceNumber(formData[f.key], f.fallback);
			else if (f.type === "boolean") app.tempData[f.key] = coerceBoolean(formData[f.key], f.fallback);
			else app.tempData[f.key] = coerceString(formData[f.key], f.fallback);
		}
	}

	// 2. Behavior Fields
	for (const f of BEHAVIOR_FIELDS) {
		if (formData[f.key] !== undefined) {
			if (f.type === "number") app.tempData[f.key] = coerceNumber(formData[f.key], f.fallback);
			else if (f.type === "boolean") app.tempData[f.key] = coerceBoolean(formData[f.key], f.fallback);
			else app.tempData[f.key] = coerceString(formData[f.key], f.fallback);
		}
	}

	// 3. Anchor Position
	if (formData.anchorX !== undefined || formData.anchorY !== undefined || formData.offsetX !== undefined || formData.offsetY !== undefined) {
		app.tempData.actionMenuPos = {
			anchorX: formData.anchorX === "left" ? "left" : "right",
			anchorY: formData.anchorY === "top" ? "top" : "bottom",
			offsetX: Math.max(0, coerceNumber(formData.offsetX, 40)),
			offsetY: Math.max(0, coerceNumber(formData.offsetY, 40)),
		};
	}

	// 4. Excluded Actor Types
	const excludedTypes = [];
	for (const key of Object.keys(formData)) {
		const match = key.match(/^excludedActorTypes\.(.+)$/);
		if (match && formData[key] === true) excludedTypes.push(match[1]);
	}
	if (excludedTypes.length > 0 || Object.keys(formData).some((k) => k.startsWith("excludedActorTypes."))) {
		app.tempData.excludedActorTypes = excludedTypes.join(",");
	}

	// 5. Menu Builder
	captureMenuBuilder(app, formData);
};
