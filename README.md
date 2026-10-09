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
- **Instant Search & Deduplication**: Real-time action search filtering across submenus with guaranteed item deduplication across all category and level tabs, instant list restoration when cleared, and Escape key dismissal (built-in).
- **Player Character & Token Fallback**: If no token is selected on the canvas, the HUD automatically resolves to your assigned player character or owned character actor on the scene without requiring manual token selection (built-in).
- **User HUD Toggle**: Per-user setting (`scope: "user"`) to cleanly enable or disable the Action HUD independently of the GM or other players, persisted in the world database across devices and fully synchronized in the Action HUD configuration menu.
- **Token Image & Dynamic Ring Scaling**: Option to display active token texture art instead of the actor portrait, automatically respecting the token's Dynamic Token Ring subject scale correction and custom subject textures, with multi-stage fallback protection if token images are missing or return 404.
- **Unlinked NPC Favorites Sync**: Native synchronization of favorite slots for unlinked tokens without flag collisions or data corruption (built-in).
- **Multi-Row Favorites**: Favorite quick-slots wrap onto multiple lines cleanly without horizontal clipping (built-in).
- **Drag-and-Drop Favorite Reordering & Right-Click Management**: Drag and drop quick-slot badges to rearrange favorites smoothly in real time. Right-clicking a favorite slot on the dock or an active favorite star in the menu opens an options popup dialog to either open the item sheet or remove the favorite.
- **Full Rich Tooltips on Favorites & Quick Buttons**: Full side-docked rich tooltips for favorite quick buttons matching the submenu action cards with enriched descriptions, roll details, item artwork, and embedded reorder/removal hints, alongside tooltips for favorite toggle stars ("Add/Remove from favorites") and search bar favorite filters.
- **Core Interface Fading Integration**: Natively respects Foundry VTT's core **Interface Fading** settings (Inactive Opacity and Fade Speed), seamlessly dimming the HUD when idle and instantly restoring full opacity on hover, focus, open submenus, favorite drag, or resizing. Enabled by default with full user toggle in configuration.
- **Live Scaling & Interactive Resizing**:
  - Drag the bottom-right corner resize handle (permanently visible on HUD) to adjust scale smoothly relative to the HUD center.
  - Visual scale toast indicator shows real-time zoom percentage.
  - Double-click the resize handle at any time to instantly reset HUD scale to 100%.
- **Fluid Repositioning & Canvas Dragging**:
  - Drag directly from the actor identity header or top stack background to smoothly move the HUD anywhere on the canvas.
  - Hold `Alt` or `Shift` and click anywhere on the HUD to immediately start dragging.
  - HUD position is automatically saved per-client across sessions and canvas reloads.
