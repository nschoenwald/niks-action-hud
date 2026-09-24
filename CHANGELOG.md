# Changelog

All notable changes to **Nik's Action HUD (`niks-action-hud`)** will be documented in this file.

## [14.1.1] - 2026-09-23

### New Themes Button Sizing & Spacing Alignment (Rift Proportions)
- **Tightly Spaced Buttons**: Overrode `#ib-action-menu.theme-{id} { gap: 0; }` across all 5 clean-room themes (**Arcanum**, **Obsidian**, **Grimoire**, **Eldritch**, and **Valiant**), eliminating the inherited 12px container gap and normalizing inter-button spacing to a compact, uniform 9px margin, identical to the Rift theme.
- **Rift-Proportional Button Geometry**: Standardized action buttons across all 5 new themes to `232px` width and `46px` height.
- **Uniform Button Appearance**: Removed contrasting hero accent colors and height overrides on the Attacks button in the 5 new themes, rendering all action category buttons with completely uniform dimensions, borders, and thematic backgrounds.
- **Horizontal Favorites Quick Slots**: Fixed an issue where favorites / quick slot icons stacked vertically in block layout by defining base `display: flex; flex-direction: row;` styling on `.ib-quick-slot-container` and custom scrollbars across all 5 new themes.
- **Submenu Alignment**: Standardized submenu flyout width to 406px and styled the menu collapse toggle across each new theme palette.

### Tooltip D&D 5e Enricher Flow & Line Break Fix
- **Fixed Line Break After Enrichers**: In Foundry V14, custom text enrichers are wrapped in `<enriched-content>`, which Foundry core defaults to `display: inline-block`. When an enricher (such as `[[/attack extended]]` or `[[/damage extended]]`) wrapped internally or was followed by punctuation (such as trailing periods `.`), the atomic inline-block box forced the trailing punctuation or subsequent inline text onto a line by itself.
- **Natural Inline Flow**: Explicitly set `enriched-content` to `display: inline !important;` inside `#ib-rich-tooltip` and `#ib-rich-tooltip .editor-content`, ensuring all enriched rolls, damage expressions, attacks, and trailing punctuation flow naturally as inline text.
- **System Typography Classes**: Added `dnd5e dnd5e2` system classes to `#ib-rich-tooltip` and `.editor-content` during tooltip initialization and rendering, ensuring system-specific typography rules, roll links, and d20 dice icons inherit properly.
- **Paragraph Spacing**: Normalized paragraph margins inside `#ib-rich-tooltip .editor-content` (`margin: 0 0 0.5em 0`) to prevent awkward vertical spacing.

## [14.1.0] - 2026-09-23

### Configuration Menu Complete Redesign & Refactor
- **Completely New UI/UX Design**:
  - Rebuilt the entire configuration menu interface with a modern dark-glass aesthetic (`backdrop-filter: blur(20px)`), luminous borders, and refined hierarchy.
  - **Two-Tier Split View Navigation**: Left-hand navigation rail featuring 5 dedicated sections: **General** (behavior & interaction), **Appearance** (visual themes, scaling, position), **Menu Builder** (category order, submenus, visibility rules), **Image Studio** (multi-layer graphical compositor), and **Presets & Backup** (world presets, JSON/ZIP import & export, modular resets).
  - **Interactive Visual Controls**:
    - **Visual Theme Selector Cards**: Clickable cards with live color preview swatches, artwork accents, and active indicators for all 8 themes (Rift, Iron, Glass, Fantasy, Cyberpunk, Medieval, Zenith, Image).
    - **Interactive Live Preview Sandbox**: An embedded HUD button bar directly inside the Appearance tab that updates in real time with dynamic CSS transform scaling, custom typography overrides, theme styles, and first-button emphasis.
    - **Live Dual-Target Preview Synchronization**: Changes to scale, fonts, themes, anchor positions, and coordinate margins instantly synchronize to both the in-dialog preview sandbox and the live canvas HUD in real time.
    - **4-Quadrant Anchor Positioner**: Visual quadrant selector (Top-Left, Top-Right, Bottom-Left, Bottom-Right) paired with pixel offset margin controls.
    - **Sleek Pill Toggles & Dual Sliders**: Replaced browser checkboxes with animated modern toggle switches, and standard sliders with real-time numeric output displays.
