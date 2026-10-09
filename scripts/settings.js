import { ActionHUDConfig } from "./config.js";
import { ActionMenu } from "./features/action-menu.js";
import { socket } from "./utils/socket.js";
import { BaseSystemAdapter } from "./systems/base.js";
import { DnD5eAdapter } from "./systems/dnd5e.js";
import { adapterRegistry } from "./systems/registry.js";
import { registerModuleApi } from "./api.js";
import { MODULE_ID } from "./constants.js";
import { getDefaultTheme, DEFAULT_EXCLUDED_ACTOR_TYPES } from "./config/constants.js";

export class SettingsManager {
	static initialize() {
		// =========================================
		// 1. INTERNAL STORAGE & DATA (config: false)
		// =========================================

		game.settings.register(MODULE_ID, "configuration", {
			name: "Global Action HUD Config",
			scope: "world",
			config: false,
			type: Object,
			default: {
				theme: getDefaultTheme(),
				enableActionMenu: true,
				actionMenuPos: { anchorX: "left", anchorY: "bottom", offsetX: 240, offsetY: 20 },
				customMenu: [
					{
						systemId: "attack",
						label: "Attacks",
						icon: "fas fa-swords",
						type: "submenu",
						useSidebar: false,
					},
					{
						systemId: "magic",
						label: "Spells",
						icon: "fas fa-wand-magic-sparkles",
						type: "submenu",
						useSidebar: true,
					},
					{
						systemId: "feature",
						label: "Features",
						icon: "fas fa-bolt",
						type: "submenu",
						useSidebar: true,
					},
					{
						systemId: "legendary",
						label: "Legendary",
						icon: "fas fa-crown",
						type: "submenu",
						useSidebar: false,
					},
					{
						systemId: "utility",
						label: "Abilities",
						icon: "fas fa-dice-d20",
						type: "submenu",
						useSidebar: true,
					},
					{
						systemId: "item",
						label: "Items",
						icon: "fas fa-box-open",
						type: "submenu",
						useSidebar: true,
					},
				],
				adapterCategoryOverrides: {},
				actionMenuVisibility: "always",
				actionMenuUseTokenImg: false,
				actionMenuEmphasizeFirstButton: true,
				actionMenuSubmenuSide: "auto",
				dnd5eGroupActionsByActivation: false,
				dnd5eShowUnpreparedRituals: true,
				dnd5eAutoFavoriteNpcActions: true,
				dnd5eAutoFavoriteNpcMax: 5,
				hideEmptySubmenus: true,
				fadeWhenIdle: true,
				excludedActorTypes: DEFAULT_EXCLUDED_ACTOR_TYPES,
			},
			onChange: () => {
				ActionMenu.refresh();
			},
		});

		game.settings.register(MODULE_ID, "clientPositions", {
			name: "Client Position Overrides",
			scope: "client",
			config: false,
			type: Object,
			default: {},
			onChange: () => {
				ActionMenu.refresh();
			},
		});

		game.settings.register(MODULE_ID, "clientActorOverrides", {
			name: "Client Actor Overrides",
			scope: "client",
			config: false,
			type: Object,
			default: {},
			onChange: () => {
				ActionMenu.refresh();
			},
		});

		game.settings.register(MODULE_ID, "clientVisibility", {
			name: "Client Visibility Overrides",
			scope: "client",
			config: false,
			type: Object,
			default: {},
			onChange: () => {
				ActionMenu.refresh();
			},
		});

		game.settings.register(MODULE_ID, "favoriteViewOptions", {
			name: "Action Menu Favorite View Options",
			scope: "client",
			config: false,
			type: Object,
			default: {
				sortFirst: false,
				only: false,
			},
			onChange: () => {
				ActionMenu.refresh();
			},
		});

		game.settings.register(MODULE_ID, "actionMenuPresets", {
			name: "Action Menu Layout Presets",
			scope: "world",
			config: false,
			type: Object,
			default: {},
		});

		game.settings.register(MODULE_ID, "configurationPresets", {
			name: "Configuration Presets",
			scope: "world",
			config: false,
			type: Object,
			default: {},
		});



		// =========================================
		// 2. USER-FACING SETTINGS & CONFIG MENU
		// =========================================

		// 2.1 Master Toggle (Top of Settings)
		game.settings.register(MODULE_ID, "disableHUD", {
			name: "NAH.Settings.DisableHud.Name",
			hint: "NAH.Settings.DisableHud.Hint",
			scope: "user",
			config: true,
			type: Boolean,
			default: false,
			onChange: (val) => {
				if (val) {
					window.ActionHUD?.actionMenu?.hideMenu?.();
					const root = document.getElementById(ActionMenu.ROOT_ID);
					if (root) root.remove();
				} else {
					ActionMenu.refresh();
				}
			},
		});

		// 2.2 Visual Configuration Panel Menu Button
		game.settings.registerMenu(MODULE_ID, "configMenu", {
			name: "NAH.Settings.ConfigMenu.Name",
			label: "NAH.Settings.ConfigMenu.Label",
			hint: "NAH.Settings.ConfigMenu.Hint",
			icon: "fas fa-cogs",
			type: ActionHUDConfig,
			restricted: true,
		});


		// 2.5 Submenu & Tooltip Display
		game.settings.register(MODULE_ID, "hideEmptySubmenus", {
			name: "NAH.Settings.HideEmptySubmenus.Name",
			hint: "NAH.Settings.HideEmptySubmenus.Hint",
			scope: "client",
			config: false,
			type: Boolean,
			default: true,
			onChange: (val) => {
				const config = game.settings.get(MODULE_ID, "configuration") || {};
				if (config.hideEmptySubmenus !== val) {
					config.hideEmptySubmenus = val;
					game.settings.set(MODULE_ID, "configuration", config);
				}
				ActionMenu.refresh();
			},
		});

		game.settings.register(MODULE_ID, "fadeWhenIdle", {
			name: "NAH.Settings.InterfaceFading.Name",
			hint: "NAH.Settings.InterfaceFading.Hint",
			scope: "client",
			config: false,
			type: Boolean,
			default: true,
			onChange: (val) => {
				const config = game.settings.get(MODULE_ID, "configuration") || {};
				if (config.fadeWhenIdle !== val) {
					config.fadeWhenIdle = val;
					game.settings.set(MODULE_ID, "configuration", config);
				}
				ActionMenu.refresh();
			},
		});

		if (game.system.id === "dnd5e") {
			game.settings.register(MODULE_ID, "dnd5eShowUnpreparedRituals", {
				name: "NAH.Settings.WizardRituals.Name",
				hint: "NAH.Settings.WizardRituals.Hint",
				scope: "client",
				config: false,
				type: Boolean,
				default: true,
				onChange: (val) => {
					const config = game.settings.get(MODULE_ID, "configuration") || {};
					if (config.dnd5eShowUnpreparedRituals !== val) {
						config.dnd5eShowUnpreparedRituals = val;
						game.settings.set(MODULE_ID, "configuration", config);
					}
					ActionMenu.refresh();
				},
			});

			game.settings.register(MODULE_ID, "dnd5eAutoFavoriteNpcActions", {
				name: "NAH.Settings.AutoFavoriteNpc.Name",
				hint: "NAH.Settings.AutoFavoriteNpc.Hint",
				scope: "world",
				config: false,
				type: Boolean,
				default: true,
				onChange: (val) => {
					const config = game.settings.get(MODULE_ID, "configuration") || {};
					if (config.dnd5eAutoFavoriteNpcActions !== val) {
						config.dnd5eAutoFavoriteNpcActions = val;
						game.settings.set(MODULE_ID, "configuration", config);
					}
				},
			});

			game.settings.register(MODULE_ID, "dnd5eAutoFavoriteNpcMax", {
				name: "NAH.Settings.AutoFavoriteNpcMax.Name",
				hint: "NAH.Settings.AutoFavoriteNpcMax.Hint",
				scope: "world",
				config: false,
				type: Number,
				default: 5,
				range: {
					min: 1,
					max: 20,
					step: 1,
				},
				onChange: (val) => {
					const config = game.settings.get(MODULE_ID, "configuration") || {};
					if (config.dnd5eAutoFavoriteNpcMax !== val) {
						config.dnd5eAutoFavoriteNpcMax = val;
						game.settings.set(MODULE_ID, "configuration", config);
					}
				},
			});
		}

		game.settings.register(MODULE_ID, "actionMenuSubmenuSide", {
			name: "NAH.Settings.SubmenuSide.Name",
			hint: "NAH.Settings.SubmenuSide.Hint",
			scope: "client",
			config: false,
			type: String,
			default: "auto",
			choices: {
				auto: "NAH.Settings.SubmenuSide.Auto",
				left: "NAH.Settings.SubmenuSide.Left",
				right: "NAH.Settings.SubmenuSide.Right",
			},
			onChange: (val) => {
				const config = game.settings.get(MODULE_ID, "configuration") || {};
				if (config.actionMenuSubmenuSide !== val) {
					config.actionMenuSubmenuSide = val;
					game.settings.set(MODULE_ID, "configuration", config);
				}
				ActionMenu.refresh();
			},
		});

		game.settings.register(MODULE_ID, "tooltipPosition", {
			name: "NAH.Settings.TooltipPosition.Name",
			hint: "NAH.Settings.TooltipPosition.Hint",
			scope: "client",
			config: false,
			type: String,
			default: "anchor",
			choices: {
				anchor: "NAH.Settings.TooltipPosition.Anchor",
				cursor: "NAH.Settings.TooltipPosition.Cursor",
			},
			onChange: (val) => {
				const config = game.settings.get(MODULE_ID, "configuration") || {};
				if (config.tooltipPosition !== val) {
					config.tooltipPosition = val;
					game.settings.set(MODULE_ID, "configuration", config);
				}
			},
		});



		// Themes
		Hooks.callAll(`${MODULE_ID}.registerThemes`, ActionHUDConfig.THEMES);

		// =========================================
		// 3. KEYBINDINGS
		// =========================================

		game.keybindings.register(MODULE_ID, "toggleHUD", {
			name: "NAH.Keybindings.ToggleHUD.Name",
			hint: "NAH.Keybindings.ToggleHUD.Hint",
			editable: [
				{
					key: "KeyH",
					modifiers: ["Shift"],
				},
			],
			onDown: () => {
				const isHudDisabled = game.settings.get(MODULE_ID, "disableHUD");
				if (isHudDisabled) return;

				const root = document.getElementById(ActionMenu.ROOT_ID);
				const isHidden = root?.classList.contains("collapsed") || root?.style.display === "none";
				if (isHidden) {
					ActionMenu.refresh();
				} else {
					ActionMenu.hideMenu();
				}
			},
			restricted: false,
			precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
		});

		game.keybindings.register(MODULE_ID, "toggleActionMenuVisibility", {
			name: "NAH.Keybindings.ToggleActionMenuVisibility.Name",
			hint: "NAH.Keybindings.ToggleActionMenuVisibility.Hint",
			editable: [
				{
					key: "KeyM",
					modifiers: ["Shift"],
				},
			],
			onDown: () => {
				const isHudDisabled = game.settings.get(MODULE_ID, "disableHUD");
				if (isHudDisabled) return;

				const root = document.getElementById(ActionMenu.ROOT_ID);
				const isHidden = root?.classList.contains("collapsed") || root?.style.display === "none";
				if (isHidden) {
					ActionMenu.refresh();
				} else {
					ActionMenu.hideMenu();
				}
			},
			restricted: false,
			precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
		});


		// Initialize Action Menu feature
		ActionMenu.initialize();

		// Sockets
		window.ActionHUD.socket = socket;
		socket.register("grantMacroPermission", async (macroUuid, userId) => {
			if (!game.user.isGM) return { success: false, error: "Not GM" };

			try {
				const macro = (await fromUuid(macroUuid)) || game.macros.get(macroUuid);
				if (!macro) return { success: false, error: "Macro not found" };

				const currentOwnership = foundry.utils.deepClone(macro.ownership || {});
				if (currentOwnership[userId] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED) {
					return { success: true, alreadyHad: true };
				}

				currentOwnership[userId] = CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED;
				await macro.update({ ownership: currentOwnership });
				return { success: true };
			} catch (err) {
				console.error("Action HUD | Failed to grant macro permission:", err);
				return { success: false, error: err.message };
			}
		});

		// Register API
		registerModuleApi(window.ActionHUD, {
			themes: ActionHUDConfig.THEMES,
		});

		// Adapters
		adapterRegistry.registerSystemAdapter("dnd5e", DnD5eAdapter, {
			priority: 0,
			source: MODULE_ID,
		});
		adapterRegistry.registerSystemAdapter("generic", BaseSystemAdapter, {
			priority: -100,
			source: MODULE_ID,
		});

		window.ActionHUD.adapter = adapterRegistry.createSystemAdapter(game.system.id);

		// Setup hook
		Hooks.once("setup", () => {
			Hooks.callAll(`${MODULE_ID}.registerDefaults`, game.system.id);
			Hooks.callAll(`${MODULE_ID}.registerSystemAdapters`, adapterRegistry);
			window.ActionHUD.adapter = adapterRegistry.createSystemAdapter(game.system.id);
		});

		// Ready hook
		Hooks.on("ready", async () => {
			const isHudDisabled = game.settings.get(MODULE_ID, "disableHUD");
			if (!isHudDisabled) {
				requestAnimationFrame(() => {
					ActionMenu.refresh();
				});
			}
		});

		// Fonts
		const fontLink = document.createElement("link");
		fontLink.href =
			"https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Teko:wght@300..700&family=Oswald:wght@400;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap";
		fontLink.rel = "stylesheet";
		document.head.appendChild(fontLink);
	}
}
