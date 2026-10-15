import { MODULE_ID } from "../../constants.js";
import {
	formatWeaponDamage,
	formatRange,
	formatDuration,
	getLightSourceInfo,
	buildShadowdarkTooltip,
	getAbilityIcon,
	escapeHtml,
} from "./helpers.js";

/**
 * Returns the default category configuration for Shadowdark RPG.
 * @returns {Array<object>}
 */
export function getDefaultLayout() {
	return [
		{
			systemId: "attack",
			label: game.i18n?.localize?.("NAH.Categories.Attacks") || "Attacks",
			icon: "fas fa-swords",
			type: "submenu",
			useSidebar: false,
		},
		{
			systemId: "spell",
			label: game.i18n?.localize?.("NAH.Categories.Spells") || "Spells",
			icon: "fas fa-wand-magic-sparkles",
			type: "submenu",
			useSidebar: true,
		},
		{
			systemId: "ability",
			label: game.i18n?.localize?.("NAH.Categories.Features") || "Abilities",
			icon: "fas fa-bolt",
			type: "submenu",
			useSidebar: true,
		},
		{
			systemId: "inventory",
			label: game.i18n?.localize?.("NAH.Categories.Items") || "Inventory",
			icon: "fas fa-box-open",
			type: "submenu",
			useSidebar: true,
		},
		{
			systemId: "check",
			label: game.i18n?.localize?.("NAH.Shadowdark.Checks") || "Checks",
			icon: "fas fa-dice-d20",
			type: "submenu",
			useSidebar: false,
		},
	];
}

/**
 * Synchronously retrieves submenu items and tabs for a Shadowdark category.
 * @param {Actor} actor
 * @param {string} systemId
 * @param {object} menuData
 * @returns {object}
 */
export function _getSystemSubMenuDataSync(actor, systemId, menuData) {
	if (!actor) return { title: menuData?.label || "", items: [] };

	switch (systemId) {
		case "attack":
		case "attacks":
			return _getAttackData(actor, menuData);
		case "spell":
		case "spells":
		case "magic":
			return _getSpellData(actor, menuData);
		case "ability":
		case "abilities":
		case "feature":
		case "features":
			return _getAbilityData(actor, menuData);
		case "inventory":
		case "item":
		case "items":
			return _getInventoryData(actor, menuData);
		case "check":
		case "checks":
		case "utility":
			return _getCheckData(actor, menuData);
		default:
			return { title: menuData?.label || "", items: [] };
	}
}

/**
 * Builds Attack submenu data for Players and NPCs.
 * @param {Actor} actor
 * @param {object} menuData
 * @returns {object}
 */
