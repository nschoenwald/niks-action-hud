/**
 * One handler per system-action kind (see core/action-ref.js). A handler can implement:
 *   run(ctx)       perform the action          ctx: { actor, args, roll(), event }
 *   describe(ctx)  favorites look              ctx: { actor, args } -> { img, name, type, description }
 *   tooltip(ctx)   hover card data (async)     ctx: { actor, args } -> card | null
 * Document ids ("item" kind) are handled separately by use-item.js and tooltips.js.
 */

import { mayEdit } from "../../../core/permissions.js";
import { REST_ICONS } from "../sections/abilities.js";
import { _dispatchAmmoCommand } from "../lib/ammo.js";
import { escapeHtml } from "../../../core/escape.js";
import { abilityActionName, getAbilityIcon, getSkillIcon, getToolIcon } from "../lib/icons.js";
import { _getRestStrings } from "../lib/rests.js";
import { getAbilityRuleText, getSkillRuleText } from "../lib/rule-text.js";
import { buildMacroCard } from "../../../core/macro-card.js";
import { text } from "../../../core/text.js";
import { safeFromUuid } from "../../base.js";

const dnd5eConfig = () => CONFIG.DND5E ?? {};
const signedValue = (n) => `${n >= 0 ? "+" : ""}${n}`;
const abilityLabel = (key) => dnd5eConfig().abilities?.[key]?.label || String(key).toUpperCase();
const missingNotice = (key, fallback, id) => ui.notifications.warn(text(key, fallback, { id }));

/** Roll a d20 test on the actor through its dnd5e roll method (`rollSkill`, `rollSavingThrow`, ...). */
function d20Roll(actor, method, ctx, payload = {}) {
	const roll = ctx.roll();
	if (typeof actor[method] === "function") return actor[method]({ ...payload, event: roll.ev, ...roll.config }, roll.dialogOptions);
	return undefined;
}

// ── shared look-up helpers ──

/** Tool (or vehicle) proficiency data and its name, as dnd5e's trait labels give it. */
function toolLabel(actor, key) {
	const data = actor?.system?.tools?.[key];
	return { data, label: dnd5e.documents.Trait.keyLabel(key, { trait: "tool" }) || key };
}

const rollFooter = () => text("NAH.Tooltips.Card.RollFooter", "Left-Click to Roll");
const TXT = {
	modifier: () => text("NAH.Tooltips.Card.Modifier", "Modifier"),
	governedBy: () => text("NAH.Tooltips.Card.GovernedBy", "Governed By"),
	proficient: () => text("NAH.Tooltips.Card.Proficient", "Proficient"),
	notProficient: () => text("NAH.Tooltips.Card.NotProficient", "Not Proficient"),
};

