# Changelog

All notable changes to **Nik's Action HUD (`niks-action-hud`)** are documented in this file.

## [14.19.2] - 2026-10-25
### Changed
- **Legendary Menu: All Monster Actions in One Place**:
  - Legendary actions, mythic actions, lair actions and Legendary Resistance are now listed only in the **Legendary** menu. They no longer also appear in the **Features** menu, so its "Monster" tab is gone.
  - The Legendary menu lists legendary actions first, then mythic actions, then lair actions, with Legendary Resistance at the bottom.
- **Spells Menu: NPC Spellcasting**:
  - Spells a monster casts through its **Spellcasting** feature (the usual setup for 2024 stat blocks) are now listed as regular spells under their level, instead of under **Items**. They are listed at the level the stat block casts them (e.g. *Command* as a level 2 spell). Uses such as 1/day still show on the spell.

### Fixed
- **Features Menu: Tab Names**:
  - Fixed some tabs showing lowercase names (e.g. "action", "special"). All tabs now use the system's capitalized names ("Action", "Special").

## [14.19.1] - 2026-10-25
### Fixed
- **Legendary Menu: Duplicate Spell Actions**:
  - Fixed legendary actions that cast a spell (such as a dragon's *Fiery Rays* or *Commanding Presence*) being listed twice, once as the action and once as the spell. Only the action is listed now. The spell is still in the Spells menu.
- **NPC Auto-Pins: Duplicate Spell Actions**:
  - Actions that cast a single spell are now pinned as the action itself, instead of as a separate copy of the spell.

### Improved
- **Legendary & Features Menus: Spell Damage and Range**:
  - Actions that cast a single spell now show that spell's damage and range (e.g. *Fiery Rays*: 2d6 fire · 120 ft) instead of "Self".

## [14.19.0] - 2026-10-25

Testing version of Nik's Action HUD v2