export function _getAttackData(actor, menuData) {
	const items = [];
	const isNPC = actor.type === "NPC";

	if (isNPC) {
		const attacks = actor.items.filter((i) => i.type === "NPC Attack" || i.type === "NPC Special Attack" || i.system?.isWeapon);
		attacks.sort((a, b) => a.name.localeCompare(b.name));

		for (const attack of attacks) {
			const ranges = attack.system?.ranges?.map((r) => formatRange(r)).filter(Boolean).join(", ")
				|| formatRange(attack.system?.range)
				|| "";
			const bonus = Number(attack.system?.bonus ?? attack.system?.bonuses?.attack ?? 0);
			const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;
			const dmg = attack.system?.damage ? (typeof attack.system.damage === "string" ? attack.system.damage : formatWeaponDamage(attack, actor)) : "";
			const costLabel = dmg ? `${bonusStr} (${dmg})` : bonusStr;

			items.push({
				id: attack.id,
				name: attack.name,
				img: attack.img || "icons/skills/melee/weapons-crossed-swords-yellow.webp",
				cost: costLabel,
				description: ranges || (attack.type === "NPC Special Attack" ? "Special" : "Attack"),
				type: attack.type || "NPC Attack",
				isSpecial: attack.type === "NPC Special Attack",
			});
		}
	} else {
		// Player Character weapons
		const weapons = actor.items.filter((i) => i.system?.isWeapon);
		weapons.sort((a, b) => {
			const eqA = a.system.equipped ? 1 : 0;
			const eqB = b.system.equipped ? 1 : 0;
			if (eqB !== eqA) return eqB - eqA;
			return a.name.localeCompare(b.name);
		});

		for (const weapon of weapons) {
			const equipped = Boolean(weapon.system.equipped);
			const dmg = formatWeaponDamage(weapon, actor);
			const range = formatRange(weapon.system.range);

			let atkBonusStr = "";
			if (actor?.system?.abilities) {
				const strMod = Number(actor.system.abilities.str?.mod ?? 0);
				const dexMod = Number(actor.system.abilities.dex?.mod ?? 0);
				const isRanged = weapon.system.type === "ranged" || weapon.system.range === "far";
				const isFinesse = Boolean(weapon.system.isFinesse || (typeof weapon.system.hasProperty === "function" && weapon.system.hasProperty("finesse")));
				const atkMod = isFinesse ? Math.max(strMod, dexMod) : (isRanged ? dexMod : strMod);
				atkBonusStr = atkMod >= 0 ? `+${atkMod}` : `${atkMod}`;
			}

			let ammoNotice = "";
			if (weapon.usesAmmunition) {
				const ammoItems = actor.ammunitionItems ? actor.ammunitionItems(weapon.system.ammoClass) : [];
				const totalAmmo = ammoItems.reduce((acc, a) => acc + (a.system.quantity || 0), 0);
				ammoNotice = totalAmmo > 0 ? ` [${totalAmmo}]` : ` [0]`;
			}

			const equipBtn = `<button type="button" class="nah-sd-equip-btn ${equipped ? "equipped" : "unequipped"}" onclick="event.stopPropagation(); ActionHUD.actionMenu.useItem('equip:${weapon.id}', event)" title="${equipped ? "Unequip weapon" : "Equip weapon"}">${equipped ? "Equipped" : "Equip"}</button>`;

			const attackLabel = atkBonusStr && dmg ? `${atkBonusStr} (${dmg})` : (dmg || atkBonusStr || "");

			items.push({
				id: weapon.id,
				name: weapon.name,
				img: weapon.img || "icons/weapons/swords/swords-short.webp",
				hasInlineControls: true,
				cost: `
					<div style="display:flex; align-items:center; gap:6px;">
						<span style="font-weight:700; color:var(--sd-torch-bright, #fbbf24); font-size:0.88em;">${attackLabel}${ammoNotice}</span>
						${equipBtn}
					</div>
				`,
				description: range || (equipped ? "Equipped" : "Unequipped"),
				equipped,
				type: "Weapon",
			});
		}
	}

	return {
		title: menuData?.label || game.i18n?.localize?.("NAH.Categories.Attacks") || "Attacks",
		hasTabs: false,
		hasSubTabs: false,
		items,
	};
}

/**
 * Builds Spell submenu data (Tiers 1-5, Scrolls, Wands, NPC Spells).
 * @param {Actor} actor
 * @param {object} menuData
 * @returns {object}
 */
