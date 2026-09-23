/**
 * Section-specific reset handlers for Nik's Action HUD Configuration.
 * Exclusively designed for Foundry V14.
 */
import { defaultRegistry } from "../systems/defaults.js";
import { APPEARANCE_FIELDS, BEHAVIOR_FIELDS, AM_ELEMENTS } from "./schema.js";

export const RESET_SCOPES = Object.freeze({
	APPEARANCE: "appearance",
	BEHAVIOR: "behavior",
	MENU: "menu",
	LAYERS: "layers",
	ALL: "all",
});

export function resetSection(tempData, scope) {
	switch (scope) {
		case RESET_SCOPES.APPEARANCE:
			for (const f of APPEARANCE_FIELDS) {
				tempData[f.key] = f.fallback;
			}
			tempData.actionMenuPos = { anchorX: "right", anchorY: "bottom", offsetX: 40, offsetY: 40 };
			break;

		case RESET_SCOPES.BEHAVIOR:
			for (const f of BEHAVIOR_FIELDS) {
				tempData[f.key] = f.fallback;
			}
			break;

		case RESET_SCOPES.MENU: {
			const adapter = window.ActionHUD?.adapter;
			tempData.customMenu = defaultRegistry.getDefaultLayout(game.system.id, adapter);
			tempData.adapterCategoryOverrides = {};
			break;
		}

		case RESET_SCOPES.LAYERS:
			tempData.amMenuLayers = [];
			tempData.amSubMenuLayers = [];
			for (const el of AM_ELEMENTS) {
				tempData[`${el.id}Layers`] = [];
				tempData[`${el.id}Scale`] = 1;
				tempData[`${el.id}X`] = 0;
				tempData[`${el.id}Y`] = 0;
				tempData[`${el.id}Color`] = "";
				tempData[`${el.id}FontFamily`] = "";
				tempData[`${el.id}TextColor`] = "";
			}
			break;

		case RESET_SCOPES.ALL:
			resetSection(tempData, RESET_SCOPES.APPEARANCE);
			resetSection(tempData, RESET_SCOPES.BEHAVIOR);
			resetSection(tempData, RESET_SCOPES.MENU);
			resetSection(tempData, RESET_SCOPES.LAYERS);
			break;

		default:
			console.warn(`Nik's Action HUD | Unknown reset scope: ${scope}`);
			break;
	}
}
