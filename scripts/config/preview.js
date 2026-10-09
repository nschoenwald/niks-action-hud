/**
 * Preview controller for Nik's Action HUD Configuration.
 * Exclusively designed for Foundry V14.
 */

import { captureInputData } from "./capture.js";
import { isThemeAvailable, getDefaultTheme } from "./constants.js";

export const triggerPreview = (app) => {
	if (!app?.element) return;

	// Always ensure tempData reflects current form inputs before updating preview
	try {
		captureInputData(app, app.element);
	} catch (e) {
		console.warn("Nik's Action HUD | Could not capture input data for preview:", e);
	}

	let theme = app.tempData.theme || getDefaultTheme();
	if (!isThemeAvailable(theme)) theme = getDefaultTheme();
	const font = app.tempData.actionMenuFont || "";
	const scale = Math.max(0.5, Math.min(2.5, Number(app.tempData.actionMenuScale) || 1.0));
	const emphasizeFirst = app.tempData.actionMenuEmphasizeFirstButton ?? true;
	const pos = app.tempData.actionMenuPos || { anchorX: "left", anchorY: "bottom", offsetX: 240, offsetY: 20 };

	// 1. Synchronize Live Sandbox inside the config dialog
	const sandbox = app.element.querySelector(".hud-preview-sandbox");
	if (sandbox) {
		sandbox.className = `hud-preview-sandbox theme-${theme} ${font ? "am-custom-font" : ""}`;
		sandbox.style.transform = `scale(${scale})`;
		sandbox.style.transformOrigin = "center center";

		if (font) {
			sandbox.style.setProperty("--am-font-family", `'${font}', sans-serif`);
		} else {
			sandbox.style.removeProperty("--am-font-family");
		}
		sandbox.dataset.emphasizeFirst = String(emphasizeFirst);

		const previewButtons = sandbox.querySelectorAll(".nah-action-btn");
		previewButtons.forEach((btn, index) => {
			if (index === 0 && emphasizeFirst) {
				btn.classList.add("nah-action-btn-first");
			} else {
				btn.classList.remove("nah-action-btn-first");
			}

			// Apply inline font-family to button content and text spans for immediate rendering
			const textEls = btn.querySelectorAll(".nah-btn-content, .nah-btn-content span");
			textEls.forEach((el) => {
				if (font) {
					el.style.fontFamily = `'${font}', sans-serif`;
				} else {
					el.style.fontFamily = "";
				}
			});
		});
	}

	// 2. Synchronize Live Canvas Action HUD in background
	if (window.ActionHUD?.previewUpdate) {
		window.ActionHUD.previewUpdate("global", {
			anchorX: pos.anchorX,
			anchorY: pos.anchorY,
			offsetX: pos.offsetX,
			offsetY: pos.offsetY,
			scale: scale,
			theme: theme,
			font: font,
			emphasizeFirst: emphasizeFirst,
			useTokenImg: app.tempData.actionMenuUseTokenImg ?? false,
		});
	}
};

