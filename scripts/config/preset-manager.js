import { MODULE_ID } from "../constants.js";
import { normalizeConditionsLayout } from "./schema.js";

const WORLD_PRESETS_KEY = "actorPresets";
const PERSONAL_PRESETS_KEY = "personalActorPresets";

export class ActorPresetManager {
	/**
	 * @param {"world" | "personal" | "all"} scope
	 * @returns {Array}
	 */
	static getPresets(scope = "all") {
		const results = [];

		if (scope === "world" || scope === "all") {
			const worldPresets = game.settings.get(MODULE_ID, WORLD_PRESETS_KEY) || {};
			for (const [id, preset] of Object.entries(worldPresets)) {
				results.push({ ...preset, id, scope: "world" });
			}
		}

		if (scope === "personal" || scope === "all") {
			const personalPresets = game.settings.get(MODULE_ID, PERSONAL_PRESETS_KEY) || {};
			for (const [id, preset] of Object.entries(personalPresets)) {
				results.push({ ...preset, id, scope: "personal" });
			}
		}

		results.sort((a, b) => a.name.localeCompare(b.name));
		return results;
	}

	/**
	 * @param {string} presetId
	 * @returns {Object|null}
	 */
	static getPreset(presetId) {
		if (presetId.startsWith("builtin-")) {
			const adapter = window.ActionHUD?.adapter;
			if (adapter?.getDefaultActorPresets) {
				const builtins = adapter.getDefaultActorPresets();
				const found = builtins.find(p => p.id === presetId);
				if (found) return { ...found, scope: "builtin" };
			}
		}

		const worldPresets = game.settings.get(MODULE_ID, WORLD_PRESETS_KEY) || {};
		if (worldPresets[presetId]) {
			return { ...worldPresets[presetId], id: presetId, scope: "world" };
		}

		const personalPresets = game.settings.get(MODULE_ID, PERSONAL_PRESETS_KEY) || {};
		if (personalPresets[presetId]) {
			return { ...personalPresets[presetId], id: presetId, scope: "personal" };
		}

		return null;
	}

	/**
	 * @param {string} name
	 * @param {Object} actorData
	 * @param {Object} options
	 * @returns {Promise<Object>}
	 */
	static async savePreset(name, actorData, options = {}) {
		const {
			scope = "personal",
			includes = { style: true, layout: true, attributes: true, imageRules: true },
			description = "",
			actorId = null,
		} = options;

		if (scope === "world" && !game.user.isGM) {
			ui.notifications.error(game.i18n.localize("IBHUD.Preset.Actor.NoPermission"));
			return null;
		}

		const presetId = foundry.utils.randomID();

		const presetData = {
			name,
			description,
			createdBy: game.user.id,
			createdAt: new Date().toISOString(),
			includes,
			data: {},
		};

		if (includes.style) {
			presetData.data.filters = foundry.utils.deepClone(actorData.filters || {});
			presetData.data.overlay = foundry.utils.deepClone(actorData.overlay || {});
			presetData.data.tint = foundry.utils.deepClone(actorData.tint || {});
		}

		if (includes.layout) {
			presetData.data.scale = actorData.scale;
			presetData.data.cardScale = actorData.cardScale;
			presetData.data.cardWidth = actorData.cardWidth;
			presetData.data.cardHeight = actorData.cardHeight;
			presetData.data.portraitWidth = actorData.portraitWidth;
			presetData.data.portraitHeight = actorData.portraitHeight;
			presetData.data.nameX = actorData.nameX;
			presetData.data.nameY = actorData.nameY;
			presetData.data.nameZ = actorData.nameZ;
			presetData.data.nameScale = actorData.nameScale;
			presetData.data.nameRotation = actorData.nameRotation;
			presetData.data.barsX = actorData.barsX;
			presetData.data.barsY = actorData.barsY;
			presetData.data.barsZ = actorData.barsZ;
			presetData.data.dotsX = actorData.dotsX;
			presetData.data.dotsY = actorData.dotsY;
			presetData.data.dotsZ = actorData.dotsZ;
			presetData.data.numbersZ = actorData.numbersZ;
			presetData.data.badgesZ = actorData.badgesZ;
			presetData.data.conditionsZ = actorData.conditionsZ;
			presetData.data.conditionsLayout = actorData.conditionsLayout;
			presetData.data.format = actorData.format;
			presetData.data.hideBg = actorData.hideBg;
		}

		if (includes.attributes && actorData.attributes) {
			presetData.data.attributes = foundry.utils.deepClone(actorData.attributes);
		}

		if (includes.imageRules && actorData.imageRules) {
			presetData.data.imageRules = foundry.utils.deepClone(actorData.imageRules);
		}

		const settingKey = scope === "world" ? WORLD_PRESETS_KEY : PERSONAL_PRESETS_KEY;
		const existingPresets = game.settings.get(MODULE_ID, settingKey) || {};
		existingPresets[presetId] = presetData;

		await game.settings.set(MODULE_ID, settingKey, existingPresets);

		ui.notifications.info(
			game.i18n.format("IBHUD.Preset.Actor.SaveSuccess", { name })
		);

		return { ...presetData, id: presetId, scope };
	}

