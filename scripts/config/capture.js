import { AM_ELEMENTS, captureActorPositionFields, captureActorSizeFields, captureAMElementData, captureAttributeBadgeConditions, captureAttributeIconFields, captureAttributeImageFields, captureAttributeLinkedBarFields, captureAttributeMetaFields, captureAttributePositionFields, captureAttributeQualitativeFields, captureAttributeQualitativeStages, captureAttributeResourceThresholdStages, captureAttributeScaleFields, captureAttributeTextColorFields, captureAttributeThresholdColorFields, captureAttributeVisibilityFields, captureEffectsBundle, captureExcludedActorTypes, captureGlobalImageFields, captureGlobalMenuBehaviorFields, captureGlobalResponsiveFields, captureGlobalScaleFields, captureGlobalSimpleFields, captureGlobalThemeFontLayoutFields, captureLayerRow, coerceNullableNumber, normalizeActorLayerOverride } from "./schema.js";
import { normalizeAdapterPlacement } from "../features/action-menu/category-placement.js";

function _findMaxIndex(formData, prefix) {
	let max = -1;
	for (const key of Object.keys(formData)) {
		const match = key.match(new RegExp(`^${prefix}\\.(\\d+)\\.`));
		if (match) max = Math.max(max, Number(match[1]));
	}
	return max;
}

function _captureLayers(formData, prefix) {
	const maxIndex = _findMaxIndex(formData, prefix);
	if (maxIndex < 0) return null;
	const layers = [];
	for (let i = 0; i <= maxIndex; i++) {
		const layer = captureLayerRow(formData, prefix, i);
		if (layer) layers.push(layer);
	}
	return layers;
}

const _normalizeMenuIcon = (value) => {
	const trimmed = String(value || "").trim();
	return trimmed.startsWith("ra-") && !trimmed.includes("ra ")
		? `ra ${trimmed}`
		: trimmed;
};

const _sameConfigValue = (left, right) => (
	JSON.stringify(left) === JSON.stringify(right)
);

const _readOptionalColor = (app, formData, name) => {
	const input = app.element?.querySelector?.(`input[name="${name}"]`);
	if (input?.dataset?.inactive === "true") return "";
	return String(formData[name] || "");
};

export const captureAdapterCategoryOverrides = (app, formData) => {
	const editorRows = Array.isArray(app._adapterCategoryEditorRows)
		? app._adapterCategoryEditorRows
		: [];
	if (!editorRows.length) return;

	const overrides = foundry.utils.deepClone(
		app.tempData.adapterCategoryOverrides || {},
	);
	for (const editorRow of editorRows) {
		const index = editorRow.index;
		const prefix = `adapterMenu.${index}`;
		if (formData[`${prefix}.id`] === undefined) continue;

		const base = editorRow.base;
		const next = {};
		const setIfDifferent = (key, value, baseValue) => {
			if (!_sameConfigValue(value, baseValue)) next[key] = value;
		};

		setIfDifferent("label", String(formData[`${prefix}.label`] ?? ""), base.label);
		setIfDifferent(
			"icon",
			_normalizeMenuIcon(formData[`${prefix}.icon`]),
			_normalizeMenuIcon(base.icon),
		);
		setIfDifferent("img", String(formData[`${prefix}.img`] ?? ""), base.img);
		setIfDifferent(
			"buttonImg",
			String(formData[`${prefix}.buttonImg`] ?? ""),
			base.buttonImg,
		);
		for (const [key, fallback] of [
			["buttonScale", 1],
			["buttonX", 0],
			["buttonY", 0],
		]) {
			const raw = formData[`${prefix}.${key}`];
			const parsed = Number(raw);
			const value = raw === "" || raw === undefined || !Number.isFinite(parsed)
				? fallback
				: parsed;
			setIfDifferent(key, value, base[key]);
		}

		const layers = _captureLayers(formData, `${prefix}.btnFrame`) || [];
		setIfDifferent("buttonFrameLayers", layers, base.buttonFrameLayers || []);
		setIfDifferent(
			"buttonFrameColor",
			String(formData[`${prefix}.btnFrameColor`] || ""),
			base.buttonFrameColor || "",
		);
		setIfDifferent(
			"fontFamily",
			String(formData[`${prefix}.fontFamily`] || ""),
			base.fontFamily || "",
		);
		setIfDifferent(
			"textColor",
			_readOptionalColor(app, formData, `${prefix}.textColor`),
			base.textColor || "",
		);

		const tabVisibility = formData[`${prefix}.tabVisibility`] || "always";
		setIfDifferent("tabVisibility", tabVisibility, base.tabVisibility || "always");

		const visibility = {
			mode: formData[`${prefix}.visibility.mode`] || "all",
			actorTypes: [],
			actorIds: String(formData[`${prefix}.visibility.actorIds`] || "")
				.split(",")
				.map((id) => id.trim())
				.filter(Boolean),
		};
		for (const key of Object.keys(formData)) {
			const match = key.match(
				new RegExp(`^adapterMenu\\.${index}\\.visibility\\.actorTypes\\.(.+)$`),
			);
			if (match && formData[key] === true) visibility.actorTypes.push(match[1]);
		}
		visibility.actorTypes.sort();
		setIfDifferent("visibility", visibility, base.visibility);

		if (Object.keys(next).length) overrides[editorRow.id] = next;
		else delete overrides[editorRow.id];
	}
	app.tempData.adapterCategoryOverrides = overrides;
};

