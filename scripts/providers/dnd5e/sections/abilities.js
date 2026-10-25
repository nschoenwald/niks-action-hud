/**
 * Abilities section: ability checks, saving throws, skills, tool checks and rests.
 */

import { dd } from "../lib/text.js";
import { ref } from "../../../core/action-ref.js";
import { createRow } from "../../shared/row-model.js";
import { emptyDrawer, withOverview } from "../../shared/drawer-model.js";
import { getAbilityIcon, getSkillIcon, abilityActionName, getToolIcon, shouldShowToolChecks } from "../lib/icons.js";
import { _getRestStrings } from "../lib/rests.js";
import { readSetting } from "../../../core/setting-read.js";

/** Rest entries: bread for a short rest, a sleep bubble for a long rest (Foundry core art). */
export const REST_ICONS = Object.freeze({
	short: "icons/consumables/grains/bread-loaf-sliced-wheat-brown.webp",
	long: "icons/magic/control/sleep-bubble-purple.webp",
});

const signed = (value) => `${value >= 0 ? "+" : ""}${value}`;
const labelOr = (key, fallback) => (game.i18n?.has?.(key) ? game.i18n.localize(key) : fallback);

/** Normalise a proficiency value to one of the four levels the sheet uses (0, 0.5, 1, 2). */
const profLevel = (value) => {
	const n = Number(value) || 0;
	return n >= 2 ? 2 : n >= 1 ? 1 : n > 0 ? 0.5 : 0;
};

/** Row extras carrying the proficiency indicator (icon level and its localized name). */
const profExtras = (value) => {
	const level = profLevel(value);
	return { proficiency: level, proficiencyLabel: CONFIG.DND5E?.proficiencyLevels?.[level] ?? "" };
};

/** Row extras for an actor-level advantage (+1) / disadvantage (-1) on this roll; empty when neutral. */
const modeExtras = (roll) => {
	const mode = Number(roll?.mode) || 0;
	if (!mode) return {};
	return { rollMode: mode > 0 ? 1 : -1, rollModeLabel: game.i18n.localize(mode > 0 ? "DND5E.Advantage" : "DND5E.Disadvantage") };
};

/** One-line roll row: name on the left, modifier on the right. */
const rollRow = ({ id, name, icon, modifier, description, ...extra }) =>
	createRow({ id, name, icon, modifier, description, isAbilityRoll: true, ...extra });

function abilityRows(actor) {
	const checks = [];
	const saves = [];
	for (const [key, meta] of Object.entries(CONFIG.DND5E?.abilities || {})) {
		const ability = actor.system.abilities?.[key];
		const mod = ability?.mod ?? 0;
		const label = meta.label || key.toUpperCase();
		const icon = getAbilityIcon(key);

		const check = ability?.check?.value ?? mod;
		checks.push(rollRow({ id: ref.check(key), name: abilityActionName("check", label), icon, modifier: signed(check), description: `Roll ${label} Ability Check`, ...modeExtras(ability?.check?.roll) }));

		const save = ability?.save?.value ?? mod;
		saves.push(rollRow({ id: ref.save(key), name: abilityActionName("save", label), icon, modifier: signed(save), description: `Roll ${label} Saving Throw`, ...profExtras(ability?.proficient), ...modeExtras(ability?.save?.roll) }));
	}
	return { checks, saves };
}

function skillRows(actor) {
	return Object.entries(CONFIG.DND5E?.skills || {}).map(([key, meta]) => {
		const skill = actor.system.skills?.[key];
		const ability = skill?.ability || meta.ability;
		return rollRow({
			id: ref.skill(key),
			name: meta.label || key,
			icon: getSkillIcon(key, getAbilityIcon(ability)),
			modifier: signed(skill?.total ?? 0),
			description: dd("RollSkill", "Roll {skill} Skill Check", { skill: meta.label || key }),
			...profExtras(skill?.value),
			...modeExtras(skill?.roll),
		});
	});
}

/** A tool or vehicle proficiency's name, as dnd5e's trait labels give it. */
const toolLabel = (key) => dnd5e.documents.Trait.keyLabel(key, { trait: "tool" }) || key;

function toolRows(actor) {
	if (!shouldShowToolChecks() || !actor.system.tools) return [];
	return Object.entries(actor.system.tools).map(([key, toolData]) => {
		const label = toolLabel(key);
		return rollRow({
			id: ref.tool(key),
			name: label,
			icon: getToolIcon(key),
			modifier: signed(toolData.total),
			description: dd("RollTool", "Roll {tool} Tool Check", { tool: label }),
			...profExtras(toolData?.value),
			...modeExtras(toolData?.roll),
		});
	});
}

function restRows() {
	return ["short", "long"].map((type) => {
		const rest = _getRestStrings(type);
		return rollRow({ id: ref.rest(type), name: rest.name, icon: REST_ICONS[type], description: rest.description });
	});
}

/** Group order per value of the dnd5eAbilityOrder setting; tools and rests always follow. */
const ROLL_GROUP_ORDERS = Object.freeze({
	savesSkillsChecks: ["save", "skill", "check"],
	checksSavesSkills: ["check", "save", "skill"],
	skillsSavesChecks: ["skill", "save", "check"],
});

function rollGroupOrder() {
	return ROLL_GROUP_ORDERS[readSetting("dnd5eAbilityOrder")] ?? ROLL_GROUP_ORDERS.savesSkillsChecks;
}

/** Drawer payload for the abilities section. */
export function buildAbilities(actor) {
	if (!actor?.system) return emptyDrawer("Abilities");

	const { checks, saves } = abilityRows(actor);
	const rollGroups = {
		save: { id: "save", label: labelOr("NAH.Dnd5e.AbilityTabs.Saves", "Saves"), rows: saves },
		skill: { id: "skill", label: labelOr("NAH.Dnd5e.AbilityTabs.Skills", "Skills"), rows: skillRows(actor) },
		check: { id: "check", label: labelOr("NAH.Dnd5e.AbilityTabs.Checks", "Checks"), rows: checks },
	};
	const groups = [
		...rollGroupOrder().map((id) => rollGroups[id]),
		{ id: "tool", label: labelOr("NAH.Dnd5e.Tools", "Tools"), rows: toolRows(actor) },
		{ id: "rest", label: labelOr("NAH.Dnd5e.AbilityTabs.Resting", "Rest"), rows: restRows() },
	];
	const overviewLabel = game.i18n?.localize?.("NAH.UI.AllAbilities") || game.i18n?.localize?.("NAH.UI.All") || "All";
	return { title: "Abilities", panes: withOverview(groups, overviewLabel) };
}
