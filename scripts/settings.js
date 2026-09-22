import { ActionHUDConfig } from "./config.js";
import { ActionMenu } from "./features/action-menu.js";
import { ActionHUDSocket } from "./lib/socket.js";
import { BaseSystemAdapter } from "./systems/base.js";
import { DnD5eAdapter } from "./systems/dnd5e.js";
import { adapterRegistry } from "./systems/registry.js";
import { registerModuleApi } from "./api.js";
import { MODULE_ID } from "./constants.js";

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
				theme: "rift",
				enableActionMenu: true,
				actionMenuPos: { anchorX: "right", anchorY: "bottom", offsetX: 40, offsetY: 40 },
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

		game.settings.register(MODULE_ID, "actorPresets", {
			name: "Actor Presets",
			scope: "world",
			config: false,
			type: Object,
			default: {},
		});

		game.settings.register(MODULE_ID, "personalActorPresets", {
			name: "Personal Actor Presets",
			scope: "client",
			config: false,
			type: Object,
			default: {},
		});

		game.settings.register(MODULE_ID, "clientActorOverrides", {
			name: "Client Actor Overrides",
			scope: "client",
			config: false,
			type: Object,
			default: {},
		});

		game.settings.register(MODULE_ID, "trackingConfigRole", {
			name: "Tracking Config Role",
			scope: "world",
			config: false,
			type: Number,
			default: 4,
		});

		// =========================================
		// 2. USER-FACING SETTINGS & CONFIG MENU
		// =========================================

		// 2.1 Master Toggle (Top of Settings)
		game.settings.register(MODULE_ID, "disableHUD", {
			name: "NIKS_ACTION_HUD.Settings.DisableHUDName",
			hint: "NIKS_ACTION_HUD.Settings.DisableHUDHint",
			scope: "client",
			config: true,
			type: Boolean,
			default: false,
			onChange: (val) => {
				if (val) {
					window.ActionHUD?.actionMenu?.hideMenu?.();
					const root = document.getElementById(ActionMenu.ROOT_ID);
					if (root) root.style.display = "none";
				} else {
					ActionMenu.refresh();
				}
			},
		});

		// 2.2 Visual Configuration Panel Menu Button
		game.settings.registerMenu(MODULE_ID, "configMenu", {
			name: "NIKS_ACTION_HUD.Settings.ConfigMenuName",
			label: "NIKS_ACTION_HUD.Settings.ConfigMenuLabel",
			hint: "NIKS_ACTION_HUD.Settings.ConfigMenuHint",
			icon: "fas fa-cogs",
			type: ActionHUDConfig,
			restricted: false,
		});

		// 2.3 Canvas & Scene Controls Integration
		game.settings.register(MODULE_ID, "hideTokenControls", {
			name: "NIKS_ACTION_HUD.Settings.HideTokenControlsName",
			hint: "NIKS_ACTION_HUD.Settings.HideTokenControlsHint",
			scope: "client",
			config: true,
			type: Boolean,
			default: false,
			requiresReload: true,
		});

		// 2.4 HUD Scaling & Sizing Suite
		game.settings.register(MODULE_ID, "enableResizeHandle", {
			name: "NIKS_ACTION_HUD.Settings.EnableResizeHandleName",
			hint: "NIKS_ACTION_HUD.Settings.EnableResizeHandleHint",
			scope: "client",
			config: true,
			type: Boolean,
			default: true,
			onChange: () => ActionMenu.refresh(),
		});

		game.settings.register(MODULE_ID, "wheelResize", {
			name: "NIKS_ACTION_HUD.Settings.WheelResizeName",
			hint: "NIKS_ACTION_HUD.Settings.WheelResizeHint",
			scope: "client",
			config: true,
			type: Boolean,
			default: true,
		});

		game.settings.register(MODULE_ID, "scaleModifierKey", {
			name: "NIKS_ACTION_HUD.Settings.ScaleModifierKeyName",
			hint: "NIKS_ACTION_HUD.Settings.ScaleModifierKeyHint",
			scope: "client",
			config: true,
			type: String,
			choices: {
				ctrl: "NIKS_ACTION_HUD.Settings.ScaleModCtrl",
				alt: "NIKS_ACTION_HUD.Settings.ScaleModAlt",
				shift: "NIKS_ACTION_HUD.Settings.ScaleModShift",
				none: "NIKS_ACTION_HUD.Settings.ScaleModNone",
			},
			default: "ctrl",
		});

		game.settings.register(MODULE_ID, "showScaleIndicator", {
			name: "NIKS_ACTION_HUD.Settings.ShowScaleIndicatorName",
			hint: "NIKS_ACTION_HUD.Settings.ShowScaleIndicatorHint",
			scope: "client",
			config: true,
			type: Boolean,
			default: true,
		});

		// 2.5 Submenu & Tooltip Display
		game.settings.register(MODULE_ID, "actionMenuSubmenuSide", {
			name: "IBHUD.Settings.ActionMenuSubmenuSide.Name",
			hint: "IBHUD.Settings.ActionMenuSubmenuSide.Hint",
			scope: "client",
			config: true,
			type: String,
			default: "auto",
			choices: {
				auto: "IBHUD.Settings.ActionMenuSubmenuSide.Auto",
				left: "IBHUD.Settings.ActionMenuSubmenuSide.Left",
				right: "IBHUD.Settings.ActionMenuSubmenuSide.Right",
			},
			onChange: () => ActionMenu.refresh(),
		});

		game.settings.register(MODULE_ID, "tooltipPosition", {
			name: "IBHUD.Settings.TooltipPosition.Name",
			hint: "IBHUD.Settings.TooltipPosition.Hint",
			scope: "client",
			config: true,
			type: String,
			default: "anchor",
			choices: {
				anchor: "IBHUD.Settings.TooltipPosition.Anchor",
				cursor: "IBHUD.Settings.TooltipPosition.Cursor",
			},
		});

		game.settings.register(MODULE_ID, "reduceMotion", {
			name: "IBHUD.Settings.ReduceMotion.Name",
			hint: "IBHUD.Settings.ReduceMotion.Hint",
			scope: "client",
			config: true,
			type: Boolean,
			default: false,
		});

		// 2.6 Permissions & Roles (World Settings)
		game.settings.register(MODULE_ID, "styleConfigRole", {
			name: "IBHUD.Settings.StyleConfigRole.Name",
			hint: "IBHUD.Settings.StyleConfigRole.Hint",
			scope: "world",
			config: true,
			type: Number,
			default: 1,
			choices: {
				1: "USER.RolePlayer",
				2: "USER.RoleTrusted",
				3: "USER.RoleAssistant",
				4: "USER.RoleGamemaster",
			},
		});

		game.settings.register(MODULE_ID, "menuConfigRole", {
			name: "IBHUD.Settings.MenuConfigRole.Name",
			hint: "IBHUD.Settings.MenuConfigRole.Hint",
			scope: "world",
			config: true,
			type: Number,
			default: 4,
			choices: {
				1: "USER.RolePlayer",
				2: "USER.RoleTrusted",
				3: "USER.RoleAssistant",
				4: "USER.RoleGamemaster",
			},
		});

		// Themes
		Hooks.callAll(`${MODULE_ID}.registerThemes`, ActionHUDConfig.THEMES);

		// =========================================
		// 3. KEYBINDINGS
		// =========================================

		game.keybindings.register(MODULE_ID, "toggleHUD", {
			name: "IBHUD.Keybindings.ToggleHUD.Name",
			hint: "IBHUD.Keybindings.ToggleHUD.Hint",
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

				// Reflect on live scene controls if present
				// [V14 Compatible Only]: In Foundry V14, ui.controls.controls is a Map<string, SceneControl>
				// (replacing V13's Array) and SceneControl.tools is a Record<string, SceneControlTool>
				// (replacing V13's Array).
				const layer = ui.controls;
				if (layer?.controls instanceof Map) {
					const tokenControl = layer.controls.get("token") ?? layer.controls.get("tokens");
					const tool = tokenControl?.tools?.["niks-action-toggle"];
					if (tool) {
						tool.active = isHidden;
						layer.render();
					}
				}
			},
			restricted: false,
			precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
		});

		game.keybindings.register(MODULE_ID, "toggleActionMenuVisibility", {
			name: "IBHUD.Keybindings.ToggleActionMenuVisibility.Name",
			hint: "IBHUD.Keybindings.ToggleActionMenuVisibility.Hint",
			editable: [
				{
					key: "KeyM",
					modifiers: ["Shift"],
				},
			],
			onDown: () => {
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

		// =========================================
		// 4. SCENE CONTROLS (V14+ Record structure)
		// =========================================
		// [V14 Compatible Only]: In Foundry V14, the getSceneControlButtons hook parameter changed
		// from SceneControl[] (Array) to Record<string, SceneControl> (plain object).
		// SceneControl.tools is now Record<string, SceneControlTool> (plain object keyed by name)
		// rather than an Array.
		Hooks.on("getSceneControlButtons", (controls) => {
			const hideControls = game.settings.get(MODULE_ID, "hideTokenControls");
			if (hideControls) return;

			// [V14 Compatible Only]: Direct property access on controls Record (replaces V13 controls.find)
			const tokenControls = controls?.token ?? controls?.tokens ?? null;
			if (!tokenControls?.tools) return;

			// [V14 Compatible Only]: Assign directly to tools Record by name (replaces V13 tools.push)
			const addTool = (tool) => {
				if (!tokenControls.tools[tool.name]) {
					tokenControls.tools[tool.name] = tool;
				}
			};

			addTool({
				name: "niks-action-toggle",
				title: game.i18n.localize("NIKS_ACTION_HUD.UI.ToggleHUD") || game.i18n.localize("IBHUD.UI.ToggleHUD") || "Toggle Action HUD",
				icon: "fas fa-eye",
				toggle: true,
				active: true,
				onChange: (_event, active) => {
					const root = document.getElementById(ActionMenu.ROOT_ID);
					if (active) {
						ActionMenu.refresh();
					} else {
						ActionMenu.hideMenu();
					}
				},
			});

			addTool({
				name: "niks-action-config",
				title: game.i18n.localize("NIKS_ACTION_HUD.UI.Settings") || game.i18n.localize("IBHUD.UI.LayoutOrSettings") || "Action HUD Settings",
				icon: "fas fa-cogs",
				button: true,
				onChange: () => {
					new ActionHUDConfig().render(true);
				},
			});
		});

		// Initialize Action Menu feature
		ActionMenu.initialize();

		// Sockets
		window.ActionHUD.socket = new ActionHUDSocket();
		window.ActionHUD.socket.register("grantMacroPermission", async (macroUuid, userId) => {
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
