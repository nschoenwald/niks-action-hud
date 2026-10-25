/**
 * Row builders shared by the Shadowdark drawer sections and by custom-menu entries, so an item looks
 * the same wherever it is listed.
 */

import { sd } from "../lib/text.js";
import { ref } from "../../../core/action-ref.js";
import { createRow, segment } from "../../shared/row-model.js";
import { formatWeaponDamage, formatRange, formatDuration } from "../lib/formatting.js";
import { getLightSourceInfo } from "../lib/light.js";

const signed = (value) => (value >= 0 ? `+${value}` : `${value}`);

const equipCommand = (item, { weapon = false } = {}) => {
	const equipped = Boolean(item.system?.equipped);
	return segment.command(ref.equip(item.id), equipped ? sd("Equipped", "Equipped") : sd("Equip", "Equip"), {
		variant: "equip",
		state: equipped ? "equipped" : "unequipped",
		title: weapon ? (equipped ? sd("UnequipWeapon", "Unequip weapon") : sd("EquipWeapon", "Equip weapon")) : (equipped ? sd("UnequipItem", "Unequip item") : sd("EquipItem", "Equip item")),
	});
};

/** Attack modifier from the actor's abilities (finesse takes the better of STR/DEX, ranged uses DEX). */
function attackBonus(weapon, actor) {
	if (!actor?.system?.abilities) return "";
	const str = Number(actor.system.abilities.str?.mod ?? 0);
	const dex = Number(actor.system.abilities.dex?.mod ?? 0);
	const isRanged = weapon.system.type === "ranged" || weapon.system.range === "far";
	return signed(weapon.system.isFinesse ? Math.max(str, dex) : (isRanged ? dex : str));
}

export function npcAttackRow(attack, actor) {
	// NPCs can also carry ordinary weapons. "NPC Attack" keeps its full damage formula in damage.value;
	// "NPC Special Attack" has no damage.
	const sys = attack.system;
	const ranges = sys.isWeapon ? formatRange(sys.range) : sys.ranges.map((r) => formatRange(r)).filter(Boolean).join(", ");
	const bonusText = sys.isWeapon ? attackBonus(attack, actor) : signed(Number(sys.bonuses.attackBonus) || 0);
	const damage = sys.isWeapon ? formatWeaponDamage(attack, actor) : (sys.damage?.value || "");
	return createRow({
		id: attack.id,
		name: attack.name,
		icon: attack.img || "icons/skills/melee/weapons-crossed-swords-yellow.webp",
		modifier: bonusText,
		segments: damage ? [segment.label(damage)] : [],
		description: ranges || (attack.type === "NPC Special Attack" ? "Special" : "Attack"),
		type: attack.type || "NPC Attack",
	});
}

export function weaponRow(weapon, actor) {
	const equipped = Boolean(weapon.system.equipped);
	const damage = formatWeaponDamage(weapon, actor);
	const bonus = attackBonus(weapon, actor);

	let ammoNotice = "";
	if (weapon.usesAmmunition) {
		const total = actor.ammunitionItems(weapon.system.ammoClass).reduce((sum, ammo) => sum + (ammo.system.quantity || 0), 0);
		ammoNotice = ` [${total}]`;
	}

	return createRow({
		id: weapon.id,
		name: weapon.name,
		icon: weapon.img || "icons/weapons/swords/swords-short.webp",
		// The attack bonus sits on the right like a check modifier; the sub-line keeps damage, ammo and the equip toggle.
		modifier: bonus,
		segments: [...(damage || ammoNotice ? [segment.stat(`${damage}${ammoNotice}`)] : []), equipCommand(weapon, { weapon: true })],
		description: formatRange(weapon.system.range) || (equipped ? "Equipped" : "Unequipped"),
		equipped,
		type: "Weapon",
	});
}

