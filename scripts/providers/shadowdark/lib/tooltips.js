import { sd } from "./text.js";
import { text } from "../../../core/text.js";
import { parseRef } from "../../../core/action-ref.js";
import { formatDuration, formatRange, formatWeaponDamage } from "./formatting.js";
import { getAbilityDescription, getAbilityIcon } from "./icons.js";
import { getLightSourceInfo } from "./light.js";
import { safeFromUuidSync } from "../../base.js";
import { locateVirtualItem } from "../provider/favorites.js";

/** Action kinds whose first argument is an owned item id. */
const ITEM_ARG_KINDS = new Set(["item", "light", "potion", "equip", "restore-spell"]);

/**
 * The item an action id points at: an owned item (by id, uuid or name), the spell inside a wand,
 * or the virtual item of a check / luck / hit-point action.
 */
function resolveTooltipItem(actor, itemId) {
	const { kind, args } = parseRef(itemId);
	if (ITEM_ARG_KINDS.has(kind)) {
		const id = args[0];
		let item = actor.items?.get(id);
		if (!item && id.includes(".")) {
			const doc = safeFromUuidSync(id);
			item = actor.items?.get(doc?.id) || (doc instanceof foundry.documents.Item ? doc : null);
		}
		return item || actor.items?.getName(id) || null;
	}
	if (kind === "wand-spell") {
		const spell = safeFromUuidSync(args[1]);
		if (spell instanceof foundry.documents.Item) return spell;
	}
	return locateVirtualItem(actor, itemId);
}

/**
 * The ability `actor` casts `spell` with, picked the way Shadowdark does when casting: the spell's
 * casting classes that the character knows, best modifier first ("" when none applies).
 */
function castingAbilityOf(actor, spell) {
	if (actor.type === "NPC") return actor.system.spellcasting.ability || "";
	const known = actor.system.spellcasting?.classes ?? [];
	const abilities = (spell.system.class ?? [])
		.map((uuid) => safeFromUuidSync(uuid))
		.filter((cls) => cls?.system?.isCastingClass && known.includes(cls.name.slugify()))
		.map((cls) => cls.system.spellcasting.ability);
	const modOf = (ability) => actor.system.abilities[ability]?.mod ?? -99;
	return abilities.reduce((best, ability) => (best && modOf(best) >= modOf(ability) ? best : ability), "");
}

/** "3 gp 5 sp" from a Shadowdark cost object, or "" when free. */
function formatCost(cost) {
	if (!cost) return "";
	return ["gp", "sp", "cp"].filter((coin) => Number(cost[coin]) > 0).map((coin) => `${cost[coin]} ${coin}`).join(" ");
}

/** Names of the property items (Finesse, Two-Handed, ...) linked to an item. */
function propertyNamesOf(sys) {
	return (sys.properties ?? []).map((uuid) => safeFromUuidSync(uuid)?.name).filter(Boolean);
}

/** Specs shared by carried gear: quantity, gear slots and cost. */
function physicalSpecs(sys) {
	const specs = [];
	if (!sys.isPhysical) return specs;
	if ((sys.quantity ?? 1) !== 1 || sys.hasMultiple) specs.push({ icon: "fas fa-layer-group", label: sd("Quantity", "Quantity"), value: `${sys.quantity ?? 1}` });
	specs.push({ icon: "fas fa-box", label: sd("GearSlots", "Gear Slots"), value: `${sys.slotsUsed}` });
	const cost = formatCost(sys.cost);
	if (cost) specs.push({ icon: "fas fa-coins", label: sd("Cost", "Cost"), value: cost });
	return specs;
}

/**
 * Builds rich, structured tooltip data for an item or action in Shadowdark RPG.
 * Supports weapons, spells (with tiers, lost state, and casting DC), light sources,
 * class abilities, armor, gear, and core checks.
 *
 * @param {Actor} actor
 * @param {Item|Object} item
 * @param {Object} [options={}]
 * @returns {Object|null}
 */