export const captureInputData = (app, formElement) => {
	const form =
		formElement.tagName === "FORM" ? formElement : formElement.closest("form");
	if (!form) return;

	const formData = new foundry.applications.ux.FormDataExtended(form).object;

	form.querySelectorAll("input.opt-color[data-inactive]").forEach((el) => {
		if (el.name) delete formData[el.name];
	});

	const isGM = game.user.isGM;
	const isGlobal = app.currentEditId === "global";

	if (!isGlobal || isGM) {
		app._captureAttributes(formData, isGlobal);
	}

	if (isGlobal) {
		app._captureGlobalSettings(formData, isGM);

		if (isGM) {
			app._captureStatusEffects(form);
			app._captureMenuBuilder(formData);
		}
	} else {
		app._captureActorSettings(formData);
		app._captureRules(formData);
	}
};

export const captureRules = (app, formData) => {
	const newRules = [];
	const maxIndex = _findMaxIndex(formData, "rules");

	for (let i = 0; i <= maxIndex; i++) {
		const type = formData[`rules.${i}.type`] || "stat";
		const target = formData[`rules.${i}.target`] || "portrait";
		const path = formData[`rules.${i}.path`];
		const statusId = formData[`rules.${i}.statusId`] || "";
		const threshold = formData[`rules.${i}.threshold`] === "" ? 0 : Number(formData[`rules.${i}.threshold`]);
		const img = formData[`rules.${i}.img`];
		const scale = formData[`rules.${i}.scale`] === "" ? 1.0 : Number(formData[`rules.${i}.scale`]);
		const x = formData[`rules.${i}.x`] === "" ? 0 : Number(formData[`rules.${i}.x`]);
		const y = formData[`rules.${i}.y`] === "" ? 0 : Number(formData[`rules.${i}.y`]);

			const numOr = (v, def) => v === "" || v === undefined || v === null ? def : Number(v);
		const strOr = (v, def) => v === undefined || v === null ? def : String(v).trim();

		const speakingImg = strOr(formData[`rules.${i}.speakingImg`], "");

		const effects = captureEffectsBundle(
			(f, d) => numOr(formData[`rules.${i}.effects.${f}`], d),
			(f, d) => strOr(formData[`rules.${i}.effects.${f}`], d),
		);

		const isValid = type === "status" ? !!statusId : !!path;
		if (isValid) {
			newRules.push({
				type,
				target,
				path: path || "",
				statusId,
				threshold,
				img,
				speakingImg,
				scale,
				x,
				y,
				effects,
			});
		}
	}

	app.tempData.imageRules[app.currentEditId] = newRules;
};