export function spellRow(spell) {
	const isLost = Boolean(spell.system?.lost);
	const duration = formatDuration(spell.system?.duration);
	const range = formatRange(spell.system?.range);

	let description = duration || "";
	if (range) description = description ? `${description} • ${range}` : range;
	if (isLost) description = description ? `[${sd("Lost", "LOST")}] ${description}` : `[${sd("Lost", "LOST")}]`;

	return createRow({
		id: spell.id,
		name: spell.name,
		icon: spell.img || "icons/magic/symbols/runes-star-blue.webp",
		segments: isLost
			? [segment.badge("lost", sd("Lost", "LOST")), segment.command(ref.restoreSpell(spell.id), sd("Restore", "Restore"), { variant: "restore", title: sd("RegainSpell", "Regain lost spell") })]
			: [segment.label(duration || sd("Tier", "Tier {tier}", { tier: spell.system?.tier || 1 }))],
		description: description || sd("Spell", "Spell"),
		isDepleted: isLost,
		lost: isLost,
	});
}

export function classAbilityRow(ability) {
	const hasUses = ability.system?.limitedUses && ability.system?.uses;
	const current = hasUses ? Number(ability.system.uses.available ?? 0) : null;
	const max = hasUses ? Number(ability.system.uses.max ?? 0) : null;
	const cost = hasUses ? `${current}/${max}` : (ability.system?.dc ? sd("Dc", "DC {dc}", { dc: ability.system.dc }) : "");
	return createRow({
		id: ability.id,
		name: ability.name,
		icon: ability.img || "icons/tools/navigation/map-chart-tan.webp",
		segments: cost ? [segment.label(cost)] : [],
		description: ability.system?.group || sd("ClassAbility", "Class Ability"),
		isDepleted: Boolean(hasUses && current <= 0),
	});
}

export function lightRow(item) {
	const info = getLightSourceInfo(item);
	return createRow({
		id: item.id,
		name: item.name,
		icon: item.img || "icons/sundries/lights/torch-purple.webp",
		segments: [
			segment.stat(info.active ? info.pips : sd("Off", "OFF"), info.active ? "torch" : "muted"),
			segment.command(ref.toggleLight(item.id), info.active ? sd("Extinguish", "Extinguish") : sd("Ignite", "Ignite"), {
				variant: "light",
				state: info.active ? "burning" : "extinguished",
				title: info.active ? sd("ExtinguishLight", "Extinguish light") : sd("IgniteLight", "Ignite light source"),
			}),
		],
		description: info.active ? sd("Burning", "Burning ({time})", { time: info.timeRemaining }) : sd("Extinguished", "Extinguished"),
		isDepleted: !info.active,
	});
}

export function potionRow(potion) {
	return createRow({
		id: potion.id,
		name: potion.name,
		icon: potion.img || "icons/consumables/potions/bottle-corked-red.webp",
		segments: [
			segment.stat(`x${Number(potion.system?.quantity || 1)}`),
			segment.command(ref.drinkPotion(potion.id), sd("Drink", "Drink"), { variant: "drink", title: sd("DrinkPotion", "Drink Potion") }),
		],
		description: sd("DrinkPotion", "Drink Potion"),
	});
}

export function equippedRow(item) {
	return createRow({
		id: item.id,
		name: item.name,
		icon: item.img || "icons/containers/bags/pouch-simple-brown.webp",
		segments: [equipCommand(item)],
		description: item.system?.slotsUsed ? `${item.system.slotsUsed} slots` : "Equipped",
		equipped: true,
	});
}

export function carriedRow(item) {
	const quantity = Number(item.system?.quantity || 1);
	const quantityText = quantity > 1 ? `x${quantity}` : "";
	const canEquip = Boolean(item.system.canBeEquipped);
	const segments = canEquip
		? [...(quantityText ? [segment.stat(quantityText, "quiet")] : []), equipCommand(item)]
		: (quantityText ? [segment.label(quantityText)] : []);
	return createRow({
		id: item.id,
		name: item.name,
		icon: item.img || "icons/containers/bags/pouch-simple-brown.webp",
		segments,
		description: sd("Carried", "Carried"),
	});
}
