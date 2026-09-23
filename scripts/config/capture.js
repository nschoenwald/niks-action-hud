/**
 * Form data capture and normalization for Nik's Action HUD Configuration.
 * Exclusively designed for Foundry V14.
 */

import { APPEARANCE_FIELDS, BEHAVIOR_FIELDS, AM_ELEMENTS, coerceNumber, coerceBoolean, coerceString } from "./schema.js";

function _findMaxIndex(formData, prefix) {
	let max = -1;
	for (const key of Object.keys(formData)) {
		const match = key.match(new RegExp(`^${prefix}\\.(\\d+)\\.`));
		if (match) max = Math.max(max, Number(match[1]));
	}
	return max;
}

function _captureLayerRow(formData, prefix, index) {
	const src = formData[`${prefix}.${index}.src`];
	if (!src) return null;

	return {
		src: String(src).trim(),
		zIndex: coerceNumber(formData[`${prefix}.${index}.zIndex`], 10),
		opacity: coerceNumber(formData[`${prefix}.${index}.opacity`], 1.0),
		blend: coerceString(formData[`${prefix}.${index}.blend`], "normal"),
		scale: coerceNumber(formData[`${prefix}.${index}.scale`], 1.0),
		x: coerceNumber(formData[`${prefix}.${index}.x`], 0),
		y: coerceNumber(formData[`${prefix}.${index}.y`], 0),
		rotation: coerceNumber(formData[`${prefix}.${index}.rotation`], 0),
	};
}

function _captureLayers(formData, prefix) {
	const maxIndex = _findMaxIndex(formData, prefix);
	if (maxIndex < 0) return [];
	const layers = [];
	for (let i = 0; i <= maxIndex; i++) {
		const layer = _captureLayerRow(formData, prefix, i);
		if (layer) layers.push(layer);
	}
	return layers;
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

		const layers = _captureLayers(formData, `${prefix}.btnFrame`);
		setIfDifferent("buttonFrameLayers", layers, base.buttonFrameLayers || []);
		setIfDifferent("buttonFrameColor", String(formData[`${prefix}.btnFrameColor`] || ""), base.buttonFrameColor || "");
		setIfDifferent("fontFamily", String(formData[`${prefix}.fontFamily`] || ""), base.fontFamily || "");
		setIfDifferent("textColor", String(formData[`${prefix}.textColor`] || ""), base.textColor || "");

		const visibility = {
			mode: formData[`${prefix}.visibility.mode`] || "all",
			actorTypes: [],
			actorIds: String(formData[`${prefix}.visibility.actorIds`] || "").split(",").map((s) => s.trim()).filter(Boolean),
		};

		for (const key of Object.keys(formData)) {
			const match = key.match(new RegExp(`^adapterMenu\\.${index}\\.visibility\\.actorTypes\\.(.+)$`));
			if (match && formData[key] === true) visibility.actorTypes.push(match[1]);
		}
		visibility.actorTypes.sort();
		setIfDifferent("visibility", visibility, base.visibility);

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

			// Layers
			const btnLayers = _captureLayers(formData, `${catPrefix}.btnFrame`);
			if (btnLayers.length > 0 || formData[`${catPrefix}.btnFrame.0.src`] !== undefined) {
				cat.buttonFrameLayers = btnLayers;
			}

			// Visibility
			const visActorTypes = [];
			for (const key of Object.keys(formData)) {
				const match = key.match(new RegExp(`^customMenu\\.${c}\\.visibility\\.actorTypes\\.(.+)$`));
				if (match && formData[key] === true) visActorTypes.push(match[1]);
			}
			cat.visibility = {
				mode: formData[`${catPrefix}.visibility.mode`] || "all",
				actorTypes: visActorTypes.sort(),
				actorIds: String(formData[`${catPrefix}.visibility.actorIds`] || "").split(",").map((s) => s.trim()).filter(Boolean),
			};
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

	// 5. Image Studio Layers & Element properties
	const menuLayers = _captureLayers(formData, "amMenuLayers");
	if (menuLayers.length > 0 || formData["amMenuLayers.0.src"] !== undefined) {
		app.tempData.amMenuLayers = menuLayers;
	}

	const subMenuLayers = _captureLayers(formData, "amSubMenuLayers");
	if (subMenuLayers.length > 0 || formData["amSubMenuLayers.0.src"] !== undefined) {
		app.tempData.amSubMenuLayers = subMenuLayers;
	}

	for (const el of AM_ELEMENTS) {
		const elLayers = _captureLayers(formData, `${el.id}Layers`);
		if (elLayers.length > 0 || formData[`${el.id}Layers.0.src`] !== undefined) {
			app.tempData[`${el.id}Layers`] = elLayers;
		}
		if (formData[`${el.id}Scale`] !== undefined) app.tempData[`${el.id}Scale`] = coerceNumber(formData[`${el.id}Scale`], 1);
		if (formData[`${el.id}X`] !== undefined) app.tempData[`${el.id}X`] = coerceNumber(formData[`${el.id}X`], 0);
		if (formData[`${el.id}Y`] !== undefined) app.tempData[`${el.id}Y`] = coerceNumber(formData[`${el.id}Y`], 0);
		if (formData[`${el.id}Color`] !== undefined) app.tempData[`${el.id}Color`] = coerceString(formData[`${el.id}Color`], "");
		if (formData[`${el.id}FontFamily`] !== undefined) app.tempData[`${el.id}FontFamily`] = coerceString(formData[`${el.id}FontFamily`], "");
		if (formData[`${el.id}TextColor`] !== undefined) app.tempData[`${el.id}TextColor`] = coerceString(formData[`${el.id}TextColor`], "");
	}

	// 6. Menu Builder
	captureMenuBuilder(app, formData);
};
