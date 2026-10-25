/**
 * Favorites resolution: display data, uses and virtual items for pinned actions.
 */

import { text } from "../../../core/text.js";
import { sd } from "../lib/text.js";
import { parseRef } from "../../../core/action-ref.js";
import { getAbilityDescription, getAbilityIcon } from "../lib/icons.js";

const INITIATIVE_ICON = "icons/svg/clockwork.svg";

export function buildFavoriteEntry(actor, itemId) {
	const { kind, args } = parseRef(itemId);
	if (kind === "check") {
		const key = args[0];
		if (key === "initiative") {
			const dexMod = actor?.system?.abilities?.dex?.mod ?? 0;
			const dexStr = dexMod >= 0 ? `+${dexMod}` : `${dexMod}`;
			return {
				img: INITIATIVE_ICON,
				name: text("NAH.Tooltips.Card.Initiative", "Initiative"),
				type: text("NAH.Tooltips.Card.Initiative", "Initiative"),
				modifier: dexStr,
				isAbilityRoll: true,
				description: sd("InitiativeDesc", "Roll initiative (DEX {mod})", { mod: dexStr }),
			};
		}

		const label = game.i18n?.localize?.(CONFIG.SHADOWDARK?.ABILITIES_LONG?.[key]) || key.toUpperCase();
		const ability = actor?.system?.abilities?.[key];
		const mod = ability?.mod ?? 0;
		const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
		return {
			img: getAbilityIcon(key),
			name: text("NAH.Tooltips.Card.CheckTitle", "{ability} Check", { ability: label }),
			type: text("NAH.Tooltips.Card.AbilityCheck", "Ability Check"),
			modifier: modStr,
			isAbilityRoll: true,
			// NPCs only have a modifier, characters also a score
			description: ability?.value !== undefined
				? sd("Score", "Score {score} ({mod})", { score: ability.value, mod: modStr })
				: sd("ScoreModifierOnly", "Modifier {mod}", { mod: modStr }),
		};
	}

	if (kind === "luck") {
		const luck = actor?.system?.luck;
		const isPulp = Boolean(game.settings.get("shadowdark", "usePulpMode"));
		const remaining = isPulp ? Number(luck?.remaining ?? 0) : undefined;
		const available = isPulp ? (remaining > 0) : Boolean(luck?.available);
		return {
			img: available
				? "icons/magic/control/buff-luck-fortune-green.webp"
				: "icons/magic/symbols/clover-luck-white-green.webp",
			name: sd("Luck", "Luck"),
			type: sd("Luck", "Luck"),
			description: isPulp ? sd("PulpRemaining", "Pulp Luck: {n} remaining", { n: remaining }) : (available ? sd("LuckAvailable", "Luck Token Available") : sd("LuckSpent", "Luck Spent")),
		};
	}

	if (kind === "rollhp") {
		return {
			img: "icons/svg/heal.svg",
			name: sd("RollHp", "Roll Hit Points"),
			type: "HP",
			description: sd("RollHpDesc", "Roll NPC Max & Current HP"),
		};
	}

	if (kind === "wand-spell") {
		const [wandId, spellUuid] = args;
		const wand = actor?.items?.get(wandId);
		const spellDoc = spellUuid ? fromUuidSync(spellUuid) : null;
		const spellName = spellDoc?.name || (spellUuid ? spellUuid.split(".").pop().replace(/-/g, " ") : "Spell");
		return {
			img: wand?.img || "icons/weapons/wands/wand-gem-violet.webp",
			name: `${wand?.name || "Wand"}: ${spellName}`,
			type: sd("Wand", "Wand"),
			description: spellDoc ? `Tier ${spellDoc.system?.tier || 1} • Wand Spell` : "Wand Spell",
		};
	}

	if (kind === "macro") {
		const macro = game.macros?.get(args[0]);
		if (macro) {
			return {
				img: macro.img,
				name: macro.name,
				type: text("NAH.Tooltips.Card.Macro", "Macro"),
				description: macro.command || "",
			};
		}
	}

	const item = actor?.items?.get(itemId);
	if (item) {
		return {
			img: item.img,
			name: item.name,
			type: item.type,
			description: item.system?.description || "",
		};
	}

	return null;
}

/**
 * Retrieve uses data for a favorited item or action.
 * @param {Actor} actor
 * @param {string} itemId
 * @param {Item|object|null} [item=null]
 * @returns {{ value: number, max: number|null, label: string, isDepleted: boolean }|null}
 */
