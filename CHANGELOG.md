# Changelog

All notable changes to **Nik's Action HUD (`niks-action-hud`)** will be documented in this file.

## [14.14.1] - 2026-10-16

### Changed
- **DnD5e Pact Magic Sorting**: Moved Pact Magic spells and sidebar tabs directly between Cantrips and 1st-level spells in the Spells drawer for quicker access.

## [14.14.0] - 2026-10-15

### Added
- **Shadowdark RPG System Support**: Full native adapter integration for the Shadowdark RPG game system (`shadowdark` v4.x+), supporting both Player characters and NPCs with instantaneous access to attacks, spells, features, inventory items, and checks without opening character sheets.
  - **Attacks**: One-click rolls for weapon attacks (Melee, Ranged, Thrown) and NPC attacks/special attacks with weapon damage, range, and ammunition tracking.
  - **Spells**: Spells categorized by Tiers (1–5) for PCs and NPCs, plus castable Wands and Scrolls. Lost spells are clearly badged with instant one-click recovery.
  - **Abilities & Features**: Class abilities with limited uses tracking (`available / max`), DC check resolution, Talents (Ancestry, Class, Level, Boons), and NPC Features.
  - **Interactive Light Tracking**: Built-in real-time burn tracking for torches and lanterns with visual progress pips (`◆ ◆ ◆ ◇`), remaining time in minutes, and one-click ignition/extinguishing.
  - **Potions & Inventory**: One-click potion drinking with confirmation prompts, quick equipment toggling (Equip/Unequip), and slot usage indicators.
  - **Checks, Initiative & Luck**: Direct rolls for the 6 core ability checks (STR, DEX, CON, INT, WIS, CHA) with distinct thematic icons, combat initiative with DEX bonuses, and Luck tokens presented in a sleek single-line layout with in-line roll modifiers.
  - **Modifier Shortcuts**: Fast-forward with <kbd>Shift</kbd>, roll with Advantage using <kbd>Alt</kbd>, or Disadvantage using <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>.
- **Bespoke "Shadowdark" Theme**: A handcrafted visual theme capturing the stark, grim OSR pulp dungeon-crawler aesthetic. Built with solid void-black surfaces (`#060709`), stark bone typography, official Shadowdark eldritch purple specular borders (`#a546b6`), and candlelit torchlight amber highlights (`#f59e0b`). Automatically activates as the default theme when running on a Shadowdark world.
- **Chiselled Dungeon Button Shape**: Added a custom `shadowdark` button shape option featuring angular chiselled stone chamfers, selectable for any visual theme in Appearance settings.
- **Bundled Ability Check & Save Icons**: Added dedicated vector SVG icons for all six core abilities (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma), providing distinct thematic iconography across checks, saves, and quick slots for both Shadowdark and DnD5e adapters.
- **DnD5e Item Spell Grouping & Sorting**: Spells granted by equipment, wands, scrolls, and cast activities in the "Item" tab of the Spells drawer are now grouped and sorted by their item source first with distinct source headers, and then sorted by spell level (Cantrips, 1st level, 2nd level, etc.) within each item source.

## [14.13.3] - 2026-10-15

### Fixed
- **Player Combat Turn Ending**: Fixed an issue where non-GM players could not advance their combat turn using the red hourglass button on the HUD identity banner. Registered the module socket namespace with the Foundry server so player turn-passing requests reliably reach the GM, and expanded ownership checks to support unlinked (synthetic) tokens. Passing a turn no longer risks skipping a combatant if the GM responds slowly, and duplicate tokens of the same creature no longer show End Turn for each other.

## [14.13.2] - 2026-10-14