export const captureAttributes = (app, formData, isGlobal) => {
	const newAttrs = [];
	const maxIndex = _findMaxIndex(formData, "attributes");

	for (let i = 0; i <= maxIndex; i++) {
		const existingAttrs = isGlobal
			? app.tempData.globalAttributes
			: app.tempData.actorAttributes[app.currentEditId];
		const existingAttr = existingAttrs?.[i] || {};
		const metaFields = captureAttributeMetaFields(formData, i);
		const { path, label, style } = metaFields;
		const iconFields = captureAttributeIconFields(formData, i);
		const visibilityFields = captureAttributeVisibilityFields(formData, i);
		const linkedBarFields = captureAttributeLinkedBarFields(formData, i, existingAttr);
		const qualitativeFields = captureAttributeQualitativeFields(formData, i);
		const thresholdColorFields = captureAttributeThresholdColorFields(formData, i);
		const qualitativeStages = captureAttributeQualitativeStages(
			formData,
			i,
			existingAttr.qualitativeStages,
		);
		const resourceThresholdStages = captureAttributeResourceThresholdStages(
			formData,
			i,
			existingAttr.resourceThresholdStages,
		);
		const scaleFields = captureAttributeScaleFields(formData, i);
		const textColorFields = captureAttributeTextColorFields(formData, i);
		const positionFields = captureAttributePositionFields(formData, i);
		const imgFields = captureAttributeImageFields(formData, i);

		const badgeConditions = style === "badge"
			? captureAttributeBadgeConditions(formData, i)
			: [];

		if (path || label) {
			newAttrs.push({
				...metaFields,
				...textColorFields,
				...iconFields,
				...visibilityFields,
				...linkedBarFields,
				...qualitativeFields,
				...thresholdColorFields,
				qualitativeStages,
				resourceThresholdStages,
				...scaleFields,
				...positionFields,
				...imgFields,
				badgeConditions,
			});
		}
	}

	if (isGlobal) {
		app.tempData.globalAttributes = newAttrs;
	} else {
		app.tempData.actorAttributes[app.currentEditId] = newAttrs;
	}
};

export const captureGlobalSettings = (app, formData, isGM) => {
	const parseVal = (val, fallback) =>
		val === "" || val === undefined || val === null ? fallback : Number(val);

	const currentPos = app.tempData.globalPos || { bottom: 50, left: 10, unit: "px" };
	const hasTop = currentPos.top !== undefined && currentPos.top !== null;
	const hasRight = currentPos.right !== undefined && currentPos.right !== null;
	const unit = currentPos.unit || "px";

	const bottomVal = parseVal(formData.globalBottom, hasTop ? (currentPos.top ?? 5) : (currentPos.bottom ?? 5));
	const leftVal = parseVal(formData.globalLeft, hasRight ? (currentPos.right ?? 0) : (currentPos.left ?? 0));

	const nextPos = { unit };
	if (hasTop) {
		nextPos.top = bottomVal;
	} else {
		nextPos.bottom = bottomVal;
	}
	if (hasRight) {
		nextPos.right = leftVal;
	} else {
		nextPos.left = leftVal;
	}

	app.tempData.globalPos = nextPos;

	captureGlobalScaleFields(app.tempData, formData);
	captureGlobalResponsiveFields(app.tempData, formData);
	captureGlobalSimpleFields(app.tempData, formData);

	app.tempData.actionMenuScale =
		formData.actionMenuScale === "" || formData.actionMenuScale === undefined
			? app.tempData.actionMenuScale
			: Number(formData.actionMenuScale);
	const currentActionMenuPos = app.tempData.actionMenuPos || {
		anchorX: "right",
		anchorY: "bottom",
		offsetX: 40,
		offsetY: 40,
	};
	if (formData.actionMenuTop !== undefined && formData.actionMenuLeft !== undefined) {
		app.tempData.actionMenuPos = {
			top: parseVal(formData.actionMenuTop, currentActionMenuPos.top),
			left: parseVal(formData.actionMenuLeft, currentActionMenuPos.left),
		};
	} else {
		app.tempData.actionMenuPos = foundry.utils.deepClone(currentActionMenuPos);
	}


	const portraitResult = _captureLayers(formData, "portraitLayers");
	if (portraitResult) app.tempData.portraitLayers = portraitResult;

	const cardBgResult = _captureLayers(formData, "cardBgLayers");
	if (cardBgResult) app.tempData.cardBgLayers = cardBgResult;

	const amMenuResult = _captureLayers(formData, "amMenuLayers");
	if (amMenuResult) app.tempData.amMenuLayers = amMenuResult;

	const amSubMenuResult = _captureLayers(formData, "amSubMenuLayers");
	if (amSubMenuResult) app.tempData.amSubMenuLayers = amSubMenuResult;

	for (const el of AM_ELEMENTS) {
		const layerKey = `${el.id}Layers`;
		const result = _captureLayers(formData, layerKey);
		if (result) app.tempData[layerKey] = result;
	}

	captureGlobalImageFields(app.tempData, formData);
	captureAMElementData(app.tempData, formData);
	captureGlobalThemeFontLayoutFields(app.tempData, formData);
	captureGlobalMenuBehaviorFields(app.tempData, formData);

	if (isGM) {
		captureExcludedActorTypes(app.tempData, formData);
	}
};