- **Redesigned Configuration Suite (v14.2+)**:
  - **Modern Dark-Glass UI/UX**: Completely overhauled configuration dialog featuring split sidebar navigation, luminous accents, and frosted glass surfaces.
  - **Visual Theme Selector**: Clickable cards with color swatches and active glow indicators for modern visual themes, organized with the modular **Carolingian UI** theme first (automatically enabled and selected as the default theme on first load when `crlngn-ui` is installed and active, dynamically adopting Carolingian UI's active color palette, Work Sans & Roboto Slab typography, and frosted glass aesthetics), followed by **Arcanum** (primary default theme for standalone worlds) and solid clean-room designs (**Obsidian**, **Grimoire**, **Eldritch**, **Valiant**) featuring uniform button dimensions (232x46px), ultra-compact 4.5px inter-button spacing, 100% solid surfaces, and enlarged action list typography.
  - **Interactive Live Preview Sandbox**: Embedded HUD preview strip that immediately reflects your theme, typography, and button emphasis choices in real time.
  - **Dynamic Bottom Placement & Fluid Repositioning**: Positioned by default along the bottom canvas edge horizontally centered in the space between the player list (`#players`) and the macro hotbar (`#hotbar`). Clicking and dragging the identity header repositions the HUD anywhere, automatically persisting per-client in `clientPositions` for future sessions and reloads.
  - **Drag-and-Drop Menu Builder**: Easily reorder categories, customize labels and icons, and build custom submenus.
  - **Excluded Actor Types Filter**: Interactive multi-select bubble chips to easily filter document types from displaying the Action HUD (with `encounter`, `group`, and `vehicle` excluded by default), featuring real-time visual states, keyboard focus support, and instant persistence.
  - **Presets & Backups**: World presets, JSON file export/import, theme ZIP packaging, and modular section resets.
  - **Streamlined Settings Organization**: General behavior, automation, ritual display, and auto-favorite settings are housed exclusively within the Action HUD configuration app, keeping Foundry's core module settings view clean and focused on essential controls (Disable HUD, Hide Toolbar Buttons, and Configuration Permissions).
- **Clean-Room Independent Architecture (v14.8+)**:
  - 100% clean-room native implementation free of external module dependencies or proprietary legacies.
  - Native 15-line `game.socket` GM dispatcher replacing socketlib dependencies.
  - Pure native HTML5 DOM and PointerEvents with zero jQuery overhead.
  - Fully decoupled standalone architecture with zero legacy baggage or backwards compatibility overhead.

### DnD5e 6.0+ Integration
- **Default Action Menu Categories**: Standardized to **Attacks / Spells / Features / Legendary / Abilities / Items**.
- **One-Line Ability & Roll Layout**: Compact, unified single-row layout for saves, checks, skills, initiative, and rests (1h/8h durations) in the Abilities menu with dedicated proficiency indicator icons, signed total roll modifiers, and real-time advantage mode badges (`ADV` / `DIS`), with favorite stars cleanly omitted.
- **Resolved Activity Damage, Any Damage & Truncation Protection**: Automatically evaluates and resolves formula variables such as `@mod`, weapon magical bonuses, ammunition bonuses, and rule damage bonuses calculated directly from the item's primary activity across weapons, spells, features, and legendary actions. Damage components and their respective localized damage types are rendered into a single compact line alongside the action indicator badge (e.g. `[A] 4d6+5 Slashing, 3d6 Acid` or `[A] 8d6 Fire`), with range cleanly formatted inline (`· 120 FT`). Features that deal all damage types concisely output `"any"` damage instead of listing all individual types. Large formulas are safely truncated with ellipsis and tooltips, guaranteeing the favorite star button remains visible and clickable.
- **Spell Attack Modifier & Spell Save DC in Header**: Displays the spellcaster's active spell attack bonus (`ATK +X`) and spell save DC (`DC X`) directly in the Spells menu header next to the category title with dedicated color-coded badges, keeping the Cantrip section and tab headers clean.
- **Dedicated "Legendary" Menu**: Creatures with legendary actions and/or legendary resistance automatically gain a dedicated **Legendary** category between Features and Abilities, grouping all legendary actions together with **Legendary Resistance** sorted at the very top. Automatically hidden for non-legendary creatures, excluded from the general Features menu to eliminate duplicate entries, supports synthetic resource interaction, and dynamically aligned without disrupting index mapping for Abilities and Items.
- **Optimized Submenu Sidebars & Slot Tab Formatting**: Clean single-line layout (`white-space: nowrap`) across all subcategory sidebar tabs avoiding awkward word wrapping (e.g. `WEAPONS`), with rich HTML-formatted spell slot indicators (`LV 1 (4/4)`) and tooltip sanitization.
- **Global Action Search & Clustered Submenu Results**: Real-time action search in any submenu drawer automatically searches across all action types, spells, features, inventory items, abilities, and legendary actions for the active actor, dynamically clustering results under themed category headers with instant active-tab list restoration when clearing the search input and Escape key dismissal.
- **Strict DnD5e v6 Support**: Built natively against DnD5e 6.0+ data models and activities:
  - Spells use the modern `system.method` and `system.properties` Set architecture (dropping deprecated v5 components).
  - Ability and skill rolls use modern check/save APIs (`system.abilities[key].save.value`, `rollSavingThrow`, `rollAbilityCheck`, `rollSkill`).
  - Item usage routes through activity rolls (`attackActivity.rollAttack`, `damageActivity.rollDamage`, `item.use`).
  - Native SVG ability and skill icons directly from `CONFIG.DND5E`.
  - Comprehensive PHB-style roll tooltips (Save DC, Check Bonus).
  - Dedicated **"All"** tab across all submenus (spells, features, items, and abilities).
  - **Unprepared Wizard Rituals**: Shows known but unprepared ritual spells in the Spellbook for wizard characters with dedicated arcane styling (dashed borders, soft radiant tint, italicized typography, book icon badges, and rich tooltip markers), enabled by default and fully configurable in settings.
  - **Universal Feature Uses & Cross-Item Consumption**: Detects and displays uses across all feature item types (`feat`, `race`, `background`), including multi-activity items, recharge states (`[Ready]` / `[Recharge X+]`), and cross-item consumption targets (e.g. maneuvers consuming Superiority Dice or features consuming another item/resource), cleanly positioned in the second row to the left of the favorite star.
  - **Legendary Action Tracking**: Features, weapons, and actions that function as or consume legendary actions dynamically display total available and max legendary actions (e.g. `[3/3]` or multi-cost indicators like `[2] [3/3]`) in the second row to the left of the favorite star, automatically dimming when exhausted, without creating redundant standalone feature entries. The activation-grouped **Legendary** tab header displays current availability in real-time (`Legendary (available/max)`).
  - **Cast Activity Spell Uses Display**: Spells granted by DnD5e 6.x cast activities with limited activity uses dynamically display their remaining and maximum uses `[current/max]` in the second row beside the favorite star, keeping parent container features clean and preventing at-will spells from inheriting unrelated activity uses. Includes full recharge state handling (`[Ready]` / `[Recharge X+]`) and automatic visual exhaustion states (`isExhausted: true`).
  - **Auto-Favorite NPC Actions**: When an NPC token is placed on the canvas and that NPC has no favorites set yet, if it possesses qualifying items or features with attack, damage, or save activities up to a configurable maximum (default 5), they are automatically favorited and sorted by action time (Action -> Bonus Action -> Reaction -> Legendary Action -> Others). Gated behind world settings (`dnd5eAutoFavoriteNpcActions`, `dnd5eAutoFavoriteNpcMax`, enabled by default).
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