export function _getSpellData(actor, menuData) {
	const items = {};
	const tabLabels = {};
	const subTabLabels = {};

	const spells = actor.items.filter((i) => i.type === "Spell" || i.type === "NPC Spell" || i.system?.isSpell);
	spells.sort((a, b) => a.name.localeCompare(b.name));

	// Group spells by Tier
	const tierGroups = {};
	for (const spell of spells) {
		const tier = spell.system?.tier || 1;
		const tierKey = `tier-${tier}`;
		tierGroups[tierKey] ||= [];
		tierGroups[tierKey].push(spell);
	}

	// Always add "All" tab if spells exist
	if (spells.length > 0) {
		const allKey = "all";
		items[allKey] = { all: [] };
		tabLabels[allKey] = "All Spells";
		subTabLabels[allKey] = { all: "All" };

		for (const spell of spells) {
			items[allKey].all.push(_formatSpellItem(spell, actor));
		}
	}

	// Add Tiers
	const sortedTiers = Object.keys(tierGroups).sort((a, b) => {
		const numA = parseInt(a.replace("tier-", ""), 10) || 0;
		const numB = parseInt(b.replace("tier-", ""), 10) || 0;
		return numA - numB;
	});

	for (const tKey of sortedTiers) {
		const tierNum = tKey.replace("tier-", "");
		const sKey = `tier_${tierNum}`;
		items[sKey] = { all: [] };
		tabLabels[sKey] = `Tier ${tierNum}`;
		subTabLabels[sKey] = { all: `Tier ${tierNum}` };

		for (const spell of tierGroups[tKey]) {
			items[sKey].all.push(_formatSpellItem(spell, actor));
		}
	}

	// Wands & Scrolls from physical items
	const wands = actor.items.filter((i) => i.system?.isWand && (i.system?.isIdentified || game.user.isGM));
	const scrolls = actor.items.filter((i) => i.system?.isScroll && (i.system?.isIdentified || game.user.isGM));

	if (wands.length > 0) {
		const wandKey = "wands";
		items[wandKey] = { all: [] };
		tabLabels[wandKey] = "Wands";
		subTabLabels[wandKey] = { all: "Wands" };

		for (const wand of wands) {
			const containedSpells = wand.system.spells || [];
			if (containedSpells.length === 0) {
				items[wandKey].all.push({
					id: wand.id,
					name: wand.name,
					img: wand.img || "icons/weapons/wands/wand-gem-violet.webp",
					cost: wand.system.broken ? "Broken" : "Wand",
					description: wand.system.broken ? "Broken" : "Empty",
					isExhausted: Boolean(wand.system.broken),
				});
			} else {
				for (const spEntry of containedSpells) {
					const isLost = Boolean(spEntry.lost || wand.system.broken);
					const spellDoc = typeof fromUuidSync === "function" ? fromUuidSync(spEntry.uuid) : null;
					const spellName = spellDoc?.name || (spEntry.uuid ? spEntry.uuid.split(".").pop().replace(/-/g, " ") : "Spell");
					items[wandKey].all.push({
						id: `wand:${wand.id}:${spEntry.uuid}`,
						name: `${wand.name}: ${spellName}`,
						img: wand.img || "icons/weapons/wands/wand-gem-violet.webp",
						cost: isLost ? "LOST" : "Cast",
						description: isLost ? "Spell Lost / Broken" : (spellDoc ? `Tier ${spellDoc.system?.tier || 1} • Wand Spell` : "Wand Spell"),
						isExhausted: isLost,
						lost: isLost,
					});
				}
			}
		}
	}

	if (scrolls.length > 0) {
		const scrollKey = "scrolls";
		items[scrollKey] = { all: [] };
		tabLabels[scrollKey] = "Scrolls";
		subTabLabels[scrollKey] = { all: "Scrolls" };

		for (const scroll of scrolls) {
			const spellDoc = typeof fromUuidSync === "function" && scroll.system?.spellUuid ? fromUuidSync(scroll.system.spellUuid) : null;
			const scrollLabel = spellDoc?.name ? `${scroll.name}: ${spellDoc.name}` : scroll.name;
			const scrollDesc = spellDoc ? `Tier ${spellDoc.system?.tier || 1} • Single Use Scroll` : "Single Use Spell Scroll";
			items[scrollKey].all.push({
				id: scroll.id,
				name: scrollLabel,
				img: scroll.img || "icons/sundries/scrolls/scroll-runed-brown-purple.webp",
				cost: "Scroll",
				description: scrollDesc,
			});
		}
	}

	const hasCategories = Object.keys(items).length > 0;

	return {
		title: menuData?.label || game.i18n?.localize?.("NAH.Categories.Spells") || "Spells",
		hasTabs: hasCategories,
		hasSubTabs: true,
		items,
		tabLabels,
		subTabLabels,
	};
}