### Fixed
- **Multi-Language Icon Picker**: Translated all remaining strings for the Icon Picker modal dialog into Italian (contributed by [@GregoryWarn](https://github.com/GregoryWarn)), German, Spanish, and French, including search placeholders, family labels, tab titles, item counters, and dialog action buttons.

## [14.13.1] - 2026-10-14

### Added
- **Category Button Shape Override**: Added an option in *Appearance -> Styling, typography and avatars* to override category button shapes with the geometry of any theme (such as chamfered, hexagonal, slanted, or rounded) while preserving your selected theme colors and typography.

## [14.13.0] - 2026-10-14

### Added
- **Integrated Icon Picker**: Choose category icons visually from Font Awesome, RPG Awesome, native emojis, or local world images directly within the Menu Builder.
- **Redesigned Configuration UI**: Completely overhauled the configuration window layout with streamlined grouping, switch toggles, and live tracking of unsaved changes.
- **Local IBM Plex Fonts**: Bundled IBM Plex Sans and IBM Plex Mono fonts locally for clean, high-legibility typography across settings panels.
- **Brazilian Portuguese Localization**: Added full Portuguese (`pt-BR`) language support (contributed by [@RichardFontoura](https://github.com/RichardFontoura)).

## [14.12.3] - 2026-10-14

### Added
- **HUD Collapse Button Setting**: Added an option in *General -> Interaction & Automation* to show or hide the collapse button next to the token name (disabled by default).

### Changed
- **Action Terminology**: Renamed user-facing instances of "macros" to "actions" across the HUD, dialogs, and notifications.
- **Abilities Drawer Cleanup**: Removed the redundant "Macros" subtab from the Abilities drawer, focusing strictly on Saves, Skills, Checks, and Rests.

### Fixed
- **Drag & Drop Overhaul**: Fixed an issue where dragging items caused a stuck blurry overlay. Drag-and-drop now highlights drop targets cleanly, with direct support for dropping actions onto the Favorites bar or Custom Category buttons.
- **Rich Details in Custom Categories**: Weapons, spells, features, and items in custom categories now display their full details (damage formulas, damage type icons, range, spell components, activation costs, and remaining uses).
- **Custom Category Reliability**: Fixed an issue where newly created custom categories could inherit items from previously deleted ones, and resolved a bug where empty custom categories closed immediately when clicked.
- **Menu Builder Category Deletion**: Deleting custom categories in the Menu Builder now reliably removes them and preserves all category settings without ghost duplicates.
- **Dynamic Category Label Scaling**: Long localized category names (such as French or Italian) now automatically scale down to fit category buttons neatly without overlapping icons.
- **Collapsible HUD Mode**: The triangle button next to the token name cleanly minimizes the Action HUD into a compact identity strip and remembers its collapsed state across reloads.

## [14.12.2] - 2026-10-14

### Fixed
- **Menu Icon Font Preservation**: Fixed an issue where selecting a custom font in the Appearance settings stripped FontAwesome and RPG-Awesome icons from category buttons, replacing them with missing glyph placeholder boxes.
- **Menu Builder Category Deletion**: Fixed an issue where clicking the delete button on custom categories in the Menu Builder had no effect due to blocked click event propagation.
- **Custom Category Visibility**: Newly created custom categories now remain visible on the HUD even when empty, allowing GMs and players to click them and drop items or macros into their submenus.
- **Settings Reset & Factory Defaults**: Resetting settings sections or executing a factory reset now immediately persists to world settings and refreshes the canvas HUD across all connected clients.
- **Category Button Translations**: Default category button labels and submenu titles (Attacks, Spells, Features, Legendary, Abilities, Items) now automatically translate according to the active language.
- **Click Execution for Depleted / Exhausted Actions**: Actions, items, and spells with zero remaining uses or expended spell slots remain clickable and executable, allowing players and GMs to roll item cards, cast without consuming resources, or trigger DnD5e's native slot and activity prompts.

## [14.12.1] - 2026-10-13

### Fixed
- **Spell Usability with Expended Free Uses**: Spells with limited item or activity uses (such as racial spells or feat spells like *Fey Touched* and *Shadow Touched*) are no longer marked as dimmed out or unusable when their free daily uses reach zero, provided the character still has spell slots of sufficient level available to cast them.

## [14.12.0] - 2026-10-13

### Added
- **Multi-Language Support**: Added complete localizations for German (Deutsch), French (Français), and Spanish (Español), in addition to Italian (Italiano, contributed by @GregoryWarn) and the native English interface. All HUD tabs, category titles, action descriptions, configuration options, tooltips, and notifications are translated.

### Changed
- **Full Opacity for Depleted Favorite Icons**: Favorite quick slot icons now retain their full brightness and color vibrancy even when remaining uses reach zero, ensuring icons remain clearly visible without dimming or desaturating. Depleted status is communicated cleanly through the red-highlighted uses badge.

## [14.11.3] - 2026-10-13

### Added
- **Uses Display on Favorite Icons**: Favorite quick slot icons now display a compact, high-contrast uses badge in their bottom-right corner for any favorited action or item with limited uses (e.g. `3/3`, `1/2`, `0/1`). This tracks items with item-level limited uses (such as charges, wands, and magic items) and items with a single activity that has activity uses (such as *Second Wind*, *Action Surge*, or *Channel Divinity*), as well as legendary resistance and resources. When all uses are expended, the badge highlights in red and the icon subtly dims so resource availability is instantly clear at a glance.

## [14.11.2] - 2026-10-13

### Fixed
- **Activity Choice Dialog for Multi-Activity Actions**: Fixed an issue where clicking spells, features, or items with multiple activities (such as *Hunter's Mark*, which contains casting, moving the mark, and bonus damage activities) directly executed a damage or attack activity instead of prompting the activity choice dialog. The HUD now cleanly prompts DnD5e's native Activity Choice dialog whenever an action offers multiple usable activities, while single-activity items continue to roll immediately without extra prompts.

## [14.11.1] - 2026-10-11

### Changed
- **Single-Line Layout for Features Menu**: Streamlined the layout of items in the Features menu to a single, compact row (`[Action Type] [Icon] [Feature Name] [Uses] [Favorite Star]`). This eliminates empty secondary lines and presents actions, class features, species traits, and resources in a clean, unified format.
- **Two-Line Layout for Damage Features**: Features that contain a damage formula (e.g. Breath Weapon, Sneak Attack) retain the informative two-line layout used in Attacks and Spells, displaying damage formulas, damage type badges, and range clearly on the subline.
- **Clean Alignment for Passive Traits**: Features without an action activation cost (such as passive traits and reaction triggers without standard action badges) omit the action badge for a seamless visual flow while preserving icon artwork, limited use tracking, and favoriting.

## [14.11.0] - 2026-10-10

### Added
- **Shortened Spell Duration in Sublines**: Spells in the Spells menu now display a clean, concise duration in their subline next to range and damage info (e.g. `1m` for 1 minute, `10m` for 10 minutes, `1h` for 1 hour, `8h`, `1d`, `1 rnd`). Instantaneous spells remain clean without any duration clutter. Hovering over the duration displays the full duration label tooltip.
- **Client & World Scope Badges in Configuration**: Settings in the General & Behavior configuration panel now display clear visual scope badges indicating whether a setting applies to the local user account (👤 **Client**, cyan) or table-wide across all connected players (🌐 **World**, violet/purple), complete with hover tooltips explaining the scope.
- **Nik's Settings Locks Integration**: Integrated first-class support for the `niks-settings-locks` module. When enabled, GMs can toggle soft-locks (🟡) and hard-locks (🔴) directly on client-scoped settings within the Action HUD Configuration interface via left/right click, immediately syncing restrictions to connected players and disabling locked controls.

### Changed
- **Damage Type Display Setting Exclusivity**: Ensured the Damage Type Display setting is configured exclusively through the Action HUD Configuration panel under General Behavior (`config: false`), keeping Foundry's core module settings list clean and focused.
- **Client Setting Precedence**: Prioritized client-level preferences for damage type display over world configuration fallback values.

## [14.10.0] - 2026-10-10

### Added
- **Damage Type Display Icons & Color Tinting**: Action HUD badges now display subtle, beautifully tinted damage type icons alongside or in place of verbose damage type names (e.g. bludgeoning, radiant, necrotic, fire). Each damage type features a curated luminous hue tailored for high legibility on dark HUD surfaces and utilizes DnD5e's native SVG assets via CSS masking.
- **Client Damage Type Display Setting**: Added a client-level configuration toggle (**Icons Only**, **Icons + Text**, or **Text Only**) accessible in the Action HUD Configuration panel under General Behavior. Each player can customize their preferred display mode without affecting others.

## [14.9.1] - 2026-10-10

### Fixed
- **Active Effect Damage Bonuses & Damage Types**: Fixed an issue where damage bonuses granted by Active Effects with bracketed damage types (such as `1d8[radiant]`) were incorrectly merged into the weapon's base damage type (e.g. bludgeoning). Action HUD now parses term-level damage flavor annotations and aggregates damage through DnD5e's dice utilities (`aggregateDamageRolls`), accurately displaying distinct damage types in the HUD badges (e.g. `1d8+3 Bludgeoning, 1d8 Radiant`).
- **Active Effect Real-Time Reactivity**: Registered lifecycle hooks for Active Effects (`createActiveEffect`, `updateActiveEffect`, and `deleteActiveEffect`) to instantly refresh Action HUD damage displays whenever buffs, conditions, or spells are toggled or modified on an actor.

## [14.9.0] - 2026-10-10

### Added
- **Six New Handcrafted Visual Themes**: Expanded the HUD visual theme collection from 6 to 12 distinct styles, complete with bespoke geometry, typography, and color palettes:
  - **Sylvan**: Ancient druidic wilds with moss-grown ironwood, leaf-chamfered action buttons, and firefly pollen glow.
  - **Infernal**: Diabolic brimstone and scorched basalt with razor-angled slashes and smoldering hellfire magma.
  - **Frostborn**: Arctic permafrost and crystalline glacial ice with hex-faceted diamond cuts and spectral aurora hues.
  - **Clockwork**: Artificer workshop with burnished brass, octagonal notched tabs, and warm vacuum filament amber.
  - **Radiant**: Divine Solaris with sanctified alabaster marble, sunburst double-tapered gold chamfers, and radiant corona halos.
  - **Ossuary**: Crypt of souls with weathered tombstone slate, sarcophagus arches, and ectoplasmic banshee soulflame.

### Fixed
- **Combat Turn Passing (Red Hourglass Button)**: Fixed an issue where clicking the red hourglass icon on the active actor banner did not advance the turn. Implemented full turn-passing handling with native GM socket delegation for non-GM players, active combatant ownership validation, debounce protection, and immediate combat turn state reactivity.
- **Ability Rolls & Utility Actions**: Fixed an issue where clicking ability checks, saving throws, skill checks, initiative, short rests, or long rests in the Abilities drawer or pinned Quick Slots failed with an `Item not found: save-*` warning. These actions are now natively dispatched through DnD5e 6.x actor methods (`rollSavingThrow`, `rollAbilityCheck`, `rollSkill`, `rollInitiativeDialog`, `shortRest`, and `longRest`) with full support for advantage/disadvantage shortcuts and skip-dialog keybindings.

## [14.8.2] - 2026-10-10

### Fixed
- **Attack Roll Item Chat Cards**: Fixed an issue where rolling attacks directly triggered the attack roll without posting the primary item card to chat. Rolling weapon or spell attacks now cleanly outputs the item usage card with Attack and Damage action buttons alongside the attack roll, matching native sheet behavior.

### Added
- **Foundry Package Release Automation**: Added automated package publishing step to GitHub Actions release workflow for the official Foundry VTT package registry.
- **Documentation & Cross-References**: Updated installation instructions with Foundry package browser details and added the "Other Modules by Nik" showcase section.

## [14.8.1] - 2026-10-09

### Changed
- **Core Foundry User Permissions Integration**: Replaced custom role dropdown settings with Foundry VTT's native permission system.
  - Access to the Action HUD Configuration app is now tied directly to the core **Modify Configuration Settings** (`SETTINGS_MODIFY`) user permission.
  - Users authorized to change module settings have full access to configure and save all HUD settings across all tabs via Configure Settings.
  - Users without this permission cannot access or alter configuration app settings and can only toggle HUD visibility off for their account using the client setting.
- **Removed Toolbar Button & Setting**:
  - Completely removed the left token controls toolbar button (`niks-action-config`) and its associated setting (`hideTokenControls`), keeping the canvas controls clean. Configuration is accessed exclusively via Foundry's Configure Settings panel.
- **Removed Master Controls from Configuration App**:
  - Removed the redundant Master Controls section (global enable toggle and GM view override) from the General tab in the visual configuration panel, since individual users configure HUD visibility via their account setting.

## [14.8.0] - 2026-10-09

### Initial Release

Initial public release of **Nik's Action HUD** for Foundry Virtual Tabletop (v14) and D&D 5th Edition (6.0+).

#### Core Architecture
- **Native Foundry V14 Architecture**: Built natively from the ground up for Foundry V14 with zero external module dependencies.
- **Pure DOM & PointerEvents**: High-performance UI rendering using native browser DOM APIs and PointerEvents with zero jQuery overhead.
- **Native GM Dispatcher**: Lightweight native `game.socket` remote procedure caller for seamless macro permission delegation without external socket libraries.
- **Unified Localization**: Clean, consistent localization namespace (`NAH.*`) across all menus, categories, tooltips, dialogs, and settings.

#### Visual Themes & Design
- **Six Native Themes**:
  - **Carolingian UI**: Dynamic palette harmony, Work Sans & Roboto Slab typography, and clean frosted styling matching Carolingian UI (`crlngn-ui`).
  - **Arcanum**: Astral high magic styling featuring celestial velvet surfaces, deep midnight tones, and gold-leaf filigree.
  - **Obsidian**: Modern tactical dark aesthetics with deep onyx slabs, specular borders, and mint accents.
  - **Grimoire**: Aged dark parchment texture, hammered forged iron borders, and warm candlelit amber accents.
  - **Eldritch**: Abyssal deep-ocean tones with bioluminescent cyan borders and otherworldly chitin surfaces.
  - **Valiant**: Polished knightly steel, heraldic azure banners, and luminous platinum highlights.
- **Responsive Submenu Drawers**: Ergonomic 426px flyout drawers with 96px single-line sidebar panels (`white-space: nowrap`), cleanly preventing mid-word text breaks across all subcategories.
- **Core Interface Fading**: Respects Foundry VTT's core Interface Fading settings, smoothly dimming when idle and restoring full opacity upon user interaction.
- **Fluid Moving & Canvas Repositioning**: Drag directly from the actor identity header or stack background (or hold `Alt`/`Shift` while clicking) to move the HUD anywhere on the canvas; positions are smoothly saved per-client across sessions.
- **Live Scaling & Interactive Resizing**: Corner resize handle calculates smooth 360° scaling relative to the HUD center with real-time percentage badge toast, double-click to instantly reset to 100%, and client persistence.
- **Global Submenu Search & Clustered Results**: Real-time search in any submenu drawer now searches across all action types (attacks, spells, features, inventory items, abilities, and legendary actions) for the active actor, dynamically clustering results under themed category headers with instant active-tab list restoration upon clearing the search input and Escape key dismissal.

#### D&D 5e (6.0+) Integration
- **Category System**: Standardized, configurable categories:
  - **Attacks**: Equipped weapon attacks with resolved primary activity damage formulas, damage types, reach/range indicators, and ammunition management.
  - **Spells**: Spellbook organized by spell level with real-time spell slot counters (`LV 1 (4/4)`), cantrips, pact magic, innate/at-will spells, and ritual spell detection for unprepared wizard rituals.
  - **Features**: Active class features, racial traits, and feats categorized by action economy (Action, Bonus Action, Reaction, Passive) with activity use tracking and recharge states.
  - **Legendary**: Dedicated submenu automatically surfaced for creatures with legendary actions or Legendary Resistance, grouping resistance uses at the top and tracking legendary action points in real time.
  - **Abilities**: Single-line layout for ability checks, saving throws, skill proficiencies, initiative, and short/long rests with signed modifiers and advantage/disadvantage shortcuts.
  - **Items**: Inventory items categorized into Weapons, Gear, Consumables, Tools, Loot, and Bags with quick equip/unequip toggles and quantity badges.
- **Activity & Resource Resolution**: Native support for DnD5e 6.x Activities, calculating dynamic roll formulas, ammunition consumption, cross-item consumption, and recharge dice.
- **Header Combat Stats**: Dynamic display of spell attack modifier (`ATK +X`) and spell save DC (`DC X`) in the Spells category header.

#### Favorites & Quick Slots
- **Drag-and-Drop Favorite Dock**: Canvas-docked quick-access bar supporting multi-row layouts, drag-to-reorder sorting, and right-click management.
- **Rich Hover Tooltips**: Side-docked enriched tooltips with full item descriptions, damage breakdowns, and activation requirements.
- **Auto-Favorite for NPCs**: Automatically populates default action favorites for unconfigured NPC tokens upon scene placement.

#### Configuration Suite
- **Interactive Configuration App**:
  - Live preview sandbox reflecting active theme, button styling, and layout changes.
  - Default bottom canvas docking horizontally between the player list and macro hotbar, with smooth canvas repositioning and client persistence.
  - Visual drag-and-drop category builder with custom icons, labels, and visibility rules.
  - Excluded actor types filter with interactive toggle chips, excluding `encounter`, `group`, and `vehicle` actor types by default.
  - JSON preset export and import with modular section resets.