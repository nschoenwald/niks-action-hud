# Nik's Action HUD (`niks-action-hud`)

A modern, fast, and stylish canvas-docked Action HUD for **Foundry VTT (v13 & v14)** with dedicated first-class support for **DnD5e 6.0+**.

Nik's Action HUD is the standalone consolidation of `stylish-action-hud` and the `niks-stylish-action-hud` enhancement patch into a single, unified module. The legacy party HUD features have been completely removed, leaving an ultra-focused, high-performance Action HUD.

---

## ✨ Features

### Core Action HUD
- **Fast & Responsive Interface**: Instant access to strikes, attacks, spells, features, inventory items, and utility checks.
- **Direct Sheet Navigation**: Right-click any action or item on the HUD to immediately open the actor sheet to that specific item (built-in).
- **Outside-Click Dismissal**: Clicking anywhere outside the Action HUD dismisses active sub-menus immediately (built-in).
- **Dynamic Token Header**: Displays the active token's current name directly in the header with clean typography (built-in).
- **Assigned Character Fallback**: If no token is selected on the canvas, the HUD automatically falls back to your assigned player character (built-in).
- **Unlinked NPC Favorites Sync**: Native synchronization of favorite slots for unlinked tokens without flag collisions or data corruption (built-in).
- **Multi-Row Favorites**: Favorite quick-slots wrap onto multiple lines cleanly without horizontal clipping (built-in).
- **Live Scaling & Wheel Resizing**:
  - Drag the bottom-right corner resize handle to adjust scale live.
  - Hold `Ctrl`, `Alt`, or `Cmd` and scroll the mouse wheel over the HUD to adjust scale on the fly.
  - Visual scale toast indicator shows current zoom percentage.
- **Clean Configuration Panel**: Streamlined single-panel settings dialog focused on key display and sizing options.
- **Intuitive Module Settings**: Master "Disable HUD" toggle right at the top of Foundry's settings, followed by the config panel shortcut, sizing controls, and display options.
- **Custom Menu Builder**: Full drag-and-drop menu customization, custom categories, macros, and action sorting.
- **Themes**: Rift (default theme), Iron, Glass, Fantasy, Medieval, Cyberpunk, Zenith, and Image themes.

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
| **Foundry VTT** | **v13** & **v14** | Fully compliant with v14 Scene Controls (Record/Map structure) and data operations. |
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