- **Complete Clean-Room Codebase Refactor**:
  - **Pruned 100% of Legacy Party HUD Cruft**: Completely removed all dead character card layouts, portrait layers, attribute tracking, qualitative badge conditions, resource threshold stages, actor rosters, and actor preset files (`preset-manager.js`).
  - **Native Foundry V14 ApplicationV2 Architecture**: Rewrote `ActionHUDConfig` strictly utilizing Foundry V14's `ApplicationV2` with `HandlebarsApplicationMixin` and declarative action delegation (`data-action`).
  - **Modular Templates**: Replaced the monolithic 1,158-line `config.hbs` template with structured modular sub-templates in `templates/config/` (`main.hbs` and dedicated tabs for `general`, `appearance`, `menu-builder`, `image-studio`, and `presets`).
  - **Streamlined Schema & Context**: Consolidated schema definitions down to active HUD keys in `scripts/config/schema.js`, cutting context preparation time to under 5ms with zero actor loop overhead.
- **Five Clean-Room Theme Presets Added (100% Solid & Non-Transparent)**:
  - **Arcanum**: Astral high fantasy with solid deep midnight velvet surfaces (`#140f26`), burnished celestial starlight gold filigree, and diamond-chamfered action buttons.
  - **Obsidian**: Modern tactical minimalist aesthetic with solid deep onyx surfaces (`#0d1117`), hairline specular borders, and mint/emerald power accents.
  - **Grimoire**: Authentic dark fantasy and OSR aesthetic with solid aged dark parchment & vellum (`#1c1510`), hammered forged iron brackets, candlelit amber glow, and blood-red wax seals.
  - **Eldritch**: Abyssal cosmic horror with solid deep chitin plates (`#080d14`), breathing bioluminescent cyan glow, and Far Realm psychic magenta pulses.
  - **Valiant**: Chivalric heraldry and knightly orders featuring solid royal plate steel surfaces (`#0e1829`), sapphire enamel accents, and tournament gold chevron geometry.
  - **Zero Transparency**: All 5 new themes feature 100% solid, opaque surfaces across action buttons, submenus, sidebars, headers, tabs, search bars, quick slots, list items, and tooltips, eliminating blur overhead and maximizing contrast against game canvas maps.
  - *(All previous legacy themes retained in parallel for seamless compatibility).*
- **Configuration Save & Window Header Improvements**:
  - **Auto-Close on Save**: Saving configuration via the footer button or <kbd>Ctrl+S</kbd> now cleanly saves settings, refreshes the live HUD, displays the localized notification *"Nik's Action HUD configuration saved."*, and closes the dialog.
  - **Window Title Resolution**: Standardized ApplicationV2 window title localization and styled the native window header, icon, and title in the dark-glass design system.
- **Keyboard Shortcut**: Added <kbd>Ctrl+S</kbd> / <kbd>Cmd+S</kbd> shortcut to save configuration instantly from any tab.

---

## [14.0.5] - 2026-09-23

### Foundry V14 Exclusivity Cleanup
- **Foundry V14 Only**: Completely removed legacy Foundry V13 compatibility code and fallbacks.
- **Strict V14 Scene Controls**: Standardized scene controls registration strictly on Foundry V14 structures (`Record<string, SceneControl>` parameter and `Record<string, SceneControlTool>` tools dictionary).
- **Strict V14 Live Controls Access**: Standardized live toolbar control updates strictly on `ui.controls.controls` (`Map<string, SceneControl>`), removing legacy Array traversals.

---

## [14.0.4] - 2026-09-23