export function buildShadowdarkTooltipData(actor, itemOrId, options = {}) {
	if (!actor || !itemOrId) return null;

	// The hover card passes the row's action id; resolve it to the item it stands for.
	const itemId = String(options.itemId || (typeof itemOrId === "string" ? itemOrId : itemOrId.id) || "");
	const item = typeof itemOrId === "string" ? resolveTooltipItem(actor, itemOrId) : itemOrId;
	const data = describeItem(actor, item, itemId, options);
	if (data && item instanceof foundry.abstract.Document) data.item = item;
	return data;
}

function describeItem(actor, item, itemId, options) {
	const { kind, args } = parseRef(itemId);
	const fromRail = Boolean(options.isFavorite);

	// 1. STAT CHECKS & SPECIAL ACTIONS
	if (kind === "check" && args[0] !== "initiative") {
		const key = item?.key || args[0];
		const rawLabel = CONFIG.SHADOWDARK?.ABILITIES_LONG?.[key];
		const abilityName = game.i18n?.localize?.(rawLabel) || rawLabel || (item?.name ? String(item.name).replace(/\s+Check$/i, "") : key?.toUpperCase());
		const abl = actor.system?.abilities?.[key];
		// NPCs only have a modifier, characters also a score
		const score = abl?.value ?? "";
		const mod = Number(abl?.mod ?? 0);
		const modStr = `${mod >= 0 ? "+" : ""}${mod}`;

		const specs = [
			{ icon: "fas fa-dice-d20", label: "Check Modifier", value: modStr },
		];
		if (score !== "") {
			specs.push({ icon: "fas fa-user", label: sd("AbilityScore", "Ability Score"), value: `${score}` });
		}

		return {
			name: text("NAH.Tooltips.Card.CheckTitle", "{ability} Check", { ability: abilityName }),
			img: getAbilityIcon(key),
			subtitle: sd("AbilityCheckSubtitle", "Ability Check · Shadowdark RPG"),
			specs,
			description: getAbilityDescription(key),
			footer: sd("KbdHelp", "<kbd>Shift</kbd>: Advantage · <kbd>Alt</kbd>: Normal · <kbd>Ctrl</kbd>: Disadvantage"),
		};
	}

	if (kind === "check") {
		const dexMod = Number(actor.system?.abilities?.dex?.mod ?? 0);
		const bonusStr = `${dexMod >= 0 ? "+" : ""}${dexMod}`;

		return {
			name: text("NAH.Tooltips.Card.Initiative", "Initiative"),
			img: "icons/svg/clockwork.svg",
			subtitle: text("NAH.Tooltips.Card.InitiativeSubtitle", "Combat Turn Order"),
			specs: [
				{ icon: "fas fa-bolt", label: sd("DexBonus", "DEX Bonus"), value: bonusStr },
				{ icon: "fas fa-dice-d20", label: sd("RollFormula", "Roll Formula"), value: `1d20 ${bonusStr}` },
			],
			description: game.i18n?.localize?.("NAH.Tooltips.Initiative") || sd("InitiativeTip", "Roll initiative to determine turn order in combat. In Shadowdark, initiative is rolled each combat round on d20 + DEX modifier."),
			footer: sd("KbdHelp", "<kbd>Shift</kbd>: Advantage · <kbd>Alt</kbd>: Normal · <kbd>Ctrl</kbd>: Disadvantage"),
		};
	}

	if (kind === "luck" || itemId === "luck" || item?.type === "Luck") {
		// Pulp mode counts `remaining`; the standard rules use the single `available` token.
		const luck = actor.system?.luck ?? {};
		const isPulp = Boolean(game.settings.get("shadowdark", "usePulpMode"));
		const available = isPulp ? luck.remaining > 0 : Boolean(luck.available);
		const tokensStr = isPulp ? `${luck.remaining ?? 0}` : (available ? "1" : "0");

		return {
			name: sd("Luck", "Luck"),
			img: "icons/svg/clover.svg",
			subtitle: sd("LuckSubtitle", "Heroic Resource · Shadowdark RPG"),
			badges: [
				{ label: available ? sd("Available", "Available") : sd("Spent", "Spent"), class: available ? "prepared" : "unprepared", icon: available ? "fas fa-clover" : "fas fa-ban" },
			],
			specs: [
				{ icon: "fas fa-coins", label: sd("Tokens", "Tokens"), value: tokensStr },
				{ icon: "fas fa-rotate", label: sd("Effect", "Effect"), value: sd("RerollAny", "Reroll any check") },
			],
			description: game.i18n?.localize?.("NAH.Shadowdark.LuckTooltip") || sd("LuckTip", "Spend Luck to reroll any roll you just made. You must take the new result."),
			footer: available ? sd("SpendLuckFooter", "Left-Click to spend Luck token") : sd("LuckIsSpent", "Luck is currently spent"),
		};
	}

	if (!item) return null;

	// 2. DOCUMENT ITEMS
	const name = item.name || "Action";
	const img = item.img || "icons/svg/item-bag.svg";
	const sys = item.system || {};
	let rawDesc = sys.description || "";

	// 2.1 SPELLS
	if (item.type === "Spell") {
		const tier = sys.tier ? sd("Tier", "Tier {tier}", { tier: sys.tier }) : sd("Spell", "Spell");
		const isLost = Boolean(sys.lost);
		const duration = formatDuration(sys.duration);
		const range = formatRange(sys.range, { short: false });

		// In Shadowdark, spellcasting check DC is 10 + spell tier
		const tierNum = Number(sys.tier) || 1;
		const spellcastingDc = 10 + tierNum;
		const castingAbl = castingAbilityOf(actor, item);
		const ablRaw = CONFIG.SHADOWDARK.ABILITIES_LONG[castingAbl];
		const ablLabel = ablRaw ? game.i18n.localize(ablRaw) : castingAbl.toUpperCase();
		const dcText = castingAbl
			? sd("DcValue", "DC {dc} ({ability})", { dc: spellcastingDc, ability: ablLabel })
			: sd("Dc", "DC {dc}", { dc: spellcastingDc });

		const badges = [];
		if (isLost) {
			badges.push({ label: sd("LostBadge", "Lost"), class: "attunement", icon: "fas fa-triangle-exclamation", title: sd("LostBadgeTitle", "Spell failed and lost until long rest") });
		} else {
			badges.push({ label: sd("Ready", "Ready"), class: "prepared", icon: "fas fa-wand-magic-sparkles" });
		}

		if (sys.duration?.type === "focus") {
			badges.push({ label: sd("Focus", "Focus"), class: "concentration", icon: "fas fa-brain", title: sd("FocusTitle", "Requires Focus (broken if damaged or casting another focus spell)") });
		}

		const specs = [
			{ icon: "fas fa-sparkles", label: sd("TierLabel", "Tier"), value: tier },
			{ icon: "fas fa-dice-d20", label: sd("CastingDc", "Casting DC"), value: dcText },
			{ icon: "fas fa-bullseye", label: sd("Range", "Range"), value: range || sd("Self", "Self") },
			{ icon: "fas fa-hourglass-half", label: sd("Duration", "Duration"), value: duration || sd("Instant", "Instant") },
		];

		return {
			name,
			img,
			subtitle: sd("SpellSubtitle", "{tier} Spell · Shadowdark RPG", { tier }),
			badges,
			specs,
			description: rawDesc,
			footer: isLost ? sd("RestoreFooter", "Click 'Restore' or take a Long Rest to regain") : sd("KbdHelp", "<kbd>Shift</kbd>: Advantage · <kbd>Alt</kbd>: Normal · <kbd>Ctrl</kbd>: Disadvantage"),
		};
	}

	// 2.2 WEAPONS & ATTACKS
	if (sys.isWeapon || item.type === "NPC Attack" || item.type === "NPC Special Attack") {
		// NPC attacks carry their own bonus, damage formula (`damage.value`, none for special attacks)
		// and list of ranges; weapons derive bonus and damage from the wielder's abilities.
		const isNpcAttack = !sys.isWeapon;
		const dmg = isNpcAttack ? (sys.damage?.value || "") : formatWeaponDamage(item, actor);
		const range = isNpcAttack
			? sys.ranges.map((r) => formatRange(r, { short: false })).filter(Boolean).join(", ")
			: formatRange(sys.range, { short: false });
		const typeStr = sys.type || (sys.isWeapon ? "Weapon" : item.type);

		// Calculate attack bonus
		let atkBonusStr = "";
		if (isNpcAttack) {
			const bonus = Number(sys.bonuses.attackBonus) || 0;
			atkBonusStr = `${bonus >= 0 ? "+" : ""}${bonus}`;
		} else if (actor.system?.abilities) {
			const strMod = Number(actor.system.abilities.str?.mod ?? 0);
			const dexMod = Number(actor.system.abilities.dex?.mod ?? 0);
			const isRanged = sys.type === "ranged" || sys.range === "far";
			const isFinesse = Boolean(sys.isFinesse);
			const atkMod = isFinesse ? Math.max(strMod, dexMod) : (isRanged ? dexMod : strMod);
			atkBonusStr = `${atkMod >= 0 ? "+" : ""}${atkMod}`;
		}

		const badges = [];

		const specs = [
			{ icon: "fas fa-ruler", label: "Range", value: range || "Close (Melee)" },
			{ icon: "fas fa-hand-fist", label: "Type", value: typeStr ? (typeStr.charAt(0).toUpperCase() + typeStr.slice(1)) : "Melee" },
		];

		if (item.usesAmmunition) {
			const totalAmmo = actor.ammunitionItems(sys.ammoClass).reduce((acc, a) => acc + (a.system.quantity || 0), 0);
			specs.push({ icon: "fas fa-bullseye", label: "Ammunition", value: `${totalAmmo} in inventory` });
		}

		const tactical = [];
		if (atkBonusStr) {
			tactical.push({ icon: "fas fa-crosshairs", label: "Attack", value: atkBonusStr, class: "attack" });
		}
		if (dmg) {
			tactical.push({ icon: "fas fa-burst", label: "Damage", value: dmg, class: "damage" });
		}

		const properties = propertyNamesOf(sys).map((label) => ({ label, title: label }));

		return {
			name,
			img,
			subtitle: sd("WeaponSubtitle", "{type} · Shadowdark RPG", { type: typeStr ? (typeStr.charAt(0).toUpperCase() + typeStr.slice(1)) : sd("Attack", "Attack") }),
			badges,
			specs,
			tactical,
			properties,
			description: rawDesc,
			footer: sd("KbdHelp", "<kbd>Shift</kbd>: Advantage · <kbd>Alt</kbd>: Normal · <kbd>Ctrl</kbd>: Disadvantage"),
		};
	}

	// 2.3 LIGHT SOURCES
	if (sys.light?.isSource) {
		const lightInfo = getLightSourceInfo(item);
		const badges = [
			lightInfo.active
				? { label: "Burning", class: "concentration", icon: "fas fa-fire", title: "Illuminates 30 ft radius" }
				: { label: "Extinguished", class: "unprepared", icon: "fas fa-moon" },
		];

		const specs = [
			{ icon: "fas fa-fire", label: "Status", value: lightInfo.active ? "Burning" : "Extinguished" },
			{ icon: "fas fa-hourglass-half", label: "Time Left", value: `${lightInfo.timeRemaining} (${lightInfo.pips})` },
			{ icon: "fas fa-clock", label: "Total Burn", value: `${sys.light?.longevityMins || 60} minutes` },
		];

		return {
			name,
			img,
			subtitle: sd("LightSubtitle", "Light Source · Shadowdark RPG"),
			badges,
			specs,
			description: rawDesc || (lightInfo.active ? sd("LightOnTip", "Illuminates a 30-foot radius. Real-time dungeon turn tracking is active.") : sd("LightOffTip", "Extinguished light source. Ignite when entering the dark.")),
			footer: sd("LightFooter", "Left-Click to ignite / extinguish"),
		};
	}

	// 2.4 ARMOR & GEAR
	if (item.type === "Armor") {
		// ac is { base, modifier, attribute }: "11 + DEX" for body armor, "+2" for a shield
		const ac = sys.ac;
		const mod = Number(ac.modifier) || 0;
		const attr = ac.attribute ? ` + ${String(ac.attribute).toUpperCase()}` : "";
		const acVal = ac.base ? `${ac.base}${mod ? (mod > 0 ? `+${mod}` : mod) : ""}${attr}` : (mod ? `${mod > 0 ? "+" : ""}${mod}` : "");
		const specs = [];
		if (acVal) specs.push({ icon: "fas fa-shield-halved", label: "Armor Class", value: acVal });
		specs.push(...physicalSpecs(sys));

		const badges = [];
		if (sys.equipped) badges.push({ label: sd("Equipped", "Equipped"), class: "prepared", icon: "fas fa-shield-halved" });
		const properties = propertyNamesOf(sys).map((label) => ({ label, title: label }));

		return {
			name,
			img,
			subtitle: sd("ArmorSubtitle", "Armor · Shadowdark RPG"),
			badges,
			specs,
			properties,
			description: rawDesc,
			footer: sd("ArmorFooter", "Left-Click to Equip / Unequip"),
		};
	}

	// 2.5 CLASS ABILITIES, TALENTS, BOONS, NPC FEATURES
	if (item.type === "Class Ability" || item.type === "Talent" || item.type === "Boon" || item.type === "NPC Feature") {
		const hasUses = sys.limitedUses && sys.uses;
		const avail = hasUses ? Number(sys.uses.available ?? 0) : null;
		const max = hasUses ? Number(sys.uses.max ?? 0) : null;

		const badges = [];
		if (hasUses) {
			badges.push({ label: `${avail} / ${max}`, class: avail > 0 ? "prepared" : "unprepared" });
		}

		const specs = [];
		if (hasUses) {
			specs.push({ icon: "fas fa-battery-half", label: "Uses", value: `${avail} / ${max}` });
		}
		if (sys.dc) {
			specs.push({ icon: "fas fa-dice-d20", label: "Difficulty", value: `DC ${sys.dc}` });
		}

		return {
			name,
			img,
			subtitle: `${item.type} · Shadowdark RPG`,
			badges,
			specs,
			description: rawDesc,
			footer: sd("UseRollFooter", "Left-Click to Use / Roll"),
		};
	}

	// 2.6 SCROLLS & WANDS: name the spell they hold
	const specs = [];
	const badges = [];
	if (item.type === "Scroll" && sys.spellUuid) {
		const spell = safeFromUuidSync(sys.spellUuid);
		if (spell?.name) specs.push({ icon: "fas fa-scroll", label: sd("Spell", "Spell"), value: spell.name });
		if (!rawDesc) rawDesc = spell?.system?.description || "";
	}
	if (item.type === "Wand") {
		for (const entry of sys.spells) {
			const spell = safeFromUuidSync(entry.uuid);
			if (spell?.name) specs.push({ icon: "fas fa-wand-sparkles", label: sd("Spell", "Spell"), value: spell.name, detail: entry.lost ? sd("LostBadge", "Lost") : "" });
		}
	}
	if (item.type === "Potion" && sys.spellName) specs.push({ icon: "fas fa-flask", label: sd("Effect", "Effect"), value: sys.spellName });
	if (sys.broken) badges.push({ label: sd("Broken", "Broken"), class: "unprepared", icon: "fas fa-heart-crack" });
	if (sys.magicItem && item.type !== "Spell") badges.push({ label: sd("Magic", "Magic"), class: "attunement", icon: "fas fa-sparkles" });
	specs.push(...physicalSpecs(sys));

	// 2.7 FALLBACK ITEM
	const typeName = item.type || "Item";
	return {
		name,
		img,
		subtitle: sd("ItemSubtitle", "{type} · Shadowdark RPG", { type: typeName }),
		badges,
		specs,
		description: rawDesc,
		footer: fromRail ? sd("FavFooter", "Drag to reorder · Right-Click to remove") : text("NAH.Tooltips.Card.UseFooter", "Left-Click to Use"),
	};
}
