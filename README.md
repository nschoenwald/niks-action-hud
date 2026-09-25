# Nik's Action HUD (`niks-action-hud`)

A modern, fast, and responsive canvas-docked Action HUD for **Foundry VTT (v14)** with dedicated first-class support for **DnD5e 6.0+**.

Nik's Action HUD is an ultra-focused, high-performance Action HUD designed to streamline combat and action management for Foundry VTT.

---

## ✨ Features

### Core Action HUD
- **Fast & Responsive Interface**: Instant access to strikes, attacks, spells, features, inventory items, and utility checks.
- **Hide Empty Submenus**: Automatically hides action buttons and submenus with no entries for the active actor (e.g. hiding the Spells button for non-spellcasters). Default enabled and fully configurable in settings.
- **Direct Sheet Navigation**: Right-click any action or item on the HUD to immediately open the actor sheet to that specific item (built-in).
- **Outside-Click Dismissal**: Clicking anywhere outside the Action HUD dismisses active sub-menus immediately (built-in).
- **Instant Search & Deduplication**: Quick search filtering across submenus with guaranteed item deduplication across all category and level tabs (built-in).
- **Player Character & Token Fallback**: If no token is selected on the canvas, the HUD automatically resolves to your assigned player character or owned character actor on the scene without requiring manual token selection (built-in).
- **User HUD Toggle**: Per-user setting (`scope: "user"`) to cleanly enable or disable the Action HUD independently of the GM or other players, persisted in the world database across devices and fully synchronized in the Action HUD configuration menu.
- **Token Image & Dynamic Ring Scaling**: Option to display active token texture art instead of the actor portrait, automatically respecting the token's Dynamic Token Ring subject scale correction and custom subject textures.
- **Unlinked NPC Favorites Sync**: Native synchronization of favorite slots for unlinked tokens without flag collisions or data corruption (built-in).
- **Multi-Row Favorites**: Favorite quick-slots wrap onto multiple lines cleanly without horizontal clipping (built-in).
- **Drag-and-Drop Favorite Reordering**: Drag and drop quick-slot badges to rearrange favorites smoothly in real time.
- **Live Scaling & Interactive Resizing**:
  - Drag the bottom-right corner resize handle (permanently visible on HUD) to adjust scale live.
  - Visual scale toast indicator shows current zoom percentage.
- **Redesigned Configuration Suite (v14.2+)**:
  - **Modern Dark-Glass UI/UX**: Completely overhauled configuration dialog featuring split sidebar navigation, luminous accents, and frosted glass surfaces.
  - **Visual Theme Selector**: Clickable cards with color swatches and active glow indicators for 12 themes, including 5 brand-new 100% solid, non-transparent clean-room designs (**Arcanum**, **Obsidian**, **Grimoire**, **Eldritch**, **Valiant**) featuring Rift-proportional button dimensions (232x46px), uniform button color styling, and tight 9px inter-button spacing, alongside existing classics (**Rift**, **Iron**, **Glass**, **Fantasy**, **Cyberpunk**, **Medieval**, and **Zenith**).
  - **Interactive Live Preview Sandbox**: Embedded HUD preview strip that immediately reflects your theme, typography, and button emphasis choices in real time.
  - **Interactive 4-Quadrant Anchor Positioner**: Visual quadrant selector for instant placement to any screen corner with precision pixel offset margins.
  - **Drag-and-Drop Menu Builder**: Easily reorder categories, customize labels and icons, and build custom submenus.
  - **Presets & Backups**: World presets, JSON file export/import, theme ZIP packaging, and modular section resets.

### DnD5e 6.0+ Integration
- **Default Action Menu Categories**: Standardized to **Attacks / Spells / Features / Abilities / Items**.
- **Strict DnD5e v6 Support**: Built natively against DnD5e 6.0+ data models and activities:
  - Spells use the modern `system.method` and `system.properties` Set architecture (dropping deprecated v5 components).
  - Ability and skill rolls use modern check/save APIs (`system.abilities[key].save.value`, `rollSavingThrow`, `rollAbilityCheck`, `rollSkill`).
  - Item usage routes through activity rolls (`attackActivity.rollAttack`, `damageActivity.rollDamage`, `item.use`).
  - Native SVG ability and skill icons directly from `CONFIG.DND5E`.
  - Comprehensive PHB-style roll tooltips (Save DC, Check Bonus).
  - Dedicated **"All"** tab across all submenus (spells, features, items, and abilities).
  - Context-aware Initiative button (displays only during active combat when the token has not yet rolled initiative).
- **Modular System Architecture**: Includes full `BaseSystemAdapter`, `adapterRegistry`, `defaultRegistry`, and lifecycle hooks so third-party modules or other systems can easily register their own adapters.

---

## 🛠️ Compatibility

| Platform / System | Supported Versions | Notes |
|---|---|---|
| **Foundry VTT** | **v14** | Built strictly for Foundry V14 (Scene Controls Record/Map, Combatants, and DataModels). Legacy v13 support dropped. |
| **DnD5e** | **6.0.0+** | Native v6 activity architecture. Deprecated v5 patterns removed. |
| **Other Systems** | Modular API | Supported via `adapterRegistry.registerSystemAdapter` and `${MODULE_ID}.registerSystemAdapters` hook. |

---

## 📦 Installation

Install directly within Foundry VTT via Manifest URL:
```
https://github.com/nschoenwald/niks-action-hud/releases/latest/download/module.json
```

---

## 📜 License

MIT License. See [LICENSE.md](file:///Users/nikolaischoenwald/Github/niks-action-hud/LICENSE.md) for details.
Third-party font and asset licenses are documented in the `licenses/` directory.