export function getFavoriteUses(actor, itemId, item = null) {
	if (!actor || !itemId) return null;

	const { kind, args } = parseRef(itemId);

	// 1. Luck
	if (kind === "luck") {
		const luck = actor.system?.luck;
		if (!luck) return null;
		const isPulp = Boolean(game.settings.get("shadowdark", "usePulpMode"));
		if (isPulp) {
			const rem = Number(luck.remaining || 0);
			return {
				value: rem,
				max: null,
				label: `${rem}`,
				isDepleted: rem <= 0,
			};
		}
		const available = Boolean(luck.available);
		return {
			value: available ? 1 : 0,
			max: 1,
			label: available ? sd("Ready", "Ready") : "0/1",
			isDepleted: !available,
		};
	}

	// 2. Wand Spell
	if (kind === "wand-spell") {
		const [wandId, spellUuid] = args;
		const wand = actor.items?.get(wandId);
		const spEntry = wand?.system?.spells?.find((s) => s.uuid === spellUuid);
		const isLost = Boolean(wand?.system?.broken || spEntry?.lost);
		return {
			value: isLost ? 0 : 1,
			max: 1,
			label: isLost ? sd("Lost", "LOST") : "1/1",
			isDepleted: isLost,
		};
	}

	// 3. Resolve actor item
	const targetItem = item || actor.items?.get(itemId);
	if (!targetItem?.system) return null;

	// Class Ability with limited uses
	if (targetItem.system.limitedUses && targetItem.system.uses) {
		const val = Number(targetItem.system.uses.available ?? 0);
		const max = Number(targetItem.system.uses.max ?? 0);
		return {
			value: Math.max(0, val),
			max: max > 0 ? max : null,
			label: max > 0 ? `${val}/${max}` : `${val}`,
			isDepleted: val <= 0,
		};
	}

	// Spell with lost state
	if (targetItem.type === "Spell") {
		const isLost = Boolean(targetItem.system.lost);
		return {
			value: isLost ? 0 : 1,
			max: 1,
			label: isLost ? sd("Lost", "LOST") : "1/1",
			isDepleted: isLost,
		};
	}

	// Light Source
	if (targetItem.system.light?.isSource) {
		const light = targetItem.system.light;
		const remainingMinutes = Math.ceil(Number(light.remainingSecs || 0) / 60);
		const longevityMins = Number(light.longevityMins || 60);
		const active = Boolean(light.active);
		return {
			value: remainingMinutes,
			max: longevityMins,
			label: active ? `${remainingMinutes}m` : "OFF",
			isDepleted: !active || remainingMinutes <= 0,
		};
	}

	// Potions and Ammunition: track quantity
	if (targetItem.type === "Potion" || targetItem.system.isAmmunition) {
		const qty = Number(targetItem.system.quantity ?? 1);
		return {
			value: qty,
			max: null,
			label: `x${qty}`,
			isDepleted: qty <= 0,
		};
	}

	return null;
}

export function locateVirtualItem(actor, itemId) {
	const { kind, args } = parseRef(itemId);
	if (kind === "check") {
		const key = args[0];
		if (key === "initiative") {
			return {
				id: itemId,
				name: text("NAH.Tooltips.Card.Initiative", "Initiative"),
				img: INITIATIVE_ICON,
				type: text("NAH.Tooltips.Card.Initiative", "Initiative"),
				system: { description: game.i18n?.localize?.("NAH.Tooltips.Initiative") || "Roll initiative to determine combat turn order." },
			};
		}

		const label = game.i18n?.localize?.(CONFIG.SHADOWDARK?.ABILITIES_LONG?.[key]) || key.toUpperCase();
		return {
			id: itemId,
			name: `${label} Check`,
			img: getAbilityIcon(key),
			type: text("NAH.Tooltips.Card.AbilityCheck", "Ability Check"),
			system: { description: getAbilityDescription(key) },
		};
	}

	if (kind === "luck") {
		return {
			id: itemId,
			name: sd("Luck", "Luck"),
			img: "icons/magic/control/buff-luck-fortune-green.webp",
			type: sd("Luck", "Luck"),
			system: {
				description: game.i18n?.localize?.("NAH.Shadowdark.LuckTooltip")
					|| sd("LuckTip", "Spend Luck to reroll any roll you just made. You must take the new result."),
			},
		};
	}

	if (kind === "rollhp") {
		return {
			id: itemId,
			name: sd("RollHp", "Roll Hit Points"),
			img: "icons/svg/heal.svg",
			type: "HP",
			system: { description: sd("RollHpTip", "Roll max and current hit points for this NPC based on level and CON modifier.") },
		};
	}

	if (kind === "wand-spell") {
		const [wandId, spellUuid] = args;
		const wand = actor?.items?.get(wandId);
		const spellDoc = spellUuid ? fromUuidSync(spellUuid) : null;
		const spellName = spellDoc?.name || (spellUuid ? spellUuid.split(".").pop().replace(/-/g, " ") : "Spell");
		return {
			id: itemId,
			name: `${wand?.name || "Wand"}: ${spellName}`,
			img: wand?.img || "icons/weapons/wands/wand-gem-violet.webp",
			type: sd("Wand", "Wand"),
			system: { description: spellDoc?.system?.description || wand?.system?.description || sd("WandTip", "Cast spell contained in wand.") },
		};
	}

	return null;
}
