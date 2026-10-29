# Nik's Action HUD

[![Foundry VTT](https://img.shields.io/badge/Foundry%20VTT-V14-orange.svg)](https://foundryvtt.com)
[![DnD5e System](https://img.shields.io/badge/DnD5e-6.0.6%E2%80%936.0.x-blue.svg)](https://github.com/foundryvtt/dnd5e)
[![Shadowdark System](https://img.shields.io/badge/Shadowdark-4.0.6%E2%80%934.0.x-purple.svg)](https://github.com/Muttley/foundryvtt-shadowdark)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/nschoenwald/niks-action-hud?color=purple)](https://github.com/nschoenwald/niks-action-hud/releases/latest)

An on-screen action bar for **D&D 5e** and **Shadowdark** in **Foundry VTT v14**. Your attacks, spells, features, items and rolls are one click away, with no character sheet needed.

<img width="1106" height="498" alt="image" src="https://github.com/user-attachments/assets/b4dc233b-0e22-4fea-b1f2-d0c907b91490" />

<img width="697" height="365" alt="image" src="https://github.com/user-attachments/assets/5ffd1d35-3803-4f53-94b9-a1f8ceb67dfb" />

<img width="2212" height="1186" alt="SCR-20261025-tujr" src="https://github.com/user-attachments/assets/0d616d2e-e3d8-4c0e-96d1-4043bee92948" />

---

## ✨ Features

- **Everything in one place**: Attacks, spells, features, inventory, ability checks, saves, skills and rests, sorted into tabs.
- **Follows your selection**: Shows the selected token's actions. With nothing selected, it shows your own character.
- **Search**: Type in any menu to search all of a character's actions at once.
- **Favorites**: Click the star on any entry to pin it next to the HUD for one-click use. NPCs can get their attacks and spells pinned automatically.
- **Move and resize**: Drag the HUD anywhere and resize it from the corner. Each player's layout is remembered.
- **Quick shortcuts**:
  - Right-click an entry to open its sheet.
  - <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + right-click to use it right away.
  - Click the portrait to open the character sheet; double-click it to jump to the token.
- **End your turn**: On your turn in combat, an **End Turn** button appears on the HUD.
  - With [Nik's DnD5e Tweaks](https://github.com/nschoenwald/niks-dnd5e-tweaks) legendary action placeholders, creatures with legendary actions get a **Pass Legendary** button during a placeholder turn.
- **Show or hide**: Press <kbd>Shift</kbd>+<kbd>H</kbd> (you can change this in Configure Controls).
- **Minimize**: Turn on **Minimize Button** in the HUD settings (Display) to get a button on the name row that shrinks the HUD down to the name and portrait. The End Turn button stays usable while minimized.
- **Make it yours**:
  - 13 themes (12 dark and the light, Greek-inspired Thairesia) and different button shapes.
  - Rename, reorder and re-icon the menu buttons.
  - Hide menus a character doesn't use.
  - If you use [Carolingian UI](https://foundryvtt.com/packages/crlngn-ui), a matching theme is available.

---

## 🎲 Game Systems

- **D&D 5e (6.0.6 and later 6.0.x)**:
  - Features are sorted by when you use them (Action, Bonus Action, Reaction…).
  - Monsters get a Legendary menu with their legendary, mythic and lair actions, followed by their legendary resistances. These are not repeated in the Features or Attacks menus. Actions that cast a spell are listed once, under the action's name, with the spell's damage and range.
  - Spells are grouped by level: cantrips first (including Pact Magic cantrips), then Pact Magic, then levels 1 to 9, with spells from items last. An eye button in the Spells menu also shows spells you haven't prepared (off by default, remembered per player). Spells a monster casts through its Spellcasting feature are listed by level like regular spells.
  - Items are split into Weapons, Armor, Gear, Tools, Consumables and Other.
  - Ammunition shows a warning when it runs low.
- **Shadowdark (4.0.6 and later 4.0.x)**:
  - Attacks, spells, wands, scrolls, light sources and luck are all supported.
  - Hold a key while clicking a roll to skip the roll prompt: **Shift** for advantage, **Alt/Option** for normal, **Ctrl/Cmd** for disadvantage.
- **Other systems**: Not supported. The module does nothing there.

---

## ⚙️ For GMs

- **Who can change what**: Players can always change their own settings. Only users allowed to change world settings in Foundry can change the shared ones, such as the menu layout and backups.
- **Settings Locks**: With [Nik's Settings Locks](https://github.com/nschoenwald/niks-settings-locks) installed, you can lock any player setting right from the HUD's settings window.

---

## 🌐 Languages

🇬🇧 English · 🇩🇪 Deutsch · 🇪🇸 Español · 🇫🇷 Français · 🇮🇹 Italiano (thanks [@GregoryWarn](https://github.com/GregoryWarn)) · 🇧🇷 Português (Brasil) (thanks [@RichardFontoura](https://github.com/RichardFontoura))

---

## 📦 Installation

In Foundry, go to **Add-on Modules → Install Module**, search for **"Nik's Action HUD"** and click **Install**.

Or paste this manifest URL:
```
https://github.com/nschoenwald/niks-action-hud/releases/latest/download/module.json
```

Requires **Foundry VTT v14** with **D&D 5e 6.0.6** or a later 6.0.x release, or **Shadowdark 4.0.6** or a later 4.0.x release.

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

---

## 📜 License

MIT License. See [LICENSE.md](LICENSE.md).

Includes the **RPG Awesome** icon font, **IBM Plex** and other free web fonts, each under its own open license (see [licenses/](licenses/)). Not affiliated with Foundry Gaming LLC, the D&D 5e system or Shadowdark RPG.
