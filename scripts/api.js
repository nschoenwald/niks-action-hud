import { ActionMenu } from "./features/action-menu.js";
import { defaultRegistry } from "./systems/defaults.js";
import { adapterRegistry } from "./systems/registry.js";
import { BaseSystemAdapter } from "./systems/base.js";
import { MODULE_ID } from "./constants.js";

/**
 * Collect macro data from customMenu items
 * @param {Array} customMenu - The custom menu structure
 * @returns {Promise<Object>} - Map of macro UUID/ID to macro data
 */
const collectMacrosFromMenu = async (customMenu) => {
	const macros = {};

	for (const category of customMenu || []) {
		for (const tab of category.tabs || []) {
			for (const item of tab.items || []) {
				if (item.type === "Macro" && item.id) {
					const macro = (await fromUuid(item.id)) || game.macros.get(item.id);
					if (macro) {
						const isCompendium = item.id.startsWith("Compendium.");
						macros[item.id] = {
							uuid: macro.uuid,
							name: macro.name,
							img: macro.img,
							type: macro.type,
							isCompendium,
							...(isCompendium ? {} : { command: macro.command }),
						};
					}
				}
			}
		}
	}

	return macros;
};

/**
 * Export current configuration as a preset
 * @param {Object} options - Export options
 * @returns {Promise<Object>} - Preset data object
 */
const exportPreset = async (options = {}) => {
	const {
		includeTheme = true,
		includeCustomMenu = true,
	} = options;

	const config = game.settings.get(MODULE_ID, "configuration") || {};
	const moduleData = game.modules.get(MODULE_ID);

	const preset = {
		meta: {
			name: "Untitled Preset",
			description: "",
			systemId: game.system.id,
			systemTitle: game.system.title,
			moduleVersion: moduleData?.version || "unknown",
			exportDate: new Date().toISOString(),
			foundryVersion: game.version,
		},
		data: {},
		macros: {},
	};

	if (includeTheme) {
		preset.data.theme = config.theme;
	}

	if (includeCustomMenu) {
		preset.data.customMenu = foundry.utils.deepClone(config.customMenu || []);
		preset.macros = await collectMacrosFromMenu(config.customMenu);
	}

	return preset;
};

/**
 * Import a preset and apply it to the current configuration
 * @param {Object} presetData - The preset data to import
 * @param {Object} options - Import options
 * @returns {Promise<Object>} - Result object with status and details
 */
const importPreset = async (presetData, options = {}) => {
	const { merge = false, skipSystemCheck = false } = options;

	if (!presetData || !presetData.meta || !presetData.data) {
		return { success: false, error: "Invalid preset format" };
	}

	const isSystemMismatch = presetData.meta.systemId !== game.system.id;
	if (!skipSystemCheck && isSystemMismatch) {
		const { DialogV2 } = foundry.applications.api;
		const confirmed = await DialogV2.confirm({
			window: {
				title: game.i18n.localize("IBHUD.Preset.SystemMismatchTitle"),
				icon: "fas fa-exclamation-triangle",
			},
			content: `<p>${game.i18n.format("IBHUD.Preset.SystemMismatchContent", {
				presetSystem: presetData.meta.systemTitle || presetData.meta.systemId,
				currentSystem: game.system.title,
			})}</p>`,
			classes: ["stylish-hud-dialog"],
		});
		if (!confirmed) {
			return { success: false, error: "Import cancelled due to system mismatch" };
		}
	}

	const result = {
		success: true,
		macrosCreated: [],
		macrosSkipped: [],
		warnings: [],
	};

	const originalToNewMacroId = {};

	for (const [originalId, macroData] of Object.entries(presetData.macros || {})) {
		let existingMacro = await fromUuid(originalId).catch(() => null);
		if (!existingMacro) {
			existingMacro = game.macros.get(originalId);
		}

		if (existingMacro) {
			originalToNewMacroId[originalId] = existingMacro.uuid || existingMacro.id;
			result.macrosSkipped.push(macroData.name);
		} else if (macroData.isCompendium) {
			result.warnings.push(`Compendium macro "${macroData.name}" not found: ${originalId}`);
			originalToNewMacroId[originalId] = null;
		} else if (macroData.command) {
			const folder = await ensureMacroFolder("Action HUD Presets");
			const newMacro = await Macro.create({
				name: macroData.name,
				img: macroData.img,
				type: macroData.type || "script",
				command: macroData.command,
				folder: folder?.id,
			});
			originalToNewMacroId[originalId] = newMacro.uuid || newMacro.id;
			result.macrosCreated.push(macroData.name);
		} else {
			result.warnings.push(`Cannot restore macro "${macroData.name}" - no command data`);
			originalToNewMacroId[originalId] = null;
		}
	}

	const customMenu = foundry.utils.deepClone(presetData.data.customMenu || []);
	for (const category of customMenu) {
		for (const tab of category.tabs || []) {
			for (const item of tab.items || []) {
				if (item.type === "Macro" && item.id && originalToNewMacroId[item.id] !== undefined) {
					if (originalToNewMacroId[item.id]) {
						item.id = originalToNewMacroId[item.id];
					} else {
						item._broken = true;
					}
				}
			}
			tab.items = (tab.items || []).filter((item) => !item._broken);
		}
	}

	const currentConfig = game.settings.get(MODULE_ID, "configuration") || {};
	const newConfig = merge
		? foundry.utils.mergeObject(
				currentConfig,
				{
					...(presetData.data.theme && { theme: presetData.data.theme }),
					...(customMenu.length && { customMenu }),
				},
				{ inplace: false },
			)
		: {
				...currentConfig,
				...(presetData.data.theme && { theme: presetData.data.theme }),
				...(customMenu.length && { customMenu }),
			};

	await game.settings.set(MODULE_ID, "configuration", newConfig);

	return result;
};

