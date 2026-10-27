/**
 * The option rows of the General tab. Which options exist, their defaults, scope and lock support
 * come from core/setting-schema.js; this file adds only what a person reads: section, wording,
 * control and choice labels.
 */

import { SETTING_SCHEMA } from "../../core/setting-schema.js";

/** `titleKey` is the NAH.Panel.Sections leaf; `title` is the English fallback. */
const SECTIONS = [
	{ id: "interaction", tab: "behavior", titleKey: "Interaction", title: "Interaction" },
	{ id: "combat", tab: "behavior", titleKey: "Combat", title: "Combat" },
	{ id: "autoFavorites", tab: "behavior", titleKey: "AutoFavorites", title: "NPC Auto-Favorites" },
	{ id: "dnd5e", tab: "system", titleKey: "Dnd5e", title: "D&D 5e System Settings", system: "dnd5e" },
	{ id: "styling", tab: "appearance", titleKey: "Styling", title: "Styling, typography and avatars" },
	{ id: "display", tab: "appearance", titleKey: "Display", title: "Display" },
];

/**
 * key -> { section, control, label, hint, choices?, unit? }. `label`, `hint` and `choices` are the
 * English fallbacks; the shown text is NAH.Settings.<schema label>.Name / .Hint / .<choice leaf>.
 */
const ROW_TEXT = {
	closeDrawerOnUse: { section: "interaction", control: "switch", label: "Close menu after action use", hint: "Automatically dismiss open submenu drawers immediately after rolling an attack, spell, or item." },
	hideEmptyDrawers: { section: "interaction", control: "switch", label: "Hide empty submenus", hint: "Automatically conceal category buttons (like Spells or Attacks) if the controlled token has no matching items." },

	combatTurnAlert: { section: "combat", control: "switch", label: "Combat turn alert", hint: "Play an attention-grabbing visual sweep and pulse across the HUD when your turn begins." },
	combatTurnSound: { section: "combat", control: "switch", label: "Turn alert sound", hint: "Play a subtle audio chime when your turn begins." },
	combatTurnNpc: { section: "combat", control: "switch", label: "Alert on NPC turns", hint: "Include NPC combatant turns in the visual alert when controlling them (GM only)." },

	autoFavoriteNpcActions: { section: "autoFavorites", control: "switch", label: "Auto-favorite NPC actions", hint: "When an NPC token with no favorites is placed on the scene, automatically favorite its attacks and other combat actions (D&D 5e: items with an attack, damage or save; Shadowdark: attacks, special attacks and spells)." },
	autoFavoriteNpcMax: {
		section: "autoFavorites", control: "number", unit: "MAX", label: "Auto-favorite max actions",
		hint: "Only auto-favorite when an NPC has this many qualifying actions or fewer (default 6).",
	},
	autoFavoriteNpcAttacks: { section: "autoFavorites", control: "switch", label: "Always favorite attacks", hint: "Even when an NPC has more qualifying actions than the maximum, still auto-favorite its attacks." },

	dnd5eShowToolChecks: { section: "dnd5e", control: "switch", label: "Show tool checks", hint: "Display tool checks below skill checks in the Abilities menu, matching the character sheet layout." },
	dnd5eAbilityOrder: {
		section: "dnd5e", control: "select", label: "Abilities menu order",
		hint: "Order of the saving throw, skill and ability check groups in the Abilities menu.",
		choices: { savesSkillsChecks: "Saves → Skills → Checks", checksSavesSkills: "Checks → Saves → Skills", skillsSavesChecks: "Skills → Saves → Checks" },
	},
	dnd5eGroupByActivation: { section: "dnd5e", control: "switch", label: "Group actions by activation type", hint: "Sort and section actions into Action, Bonus Action, Reaction, and Legendary Action headers." },
	dnd5eShowUnpreparedRituals: { section: "dnd5e", control: "switch", label: "Show unprepared wizard rituals", hint: "Display known but unprepared ritual spells in the Spellbook for wizard characters, allowing ritual casting." },
	dnd5eDamageTypeDisplay: {
		section: "dnd5e", control: "select", label: "Damage type display",
		hint: "Choose how damage types are displayed on action buttons: compact subtly colored icons, icons with text, or written text only.",
		choices: { icons: "Icons only", both: "Icons and text", text: "Text only" },
	},

	fontFamily: { section: "styling", control: "select", dynamic: "fonts", label: "Action HUD font", hint: "Typography used for button labels, item headers, and submenus." },
	buttonShape: { section: "styling", control: "select", dynamic: "buttonShapes", label: "Category button shape", hint: "Override category button geometry with any theme's button shape." },
	hudOpacity: { section: "styling", control: "range", unit: "%", label: "HUD opacity", hint: "How opaque the HUD's panels, buttons and tooltips are. Lower it to see the canvas through the HUD; text and icons stay fully visible." },
	tooltipScale: { section: "styling", control: "range", unit: "%", label: "Tooltip text size", hint: "Scale rich action hover cards and item tooltips for improved readability." },
	portraitSource: {
		section: "styling", control: "select", label: "Portrait image source",
		hint: "Which image the HUD portrait shows: the actor's character sheet portrait or the token art. Players can still override this per character from the portrait's right-click menu.",
		choices: { portrait: "Actor portrait", token: "Token image" },
	},

	fadeWhenIdle: { section: "display", control: "switch", label: "Fade when idle", hint: "Dim the Action HUD when inactive, respecting core Foundry's Inactive Opacity and Fade Speed settings." },
	drawerSide: {
		section: "display", control: "select", label: "Submenu expansion direction", hint: "Side on which secondary submenus and item trays unfold.",
		choices: { auto: "Automatic", left: "Left", right: "Right" },
	},
	favoritesLayout: {
		section: "display", control: "select", label: "Favorites bar layout", hint: "Vertical rail at the side of the HUD, or a horizontal bar above it.",
		choices: { rail: "Vertical rail", top: "Horizontal bar" },
	},
	minimizeButton: { section: "display", control: "switch", label: "Minimize button", hint: "Show a button on the HUD's name row that shrinks the HUD down to the name and portrait. Click it again to bring the full HUD back." },
};

