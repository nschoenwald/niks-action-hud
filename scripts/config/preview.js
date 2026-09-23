import { MODULE_ID } from "../constants.js";
import { getAMElementPreviewData, getGlobalImagePreviewData, getGlobalMenuBehaviorPreviewData, getGlobalResponsivePreviewData, getGlobalSimpleFieldKeys, getGlobalSimplePreviewData, getGlobalThemeFontLayoutPreviewData } from "./schema.js";

export const triggerPreview = (app, focusedIndex = null) => {
	if (app.currentEditId === "global") {
		app._triggerPreviewGlobal(focusedIndex);
		return;
	}

	app._captureInputData(app.element);

	const persistedGlobalConfig =
		game.settings.get(MODULE_ID, "configuration") || {};
	const clientPos =
		game.settings.get(MODULE_ID, "clientPositions") || {};
	const globalConfig = {
		...persistedGlobalConfig,
		...Object.fromEntries(
			getGlobalSimpleFieldKeys().map((key) => [
				key,
				app.tempData[key] ?? persistedGlobalConfig[key],
			]),
		),
	};

	const savedData = app._calculateActorStyle(
		app.currentEditId,
		clientPos,
		globalConfig,
	);

	const activeRules = foundry.utils.deepClone(
		app.tempData.imageRules?.[app.currentEditId] || [],
	);

	const savedAttributes = app.tempData.actorAttributes[app.currentEditId] || [];
	const globalAttributes = app.tempData.globalAttributes || [];

	const newData = {
		...getGlobalSimplePreviewData(app.tempData),
		...getGlobalImagePreviewData(app.tempData),
		...savedData,
		theme: app.tempData.theme,
		imageRules: activeRules,
		forceRuleIndex: focusedIndex,
		showConditionPreview: ["conditionsX", "conditionsY", "conditionsLayout"].includes(
			app._previewFocusField || app.element.querySelector(":focus")?.name || "",
		),
		previewAttributes: savedAttributes,
		previewGlobalAttributes: globalAttributes,
	};

	if (window.ActionHUD) {
		window.ActionHUD.previewUpdate(app.currentEditId, newData);
	}
};