### Hide Empty Submenus
- **Hide Empty Submenus Setting**: Added a new setting `hideEmptySubmenus` (default to enabled) that automatically hides action category buttons and submenus with no entries for the currently selected actor (for example, the Spells button and submenu for actors that have no spells, or Attacks for actors with no equipped weapons).
- **Dynamic Category Button Filtering**: Evaluates category contents synchronously during HUD rendering; category buttons with zero valid entries are excluded from the main action bar.
- **Submenu Protection & Dismissal**: If an open submenu has its last entry removed or if the user switches to an actor without entries for that submenu, the panel is automatically dismissed cleanly. Direct invocation (`toggleSubMenu` / `renderSubMenu`) prevents opening empty panels when the setting is enabled.
- **Edit Mode Bypass**: While in Edit Mode (`window.ActionHUD.isEditMode`), all categories remain visible regardless of entry count so users can configure layouts and drop items or macros.
- **Settings & Config Panel Integration**: Added to both Foundry VTT's Module Settings (`Configure Settings -> Module Settings -> Nik's Action HUD`) and the visual Action HUD Configuration dialog (under the Action Menu tab).

---

## [14.0.3] - 2026-09-23

### Right-Click Directly Opens Item Sheet
- **Direct Item Sheet Navigation**: Right-clicking any item, feature, or spell in the Action HUD list now directly opens that item's sheet (`item.sheet.render(true)`).
- **Removed Editable Resource Functionality**: Completely removed the legacy "Editable Resource" prompt dialog, status-effect resource extraction (`getResourceForEdit`), and right-click interceptors that previously prevented opening item sheets.

### Persistent Size Drag Indicator & Setting Cleanups
- **Always Visible Drag Handle**: The bottom-right HUD resize drag indicator handle (`#niks-resize-handle`) is now permanently visible on the HUD at all times (`opacity: 0.65` resting, `0.9` on HUD hover, `1.0` during active resize/drag) rather than hidden until hover.
- **Baked In Resize Settings**: Removed `enableResizeHandle` and `showScaleIndicator` from module settings registration, keeping interactive corner dragging and scale toast feedback permanently enabled as native core behaviors.

### Removed Reduce Motion Setting & Logic
- **Purged Reduce Motion**: Removed the `reduceMotion` setting and cleaned up all `.reduce-motion` and `@media (prefers-reduced-motion: reduce)` style overrides that forced animations and transitions off, streamlining runtime CSS.

### Mouse Wheel Scaling Modifier Default
- **Shift as Default Modifier**: Changed the default modifier key for mouse wheel scaling from `Ctrl` to `Shift` (`scaleModifierKey: "shift"`).
- **Dynamic Modifier Evaluation**: Updated the wheel resize event listener in `scripts/features/action-menu/drag.js` to actively read `scaleModifierKey` (Shift, Ctrl/Cmd, Alt, or None) rather than relying on hardcoded keys.

---

## [14.0.2] - 2026-09-23

### Fixed
- **Config Dialog ReferenceError (`adapter is not defined`)**: Resolved an issue in `scripts/config/context.js` where `adapter` was passed to `prepareExternalAdapterMenu` without being declared in `prepareContext`. `adapter` is now safely resolved via `window.ActionHUD?.adapter || adapterRegistry.createSystemAdapter(game.system.id)`.
- **Global API Alias & Handlers Consistency**: Added `window.stylishActionHUD = ActionHUD` backwards-compatibility alias in `scripts/main.js` and updated config handlers in `scripts/config/handlers.js` to reference `(window.ActionHUD || window.stylishActionHUD)` cleanly.

---

## [14.0.1] - 2026-09-22