	/**
	 * @param {string} presetId
	 * @returns {Promise<boolean>}
	 */
	static async deletePreset(presetId) {
		let settingKey = null;
		let presets = null;

		const worldPresets = game.settings.get(MODULE_ID, WORLD_PRESETS_KEY) || {};
		if (worldPresets[presetId]) {
			if (!game.user.isGM) {
				ui.notifications.error(game.i18n.localize("IBHUD.Preset.Actor.NoPermission"));
				return false;
			}
			settingKey = WORLD_PRESETS_KEY;
			presets = worldPresets;
		} else {
			const personalPresets = game.settings.get(MODULE_ID, PERSONAL_PRESETS_KEY) || {};
			if (personalPresets[presetId]) {
				settingKey = PERSONAL_PRESETS_KEY;
				presets = personalPresets;
			}
		}

		if (!settingKey || !presets) {
			ui.notifications.error(game.i18n.localize("IBHUD.Preset.Actor.NotFound"));
			return false;
		}

		const presetName = presets[presetId]?.name || presetId;
		delete presets[presetId];

		await game.settings.set(MODULE_ID, settingKey, presets);

		ui.notifications.info(
			game.i18n.format("IBHUD.Preset.Actor.DeleteSuccess", { name: presetName })
		);

		return true;
	}