function _formatSpellItem(spell, _actor) {
	const isLost = Boolean(spell.system?.lost);
	const duration = formatDuration(spell.system?.duration);
	const range = formatRange(spell.system?.range);

	let desc = duration || "";
	if (range) desc = desc ? `${desc} • ${range}` : range;
	if (isLost) desc = desc ? `[LOST] ${desc}` : "[LOST]";

	const restoreBtn = isLost
		? `<button type="button" class="nah-sd-restore-btn" onclick="event.stopPropagation(); ActionHUD.actionMenu.useItem('restoreSpell:${spell.id}', event)" title="Regain lost spell">Restore</button>`
		: "";

	return {
		id: spell.id,
		name: spell.name,
		img: spell.img || "icons/magic/symbols/runes-star-blue.webp",
		hasInlineControls: isLost,
		cost: isLost
			? `<div style="display:flex; align-items:center; gap:6px;"><span class="nah-sd-lost-badge">LOST</span>${restoreBtn}</div>`
			: (duration || `Tier ${spell.system?.tier || 1}`),
		description: desc || "Spell",
		isExhausted: isLost,
		lost: isLost,
	};
}

/**
 * Builds Abilities and Features submenu data.
 * @param {Actor} actor
 * @param {object} menuData
 * @returns {object}
 */
export function _getAbilityData(actor, menuData) {
	const items = {};
	const tabLabels = {};
	const subTabLabels = {};

	const isNPC = actor.type === "NPC";

	if (isNPC) {
		const features = actor.items.filter((i) => i.type === "NPC Feature");
		features.sort((a, b) => a.name.localeCompare(b.name));

		const allKey = "features";
		items[allKey] = { all: [] };
		tabLabels[allKey] = "Features";
		subTabLabels[allKey] = { all: "Features" };

		for (const feat of features) {
			const cleanDesc = (feat.system?.description || "").replace(/<[^>]*>?/gm, "").trim();
			items[allKey].all.push({
				id: feat.id,
				name: feat.name,
				img: feat.img || "icons/creatures/abilities/dragon-breath-purple.webp",
				cost: "Trait",
				description: cleanDesc ? cleanDesc.slice(0, 80) : "NPC Feature",
			});
		}
	} else {
		// Player Character: Class Abilities, Talents, Boons
		const classAbilities = actor.items.filter((i) => i.type === "Class Ability");
		const talents = actor.items.filter((i) => i.type === "Talent");
		const boons = actor.items.filter((i) => i.type === "Boon");

		if (classAbilities.length > 0) {
			const caKey = "class_abilities";
			items[caKey] = { all: [] };
			tabLabels[caKey] = "Class Abilities";
			subTabLabels[caKey] = { all: "Class Abilities" };

			for (const ability of classAbilities) {
				const hasUses = ability.system?.limitedUses && ability.system?.uses;
				const current = hasUses ? Number(ability.system.uses.available ?? 0) : null;
				const max = hasUses ? Number(ability.system.uses.max ?? 0) : null;
				const cost = hasUses ? `${current}/${max}` : (ability.system?.dc ? `DC ${ability.system.dc}` : "");
				const isExhausted = hasUses && current <= 0;

				items[caKey].all.push({
					id: ability.id,
					name: ability.name,
					img: ability.img || "icons/tools/navigation/map-chart-tan.webp",
					cost,
					description: ability.system?.group || "Class Ability",
					isExhausted,
				});
			}
		}

		if (talents.length > 0) {
			const talKey = "talents";
			items[talKey] = { all: [] };
			tabLabels[talKey] = "Talents";
			subTabLabels[talKey] = { all: "Talents" };

			for (const talent of talents) {
				const group = talent.system?.talentClass
					? game.i18n?.localize?.(`SHADOWDARK.talent.class.${talent.system.talentClass}`) || talent.system.talentClass
					: "Talent";
				items[talKey].all.push({
					id: talent.id,
					name: talent.name,
					img: talent.img || "icons/sundries/books/book-worn-brown-grey.webp",
					cost: group,
					description: talent.name,
				});
			}
		}

		if (boons.length > 0) {
			const boonKey = "boons";
			items[boonKey] = { all: [] };
			tabLabels[boonKey] = "Boons";
			subTabLabels[boonKey] = { all: "Boons" };

			for (const boon of boons) {
				const bType = boon.system?.boonType
					? game.i18n?.localize?.(CONFIG.SHADOWDARK?.BOON_TYPES?.[boon.system.boonType]) || boon.system.boonType
					: "Boon";
				items[boonKey].all.push({
					id: boon.id,
					name: boon.name,
					img: boon.img || "icons/skills/social/diplomacy-writing-letter.webp",
					cost: bType,
					description: boon.name,
				});
			}
		}
	}

	const hasCategories = Object.keys(items).length > 0;

	return {
		title: menuData?.label || game.i18n?.localize?.("NAH.Categories.Features") || "Abilities",
		hasTabs: hasCategories,
		hasSubTabs: true,
		items,
		tabLabels,
		subTabLabels,
	};
}