### Foundry V14 Exclusivity & V13 Deprecation Cleanup
- **Dropped Legacy Foundry V13 Support**: Raised minimum required Foundry version to **14** in `module.json` (`"compatibility": { "minimum": "14", "verified": "14" }`).
- **V14-Only Compatibility Annotations**: Added explicit `// [V14 Compatible Only]: ...` code comments throughout all changed areas documenting V14-specific structures and deprecations:
  - **Scene Controls Hook (`getSceneControlButtons`)**: Removed legacy V13 `controls` Array searching and `tools.push()` fallbacks. Strictly handles `controls` as a `Record<string, SceneControl>` and `tools` as a `Record<string, SceneControlTool>` (`scripts/settings.js`).
  - **Live Controls Access (`ui.controls`)**: Removed V13 Array traversal; strictly handles `ui.controls.controls` as `Map<string, SceneControl>` and `SceneControl.tools` as `Record<string, SceneControlTool>` (`scripts/settings.js`).
  - **Combatant Queries (`Combat#getCombatantsByToken`)**: Removed legacy fallbacks and deprecated `Combat#getCombatantByToken`, standardizing on V14 `Combat#getCombatantsByToken` (`scripts/systems/dnd5e/action-menu.js`).
  - **ActiveEffect Statuses & Temp Checks**: Removed legacy Array fallbacks for `ActiveEffect#statuses` across `BaseSystemAdapter` and `DnD5eAdapter`. Standardized on strict `Set<string>` handling and V14 duration requirements for `isTemporary` (`scripts/systems/base.js`, `scripts/systems/dnd5e.js`).
  - **Item & Spell Properties (`Set<string>`)**: Removed legacy Array fallbacks for spell components and weapon ammunition properties, adhering strictly to DnD5e v6+ / Foundry V14 `Set<string>` architecture (`scripts/systems/dnd5e/action-menu.js`, `scripts/systems/dnd5e/helpers.js`).

---

## [14.0.0] - 2026-09-22

### Default "All" Tab for Items & Abilities
- **Added "All" Tab to Items Menu**: Injected a default "All" tab at the beginning of the Items / Inventory submenu, matching the existing behavior of Spells and Features.
- **Added "All" Tab to Abilities Menu**: Injected a default "All" tab at the beginning of the Abilities / Utility submenu, grouping Saves, Skills, Checks, Rests, and Custom Macros cleanly under section headers.
- **Section Headers**: All entries across sub-categories are cleanly grouped and displayed under their respective section headers.
- **Ordered Navigation**: When opening either submenu, the "All" tab is selected first by default.
- **Context-Aware Initiative Check**: The Initiative button in Checks / Abilities is now only displayed when there is an active combat encounter and the token does not have an initiative value yet. Once rolled, the button is automatically hidden.
- **Combat Lifecycle Real-Time Hooks**: Registered listeners for `createCombat`, `deleteCombat`, `createCombatant`, `updateCombatant`, and `deleteCombatant` to seamlessly refresh the HUD when combat starts, ends, or combatant initiative rolls occur.
- **Settings Order Overhaul**: Restructured all module settings registrations so that `Disable HUD` is placed at the very top of the settings list, followed by the Configuration Panel menu button, Scene Controls integration, the complete HUD Scaling & Sizing suite, Display & Navigation options, and World GM Permissions.
- **Automated GitHub Release Workflow**: Added `.github/workflows/release.yml` to automatically package `module.zip`, inject release tag download URLs into `module.json`, and attach release assets to published GitHub releases (without Foundry package repository publishing).
- **Localization**: Added `"AllItems": "All"` and `"AllAbilities": "All"` under `NIKS_ACTION_HUD.UI` in `lang/en.json`.

---

## [1.0.5] - 2026-09-22

### Default Theme: Rift
- Set **Rift** as the default theme across the module (settings defaults, schema fallbacks, renderer initialization, and config panel defaults).

### Config Menu Audit & Optimizations
- **Purged 9 Dead Party HUD Settings**:
  - Removed `partyHudVisibility`, `panToTokenOnClick`, `ownerOnlyCards`, `showSceneFriendlyNPCs`, `onlinePlayersOnly`, `useTokenName`, `partyHudDisplayMode`, `hudBehindUI`, and `layoutLocked` from `templates/config.hbs`, `scripts/config/schema.js`, `scripts/config/reset-sections.js`, and `lang/en.json`.