	/**
	 * @param {string} presetId
	 * @param {Object} app
	 * @returns {boolean}
	 */
	static applyPreset(presetId, app) {
		const preset = this.getPreset(presetId);
		if (!preset) {
			ui.notifications.error(game.i18n.localize("IBHUD.Preset.Actor.NotFound"));
			return false;
		}

		const actorId = app.currentEditId;
		if (actorId === "global") {
			ui.notifications.warn(game.i18n.localize("IBHUD.Preset.Actor.NotForGlobal"));
			return false;
		}

		if (!app.tempData.actorSettings[actorId]) {
			app.tempData.actorSettings[actorId] = {};
		}

		const settings = app.tempData.actorSettings[actorId];
		const { includes, data } = preset;

		if (includes.style && data.filters) {
			settings.filters = foundry.utils.deepClone(data.filters);
		}
		if (includes.style && data.overlay) {
			settings.overlay = foundry.utils.deepClone(data.overlay);
		}
		if (includes.style && data.tint) {
			settings.tint = foundry.utils.deepClone(data.tint);
		}

		if (includes.layout) {
			if (data.scale !== undefined) settings.scale = data.scale;
			if (data.cardScale !== undefined) settings.cardScale = data.cardScale;
			if (data.cardWidth !== undefined) settings.cardWidth = data.cardWidth;
			if (data.cardHeight !== undefined) settings.cardHeight = data.cardHeight;
			if (data.portraitWidth !== undefined) settings.portraitWidth = data.portraitWidth;
			if (data.portraitHeight !== undefined) settings.portraitHeight = data.portraitHeight;
			if (data.nameX !== undefined) settings.nameX = data.nameX;
			if (data.nameY !== undefined) settings.nameY = data.nameY;
			if (data.nameZ !== undefined) settings.nameZ = data.nameZ;
			if (data.nameScale !== undefined) settings.nameScale = data.nameScale;
			if (data.nameRotation !== undefined) settings.nameRotation = data.nameRotation;
			if (data.barsX !== undefined) settings.barsX = data.barsX;
			if (data.barsY !== undefined) settings.barsY = data.barsY;
			if (data.barsZ !== undefined) settings.barsZ = data.barsZ;
			if (data.dotsX !== undefined) settings.dotsX = data.dotsX;
			if (data.dotsY !== undefined) settings.dotsY = data.dotsY;
			if (data.dotsZ !== undefined) settings.dotsZ = data.dotsZ;
			if (data.numbersZ !== undefined) settings.numbersZ = data.numbersZ;
			if (data.badgesZ !== undefined) settings.badgesZ = data.badgesZ;
			if (data.conditionsX !== undefined) settings.conditionsX = data.conditionsX;
			if (data.conditionsY !== undefined) settings.conditionsY = data.conditionsY;
			if (data.conditionsZ !== undefined) settings.conditionsZ = data.conditionsZ;
			if (data.conditionsLayout !== undefined) settings.conditionsLayout = data.conditionsLayout ? normalizeConditionsLayout(data.conditionsLayout) : null;
			if (data.endTurnX !== undefined) settings.endTurnX = data.endTurnX;
			if (data.endTurnY !== undefined) settings.endTurnY = data.endTurnY;
			if (data.format !== undefined) settings.format = data.format;
			if (data.hideBg !== undefined) settings.hideBg = data.hideBg;
		}

		if (includes.attributes && data.attributes) {
			app.tempData.actorAttributes[actorId] = foundry.utils.deepClone(data.attributes);
		}

		if (includes.imageRules && data.imageRules) {
			app.tempData.imageRules[actorId] = foundry.utils.deepClone(data.imageRules);
		}

		ui.notifications.info(
			game.i18n.format("IBHUD.Preset.Actor.ApplySuccess", { name: preset.name })
		);

		return true;
	}

	static collectActorData(app) {
		const actorId = app.currentEditId;
		if (actorId === "global") return null;

		const settings = app.tempData.actorSettings[actorId] || {};
		const attributes = app.tempData.actorAttributes[actorId] || [];
		const imageRules = app.tempData.imageRules[actorId] || [];

		return {
			filters: settings.filters || {},
			overlay: settings.overlay || {},
			tint: settings.tint || {},
			scale: settings.scale,
			cardScale: settings.cardScale,
			cardWidth: settings.cardWidth,
			cardHeight: settings.cardHeight,
			portraitWidth: settings.portraitWidth,
			portraitHeight: settings.portraitHeight,
			nameX: settings.nameX,
			nameY: settings.nameY,
			nameZ: settings.nameZ,
			nameScale: settings.nameScale,
			nameRotation: settings.nameRotation,
			barsX: settings.barsX,
			barsY: settings.barsY,
			barsZ: settings.barsZ,
			dotsX: settings.dotsX,
			dotsY: settings.dotsY,
			dotsZ: settings.dotsZ,
			numbersZ: settings.numbersZ,
			badgesZ: settings.badgesZ,
			conditionsX: settings.conditionsX,
			conditionsY: settings.conditionsY,
			conditionsZ: settings.conditionsZ,
			conditionsLayout: settings.conditionsLayout,
			endTurnX: settings.endTurnX,
			endTurnY: settings.endTurnY,
			format: settings.format,
			hideBg: settings.hideBg,
			attributes,
			imageRules,
		};
	}