/**
 * Builds Inventory submenu data (Equipped, Carried, Potions, Light Sources, Treasure).
 * @param {Actor} actor
 * @param {object} menuData
 * @returns {object}
 */
export function _getInventoryData(actor, menuData) {
	const items = {};
	const tabLabels = {};
	const subTabLabels = {};

	const physicalItems = actor.system?.getPhysicalItems ? actor.system.getPhysicalItems() : actor.items.filter((i) => i.system?.isPhysical);

	// Light sources
	const lightSources = physicalItems.filter((i) => i.system?.light?.isSource);
	if (lightSources.length > 0) {
		const lKey = "light";
		items[lKey] = { all: [] };
		tabLabels[lKey] = "Light Sources";
		subTabLabels[lKey] = { all: "Light Sources" };

		for (const lightItem of lightSources) {
			const info = getLightSourceInfo(lightItem);
			const toggleBtn = `<button type="button" class="nah-sd-light-btn ${info.active ? "burning" : "extinguished"}" onclick="event.stopPropagation(); ActionHUD.actionMenu.useItem('toggleLight:${lightItem.id}', event)" title="${info.active ? "Extinguish light" : "Ignite light source"}">${info.active ? "Extinguish" : "Ignite"}</button>`;

			items[lKey].all.push({
				id: lightItem.id,
				name: lightItem.name,
				img: lightItem.img || "icons/sundries/lights/torch-purple.webp",
				hasInlineControls: true,
				cost: `
					<div style="display:flex; align-items:center; gap:6px;">
						<span style="font-size:0.85em; color:${info.active ? "var(--sd-torch-bright, #fbbf24)" : "var(--sd-bone-muted, #888)"}; font-weight:700;">${info.active ? info.pips : "OFF"}</span>
						${toggleBtn}
					</div>
				`,
				description: info.active ? `Burning (${info.timeRemaining})` : "Extinguished",
				isExhausted: !info.active,
			});
		}
	}

	// Potions
	const potions = actor.items.filter((i) => i.type === "Potion");
	if (potions.length > 0) {
		const pKey = "potions";
		items[pKey] = { all: [] };
		tabLabels[pKey] = "Potions";
		subTabLabels[pKey] = { all: "Potions" };

		for (const pot of potions) {
			const qty = Number(pot.system?.quantity || 1);
			const drinkBtn = `<button type="button" class="nah-sd-drink-btn" onclick="event.stopPropagation(); ActionHUD.actionMenu.useItem('drinkPotion:${pot.id}', event)" title="Drink Potion">Drink</button>`;

			items[pKey].all.push({
				id: pot.id,
				name: pot.name,
				img: pot.img || "icons/consumables/potions/bottle-corked-red.webp",
				hasInlineControls: true,
				cost: `
					<div style="display:flex; align-items:center; gap:6px;">
						<span style="font-size:0.85em; font-weight:700; color:var(--sd-torch-bright, #fbbf24);">x${qty}</span>
						${drinkBtn}
					</div>
				`,
				description: "Drink Potion",
			});
		}
	}

	// Equipped items
	const equippedItems = physicalItems.filter((i) => i.system?.equipped);
	if (equippedItems.length > 0) {
		const eqKey = "equipped";
		items[eqKey] = { all: [] };
		tabLabels[eqKey] = "Equipped";
		subTabLabels[eqKey] = { all: "Equipped" };

		for (const eq of equippedItems) {
			const slots = eq.system?.slotsUsed ? `${eq.system.slotsUsed} slots` : "Equipped";
			const equipBtn = `<button type="button" class="nah-sd-equip-btn equipped" onclick="event.stopPropagation(); ActionHUD.actionMenu.useItem('equip:${eq.id}', event)" title="Unequip item">Equipped</button>`;

			items[eqKey].all.push({
				id: eq.id,
				name: eq.name,
				img: eq.img || "icons/containers/bags/pouch-simple-brown.webp",
				hasInlineControls: true,
				cost: equipBtn,
				description: slots,
				equipped: true,
			});
		}
	}

	// Carried items
	const carriedItems = physicalItems.filter((i) => !i.system?.equipped && !i.system?.treasure && !i.system?.isGem);
	if (carriedItems.length > 0) {
		const carKey = "carried";
		items[carKey] = { all: [] };
		tabLabels[carKey] = "Carried";
		subTabLabels[carKey] = { all: "Carried" };

		for (const car of carriedItems) {
			const qty = Number(car.system?.quantity || 1);
			const qtyStr = qty > 1 ? `x${qty}` : "";
			const canEquip = typeof car.system?.equipped === "boolean";
			const equipBtn = canEquip
				? `<button type="button" class="nah-sd-equip-btn unequipped" onclick="event.stopPropagation(); ActionHUD.actionMenu.useItem('equip:${car.id}', event)" title="Equip item">Equip</button>`
				: "";

			items[carKey].all.push({
				id: car.id,
				name: car.name,
				img: car.img || "icons/containers/bags/pouch-simple-brown.webp",
				hasInlineControls: Boolean(equipBtn),
				cost: equipBtn ? `
					<div style="display:flex; align-items:center; gap:6px;">
						${qtyStr ? `<span style="font-size:0.85em; color:var(--sd-bone-muted);">${qtyStr}</span>` : ""}
						${equipBtn}
					</div>
				` : qtyStr,
				description: "Carried",
			});
		}
	}

	// Treasure & Gems
	const treasures = physicalItems.filter((i) => i.system?.treasure || i.system?.isGem);
	if (treasures.length > 0 || actor.system?.coins) {
		const trKey = "treasure";
		items[trKey] = { all: [] };
		tabLabels[trKey] = "Treasure";
		subTabLabels[trKey] = { all: "Treasure & Coins" };

		if (actor.system?.coins) {
			const c = actor.system.coins;
			items[trKey].all.push({
				id: "coins-summary",
				name: `Coins (${c.gp || 0} GP, ${c.sp || 0} SP, ${c.cp || 0} CP)`,
				img: "icons/commodities/currency/coins-assorted-mix-copper-silver-gold.webp",
				cost: `${(c.gp || 0) + (c.sp || 0) * 0.1} GP`,
				description: "Purse Currency",
				isVirtual: true,
			});
		}

		for (const tr of treasures) {
			const val = tr.system?.cost ? `${tr.system.cost.gp || 0} GP` : (tr.system?.isGem ? "Gem" : "Treasure");
			items[trKey].all.push({
				id: tr.id,
				name: tr.name,
				img: tr.img || "icons/commodities/gems/gem-faceted-navette-red.webp",
				cost: val,
				description: tr.system?.isGem ? "Gemstone" : "Valuable",
			});
		}
	}

	const hasCategories = Object.keys(items).length > 0;

	return {
		title: menuData?.label || game.i18n?.localize?.("NAH.Categories.Items") || "Inventory",
		hasTabs: hasCategories,
		hasSubTabs: true,
		items,
		tabLabels,
		subTabLabels,
	};
}

