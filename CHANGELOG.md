# Changelog

All notable changes to **Nik's Action HUD (`niks-action-hud`)** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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