const SCOPE_TEXT = {
	client: { id: "client", label: "CLIENT", labelKey: "NAH.Panel.Scope.Client", titleKey: "NAH.Panel.Scope.ClientTitle", title: "Applies to this browser only" },
	world: { id: "world", label: "WORLD", labelKey: "NAH.Panel.Scope.World", titleKey: "NAH.Panel.Scope.WorldTitle", title: "Applies to every player at the table" },
};

/** Localized text for `key`, or `fallback` when the language has no entry. */
const localized = (key, fallback) => (game.i18n?.has?.(key) ? game.i18n.localize(key) : fallback);

/**
 * Sections of rows, grouped by tab (`{ general: [...], appearance: [...] }`).
 * @param {object} values      draft values by option key
 * @param {Record<string, object>} locks  lock state by option key
 * @param {Record<string, Array<{value: string, label: string}>>} lists  choices computed at runtime ("fonts", "buttonShapes")
 */
export function buildSettingSections(values, locks, lists = {}) {
	const sections = SECTIONS
		.filter((section) => !section.system || section.system === game.system.id)
		.map((section) => ({
			id: section.id,
			tab: section.tab,
			title: localized(`NAH.Panel.Sections.${section.titleKey}`, section.title),
			rows: SETTING_SCHEMA
				.filter((spec) => ROW_TEXT[spec.key]?.section === section.id && (!spec.gmOnly || game.user?.isGM))
				.map((spec) => {
					const text = ROW_TEXT[spec.key];
					const value = values[spec.key];
					const lock = locks[spec.key] ?? null;
					const stem = `NAH.Settings.${spec.label}`;
					const scope = SCOPE_TEXT[spec.scope ?? "client"];
					return {
						key: spec.key,
						label: localized(`${stem}.Name`, text.label),
						hint: localized(`${stem}.Hint`, text.hint),
						scope: { id: scope.id, label: localized(scope.labelKey, scope.label), title: localized(scope.titleKey, scope.title) },
						lock,
						disabled: Boolean(lock?.disabled),
						// Shown (tooltip, click notice) where the control does not react.
						blockedReason: lock?.isHard ? lock.tooltip : "",
						isSwitch: text.control === "switch",
						isSelect: text.control === "select",
						isNumber: text.control === "number",
						isRange: text.control === "range",
						unit: text.unit && text.control === "number" ? localized("NAH.Panel.Unit.Max", text.unit) : text.unit,
						checked: Boolean(value),
						value,
						min: spec.range?.min,
						max: spec.range?.max,
						step: spec.range?.step,
						choices: (text.dynamic
							? (lists[text.dynamic] ?? []).map((entry) => ({ id: entry.value, label: entry.label, selected: value === entry.value }))
							: Object.entries(text.choices ?? {}).map(([id, label]) => ({
								id,
								label: localized(`${stem}.${spec.choices?.[id]}`, label),
								selected: value === id,
							}))),
					};
				}),
		}));
	return { behavior: sections.filter((s) => s.tab === "behavior"), system: sections.filter((s) => s.tab === "system"), appearance: sections.filter((s) => s.tab === "appearance") };
}

/** Sections of the Backup and reset tab: one description plus rows of buttons each. */
export function buildBackupSections() {
	const P = (leaf) => game.i18n.localize(`NAH.Panel.Backup.${leaf}`);
	return [
		{
			title: P("ExportTitle"),
			description: P("ExportDesc"),
			rows: [{
				label: P("FileLabel"),
				buttons: [
					{ action: "exportConfig", icon: "fa-solid fa-download", label: P("Export") },
					{ action: "importConfig", icon: "fa-solid fa-upload", label: P("Import") },
				],
			}],
		},
		{
			title: P("ResetTitle"),
			rows: [{ label: P("ResetLabel"), hint: P("ResetHint"), buttons: [{ action: "reset", danger: true, label: P("ResetButton") }] }],
		},
	];
}
