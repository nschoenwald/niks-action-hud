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

<img width="683" height="482" alt="image" src="https://github.com/user-attachments/assets/863588eb-ca50-4534-84b3-7a66885974dd" />

<img width="678" height="383" alt="image" src="https://github.com/user-attachments/assets/9c7e0211-5374-46dd-8da5-9ccdb42f8406" />

<img width="254" height="333" alt="image" src="https://github.com/user-attachments/assets/0a6c9714-e6f0-40fb-a2b2-ff4b38fd1a51" />


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
- **Core Foundry Permissions**: Access to the visual configuration app is governed directly by Foundry's core **Modify Configuration Settings** (`SETTINGS_MODIFY`) permission. Players without this permission can cleanly toggle the HUD off for their user account using the client setting.

---

## 🛠️ Compatibility

| Platform / System | Supported Versions | Notes |
|---|---|---|
| **Foundry VTT** | **v14** | Built natively for Foundry V14. |
| **DnD5e** | **6.0+** | Native support for 6.x activities and data models. |
| **Other Systems** | Modular API | Supported via custom system adapters. |

---

## 📦 Installation

Install directly within Foundry VTT:
1. Search for **"Nik's Action HUD"** in the Foundry VTT Package Browser and click **Install**.
2. Or install manually using the Manifest URL:
```
https://github.com/nschoenwald/niks-action-hud/releases/latest/download/module.json
```

---

## 📜 License

MIT License. See [LICENSE.md](LICENSE.md) for details.

---

## Other Modules by Nik

### 🎲 D&D 5e Specific
* **[Nik's DnD5e Tweaks](https://github.com/nschoenwald/niks-dnd5e-tweaks)** – Consolidated collection of quality-of-life enhancements and combat automation tweaks for DnD5e.

### ⚔️ Combat & Token Tools
* **[Nik's Token Tags](https://github.com/nschoenwald/niks-token-tags)** – Automatically numbers duplicate combatant NPCs (A, B, C…) with color-coded letter overlays.
* **[Nik's Shared NPC Initiative](https://github.com/nschoenwald/niks-shared-npc-initiative)** – Groups NPCs of the same type in combat so they share a single initiative roll.
* **[Nik's Movement Control](https://github.com/nschoenwald/niks-movement-control)** – GM controls to toggle player movement and automatically restrict/allow movement on combat start and end.
* **[Nik's Tiny Change Logs](https://github.com/nschoenwald/niks-tiny-changelogs)** – Compact, single-line chat messages logging token HP and Temp HP changes.

### 🎲 Visuals & Display
* **[Nik's Dynamic Roll Area](https://github.com/nschoenwald/niks-dynamic-roll-area)** – Dynamically restricts Dice So Nice 3D dice rolling area to exclude the sidebar / chat log across all screen resolutions and window sizes.

### ⚙️ Utilities & System Management
* **[Nik's Settings Locks](https://github.com/nschoenwald/niks-settings-locks)** – Soft-lock and hard-lock client settings and keybindings across all connected players.
* **[Nik's Compendium Search Tweaks](https://github.com/nschoenwald/niks-compendium-search-tweaks)** – Configure which compendium packs are included or excluded from native sidebar search.
* **[Nik's Show & Tell](https://github.com/nschoenwald/niks-show-and-tell)** – Share popout images to chat and paste image files directly into chat messages.
* **[Nik's Zoom / Pan Options](https://github.com/nschoenwald/niks-zoom-pan-options)** – Touchpad and scroll wheel pan/zoom controls and canvas navigation enhancements.