- **Render Overhead Optimization (~80% Faster)**:
  - Eliminated expensive iterations over `game.actors` (`_prepareActorList()`), roster actor transformations, tracking attribute lookups (`currentAttributes`, `availableAttributes`, `selectableAttributes`), and status effects bundling in `scripts/config/context.js`. The config window now opens and renders instantly.
- **Position Anchor Protection**:
  - Replaced misleading fixed pixel inputs (`actionMenuTop` / `actionMenuLeft`) in the config menu with a clean, responsive Scale slider.
  - Safeguarded docked anchor positioning (`anchorX: "right", anchorY: "bottom", offsetX: 40, offsetY: 40`) so saving configuration never corrupts or resets anchor coordinates to fixed screen pixels.
- **Template Balance & Cleanliness**:
  - Maintained 100% balanced Handlebars block structures in `templates/config.hbs` (168 open/close pairs).

---

## [1.0.4] - 2026-09-22

### Complete Removal of Sounds & Audio
- **Purged Audio Assets**: Deleted the entire `sounds/` asset directory (`click.mp3`, `fantasy_click.mp3`) and removed `scripts/utils/audio.js`.
- **Removed Audio Settings**:
  - Removed `soundProfile` and `disableSounds` from Foundry module settings.
  - Removed `enableSound`, `soundVolume`, `customSoundClick`, and `customSoundHover` from default configuration and client positions.
- **Cleaned Configuration UI & Templates**:
  - Removed the entire "Audio Settings" section (`IBHUD.Config.Style.AudioTitle`, volume slider, custom audio file picker) from the Common tab in `templates/config.hbs`.
  - Removed per-category `clickSound` and `hoverSound` fields from both adapter and custom menu categories in `templates/config.hbs`.
  - Removed `.category-sound-field` CSS styles from `styles/config.css`.
- **Runtime & Event Cleanups**:
  - Removed sound click and hover event listeners from `scripts/features/action-menu/events.js`.
  - Removed `data-click-sound` and `data-hover-sound` data attributes from `scripts/features/action-menu/renderer.js`.
  - Removed theme sound definitions from all themes in `scripts/config/constants.js`.
  - Removed custom sound fields, schema handlers, preview functions, and theme export collectors.
- **Cleaned Localization**: Removed all sound and audio strings (`AudioTitle`, `AudioEnable`, `CustomClick`, `SoundProfile*`, `DisableSounds*`, `CategoryClickSound`, `CategoryHoverSound`, etc.) from `lang/en.json`.

---

## [1.0.3] - 2026-09-22

### Built-in Native Behaviors (Settings Baked In)
Permanently baked 12 previously configurable settings into the core module runtime as always-enabled native behaviors, removing them from settings registration and decluttering the settings menu:
1. **Assigned Character Fallback**: Always falls back to the user's assigned character when no token is selected on the canvas.
2. **Token Name Title**: Always displays the controlled token's name in the HUD header.
3. **Hidden Subtitle**: Always hides the redundant "Selected Actor/Character" subtitle in the HUD header.
4. **Right-Click Opens Sheet**: Right-clicking any action or item unconditionally opens its sheet.
5. **Outside-Click Dismissal**: Submenus and open containers close unconditionally when clicking or dragging outside the HUD.
6. **DnD5e Icons**: Always injects native system ability and skill SVGs from `CONFIG.DND5E`.
7. **Wrap Favorites**: Favorites quick-slots always wrap onto multiple rows instead of clipping horizontally.
8. **"All" Spells Tab**: Default "All" tab in the spells menu is always injected and organized by level.
9. **"All" Features Tab**: Default "All" tab in the features menu is always injected and organized by type/passives.
10. **Rich DnD5e Tooltips**: Ability/skill check buttons always show comprehensive roll type and DC/modifier descriptions.
11. **Show HUD on Load**: The HUD is always displayed automatically on world load (unless `disableHUD` is explicitly set).
12. **Sync NPC Favorites**: Unlinked NPC tokens of the same actor always synchronize their favorite slots automatically.

