/**
 * The one table describing every profile option the HUD exposes.
 *
 * Other modules derive what they need from it: core/settings.js registers the client/world
 * settings that mirror an option, settings-panel/option-schema.js builds the draft field lists,
 * settings-panel/settings-sync.js moves values between the panel and those settings, and the
 * panel's lock icons come from `lock`.
 *
 *   key       flat profile key (and the registered setting key when `mirror` is set)
 *   type      "boolean" | "number" | "string"
 *   group     "appearance" or "behavior" (which panel list the option belongs to)
 *   scope     where a mirrored setting lives: "client" (each user) or "world" (GM-managed)
 *   mirror    also register it as a Foundry setting named NAH.Settings.<label>
 *   label     i18n stem: NAH.Settings.<label>.Name / .Hint / .<choice leaf> (also used by the panel)
 *   lock      the settings-locks module may lock it
 *   refresh   repaint the HUD when it changes
 *   system    only offered for this game system
 *   choices   { value: i18nLeaf } for select options;  range: { min, max, step }
 */

import { getDefaultTheme, DEFAULT_HIDDEN_ACTOR_TYPES } from "../features/settings-panel/ui-constants.js";

const option = (key, type, fallback, group, extra = {}) => ({ key, type, default: fallback, group, ...extra });

const client = (extra) => ({ mirror: true, scope: "client", refresh: true, ...extra });
const world = (extra) => ({ mirror: true, scope: "world", ...extra });

export const SETTING_SCHEMA = Object.freeze([
	// Look
	option("theme", "string", getDefaultTheme, "appearance", { scope: "world" }),
	option("fontFamily", "string", "", "appearance", { scope: "world", label: "FontFamily" }),
	option("portraitSource", "string", "token", "appearance", { scope: "world", label: "PortraitSource", choices: { portrait: "Portrait", token: "Token" } }),
	option("buttonShape", "string", "", "appearance", { scope: "world", label: "ButtonShape" }),
	option("hudOpacity", "number", 100, "appearance", client({ label: "HudOpacity", lock: true, range: { min: 30, max: 100, step: 5 } })),
	option("tooltipScale", "number", 100, "appearance", client({ label: "TooltipScale", lock: true, range: { min: 75, max: 150, step: 5 } })),

	// Behavior
	option("hudEnabled", "boolean", true, "behavior"),
	option("hideForGm", "boolean", false, "behavior"),
	option("hiddenActorTypes", "string", () => DEFAULT_HIDDEN_ACTOR_TYPES, "behavior"),
	option("closeDrawerOnUse", "boolean", false, "behavior", client({ label: "CloseDrawerOnUse", lock: true, refresh: false })),
	option("hideEmptyDrawers", "boolean", true, "behavior", client({ label: "HideEmptyDrawers", lock: true })),
	option("fadeWhenIdle", "boolean", true, "behavior", client({ label: "InterfaceFading", lock: true })),
	option("drawerSide", "string", "auto", "behavior", client({ label: "SubmenuSide", lock: true, choices: { auto: "Auto", left: "Left", right: "Right" } })),
	option("favoritesLayout", "string", "rail", "behavior", client({ label: "FavoritesLayout", lock: true, choices: { rail: "Rail", top: "Top" } })),
	option("combatTurnAlert", "boolean", true, "behavior", client({ label: "CombatTurnAlert", lock: true, refresh: false })),
	option("combatTurnSound", "boolean", false, "behavior", client({ label: "CombatTurnSound", lock: true, refresh: false })),
	option("combatTurnNpc", "boolean", false, "behavior", client({ label: "CombatTurnNpc", lock: true, refresh: false, gmOnly: true })),
	option("autoFavoriteNpcActions", "boolean", true, "behavior", world({ label: "AutoFavoriteNpc" })),
	option("autoFavoriteNpcMax", "number", 6, "behavior", world({ label: "AutoFavoriteNpcMax", range: { min: 1, max: 20, step: 1 } })),
	option("autoFavoriteNpcAttacks", "boolean", true, "behavior", world({ label: "AutoFavoriteNpcAttacks" })),

	// D&D 5e
	option("dnd5eGroupByActivation", "boolean", true, "behavior", { scope: "world", label: "GroupByActivation" }),
	option("dnd5eShowToolChecks", "boolean", true, "behavior", client({ label: "ToolChecks", lock: true, system: "dnd5e" })),
	option("dnd5eAbilityOrder", "string", "savesSkillsChecks", "behavior", client({ label: "AbilityOrder", lock: true, system: "dnd5e", choices: { savesSkillsChecks: "SavesSkillsChecks", checksSavesSkills: "ChecksSavesSkills", skillsSavesChecks: "SkillsSavesChecks" } })),
	option("dnd5eShowUnpreparedRituals", "boolean", true, "behavior", client({ label: "WizardRituals", lock: true, system: "dnd5e" })),
	option("dnd5eDamageTypeDisplay", "string", "icons", "behavior", client({ label: "DamageTypeDisplay", lock: true, system: "dnd5e", choices: { icons: "Icons", both: "Both", text: "Text" } })),
]);

/** Options that are also registered as Foundry settings. */
export const MIRRORED_OPTIONS = SETTING_SCHEMA.filter((spec) => spec.mirror);

/** Option keys the settings-locks module may lock. */
export const LOCKABLE_KEYS = SETTING_SCHEMA.filter((spec) => spec.lock).map((spec) => spec.key);

/** Default of an option (some are computed when read). */
export const defaultOf = (spec) => (typeof spec.default === "function" ? spec.default() : spec.default);