export const triggerPreviewGlobal = (app, focusedEffectIndex = null) => {
	const toNumberOr = (value, fallback) => {
		if (value === undefined || value === null || value === "") return fallback;
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	};

	app._captureInputData(app.element);

	const currentPos = app.tempData.globalPos || {};
	const useTop = currentPos.top !== undefined && currentPos.top !== null;
	const useRight = currentPos.right !== undefined && currentPos.right !== null;
	const unit = currentPos.unit || "px";

	const globalBottomInput = app.element.querySelector('input[name="globalBottom"]');
	const globalLeftInput = app.element.querySelector('input[name="globalLeft"]');
	const globalScaleInput = app.element.querySelector('input[name="globalScale"]');

	const bottomFallback = useTop
		? (currentPos.top ?? app.tempData.globalPos?.top ?? 5)
		: (currentPos.bottom ?? app.tempData.globalPos?.bottom ?? 5);
	const leftFallback = useRight
		? (currentPos.right ?? app.tempData.globalPos?.right ?? 0)
		: (currentPos.left ?? app.tempData.globalPos?.left ?? 0);

	const bottomInput = toNumberOr(globalBottomInput?.value, bottomFallback);
	const leftInput = toNumberOr(globalLeftInput?.value, leftFallback);
	const baseScale = toNumberOr(globalScaleInput?.value, app.tempData.globalScale ?? 1.0);
	const responsiveData = getGlobalResponsivePreviewData(app.tempData);
	const responsiveEnabled = responsiveData.responsiveEnabled;
	const baseWidth = responsiveData.responsiveBaseWidth;
	const baseHeight = responsiveData.responsiveBaseHeight;
	const scaleMin = responsiveData.responsiveScaleMin;
	const scaleMax = responsiveData.responsiveScaleMax;
	const sidebar = document.getElementById("sidebar");
	const SIDEBAR_RESERVED_WIDTH = 364;
	const sidebarWidth = Math.max(sidebar?.offsetWidth ?? 0, SIDEBAR_RESERVED_WIDTH);
	const usableWidth = window.innerWidth - sidebarWidth;
	const usableBaseWidth = baseWidth - SIDEBAR_RESERVED_WIDTH;
	const widthScale = usableBaseWidth ? usableWidth / usableBaseWidth : 1.0;
	const heightScale = baseHeight ? window.innerHeight / baseHeight : 1.0;
	const rawAutoScale = Math.min(widthScale, heightScale);
	const autoScale = responsiveEnabled
		? Math.min(scaleMax, Math.max(scaleMin, rawAutoScale))
		: 1.0;
	const scale = baseScale * autoScale;
	const gapInput = Number(
		app.element.querySelector('input[name="globalGap"]')?.value,
	);
	const gap = Number.isFinite(gapInput) ? gapInput : 10;

	const actionMenuBaseScale =
		Number(app.element.querySelector('input[name="actionMenuScale"]')?.value) ||
		1.0;
	const actionMenuScale = actionMenuBaseScale * autoScale;
	app.tempData.positionMode = app.tempData.positionMode ?? "anchor";
	const actionMenuTop =
		Number(app.element.querySelector('input[name="actionMenuTop"]')?.value) ||
		800;
	const actionMenuLeft =
		Number(app.element.querySelector('input[name="actionMenuLeft"]')?.value) ||
		1200;
	let previewEffect = null;

	if (focusedEffectIndex !== null) {
		const targetInput = app.element.querySelector(
			`[name="effects.${focusedEffectIndex}.id"]`,
		);

		const row = targetInput ? targetInput.closest(".effect-row") : null;

		if (row) {
			const getInput = (name) => {
				const el = row.querySelector(
					`[name="effects.${focusedEffectIndex}.${name}"]`,
				);
				return el ? (el.type === "checkbox" ? el.checked : el.value) : "";
			};

			previewEffect = {
				id: getInput("id") || "preview_temp",
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
			};
		}
	}

	const menuBehaviorData = getGlobalMenuBehaviorPreviewData(app.tempData);
	const simpleGlobalData = getGlobalSimplePreviewData(app.tempData);
	const themeFontLayoutData = getGlobalThemeFontLayoutPreviewData(app.tempData);
	const previewAttributes = app.tempData.globalAttributes || [];

	const position = { unit };
	if (useTop) {
		position.top = Math.round(bottomInput * heightScale);
	} else {
		position.bottom = Math.round(bottomInput * heightScale);
	}
	if (useRight) {
		position.right = Math.round(leftInput * widthScale);
	} else {
		position.left = Math.round(leftInput * widthScale);
	}
	if (themeFontLayoutData.layoutMode === "stack") {
		if (position.right !== undefined && position.right !== null) {
			position.right = Math.max(position.right, sidebarWidth);
		}
	}

	if (window.ActionHUD) {
		const focusedName =
			app._previewFocusField || app.element.querySelector(":focus")?.name || "";
		window.ActionHUD.previewUpdate("global", {
			...position,
			scale,
			...themeFontLayoutData,
			...menuBehaviorData,
			...responsiveData,
			gap,
			actionMenuScale,
			actionMenuBaseScale,
			actionMenuTop,
			actionMenuLeft,
			...simpleGlobalData,
			showConditionPreview: ["conditionsX", "conditionsY", "conditionsLayout"].includes(
				focusedName,
			),
			actionMenuPosMode: app.tempData.positionMode ?? "anchor",
			forcedEffect: previewEffect,
			previewAttributes: previewAttributes,
			portraitLayers: app.tempData.portraitLayers,
			cardBgLayers: app.tempData.cardBgLayers,
			actorSettings: app.tempData.actorSettings || {},
			...getGlobalImagePreviewData(app.tempData),
			amMenuLayers: app.tempData.amMenuLayers,
			amSubMenuLayers: app.tempData.amSubMenuLayers,
			...getAMElementPreviewData(app.tempData),
			perButtonFrames: (app.tempData.customMenu || []).map((cat) => ({
				buttonFrameLayers: cat.buttonFrameLayers || [],
				buttonFrameColor: cat.buttonFrameColor || "",
			})),
		});
	}
};