export const captureStatusEffects = (app, form) => {
	const newEffects = [];
	const effectRows = form.querySelectorAll(".effect-row");

	effectRows.forEach((row, i) => {
		const getInput = (name) => {
			const el = row.querySelector(`[name="effects.${i}.${name}"]`);
			return el ? (el.type === "checkbox" ? el.checked : el.value) : "";
		};

		const id = getInput("id");
		if (id) {
			newEffects.push({
				id: id.trim().toLowerCase(),
				label: getInput("label"),
				filters: {
					grayscale: Number(getInput("filters.grayscale")) || 0,
					brightness: Number(getInput("filters.brightness")) || 100,
					contrast: Number(getInput("filters.contrast")) || 100,
					blur: Number(getInput("filters.blur")) || 0,
					saturate: Number(getInput("filters.saturate")) || 100,
					sepia: Number(getInput("filters.sepia")) || 0,
				},
				overlayPath: getInput("overlayPath"),
				overlayScale: Number(getInput("overlayScale")) || 1.0,
				overlayX: Number(getInput("overlayX")) || 0,
				overlayY: Number(getInput("overlayY")) || 0,
				overlayOpacity: Number(getInput("overlayOpacity")) || 1.0,
				overlayBlend: getInput("overlayBlend") || "normal",
				animation: getInput("animation") || "",
				effectX: Number(getInput("effectX")) || 0,
				effectY: Number(getInput("effectY")) || 0,
				tintColor: getInput("tintColor") || "#000000",
				tintAlpha: Number(getInput("tintAlpha")) || 0,
				tintAnimation: getInput("tintAnimation") || "",
			});
		}
	});
	app.tempData.statusEffects = newEffects;
};

