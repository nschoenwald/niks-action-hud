# Nik's Action HUD

[![Foundry VTT](https://img.shields.io/badge/Foundry%20VTT-V14-orange.svg)](https://foundryvtt.com)
[![DnD5e System](https://img.shields.io/badge/DnD5e-6.0%2B-blue.svg)](https://github.com/foundryvtt/dnd5e)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/nschoenwald/niks-action-hud?color=purple)](https://github.com/nschoenwald/niks-action-hud/releases/latest)

A sleek, canvas-docked Action HUD for **Foundry VTT (v14)** and **D&D 5e (6.x)**. Provides players and Game Masters with instant access to attacks, spells, features, inventory items, and utility rolls directly on screen without needing character sheets open.

---

> [!TIP]
> **Ergonomic & Non-Intrusive**: Docked by default at the bottom edge of your screen between the player list and the macro hotbar. Drag to move it anywhere on your canvas, smoothly resize with the corner handle, and customize themes, categories, and quick slots to fit your table.

---

## ⚡ Quick Navigation

- [✨ Key Features](#-key-features)
- [🎨 Visual Themes](#-visual-themes)
- [⚔️ Action Submenus](#️-action-submenus)
- [⭐ Favorites Dock & Quick Slots](#-favorites-dock--quick-slots)
- [⚙️ Configuration Suite](#️-configuration-suite)
- [🛠️ Compatibility](#️-compatibility)
- [📦 Installation](#-installation)

---

## ✨ Key Features

- **Bottom Docking & Free Canvas Dragging**: Positioned cleanly along the bottom canvas edge. Drag from the actor header to place the HUD anywhere; your position is automatically saved per-client across sessions.
- **Smooth 360° Resizing**: Drag the bottom-right resize handle to scale the HUD up or down with a live zoom percentage readout; double-click to instantly reset to 100%.
- **Smart Token & Character Fallback**: Select any token to view its actions instantly. When no token is selected, the HUD automatically displays your assigned player character.
- **Global Clustered Action Search**: Type in the search box of any submenu to search across all action types, spells, features, inventory items, and utility checks at once, clustered under clear category headers. Clears instantly with <kbd>Esc</kbd>.
- **Automatic Empty Menu Hiding**: Automatically hides category buttons that have no actions for the selected actor (e.g. hiding the Spells button for characters without magic).
- **Core Interface Fading**: Seamlessly integrates with Foundry's core interface fading, dimming when idle and restoring full brightness on hover or interaction.
- **Direct Sheet Navigation**: Right-click any action, spell, or item to jump directly to its sheet.

---

## 🎨 Visual Themes

Six handcrafted visual themes with zero external dependencies:

| Theme | Style & Aesthetic |
|---|---|
| **Carolingian UI** | Frosted glass surfaces, dynamic color palette harmony, and refined typography matching `crlngn-ui`. |
| **Arcanum** | Astral high magic with deep midnight velvet surfaces, starlight glows, and burnished gold filigree. |
| **Obsidian** | Tactical dark minimalist aesthetic with deep onyx surfaces, specular borders, and mint/emerald accents. |
| **Grimoire** | Dark fantasy styling with weathered parchment tones, hammered forged iron borders, and candlelight amber. |
| **Eldritch** | Abyssal cosmic horror aesthetic with black chitin surfaces, bioluminescent cyan, and psychic magenta. |
| **Valiant** | Chivalric plate steel, royal sapphire enamel banners, and tournament gold highlights. |

---

## ⚔️ Action Submenus

Organized, flyout drawers designed for fast combat decision-making:

- **Attacks**: Equipped weapons with calculated attack bonuses, damage formulas, damage types, reach/range indicators, and ammunition tracking.
- **Spells**: Spellbook categorized by level with real-time spell slot counters (`LV 1 (4/4)`), cantrips, at-will spells, and ritual spell indicators for unprepared wizard rituals.
- **Features**: Class features, species traits, and feats categorized by action type (Action, Bonus Action, Reaction, Passive) with limited use tracking and recharge dice states.
- **Legendary**: Automatically surfaces for legendary creatures, grouping Legendary Resistance at the top and tracking legendary action points in real time.
- **Abilities**: Single-line layout for ability checks, saving throws, skill proficiencies, initiative, and rests with signed modifiers and advantage shortcuts.
- **Items**: Inventory organized into Weapons, Gear, Consumables, Tools, Loot, and Containers with quick equip toggles and quantity badges.

---

## ⭐ Favorites Dock & Quick Slots

- **Canvas Quick Slots**: Pin your favorite attacks, spells, items, or macros to a dedicated dock for instant one-click execution.
- **Drag-to-Reorder**: Rearrange quick slots smoothly via drag-and-drop.
- **Rich Hover Tooltips**: View item artwork, full descriptions, activation costs, and roll details on hover.
- **Auto-Favorites for NPCs**: Automatically populates default attack and action favorites when placing NPC tokens on the scene.

---

## ⚙️ Configuration Suite

- **Live Preview Sandbox**: See your theme, button styles, and layout changes in real time before saving.
- **Visual Category Builder**: Reorder, rename, or customize menu icons, button scaling, and visibility conditions.
- **Excluded Actor Types**: Simple toggle chips to prevent the HUD from showing on specific actor types (`encounter`, `group`, and `vehicle` excluded by default).
- **Presets & Backups**: Export and import complete HUD setups as JSON presets with modular section resets.

---

## 🛠️ Compatibility

| Platform / System | Supported Versions | Notes |
|---|---|---|
| **Foundry VTT** | **v14** | Built natively for Foundry V14. |
| **DnD5e** | **6.0+** | Native support for 6.x activities and data models. |
| **Other Systems** | Modular API | Supported via custom system adapters. |

---

## 📦 Installation

Install directly within Foundry VTT using the Manifest URL:
```
https://github.com/nschoenwald/niks-action-hud/releases/latest/download/module.json
```

---

## 📜 License

MIT License. See [LICENSE.md](LICENSE.md) for details.
