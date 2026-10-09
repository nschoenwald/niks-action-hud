# Changelog

All notable changes to **Nik's Action HUD (`niks-action-hud`)** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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