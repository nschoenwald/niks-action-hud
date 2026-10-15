# Nik's Action HUD

[![Foundry VTT](https://img.shields.io/badge/Foundry%20VTT-V14-orange.svg)](https://foundryvtt.com)
[![DnD5e System](https://img.shields.io/badge/DnD5e-6.0%2B-blue.svg)](https://github.com/foundryvtt/dnd5e)
[![Shadowdark System](https://img.shields.io/badge/Shadowdark-4.0%2B-purple.svg)](https://github.com/Muttley/foundryvtt-shadowdark)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/nschoenwald/niks-action-hud?color=purple)](https://github.com/nschoenwald/niks-action-hud/releases/latest)

A sleek, canvas-docked Action HUD for **Foundry VTT (v14)**, **D&D 5e (6.x)**, and **Shadowdark RPG (4.x+)**. Provides players and Game Masters with instant access to attacks, spells, features, inventory items, and utility rolls directly on screen without needing character sheets open.

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
- [🌐 Supported Languages](#-supported-languages)
- [🛠️ Compatibility](#️-compatibility)
- [📦 Installation](#-installation)

---

## ✨ Key Features

- **Bottom Docking & Free Canvas Dragging**: Positioned cleanly along the bottom canvas edge. Drag from the actor header to place the HUD anywhere; your position is automatically saved per-client across sessions.
- **Collapsible HUD Mode**: Click the triangle caret next to the token name to minimize the Action HUD into a compact token identity banner, freeing up canvas space while preserving portrait sheet navigation, turn management, and canvas dragging.
- **Combat Turn Passing**: Click the red hourglass icon on the active actor banner to instantly end and pass your combat turn, with native socket delegation allowing both Game Masters and non-GM players to advance the combat tracker smoothly.
- **Smooth 360° Resizing**: Drag the bottom-right resize handle to scale the HUD up or down with a live zoom percentage readout; double-click to instantly reset to 100%.
- **Smart Token & Character Fallback**: Select any token to view its actions instantly. When no token is selected, the HUD automatically displays your assigned player character.
- **Global Clustered Action Search**: Type in the search box of any submenu to search across all action types, spells, features, inventory items, and utility checks at once, clustered under clear category headers. Clears instantly with <kbd>Esc</kbd>.
- **Automatic Empty Menu Hiding**: Automatically hides system category buttons that have no actions for the selected actor (e.g. hiding the Spells button for characters without magic), while custom user categories remain visible for easy tray population.
- **Subtly Tinted Damage Type Icons**: Renders intuitive, beautifully colored vector damage type icons (e.g. fire, radiant, bludgeoning) directly on action badges using DnD5e's native SVG assets, with client customization for **Icons Only**, **Both (Icon + Text)**, or **Text Only**.
- **Core Interface Fading**: Seamlessly integrates with Foundry's core interface fading, dimming when idle and restoring full brightness on hover or interaction.
- **Native Activity Choice Dialogs**: Spells, items, and features containing multiple activities (such as *Hunter's Mark* with spell slot casting, moving the mark, and bonus damage) automatically trigger DnD5e's native Activity Choice dialog on click.
- **Intelligent Resource & Spell Slot Tracking**: Spells, actions, and features with zero remaining daily uses or expended spell slots remain clickable and executable, allowing players and GMs to post chat cards, cast without consuming resources, or trigger DnD5e's native upcast and slot selection prompts.
- **Direct Sheet Navigation**: Right-click any action, spell, or item to jump directly to its sheet.
- **Integrated Icon Picker**: Choose category icons visually from Font Awesome (solid, regular, brands), RPG Awesome, emojis, or local world images directly within the Menu Builder.
- **Multi-Language Support**: Fully localized out of the box in English, German (Deutsch), French (Français), Spanish (Español), Italian (Italiano, contributed by [@GregoryWarn](https://github.com/GregoryWarn)), and Brazilian Portuguese (Português (Brasil), contributed by [@RichardFontoura](https://github.com/RichardFontoura)). Features dynamic category button font scaling to guarantee long localized words (such as French *Caractéristiques* or Italian *Caratteristiche*) fit with balanced spacing without clipping or pushing icons out of bounds.

---

## 🎨 Visual Themes

Thirteen handcrafted visual themes with zero external dependencies:

| Theme | Style & Aesthetic |
|---|---|
| **Shadowdark** | Grim OSR pulp dungeon crawler with solid obsidian surfaces, eldritch purple borders, stark bone typography, and torchlight amber highlights. |
| **Carolingian UI** | Frosted glass surfaces, dynamic color palette harmony, and refined typography matching `crlngn-ui`. |
| **Arcanum** | Astral high magic with deep midnight velvet surfaces, starlight glows, and burnished gold filigree. |
| **Obsidian** | Tactical dark minimalist aesthetic with deep onyx surfaces, specular borders, and mint/emerald accents. |
| **Grimoire** | Dark fantasy styling with weathered parchment tones, hammered forged iron borders, and candlelight amber. |
| **Eldritch** | Abyssal cosmic horror aesthetic with black chitin surfaces, bioluminescent cyan, and psychic magenta. |
| **Valiant** | Chivalric plate steel, royal sapphire enamel banners, and tournament gold highlights. |
| **Sylvan** | Ancient druidic wilds, moss-grown ironwood bark, living sprout emeralds, and sun-dappled pollen motes. |
| **Infernal** | Diabolic brimstone and scorched basalt slabs with smoldering hellfire magma and liquid sulfur veins. |
| **Frostborn** | Arctic permafrost, crystalline glacial ice facets, frosted silver edges, and spectral aurora borealis hues. |
| **Clockwork** | Artificer mechanical workshop with burnished brass plating, riveted copper flanges, and vacuum filament amber. |
| **Radiant** | Divine Solaris with sanctified alabaster marble, blinding corona halos, and tournament sun gold. |
| **Ossuary** | Crypt of souls with weathered tombstone slate, carved bone inlays, and chilling ectoplasmic soulflame. |

---

## ⚔️ Action Submenus

Organized, flyout drawers designed for fast combat decision-making that dynamically adapt to your active game system:

- **Attacks**: Equipped weapons with calculated attack bonuses, split multi-type damage formulas (including two-handed and finesse modifiers), reach/range indicators, ammunition tracking, and NPC attacks/special attacks.
- **Spells**: Spells categorized by level or Tier (1–5) with real-time spell slot counters (`LV 1 (4/4)`), castable wands and scrolls, duration indicators, and one-click recovery for lost spells.
- **Features & Talents**: Class features, ancestry/class talents, species traits, feats, and tracked resources presented in a sleek single-line layout (`[Action Type] [Icon] [Name] [Uses] [Favorite Star]`) with limited use tracking and recharge states.
- **Checks & Abilities**: Single-line layout for ability checks, saving throws, skill proficiencies, initiative, rests, and Luck tokens with signed modifiers and advantage/disadvantage keyboard shortcuts.
- **Inventory & Light Sources**: Inventory organized into Weapons, Gear, Consumables, Tools, and Containers with quick equip toggles, one-click potion drinking, and real-time torch/lantern burn tracking (`◆ ◆ ◆ ◇`) with interactive lighting toggles.
- **Legendary**: Automatically surfaces for legendary creatures, grouping Legendary Resistance at the top and tracking legendary action points in real time.

---

## ⭐ Favorites Dock & Quick Slots

- **Canvas Quick Slots**: Pin your favorite attacks, spells, items, or actions to a dedicated dock for instant one-click execution.
- **Drag-and-Drop Pinning**: Drag items directly from your character sheet or actions from your hotbar onto the favorites bar to instantly pin them to your canvas quick slots.
- **Uses Tracking on Favorite Icons**: Quick slot icons dynamically display remaining uses (e.g. `3/3`, `1/2`, `0/1`) for items with item-level limited uses or single activities with activity uses, complete with real-time updates and an exhausted badge indicator when fully spent.
- **Drag-to-Reorder**: Rearrange quick slots smoothly via drag-and-drop.
- **Rich Hover Tooltips**: View item artwork, full descriptions, activation costs, and roll details on hover.
- **Auto-Favorites for NPCs**: Automatically populates default attack and action favorites when placing NPC tokens on the scene.
- **Collapsible Action HUD**: Minimize the Action HUD down to a clean, non-intrusive token identity strip to maximize screen real estate during exploration, while retaining one-click character sheet access, turn management, and canvas dragging. Enabled via the *Enable HUD Collapse Button* client setting in the configuration panel (disabled by default).

---

## ⚙️ Configuration Suite

- **Live Preview Sandbox**: See your theme, button styles, and layout changes in real time before saving.
- **Category Button Shape Override**: Mix and match visual aesthetics by pairing any theme's button geometry (such as chamfered, hexagonal, slanted, or rounded) with any chosen color theme.
- **Visual Category Builder & Icon Picker**: Create custom categories and flyout trays, pick icons visually across Font Awesome, RPG Awesome, emojis, and local images, reorder, rename, or customize menu icons, button scaling, and visibility conditions.
- **Excluded Actor Types**: Simple toggle chips to prevent the HUD from showing on specific actor types (`encounter`, `group`, and `vehicle` excluded by default).
- **Presets & Backups**: Export and import complete HUD setups as JSON presets with modular section resets.
- **Client Damage Display Preferences**: Choose between **Icons Only**, **Icons + Text**, or **Text Only** in the Action HUD Configuration panel to tune visual density to your table's preference.
- **World vs. Client Scope Badges**: Setting rows clearly distinguish shared table rules (🌐 **World**) from local user preferences (👤 **Client**).
- **Nik's Settings Locks Integration**: Seamlessly integrates with [Nik's Settings Locks](https://github.com/nschoenwald/niks-settings-locks), enabling GMs to toggle soft-locks (🟡) or hard-locks (🔴) on client settings directly within the configuration UI.
- **Core Foundry Permissions**: Access to the visual configuration app is governed directly by Foundry's core **Modify Configuration Settings** (`SETTINGS_MODIFY`) permission. Players without this permission can cleanly toggle the HUD off for their user account using the client setting.

---

## 🌐 Supported Languages

Nik's Action HUD provides out-of-the-box localizations for:
- 🇬🇧 **English** (`en`)
- 🇮🇹 **Italiano** (`it`) — contributed by [@GregoryWarn](https://github.com/GregoryWarn)
- 🇩🇪 **Deutsch** (`de`)
- 🇫🇷 **Français** (`fr`)
- 🇪🇸 **Español** (`es`)
- 🇧🇷 **Português (Brasil)** (`pt-BR`) — contributed by [@RichardFontoura](https://github.com/RichardFontoura)

---

## 🛠️ Compatibility

| Platform / System | Supported Versions | Notes |
|---|---|---|
| **Foundry VTT** | **v14** | Built natively for Foundry V14. |
| **DnD5e** | **6.0+** | Native support for 6.x activities and data models. |
| **Shadowdark** | **4.0+** | Full native support for PC & NPC attacks, spells, wands, scrolls, light tracking, and luck. |
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

