/**
 * Preview controller for Nik's Action HUD Configuration.
 * Exclusively designed for Foundry V14.
 */

import { readFormValues } from "./form-reader.js";
import { isThemeAvailable, getDefaultTheme } from "./ui-constants.js";
import { fitRibbonLabels } from "../dock/models.js";

export const refreshPreview = (app) => {
	if (!app?.element) return;

	// Always ensure the draft reflects current form inputs before updating preview
	try {
		readFormValues(app, app.element);
	} catch (e) {
		console.warn("Nik's Action HUD | Could not capture input data for preview:", e);
	}

	let theme = app.draft.data.theme || getDefaultTheme();
	if (!isThemeAvailable(theme)) theme = getDefaultTheme();
	const font = app.draft.data.fontFamily || "";
	const shape = app.draft.data.buttonShape || "";

	// 1. Synchronize Live Sandbox inside the config dialog
	const sandbox = app.element.querySelector(".hud-preview-sandbox");
	if (sandbox) {
		sandbox.className = `hud-preview-sandbox theme-${theme} ${font ? "nah-custom-font" : ""}`;

		if (font) {
			sandbox.style.setProperty("--nah-font-family", `'${font}', sans-serif`);
		} else {
			sandbox.style.removeProperty("--nah-font-family");
		}
		if (shape) {
			sandbox.dataset.buttonShape = shape;
		} else {
			delete sandbox.dataset.buttonShape;
		}

		const previewButtons = sandbox.querySelectorAll(".nah-hud-btn");
		previewButtons.forEach((btn) => {
			// Apply inline font-family to button text spans for immediate rendering
			const textEls = btn.querySelectorAll(".nah-btn-inner span");
			textEls.forEach((el) => {
				if (font) {
					el.style.fontFamily = `'${font}', sans-serif`;
				} else {
					el.style.fontFamily = "";
				}
			});
		});

		fitRibbonLabels(sandbox);
	}

	// 2. Synchronize Live Canvas Action HUD in background
	if (window.NikHUD?.pushPreview) {
		window.NikHUD.pushPreview({
			theme,
			font,
			hudOpacity: Number(app.draft.data.hudOpacity) || 100,
			tooltipScale: Number(app.draft.data.tooltipScale) || 100,
		});
	}
};