export const captureMenuBuilder = (app, formData) => {
	if (!Array.isArray(app.tempData.customMenu)) app.tempData.customMenu = [];

	app.tempData.customMenu.forEach((cat, cIdx) => {
		const catLabel = formData[`menu.${cIdx}.label`];
		const catIcon = formData[`menu.${cIdx}.icon`];
		const catImg = formData[`menu.${cIdx}.img`];
		const sysId = formData[`menu.${cIdx}.systemId`];
		if (sysId !== undefined) cat.systemId = sysId;
		if (cat.systemId) {
			delete cat.adapterPlacement;
			delete cat.adapterInsertPosition;
		} else {
			const placement = normalizeAdapterPlacement(cat.adapterPlacement);
			if (placement) cat.adapterPlacement = placement;
			else delete cat.adapterPlacement;
			delete cat.adapterInsertPosition;
		}

		const useSidebar = formData[`menu.${cIdx}.useSidebar`];

		const btnImg = formData[`menu.${cIdx}.buttonImg`];
		const btnScale = formData[`menu.${cIdx}.buttonScale`];
		const btnX = formData[`menu.${cIdx}.buttonX`];
		const btnY = formData[`menu.${cIdx}.buttonY`];

		if (catLabel !== undefined) cat.label = catLabel;
		if (catIcon !== undefined) {
			const trimmed = catIcon.trim();
			cat.icon = trimmed.startsWith("ra-") && !trimmed.includes("ra ") ? `ra ${trimmed}` : trimmed;
		}
		if (catImg !== undefined) cat.img = catImg;
		if (btnImg !== undefined) cat.buttonImg = btnImg;

		if (catImg !== undefined) cat.img = catImg;

		cat.useSidebar = useSidebar === true;
		cat.buttonScale =
			btnScale === "" || btnScale === undefined ? 1.0 : Number(btnScale);
		cat.buttonX = btnX === "" || btnX === undefined ? 0 : Number(btnX);
		cat.buttonY = btnY === "" || btnY === undefined ? 0 : Number(btnY);

		const btnFrameResult = _captureLayers(formData, `menu.${cIdx}.btnFrame`, 10);
		if (btnFrameResult) cat.buttonFrameLayers = btnFrameResult;
		else if (!cat.buttonFrameLayers) cat.buttonFrameLayers = [];

		const btnFrameColor = formData[`menu.${cIdx}.btnFrameColor`];
		if (btnFrameColor !== undefined) cat.buttonFrameColor = String(btnFrameColor || "");

		const fontFamily = formData[`menu.${cIdx}.fontFamily`];
		if (fontFamily !== undefined) cat.fontFamily = String(fontFamily || "");
		const textColorName = `menu.${cIdx}.textColor`;
		const textColorInput = app.element?.querySelector?.(`input[name="${textColorName}"]`);
		if (textColorInput?.dataset?.inactive === "true") cat.textColor = "";
		else if (formData[textColorName] !== undefined) {
			cat.textColor = String(formData[textColorName] || "");
		}

		const visMode = formData[`menu.${cIdx}.visibility.mode`];
		if (visMode !== undefined) {
			if (!cat.visibility) cat.visibility = { mode: "all", actorTypes: [], actorIds: [] };
			cat.visibility.mode = visMode;

			const types = [];
			Object.keys(formData).forEach((key) => {
				const m = key.match(new RegExp(`^menu\\.${cIdx}\\.visibility\\.actorTypes\\.(.+)$`));
				if (m && formData[key] === true) types.push(m[1]);
			});
			cat.visibility.actorTypes = types;

			const idsRaw = formData[`menu.${cIdx}.visibility.actorIds`];
			if (idsRaw !== undefined) {
				cat.visibility.actorIds = String(idsRaw).split(",").map(s => s.trim()).filter(Boolean);
			}
		}

		const tabVis = formData[`menu.${cIdx}.tabVisibility`];
		if (tabVis !== undefined) cat.tabVisibility = tabVis || "always";

		if (cat.tabs) {
			cat.tabs.forEach((tab, tIdx) => {
				const tabLabel = formData[`menu.${cIdx}.tabs.${tIdx}.label`];
				const subLabel = formData[`menu.${cIdx}.tabs.${tIdx}.subLabel`];

				if (tabLabel !== undefined) tab.label = tabLabel;
				if (subLabel !== undefined) tab.subLabel = subLabel;

				const tabVisMode = formData[`menu.${cIdx}.tabs.${tIdx}.visibility.mode`];
				if (tabVisMode !== undefined) {
					if (!tab.visibility) tab.visibility = { mode: "all", actorTypes: [], actorIds: [] };
					tab.visibility.mode = tabVisMode;
					const types = [];
					Object.keys(formData).forEach((key) => {
						const m = key.match(new RegExp(`^menu\\.${cIdx}\\.tabs\\.${tIdx}\\.visibility\\.actorTypes\\.(.+)$`));
						if (m && formData[key] === true) types.push(m[1]);
					});
					tab.visibility.actorTypes = types;
					const idsRaw = formData[`menu.${cIdx}.tabs.${tIdx}.visibility.actorIds`];
					if (idsRaw !== undefined) {
						tab.visibility.actorIds = String(idsRaw).split(",").map(s => s.trim()).filter(Boolean);
					}
				}
			});
		}
	});
	captureAdapterCategoryOverrides(app, formData);
};