export const ACTION_HANDLERS = {

	equip: {
		run: ({ actor, args: [itemId] }) => flipEquipped(actor, itemId),
	},

	ammo: {
		run: ({ actor, args: [weaponId, command], event }) => _dispatchAmmoCommand(actor, weaponId, command, event ?? window.event),
	},

	initiative: {
		run: ({ actor, roll }) => {
			const { ev, config, dialogOptions } = roll();
			return actor.rollInitiativeDialog({ event: ev, ...config }, dialogOptions);
		},
		describe: () => ({ img: "icons/svg/clockwork.svg", name: text("NAH.Tooltips.Card.Initiative", "Initiative"), type: text("NAH.Tooltips.Card.Initiative", "Initiative"), description: "" }),
		tooltip: async ({ actor }) => {
			const total = actor.system?.attributes?.init?.total ?? 0;
			return {
				title: text("NAH.Tooltips.Card.Initiative", "Initiative"),
				subtitle: text("NAH.Tooltips.Card.InitiativeSubtitle", "Combat Turn Order"),
				icon: "icons/svg/d20-highlight.svg",
				badges: [],
				specs: [{ icon: "fas fa-bolt", label: text("NAH.Tooltips.Card.InitiativeBonus", "Initiative Bonus"), value: signedValue(total) }],
				description: `<p>${escapeHtml(text("NAH.Tooltips.Card.InitiativeText", "Roll initiative at the beginning of a combat encounter to determine turn order."))}</p>`,
				footer: rollFooter(),
			};
		},
	},

	check: {
		run: (ctx) => {
			const [ability] = ctx.args;
			const { actor } = ctx;
			if (ability === "initiative") return ACTION_HANDLERS.initiative.run(ctx);
			if (ability === "concentration") return d20Roll(actor, "rollConcentration", ctx);
			if (ability === "death") return d20Roll(actor, "rollDeathSave", ctx);
			return d20Roll(actor, "rollAbilityCheck", ctx, { ability });
		},
		describe: ({ args: [key] }) => {
			if (key === "initiative") return ACTION_HANDLERS.initiative.describe();
			const img = dnd5eConfig().abilities?.[key]?.icon || getAbilityIcon(key, "icons/svg/d20-grey.svg");
			return { img, name: abilityActionName("check", abilityLabel(key)), type: text("NAH.Tooltips.Card.AbilityCheck", "Ability Check"), description: "" };
		},
		tooltip: async (ctx) => {
			const [key] = ctx.args;
			if (key === "initiative") return ACTION_HANDLERS.initiative.tooltip(ctx);
			const meta = dnd5eConfig().abilities?.[key];
			const data = ctx.actor.system?.abilities?.[key];
			if (!meta && !data) return null;
			const mod = data?.check?.value ?? data?.mod ?? 0;
			const rule = await getAbilityRuleText(key);
			const paragraphs = [rule.intro, rule.check].filter(Boolean).map((text) => `<p>${escapeHtml(text)}</p>`).join("");
			return {
				title: text("NAH.Tooltips.Card.CheckTitle", "{ability} Check", { ability: abilityLabel(key) }),
				subtitle: text("NAH.Tooltips.Card.AbilityCheck", "Ability Check"),
				icon: getAbilityIcon(key),
				badges: [],
				specs: [{ icon: "fas fa-dice-d20", label: TXT.modifier(), value: signedValue(mod) }],
				description: paragraphs || `<p>Roll a ${abilityLabel(key)} ability check.</p>`,
				footer: rollFooter(),
			};
		},
	},

	save: {
		run: (ctx) => {
			const [ability] = ctx.args;
			if (ability === "concentration") return d20Roll(ctx.actor, "rollConcentration", ctx);
			if (ability === "death") return d20Roll(ctx.actor, "rollDeathSave", ctx);
			return d20Roll(ctx.actor, "rollSavingThrow", ctx, { ability });
		},
		describe: ({ args: [key] }) => {
			const img = dnd5eConfig().abilities?.[key]?.icon || getAbilityIcon(key, "icons/svg/d20-highlight.svg");
			return { img, name: abilityActionName("save", abilityLabel(key)), type: text("NAH.Tooltips.Card.SavingThrow", "Saving Throw"), description: "" };
		},
		tooltip: async ({ actor, args: [key] }) => {
			const meta = dnd5eConfig().abilities?.[key];
			const data = actor.system?.abilities?.[key];
			if (!meta && !data) return null;
			const total = data?.save?.value ?? 0;
			const proficient = (data?.save?.prof?.multiplier ?? 0) >= 1;
			const rule = await getAbilityRuleText(key);
			return {
				title: text("NAH.Tooltips.Card.SavingThrowTitle", "{ability} Saving Throw", { ability: abilityLabel(key) }),
				subtitle: text("NAH.Tooltips.Card.SavingThrow", "Saving Throw"),
				icon: getAbilityIcon(key),
				badges: [{ label: proficient ? TXT.proficient() : TXT.notProficient(), className: proficient ? "prepared" : "unprepared" }],
				specs: [
					{ icon: "fas fa-shield-halved", label: text("NAH.Tooltips.Card.SavingThrow", "Saving Throw"), value: signedValue(total) },
					{ icon: proficient ? "fas fa-check-circle" : "far fa-circle", label: text("NAH.Tooltips.Card.Proficiency", "Proficiency"), value: proficient ? TXT.proficient() : TXT.notProficient() },
				],
				description: `<p>${escapeHtml(rule.save || `Roll a ${abilityLabel(key)} saving throw.`)}</p>`,
				footer: rollFooter(),
			};
		},
	},

	skill: {
		run: (ctx) => d20Roll(ctx.actor, "rollSkill", ctx, { skill: ctx.args[0] }),
		describe: ({ args: [key] }) => ({
			img: getSkillIcon(key, "icons/svg/book.svg"),
			name: dnd5eConfig().skills?.[key]?.label || key,
			type: text("NAH.Tooltips.Card.SkillCheck", "Skill Check"),
			description: "",
		}),
		tooltip: async ({ actor, args: [key] }) => {
			const meta = dnd5eConfig().skills?.[key];
			const data = actor.system?.skills?.[key];
			if (!meta && !data) return null;
			const abilityKey = data?.ability || meta?.ability || "dex";
			const multiplier = data?.prof?.multiplier ?? 0;
			const level = ({ 2: text("NAH.Tooltips.Card.Expertise", "Expertise"), 1: TXT.proficient(), 0.5: text("NAH.Tooltips.Card.HalfProficient", "Half-Proficient") })[multiplier] ?? TXT.notProficient();
			const rule = await getSkillRuleText(key);
			return {
				title: meta?.label || key,
				subtitle: text("NAH.Tooltips.Card.SkillSubtitle", "{ability} Skill Check", { ability: abilityLabel(abilityKey) }),
				icon: getSkillIcon(key, getAbilityIcon(abilityKey)),
				iconLead: getAbilityIcon(abilityKey),
				badges: [{ label: level, className: multiplier >= 1 ? "prepared" : "unprepared" }],
				specs: [
					{ icon: "fas fa-dice-d20", label: TXT.modifier(), value: signedValue(data?.total ?? 0) },
				],
				description: `<p>${escapeHtml(rule || `Roll a ${meta?.label || key} check.`)}</p>`,
				footer: rollFooter(),
			};
		},
	},

	tool: {
		run: (ctx) => d20Roll(ctx.actor, "rollToolCheck", ctx, { tool: ctx.args[0] }),
		describe: ({ actor, args: [key] }) => {
			const { label } = toolLabel(actor, key);
			return { img: getToolIcon(key), name: label, type: text("NAH.Tooltips.Card.ToolCheck", "Tool Check"), description: "" };
		},
		tooltip: async ({ actor, args: [key] }) => {
			const { data, label } = toolLabel(actor, key);
			const abilityKey = data?.ability || dnd5eConfig().tools[key]?.ability || "int";
			// `prof` is always a Proficiency object; its multiplier says whether the actor is proficient
			const proficient = (data?.prof?.multiplier ?? 0) >= 1;
			return {
				title: label,
				subtitle: text("NAH.Tooltips.Card.ToolSubtitle", "{ability} Tool Check", { ability: abilityLabel(abilityKey) }),
				icon: getToolIcon(key),
				iconLead: getAbilityIcon(abilityKey),
				badges: proficient ? [{ label: TXT.proficient(), className: "prepared" }] : [],
				specs: [
					{ icon: "fas fa-tools", label: TXT.modifier(), value: signedValue(data?.total ?? 0) },
					{ icon: "fas fa-brain", img: getAbilityIcon(abilityKey), label: TXT.governedBy(), value: abilityLabel(abilityKey) },
				],
				description: `<p>Roll a ${label} tool check governed by ${abilityLabel(abilityKey)}.</p>`,
				footer: rollFooter(),
			};
		},
	},

	rest: {
		run: ({ actor, args: [type] }) => (type === "long" ? actor.longRest?.() : actor.shortRest?.()),
		describe: ({ args: [type] }) => {
			const rest = _getRestStrings(type === "long" ? "long" : "short");
			return {
				img: REST_ICONS[type === "long" ? "long" : "short"],
				name: rest.name,
				type: game.i18n?.has?.("DND5E.REST.Label") ? game.i18n.localize("DND5E.REST.Label") : "Rest",
				description: rest.description,
			};
		},
		tooltip: async ({ args: [type] }) => {
			const kind = type === "long" ? "long" : "short";
			const rest = _getRestStrings(kind);
			return {
				title: rest.name,
				subtitle: rest.subtitle,
				icon: REST_ICONS[kind],
				badges: [],
				specs: [{ icon: "fas fa-hourglass-half", label: rest.durationLabel, value: rest.duration }],
				description: `<p>${escapeHtml(rest.tooltip)}</p>`,
				footer: rest.footer,
			};
		},
	},

	macro: {
		tooltip: async ({ args: [id] }) => buildMacroCard(id),
		run: async ({ actor, args: [id] }) => {
			if (id === "help") return undefined;
			const macro = (await safeFromUuid(id)) || game.macros?.get(id);
			if (!macro) return missingNotice("NAH.Messages.MissingMacro", "Macro not found: {id}", id);
			return macro.execute({ actor, token: actor.token });
		},
		describe: ({ args: [id] }) => {
			const macro = game.macros?.get(id);
			return macro ? { img: macro.img, name: macro.name, type: text("NAH.Tooltips.Card.Macro", "Macro"), description: macro.command || "" } : null;
		},
	},

	activity: {
		run: ({ actor, args: [itemId, activityId], roll }) => {
			const item = actor.items.get(itemId);
			const { config, dialogOptions } = roll();
			const activity = item?.system?.activities?.get(activityId);
			// A deleted activity falls back to the item's own use
			if (activity) return activity.use(config, dialogOptions);
			if (item) return item.use(config, dialogOptions);
			return missingNotice("NAH.Messages.ActivityNotFound", "Activity not found: {id}", activityId);
		},
	},
};

/** Toggle an item's equipped flag (needs ownership). */
async function flipEquipped(actor, itemId) {
	if (!mayEdit(actor)) {
		ui.notifications.warn(game.i18n.localize("NAH.UI.PermissionDenied"));
		return;
	}
	const item = actor.items.get(itemId);
	if (!item) return;
	try {
		await item.update({ "system.equipped": !item.system?.equipped });
	} catch (error) {
		console.warn("Nik's Action HUD | equip toggle failed:", error);
		ui.notifications.warn(game.i18n.localize("NAH.Notifications.ActorUpdateError"));
	}
}