	/**
	 * @param {Object} app
	 * @returns {Promise<Object|null>}
	 */
	static async showSaveDialog(app) {
		const { DialogV2 } = foundry.applications.api;
		const isGM = game.user.isGM;

		const result = await DialogV2.prompt({
			window: {
				title: game.i18n.localize("IBHUD.Preset.Actor.SaveTitle"),
				icon: "fas fa-save",
			},
			content: `
				<div style="display: flex; flex-direction: column; gap: 12px;">
					<div class="form-group">
						<label>${game.i18n.localize("IBHUD.Preset.Actor.Name")}</label>
						<input type="text" name="presetName" placeholder="Fighter Template" style="width: 100%;">
					</div>
					
					<div class="form-group">
						<label>${game.i18n.localize("IBHUD.Preset.Actor.Scope")}</label>
						<select name="presetScope" style="width: 100%;" ${!isGM ? 'disabled' : ''}>
							${isGM ? `<option value="world">${game.i18n.localize("IBHUD.Preset.Actor.ScopeWorld")}</option>` : ''}
							<option value="personal" ${!isGM ? 'selected' : ''}>${game.i18n.localize("IBHUD.Preset.Actor.ScopePersonal")}</option>
						</select>
					</div>
					
					<div class="form-group">
						<label>${game.i18n.localize("IBHUD.Preset.Actor.IncludeTitle")}</label>
						<div style="display: flex; flex-direction: column; gap: 6px; padding: 8px; background: #222; border-radius: 4px;">
							<label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
								<input type="checkbox" name="includeStyle" checked>
								<span>${game.i18n.localize("IBHUD.Preset.Actor.IncludeStyle")}</span>
							</label>
							<label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
								<input type="checkbox" name="includeLayout" checked>
								<span>${game.i18n.localize("IBHUD.Preset.Actor.IncludeLayout")}</span>
							</label>
							<label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
								<input type="checkbox" name="includeAttributes" checked>
								<span>${game.i18n.localize("IBHUD.Preset.Actor.IncludeAttributes")}</span>
							</label>
							<label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
								<input type="checkbox" name="includeRules" checked>
								<span>${game.i18n.localize("IBHUD.Preset.Actor.IncludeRules")}</span>
							</label>
						</div>
					</div>
				</div>
			`,
			ok: {
				label: game.i18n.localize("IBHUD.Preset.Actor.SaveBtn"),
				icon: "fas fa-save",
				callback: (event, button, dialog) => {
					const form = button.form;
					return {
						name: form.presetName.value.trim(),
						scope: form.presetScope.value,
						includes: {
							style: form.includeStyle.checked,
							layout: form.includeLayout.checked,
							attributes: form.includeAttributes.checked,
							imageRules: form.includeRules.checked,
						},
					};
				},
			},
			classes: ["stylish-hud-dialog"],
		});

		if (!result || !result.name) {
			return null;
		}

		app._captureInputData(app.element);

		const actorData = this.collectActorData(app);
		if (!actorData) {
			ui.notifications.error(game.i18n.localize("IBHUD.Preset.Actor.NotForGlobal"));
			return null;
		}

		return await this.savePreset(result.name, actorData, {
			scope: result.scope,
			includes: result.includes,
			actorId: app.currentEditId,
		});
	}

	/**
	 * @param {string} presetId
	 * @returns {Promise<boolean>}
	 */
	static async showDeleteDialog(presetId) {
		const preset = this.getPreset(presetId);
		if (!preset) return false;

		const { DialogV2 } = foundry.applications.api;

		const confirmed = await DialogV2.confirm({
			window: {
				title: game.i18n.localize("IBHUD.Preset.Actor.DeleteTitle"),
				icon: "fas fa-trash",
			},
			content: `<p>${game.i18n.format("IBHUD.Preset.Actor.DeleteConfirm", { name: preset.name })}</p>`,
			classes: ["stylish-hud-dialog"],
		});

		if (!confirmed) return false;

		return await this.deletePreset(presetId);
	}
}