export const captureActorSettings = (app, formData) => {
	const parseVal = (val, fallback) =>
		val === "" || val === undefined || val === null ? fallback : Number(val);
	const getVal = (name, def) =>
		formData[name] !== undefined ? formData[name] : def;
	const getNum = (name, def) => parseVal(formData[name], def);
	const numOrExisting = (name, existingValue, fallback) =>
		formData[name] === undefined
			? existingValue ?? fallback
			: parseVal(formData[name], fallback);
	const numOrGlobal = (name, existingValue) => {
		if (formData[name] === undefined) return existingValue;
		if (formData[name] === "" || formData[name] === null) return null;
		const n = Number(formData[name]);
		return Number.isFinite(n) ? n : null;
	};
	const boolOrExisting = (name, existingValue) =>
		formData[name] === undefined
			? existingValue === true
			: formData[name] === true;
	const getNumOrExisting = (name, existingValue, fallback) =>
		formData[name] === undefined
			? existingValue ?? fallback
			: parseVal(formData[name], fallback);
	const getValOrExisting = (name, existingValue, fallback) =>
		formData[name] === undefined ? existingValue ?? fallback : getVal(name, fallback);

	const existingSettings = app.tempData.actorSettings[app.currentEditId] || {};

	const parseFreeVal = (formVal, existingVal) => {
		if (formVal === undefined) return existingVal;
		if (formVal === "" || isNaN(formVal)) return "";
		return Number(formVal);
	};
	const actor = game.actors.get(app.currentEditId);
	const rawDisplayName = formData.displayName?.trim() || "";
	const displayName = actor && rawDisplayName === actor.name ? "" : rawDisplayName;

	const portraitVariants = [];
	const portraitMaxIndex = _findMaxIndex(formData, "portraitVariants");

	for (let i = 0; i <= portraitMaxIndex; i++) {
		const id = formData[`portraitVariants.${i}.id`] || foundry.utils.randomID();
		const img = String(formData[`portraitVariants.${i}.img`] || "").trim();
		if (!img) continue;
		const speakingImg = String(formData[`portraitVariants.${i}.speakingImg`] || "").trim();
		portraitVariants.push({
			id: String(id),
			label:
				String(formData[`portraitVariants.${i}.label`] || "").trim() ||
				`${game.i18n.localize("IBHUD.Config.Portrait.DefaultLabel")} ${i + 1}`,
			img,
			speakingImg,
			scale: numOrGlobal(`portraitVariants.${i}.scale`, null),
			x: numOrGlobal(`portraitVariants.${i}.x`, null),
			y: numOrGlobal(`portraitVariants.${i}.y`, null),
		});
	}

	const activePortraitVariantId =
		formData.activePortraitVariantId || portraitVariants[0]?.id || null;
	const voicePortraitVariantId =
		formData.voicePortraitVariantId || null;

	let actorPortraitLayers = _captureLayers(formData, "portraitLayers") ?? existingSettings.portraitLayers ?? [];
	let actorCardBgLayers = _captureLayers(formData, "cardBgLayers") ?? existingSettings.cardBgLayers ?? [];

	const globalPortraitLayers = app.tempData.portraitLayers || [];
	const globalCardBgLayers = app.tempData.cardBgLayers || [];
	actorPortraitLayers = normalizeActorLayerOverride(actorPortraitLayers, globalPortraitLayers);
	actorCardBgLayers = normalizeActorLayerOverride(actorCardBgLayers, globalCardBgLayers);

	app.tempData.actorSettings[app.currentEditId] = {
		displayName,
		scale: numOrGlobal("scale", existingSettings.scale),
		x: numOrGlobal("x", existingSettings.x),
		y: numOrGlobal("y", existingSettings.y),
		...captureActorPositionFields(formData, existingSettings, app.tempData),

		cardScale: numOrGlobal("cardScale", existingSettings.cardScale),
		...captureActorSizeFields(formData),

		customImg:
			formData.customImg === undefined
				? existingSettings.customImg ?? ""
				: formData.customImg || "",
		portraitLayers: actorPortraitLayers,
		cardBgLayers: actorCardBgLayers,
		portraitVariants,
		activePortraitVariantId,
		voicePortraitVariantId,
		format:
			formData.format === undefined
				? existingSettings.format ?? null
				: formData.format || null,
		hideBg: boolOrExisting("hideBg", existingSettings.hideBg),
		collapseCard: formData.collapseCard === undefined
			? existingSettings.collapseCard ?? ""
			: formData.collapseCard || "",
		collapseSize: formData.collapseSize === undefined || formData.collapseSize === ""
			? existingSettings.collapseSize ?? null
			: Number(formData.collapseSize) || null,
		collapseWidth: formData.collapseWidth === undefined
			? existingSettings.collapseWidth ?? null
			: coerceNullableNumber(formData.collapseWidth),
		collapseHeight: formData.collapseHeight === undefined
			? existingSettings.collapseHeight ?? null
			: coerceNullableNumber(formData.collapseHeight),
		collapseBorderRadius: formData.collapseBorderRadius === undefined
			? existingSettings.collapseBorderRadius ?? null
			: coerceNullableNumber(formData.collapseBorderRadius),
		collapsePortraitX: formData.collapsePortraitX === undefined
			? existingSettings.collapsePortraitX ?? null
			: coerceNullableNumber(formData.collapsePortraitX),
		collapsePortraitY: formData.collapsePortraitY === undefined
			? existingSettings.collapsePortraitY ?? null
			: coerceNullableNumber(formData.collapsePortraitY),
		collapsePortraitScale: formData.collapsePortraitScale === undefined
			? existingSettings.collapsePortraitScale ?? null
			: coerceNullableNumber(formData.collapsePortraitScale),
		collapseBorderColor: formData.collapseBorderColor === undefined
			? existingSettings.collapseBorderColor ?? null
			: formData.collapseBorderColor || null,
		collapseUseCustomColors: formData.collapseUseCustomColors === undefined
			? existingSettings.collapseUseCustomColors ?? false
			: formData.collapseUseCustomColors === true,
		collapseBgColor: formData.collapseBgColor === undefined
			? existingSettings.collapseBgColor ?? null
			: formData.collapseBgColor || null,

		freeX: parseFreeVal(formData.freeX, existingSettings.freeX),
		freeY: parseFreeVal(formData.freeY, existingSettings.freeY),
		zIndex:
			formData.zIndex === "" || isNaN(formData.zIndex)
				? ""
				: Number(formData.zIndex),

		relativeX: existingSettings.relativeX,
		relativeY: existingSettings.relativeY,
		anchorX: existingSettings.anchorX,
		anchorY: existingSettings.anchorY,
		offsetX: existingSettings.offsetX,
		offsetY: existingSettings.offsetY,

		...captureEffectsBundle(
			(f, d) => {
				const [cat, key] = f.split(".");
				return getNumOrExisting(`baseStyle.${f}`, existingSettings?.[cat]?.[key], d);
			},
			(f, d) => {
				const [cat, key] = f.split(".");
				return getValOrExisting(`baseStyle.${f}`, existingSettings?.[cat]?.[key], d);
			},
		),
	};
};