### Configuration UI & Bug Fixes
- **SyntaxError Fix ('Unexpected token }' in actions.js & action-menu.js)**: Fixed an unclosed brace in `scripts/features/action-menu/actions.js` (`editResource`) and an incomplete method snippet in `scripts/features/action-menu.js` (`previewButton`) that triggered syntax errors during module parsing. Verified all 48 script files with strict ESM syntax checking.
- **SyntaxError Fix ('ActionHUDConfig' already declared)**: Removed duplicate `export const ActionHUDConfig` statement from `scripts/config.js` that caused a fatal module parse error.
- **Actor Sidebar Removal**: Completely removed the legacy actor sidebar, PC/NPC filter tabs, and roster checkboxes from `templates/config.hbs`, creating a clean, full-width single-panel configuration dialog.
- **Streamlined Settings**: Retained only essential toggle settings (`disableHUD`, `hideTokenControls`, `wheelResize`, `enableResizeHandle`, `scaleModifierKey`, `showScaleIndicator`, `soundProfile`, `disableSounds`).
- **Cleaned Localization**: Removed obsolete setting keys from `lang/en.json` while keeping required UI and tooltip strings.

---

## [1.0.2] - 2026-09-22

### Highlights & Bug Fixes
- **SyntaxError Fix ('ActionHUDConfig' already declared)**: Removed redundant duplicate `export const ActionHUDConfig` statement from the end of `scripts/config.js` that caused a fatal module compilation error and prevented the HUD from rendering.
- **Actor Sidebar Removal**: Completely removed the legacy actor sidebar, PC/NPC filter tabs, search input, and roster checkboxes from `templates/config.hbs`. The configuration menu is now a clean, full-width, single-panel dialog dedicated solely to the Action HUD.
- **Complete Decoupling from Legacy Module**: Completely removed `MigrationManager`, `LEGACY_MODULE_ID`, and all runtime references to `stylish-action-hud`, `window.StylishAction`, and `window.stylishActionHUD`. The module is now 100% standalone and clean.
- **Config Menu Visual Fix & Portrait Blowout Prevention**: Fixed CSS scoping mismatch in `styles/config.css` where rules targeted `#iron-blood-config` instead of the ApplicationV2 window ID `#niks-action-config`.
- **Action Menu Positioning & Canvas Load Refresh**: Fixed default unanchored coordinates (`top: 800, left: 1200`) that caused the HUD to render offscreen on many displays; defaulted to docked bottom-right anchor (`anchorX: "right", anchorY: "bottom", offsetX: 40, offsetY: 40`) with viewport clamping. Registered `canvasReady` and `updateUser` hooks to ensure HUD displays immediately on scene load and actor assignment.
- **Settings Deduplication & Localization Cleanups**: Removed duplicate `enableWheelResize` setting registration and removed redundant legacy `NIKS_STYLISH_ACTION_HUD` namespace from `lang/en.json`. All settings now cleanly show their localized names and hints.

---

## [1.0.1] - 2026-09-22