/**
 * Builds Checks and Utility submenu data (Ability Checks, Initiative, Luck).
 * @param {Actor} actor
 * @param {object} menuData
 * @returns {object}
 */
export function _getCheckData(actor, menuData) {
	const items = [];

	// Ability Checks
	const abilities = CONFIG.SHADOWDARK?.ABILITY_KEYS || ["str", "dex", "con", "int", "wis", "cha"];
	for (const key of abilities) {
		const abl = actor.system?.abilities?.[key];
		const mod = Number(abl?.mod ?? 0);
		const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
		const val = abl?.value !== undefined ? abl.value : 10;
		const longLabel = game.i18n?.localize?.(CONFIG.SHADOWDARK?.ABILITIES_LONG?.[key]) || key.toUpperCase();

		items.push({
			id: `check-${key}`,
			name: `${longLabel} Check`,
			img: getAbilityIcon(key),
			cost: modStr,
			rollModifierStr: modStr,
			isAbilityRoll: true,
			oneLineLayout: true,
			favoritable: false,
			description: `Score ${val} (${modStr})`,
			type: "Ability Check",
			key,
		});
	}

	// Initiative
	const dexMod = Number(actor.system?.abilities?.dex?.mod ?? 0);
	const dexBonusStr = dexMod >= 0 ? `+${dexMod}` : `${dexMod}`;
	items.push({
		id: "check-initiative",
		name: "Initiative",
		img: "icons/svg/clockwork.svg",
		cost: dexBonusStr,
		rollModifierStr: dexBonusStr,
		isAbilityRoll: true,
		oneLineLayout: true,
		favoritable: false,
		description: "Roll Turn Order",
		type: "Initiative",
	});

	// Luck (PCs only)
	if (actor.type === "Player") {
		const luck = actor.system?.luck;
		const available = Boolean(luck?.available);
		const remaining = luck?.remaining;
		const luckCost = available ? "Ready" : "Spent";
		const desc = remaining !== undefined ? `Pulp Luck: ${remaining} left` : (available ? "Luck Token Available" : "Luck Spent");

		items.push({
			id: "action-luck",
			name: "Luck",
			img: available ? "icons/magic/control/buff-luck-fortune-green.webp" : "icons/magic/symbols/clover-luck-white-green.webp",
			cost: luckCost,
			rollModifierStr: luckCost,
			isAbilityRoll: true,
			oneLineLayout: true,
			favoritable: false,
			description: desc,
			type: "Luck",
			isExhausted: !available,
		});
	}

	// Roll HP (NPCs or level-up)
	if (actor.type === "NPC" && typeof actor.system?.rollHP === "function") {
		items.push({
			id: "action-roll-hp",
			name: "Roll Hit Points",
			img: "icons/svg/heal.svg",
			cost: "HP",
			rollModifierStr: "HP",
			isAbilityRoll: true,
			oneLineLayout: true,
			favoritable: false,
			description: "Roll NPC Max & Current HP",
			type: "HP",
		});
	}

	return {
		title: menuData?.label || game.i18n?.localize?.("NAH.Shadowdark.Checks") || "Checks",
		hasTabs: false,
		hasSubTabs: false,
		items,
	};
}