/**
 * Ensure a macro folder exists, create if not
 * @param {string} folderName - Name of the folder
 * @returns {Promise<Folder|null>}
 */
const ensureMacroFolder = async (folderName) => {
	let folder = game.folders.find((f) => f.type === "Macro" && f.name === folderName);
	if (!folder) {
		folder = await Folder.create({
			name: folderName,
			type: "Macro",
			parent: null,
		});
	}
	return folder;
};

/**
 * Download preset as JSON file
 * @param {Object} preset - The preset data
 * @param {string} filename - Optional filename (default: preset name)
 */
const downloadPreset = (preset, filename = null) => {
	const name = filename || preset.meta?.name || "action-hud-preset";
	const safeName = name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
	const json = JSON.stringify(preset, null, 2);
	saveDataToFile(json, "application/json", `${safeName}.json`);
};

/**
 * Open file picker and import preset from JSON file
 * @param {Object} options - Import options (passed to importPreset)
 * @returns {Promise<Object>} - Import result
 */
const importPresetFromFile = async (options = {}) => {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json";

		input.onchange = async (e) => {
			const file = e.target.files[0];
			if (!file) {
				resolve({ success: false, error: "No file selected" });
				return;
			}

			try {
				const text = await file.text();
				const preset = JSON.parse(text);
				const result = await importPreset(preset, options);
				resolve(result);
			} catch (err) {
				resolve({ success: false, error: `Failed to parse preset: ${err.message}` });
			}
		};

		input.click();
	});
};

export const registerModuleApi = (moduleClass, options = {}) => {
	if (!moduleClass) return null;
	const themeRegistry = options.themes || moduleClass.THEMES || {};
	if (!Object.prototype.hasOwnProperty.call(moduleClass, "THEMES")) {
		moduleClass.THEMES = themeRegistry;
	}
	const registerTheme = (key, themeData) => {
		const themeKey = String(key || "").trim();
		if (!themeKey || !themeData || typeof themeData !== "object") return null;
		themeRegistry[themeKey] = themeData;
		return themeRegistry[themeKey];
	};
	const moduleApi = {
		BaseSystemAdapter,
		registerSystemAdapter: adapterRegistry.registerSystemAdapter,
		createSystemAdapter: adapterRegistry.createSystemAdapter,
		getRegisteredAdapters: adapterRegistry.getRegisteredAdapters,
		listSystemAdapters: adapterRegistry.listSystemAdapters,
		registerDefaultLayout: defaultRegistry.registerDefaultLayout,
		getDefaultLayout: defaultRegistry.getDefaultLayout,
		listDefaultLayouts: defaultRegistry.listDefaultLayouts,
		registerActionMenuCategory: ActionMenu.registerActionMenuCategory,
		registerActionMenuSubMenu: ActionMenu.registerActionMenuSubMenu,
		registerTheme,
		getThemes: () => themeRegistry,
		onModifyActionMenuCategories: (callback) => {
			Hooks.on(`${MODULE_ID}.modifyActionMenuCategories`, callback);
		},
		onModifyActionMenuData: (callback) => {
			Hooks.on(`${MODULE_ID}.modifyActionMenuData`, callback);
		},
		updateConfiguration: async (updates = {}, options = {}) => {
			const current = game.settings.get(MODULE_ID, "configuration") || {};
			const next = options.replace
				? updates
				: foundry.utils.mergeObject(current, updates, {
						inplace: false,
					});
			await game.settings.set(MODULE_ID, "configuration", next);
			return next;
		},
		updateClientPositions: async (updates = {}, options = {}) => {
			const current = game.settings.get(MODULE_ID, "clientPositions") || {};
			const next = options.replace
				? updates
				: foundry.utils.mergeObject(current, updates, {
						inplace: false,
					});
			await game.settings.set(MODULE_ID, "clientPositions", next);
			return next;
		},
		getRegisteredActionMenuCategories: ActionMenu.getRegisteredActionMenuCategories,
		getRegisteredActionMenuSubMenus: ActionMenu.getRegisteredActionMenuSubMenus,
		exportPreset,
		importPreset,
		downloadPreset,
		importPresetFromFile,
	};

	const moduleData = game.modules.get(moduleClass.ID);
	if (moduleData) moduleData.api = moduleApi;
	Hooks.callAll(`${MODULE_ID}.apiReady`, moduleApi);

	moduleClass.registerSystemAdapter = adapterRegistry.registerSystemAdapter;
	moduleClass.createSystemAdapter = adapterRegistry.createSystemAdapter;
	moduleClass.BaseSystemAdapter = BaseSystemAdapter;
	moduleClass.registerDefaultLayout = defaultRegistry.registerDefaultLayout;
	moduleClass.registerTheme = registerTheme;
	moduleClass.getThemes = () => themeRegistry;
	moduleClass.updateConfiguration = moduleApi.updateConfiguration;
	moduleClass.updateClientPositions = moduleApi.updateClientPositions;
	moduleClass.exportPreset = exportPreset;
	moduleClass.importPreset = importPreset;
	moduleClass.downloadPreset = downloadPreset;
	moduleClass.importPresetFromFile = importPresetFromFile;

	return moduleApi;
};