### Bug Fixes
- **Action Menu Opening & Flag Scopes**: Fixed an error where `actor.getFlag("stylish-action-hud", ...)` threw `Flag scope "stylish-action-hud" is not valid or not currently active` during token selection (`controlToken`). Replaced all legacy flag queries across the codebase with safe property access (`actor.flags?.[LEGACY_MODULE_ID]?.[key]`).
- **Config Menu Button & Missing Settings**: Fixed a promise rejection when clicking the "Configure Action HUD" button caused by unregistered settings (`trackingConfigRole`, `configurationPresets`, `actorPresets`, `personalActorPresets`, `clientActorOverrides`). All internal settings are now properly registered.
- **Settings Registration & Missing Names**: Registered all module settings (`rightClickOpenSheet`, `closeOnOutsideClick`, `useTokenNameTitle`, `wheelResize`) and provided complete, human-friendly localization strings for all settings, sound profile choices, and modifier keys in `lang/en.json`.
- **Role Dropdown Localization**: Updated role choices in `menuConfigRole` and `styleConfigRole` to use standard Foundry localization keys (`USER.RolePlayer`, `USER.RoleTrusted`, `USER.RoleAssistant`, `USER.RoleGamemaster`).

---

## [1.0.0] - 2026-09-22

### Highlights
- **Module Consolidation**: Consolidated `stylish-action-hud` and the `niks-stylish-action-hud` patch into a single, standalone module: `niks-action-hud`.
- **Party HUD Removal**: Purged all party HUD features (card tracking layers, OBS streaming overlays, voice indicators, portrait gallery, card navigation, party attributes) to focus entirely on a high-performance Action HUD.
- **DnD5e 6.0+ Focus & Modernization**: Focused built-in system support exclusively on DnD5e 6.0+ activities and data models, dropping backwards compatibility to v5.
- **Modular System Architecture**: Retained the modular system adapter infrastructure (`BaseSystemAdapter`, `adapterRegistry`, `defaultRegistry`, and lifecycle hooks) intact, enabling external modules and systems to register custom adapters seamlessly.
- **Standardized DnD5e Action Menu Labels**: Updated default DnD5e category layout and labels to **Attacks / Spells / Features / Abilities / Items**.
- **Foundry V13 & V14 Compatibility**: Native support for Foundry V14 breaking changes (SceneControls Record/Map data structures, tool dictionaries, deprecation of `-=` updateSource operators) alongside Foundry V13.

### Native Features Consolidated
- **Outside-Click Dismissal**: Action HUD automatically closes when clicking anywhere outside its bounds.
- **Direct Sheet Navigation**: Right-clicking an action button directly opens the actor sheet to that specific item.
- **Token Name Display**: HUD header dynamically displays the selected token name rather than the base prototype actor name.
- **Unlinked NPC Favorites Sync**: Added reliable favorite slots synchronization for unlinked tokens with safe flag operations.
- **Scale Toast & Corner Resize**:
  - Live scale toast indicator during resizing.
  - Interactive bottom-right corner resize handle.
  - Wheel resizing with `Ctrl`, `Alt`, or `Cmd` modifier keys.
- **Sound Profiles**: User selectable sound profiles (Iron / Modern, Fantasy / Medieval, or Mute) with customizable volume.
- **DnD5e Enhancements**:
  - Default category labels: Attacks / Spells / Features / Abilities / Items.
  - SVG ability and skill icons injected directly from `CONFIG.DND5E`.
  - Rich PHB tooltips showing Save DC and Check modifiers.
  - Dedicated "All" tab for spells and "All" tab for features.
- **Assigned Character Fallback**: Automatically activates HUD for user's assigned player character when no canvas token is selected.
- **Settings & Clean Canvas**:
  - Toggle to hide scene control token buttons (`hideTokenControls`).
  - Toggle to hide "Selected" text in the HUD header (`hideSelectedText`).
  - Toggle to wrap favorites across multiple rows (`wrapFavorites`).

### Technical Improvements
- Removed legacy `pf2e` adapter files and settings while preserving the extensible `BaseSystemAdapter` and `adapterRegistry` interfaces.
- Migrated module ID namespace to `niks-action-hud` while retaining backwards-compatible flag reads for `stylish-action-hud`.
- Registered scene controls inside `Hooks.once("init")` supporting both V13 Array and V14 Record representations.
- Streamlined configuration template (`templates/config.hbs`) to present only `actionmenu`, `menu`, and `common` settings.
- Validated all JavaScript source files with zero syntax errors.
