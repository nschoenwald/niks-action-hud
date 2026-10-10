import { MODULE_ID } from "../../constants.js";
import {
	_hasItemUses,
	_activityHasUses,
	_getSingleActivityUses,
	_resolveFeatureUses,
	_getItemActivityData,
	_getActivationIcon,
	_formatRange,
	_buildDnd5eAmmoHtml,
	_isLegendaryResistanceItem,
	_isLegendaryActionItem,
	_isLegendaryItem,
	_actorHasLegendary,
	_getItemDamage,
	_getWeaponDamage,
	_getPrimaryAttackActivity,
	_getPrimaryDamageActivity,
	escapeHtml,
} from "./helpers.js";



export function getDefaultLayout() {
	return [
		{
			systemId: "attack",
			label: game.i18n?.localize?.("NAH.Categories.Attacks") || game.i18n?.localize?.("NAH.Categories.Attack") || "Attacks",
			icon: "fas fa-swords",
			type: "submenu",
			useSidebar: false,
		},
		{
			systemId: "magic",
			label: game.i18n?.localize?.("NAH.Categories.Spells") || game.i18n?.localize?.("NAH.Categories.Magic") || "Spells",
			icon: "fas fa-wand-magic-sparkles",
			type: "submenu",
			useSidebar: true,
		},
		{
			systemId: "feature",
			label: game.i18n?.localize?.("NAH.Categories.Features") || game.i18n?.localize?.("NAH.Categories.Feature") || "Features",
			icon: "fas fa-bolt",
			type: "submenu",
			useSidebar: true,
		},
		{
			systemId: "legendary",
			label: game.i18n?.localize?.("NAH.Categories.Legendary") || "Legendary",
			icon: "fas fa-crown",
			type: "submenu",
			useSidebar: false,
		},
		{
			systemId: "utility",
			label: game.i18n?.localize?.("NAH.Categories.Abilities") || game.i18n?.localize?.("NAH.Categories.Utility") || "Abilities",
			icon: "fas fa-dice-d20",
			type: "submenu",
			useSidebar: true,
		},
		{
			systemId: "item",
			label: game.i18n?.localize?.("NAH.Categories.Items") || game.i18n?.localize?.("NAH.Categories.Inventory") || "Items",
			icon: "fas fa-box-open",
			type: "submenu",
			useSidebar: true,
		},
	];
}

function createOrderedItemsObject(itemsObj, firstKey = "all") {
	const rawKeys = Object.keys(itemsObj);
	const keysInOrder = [firstKey, ...rawKeys.filter((k) => k !== firstKey)];

	return new Proxy(itemsObj, {
		ownKeys() {
			return keysInOrder;
		},
		getOwnPropertyDescriptor(target, prop) {
			if (prop in target) {
				return {
					enumerable: true,
					configurable: true,
					value: target[prop],
				};
			}
			return undefined;
		},
	});
}

// [V14 Compatible Only]: Check initiative status using V14 Combat#getCombatantsByToken
function shouldShowInitiative(actor) {
	const combat = game.combat;
	if (!combat || combat.isActive === false) return false;

	let combatant = null;

	// 1. If synthetic actor with token document
	// [V14 Compatible Only]: In Foundry V14, Combat#getCombatantsByToken returns an Array of matching combatants.
	// The legacy Combat#getCombatantByToken method has been deprecated since V14.
	if (actor.isToken && actor.token) {
		combatant = combat.getCombatantsByToken(actor.token)?.[0] ?? null;
	}

	// 2. If token is controlled on canvas or active on scene
	if (!combatant) {
		const token =
			canvas.tokens?.controlled?.find(
				(t) => t.actor?.id === actor.id || (actor.isToken && t.id === actor.token?.id),
			) ||
			actor.getActiveTokens?.()[0] ||
			null;
		const tokenDoc = token?.document || null;
		if (tokenDoc) {
			// [V14 Compatible Only]: Combat#getCombatantsByToken replaces deprecated Combat#getCombatantByToken
			combatant = combat.getCombatantsByToken(tokenDoc)?.[0] ?? null;
		}
	}

	// 3. Fallback to actor ID match in combat
	if (!combatant) {
		combatant = combat.combatants.find((c) => c.actorId === actor.id) ?? null;
	}

	// If combatant exists and has a numeric initiative value, do not show button
	const hasInitiativeValue = Number.isFinite(combatant?.initiative);

	return !hasInitiativeValue;
}

export function getDnd5eTooltip(type, key, label, abilityLabel) {
	if (type === "initiative") {
		return (
			game.i18n.localize("NAH.Tooltips.Initiative") || "Determine turn order in combat."
		);
	}

	if (type === "save") {
		const desc = game.i18n.localize(`NAH.Tooltips.SaveDescriptions.${key}`) || "";
		if (desc && !desc.startsWith("NAH")) {
			return desc;
		}
		return `Roll ${label} Saving Throw`;
	}

	if (type === "check") {
		const desc = game.i18n.localize(`NAH.Tooltips.CheckDescriptions.${key}`) || "";
		if (desc && !desc.startsWith("NAH")) {
			return desc;
		}
		return `Roll ${label} Check`;
	}

	if (type === "skill") {
		const desc = game.i18n.localize(`NAH.Tooltips.SkillDescriptions.${key}`) || "";
		if (desc && !desc.startsWith("NAH")) {
			return desc;
		}
		return `Roll ${label} (${abilityLabel}) Check`;
	}

	return "";
}

export function _getSystemSubMenuDataSync(actor, systemId, menuData) {
	let res = null;
	switch (systemId) {
		case "attack":
		case "attacks":
			res = { ..._getWeaponData(actor), title: menuData.label };
			break;
		case "magic":
		case "spells":
		case "spell":
			res = { ..._getSpellData(actor), title: menuData.label };
			break;
		case "feature":
		case "features":
			res = { ..._getFeatureData(actor), title: menuData.label };
			break;
		case "legendary":
			res = { ..._getLegendaryData(actor), title: menuData.label };
			break;
		case "utility":
		case "abilities":
		case "ability":
			res = { ..._getUtilityData(actor), title: menuData.label };
			break;
		case "item":
		case "items":
		case "inventory":
			res = { ..._getInventoryData(actor), title: menuData.label };
			break;
		default:
			res = { title: menuData.label, items: [] };
			break;
	}
	return res;
}

export async function _getSystemSubMenuData(actor, systemId, menuData) {
	const res = _getSystemSubMenuDataSync(actor, systemId, menuData);
	Hooks.callAll(`${MODULE_ID}.modifyActionMenuData`, res, actor, systemId);
	return res;
}

/* -----------------------------------------
   1. ATTACK (Weapons)
   ----------------------------------------- */
export function _getWeaponData(actor) {
	if (!actor?.items) return { title: "WEAPONS", theme: "red", hasTabs: false, items: [] };
	const items = actor.items
		.filter((i) => i.type === "weapon" && i.system.equipped)
		.map((i) => {
			const { damageFormula, damageType, damageText, damageHtml } = _getWeaponDamage(i, actor);
			const attackActivity = _getPrimaryAttackActivity(i);
			const toHit = attackActivity?.labels?.toHit || i.labels?.toHit || "";

			const { activationIcon, activationType } = _getItemActivityData(i);
			const resolved = _resolveFeatureUses(i, actor);

			let isExhausted = resolved.isExhausted;
			let usesBracket = "";
			if (resolved.usesBracket) {
				usesBracket = resolved.usesBracket;
			} else if (activationType === "legendary" && actor.system?.resources?.legact?.max > 0) {
				const leg = actor.system.resources.legact;
				const rem = leg.value ?? (leg.max - (leg.spent ?? 0));
				usesBracket = `<span style="color:#aaa;">[${rem}/${leg.max}]</span>`;
				if (rem === 0) isExhausted = true;
			}

			const rangeText = _formatRange(i);
			const showRange = rangeText && !rangeText.startsWith("5 ");

			let displayHtml = "";
			const text = damageText || damageFormula;
			if (text) {
				displayHtml = `<span class="nah-info-sub" title="${escapeHtml(text)}" style="font-size:0.78em; letter-spacing:0.5px; display:inline-flex; align-items:center; line-height:1.1; white-space:nowrap; min-width:0; overflow:hidden; text-overflow:ellipsis; max-width:100%;">${damageHtml || text}${showRange ? ` · ${rangeText}` : ""}</span>`;
			} else if (toHit) {
				displayHtml = `<span style="color:#aaa; font-size:0.9em; display:inline-flex; align-items:center; white-space:nowrap;">Hit: ${toHit}${showRange ? ` · ${rangeText}` : ""}</span>`;
			} else {
				displayHtml = `<span style="color:#666; font-size:0.75em; display:inline-flex; align-items:center; white-space:nowrap;">${i.labels?.properties || ""}${showRange ? ` · ${rangeText}` : ""}</span>`;
			}

			const ammoHtml = _buildDnd5eAmmoHtml(i);

			return {
				id: i.id,
				name: i.name,
				uses: usesBracket,
				img: i.img,
				description: i.system.description?.value || "",
				isExhausted: isExhausted,
				cost: `
                        <div class="nah-cost-wrapper" style="display:inline-flex; align-items:center; gap:5px; white-space:nowrap;">
                            ${activationIcon}
                            ${displayHtml}
                        </div>
                        ${ammoHtml}
                    `,
			};
		});

	return { title: "WEAPONS", theme: "red", hasTabs: false, items: items };
}

/* -----------------------------------------
   2. MAGIC (Spells - DnD5e v6)
   ----------------------------------------- */
export function isWizardActor(actor) {
	if (!actor) return false;

	// 1. Direct class mapping via Actor5e.classes getter (keyed by class identifier: "wizard")
	if (actor.classes?.wizard) return true;

	// 2. Class items in actor itemTypes
	if (actor.itemTypes?.class?.some((cls) => {
		const id = cls.identifier || cls.system?.identifier || "";
		const name = cls.name?.toLowerCase() || "";
		return id.toLowerCase() === "wizard" || name === "wizard";
	})) {
		return true;
	}

	// 3. 2024 Ritual Adept feature (feat identifier: "ritual-adept") or Spellcasting feature
	if (actor.itemTypes?.feat?.some((feat) => {
		const id = feat.identifier || feat.system?.identifier || "";
		const name = feat.name?.toLowerCase() || "";
		return id === "ritual-adept" || name === "ritual adept";
	})) {
		return true;
	}

	// 4. Details class string fallback (e.g. for simple NPCs or legacy imports)
	const detailsClass = actor.system?.details?.class;
	if (typeof detailsClass === "string" && detailsClass.toLowerCase().includes("wizard")) {
		return true;
	}

	return false;
}

export function isSpellEligibleAsWizardRitual(spell, actor) {
	if (!spell || spell.type !== "spell") return false;

	// Must have the ritual property (DnD5e v6 system.properties Set)
	const props = spell.system?.properties;
	const isRitual = (props instanceof Set && props.has("ritual"))
		|| (Array.isArray(props) && props.includes("ritual"))
		|| (props && typeof props === "object" && props.ritual === true);
	if (!isRitual) return false;

	// Check if associated with the wizard class
	const classId = (spell.system?.classIdentifier || spell.system?.sourceClass || "").toLowerCase();
	if (classId) {
		return classId === "wizard";
	}

	// Check if sourceItem contains wizard (e.g. "class:wizard" or matching class item)
	const sourceItem = spell.system?.sourceItem;
	if (typeof sourceItem === "string" && sourceItem.toLowerCase().includes("wizard")) {
		return true;
	}

	// Check spellLists if available (DnD5e 6.x)
	const spellLists = spell.system?.spellLists;
	if (spellLists instanceof Set) {
		if (spellLists.has("class:wizard") || spellLists.has("wizard")) return true;
	}

	// If no explicit class assignment exists on the spell:
	// If the actor only has one spellcasting class (or single class wizard), it's part of their spellbook.
	const spellcastingClasses = actor?.spellcastingClasses || {};
	const castingKeys = Object.keys(spellcastingClasses);
	if (castingKeys.length <= 1) {
		return true;
	}

	// If multiclassed and the spell list does not contain wizard, exclude it
	if (spellLists instanceof Set && spellLists.size > 0) {
		return false;
	}

	return true;
}

export function _getSpellData(actor) {
	if (!actor?.items) {
		return { title: "SPELLBOOK", theme: "blue", hasTabs: true, hasSubTabs: true, items: {}, tabLabels: {}, tabTooltips: {}, subTabLabels: {} };
	}
	const items = {};
	const primaryLabels = {};
	const primaryTooltips = {};
	const subLabels = {};

	let spellDC = actor.system.attributes?.spell?.dc ?? null;
	let spellAttack = actor.system.attributes?.spell?.attack ?? null;

	if ((spellDC == null || spellAttack == null) && actor.system.attributes?.spellcasting) {
		const abl = actor.system.abilities?.[actor.system.attributes.spellcasting];
		if (abl) {
			const prof = actor.system.attributes?.prof ?? 0;
			if (spellAttack == null) {
				spellAttack = abl.mod + prof + (actor.system.bonuses?.rsak?.attack ? Number(actor.system.bonuses.rsak.attack) || 0 : 0);
			}
			if (spellDC == null) {
				spellDC = 8 + abl.mod + prof + (actor.system.bonuses?.spell?.dc ? Number(actor.system.bonuses.spell.dc) || 0 : 0);
			}
		}
	}

	let headerStatsHtml = "";
	const statsBadges = [];

	if (spellAttack !== null && spellAttack !== undefined) {
		const atkNum = Number(spellAttack);
		const atkStr = Number.isFinite(atkNum) ? (atkNum >= 0 ? `+${atkNum}` : `${atkNum}`) : String(spellAttack);
		const atkTitle = game.i18n?.localize?.("DND5E.SpellAttackBonus") || "Spell Attack Bonus";
		statsBadges.push(`<span class="nah-header-stat-badge nah-spell-atk" data-tooltip="${atkTitle}"><span class="nah-stat-label">ATK</span><span class="nah-stat-val">${atkStr}</span></span>`);
	}

	if (spellDC !== null && spellDC !== undefined && Number(spellDC) > 0) {
		const dcTitle = game.i18n?.localize?.("DND5E.SpellDC") || game.i18n?.localize?.("DND5E.AbbreviationDC") || "Spell Save DC";
		statsBadges.push(`<span class="nah-header-stat-badge nah-spell-dc" data-tooltip="${dcTitle}"><span class="nah-stat-label">DC</span><span class="nah-stat-val">${spellDC}</span></span>`);
	}

	if (statsBadges.length > 0) {
		headerStatsHtml = `<div class="nah-header-stats-wrap">${statsBadges.join("")}</div>`;
	}

	const config = game.settings.get(MODULE_ID, "configuration") || {};
	let showUnpreparedRituals = config.dnd5eShowUnpreparedRituals;
	if (typeof showUnpreparedRituals !== "boolean") {
		try {
			if (game.settings.settings.has(`${MODULE_ID}.dnd5eShowUnpreparedRituals`)) {
				showUnpreparedRituals = game.settings.get(MODULE_ID, "dnd5eShowUnpreparedRituals") ?? true;
			} else {
				showUnpreparedRituals = true;
			}
		} catch (e) {
			showUnpreparedRituals = true;
		}
	}

	const isWizard = isWizardActor(actor);

	actor.items.forEach((i) => {
		if (i.type !== "spell") return;

		const cachedFor = i.getFlag?.("dnd5e", "cachedFor") ?? i.flags?.dnd5e?.cachedFor;
		let linkedActivity = i.system?.linkedActivity ?? null;
		if (!linkedActivity && cachedFor && actor) {
			try {
				const data = foundry.utils.parseUuid(cachedFor, { relative: actor });
				const [itemId, , activityId] = (data?.embedded ?? []).slice(-3);
				linkedActivity = actor.items?.get(itemId)?.system?.activities?.get(activityId) ?? null;
			} catch (e) {
				linkedActivity = null;
			}
		}

		const isActivitySpell = Boolean(cachedFor || linkedActivity);
		if (isActivitySpell) {
			if (linkedActivity && !linkedActivity.displayInSpellbook) return;
		}

		const lvl = i.system.level ?? 0;
		const prepMode = i.system.method ?? "prepared";

		let key;
		if (isActivitySpell) {
			key = "item";
		} else {
			key = `${lvl}`;
			if (prepMode === "pact") key = "pact";
			else if (prepMode === "innate") key = "innate";
			else if (prepMode === "atwill") key = "atwill";
			if (lvl === 0) key = "0";
		}

		// Filter out unprepared spells (except Cantrips and non-standard prep methods,
		// or unprepared ritual spells known by wizard characters)
		let isUnpreparedRitual = false;
		if (!isActivitySpell && lvl > 0 && !["pact", "innate", "atwill", "always"].includes(prepMode)) {
			const isPrepared = Boolean(i.system.prepared);
			if (!isPrepared) {
				if (showUnpreparedRituals && isWizard && isSpellEligibleAsWizardRitual(i, actor)) {
					isUnpreparedRitual = true;
				} else {
					return;
				}
			}
		}

		if (!items[key]) {
			items[key] = { all: [] };
			subLabels[key] = { all: "Spells" };
		}

		// Components in v6 are in system.properties Set
		const compList = [];
		const props = i.system.properties;
		// [V14 Compatible Only]: In DnD5e v6+ / Foundry V14, system.properties is strictly a Set<string>.
		// Legacy Array support has been removed.
		if (props instanceof Set) {
			if (props.has("vocal")) compList.push("V");
			if (props.has("somatic")) compList.push("S");
			if (props.has("material")) compList.push("M");
		}

		const compStr = compList.join(", ");

		let tags = "";
		const hasProp = (k) => props instanceof Set && props.has(k);

		if (hasProp("concentration")) {
			tags += `<span class="nah-tag conc" title="Concentration">C</span>`;
		}

		if (hasProp("ritual")) {
			if (isUnpreparedRitual) {
				const ritualTagLabel = game.i18n.localize("NAH.Spells.RitualTag") || "Ritual";
				const ritualTitle = game.i18n.localize("NAH.Spells.UnpreparedRitualTitle") || "Ritual Only (Unprepared)";
				tags += `<span class="nah-tag ritual nah-tag-unprepared" title="${ritualTitle}">${ritualTagLabel}</span>`;
			} else {
				tags += `<span class="nah-tag ritual" title="Ritual">R</span>`;
			}
		}

		let isExhausted = false;
		let usesBracket = "";

		const isCastActivity = Boolean(
			linkedActivity && (linkedActivity.type === "cast" || isActivitySpell)
		);
		const hasActivityUses = isCastActivity && _activityHasUses(linkedActivity);

		if (hasActivityUses) {
			const actUses = linkedActivity.uses;
			const isActRecharge = Boolean(
				linkedActivity.hasRecharge ||
				actUses?.recovery?.[0]?.period === "recharge" ||
				actUses?.recovery?.some?.((r) => r.period === "recharge")
			);

			if (isActRecharge) {
				const isCharged = (actUses?.value ?? 0) >= 1 && !linkedActivity.isOnCooldown;
				const formula = actUses?.recovery?.[0]?.formula || "6";
				const readyLabel = game.i18n.localize("NAH.Dnd5e.Ready");
				const rechargeLabel = game.i18n.localize("NAH.Dnd5e.Recharge");
				if (isCharged) {
					usesBracket = `<span style="color:#4ecdc4;"><i class="fas fa-bolt"></i> [${readyLabel}]</span>`;
				} else {
					usesBracket = `<span style="color:#ff6b6b;"><i class="fas fa-dice-d6"></i> [${rechargeLabel} ${formula}+]</span>`;
					isExhausted = true;
				}
			} else {
				const remaining = actUses?.value ?? 0;
				const rawMax = actUses?.max ?? 0;
				const maxNum = Number(rawMax);
				const hasValidMax = Number.isFinite(maxNum) ? maxNum > 0 : Boolean(rawMax);
				const maxStr = hasValidMax ? `/${rawMax}` : "";
				usesBracket = `<span style="color:#aaa;">[${remaining}${maxStr}]</span>`;

				if (hasValidMax && remaining === 0) {
					isExhausted = true;
				}
			}
		} else if (isCastActivity && linkedActivity?.item && _hasItemUses(linkedActivity.item)) {
			const res = _resolveFeatureUses(linkedActivity.item, actor);
			if (res.hasUses || res.hasRecharge) {
				usesBracket = res.usesBracket;
				if (res.isExhausted) {
					isExhausted = true;
				}
			}
		} else if (isCastActivity && linkedActivity?.consumption?.targets?.length) {
			for (const t of linkedActivity.consumption.targets) {
				if (t.type === "itemUses" && t.target) {
					const targetItem = t.target === linkedActivity.item?.id ? linkedActivity.item : actor?.items?.get(t.target);
					if (targetItem && _hasItemUses(targetItem)) {
						const res = _resolveFeatureUses(targetItem, actor);
						if (res.hasUses) {
							const costVal = Number(t.value) || 1;
							const costPrefix = costVal > 1 ? `[${costVal}] ` : "";
							const maxStr = res.max !== null && res.max !== undefined ? `/${res.max}` : "";
							usesBracket = `<span style="color:#aaa;">${costPrefix}[${res.value ?? 0}${maxStr}]</span>`;
							if (res.value !== null && res.value < costVal) isExhausted = true;
							break;
						}
					}
				}
			}
		} else if (_hasItemUses(i)) {
			const itemUses = i.system.uses;
			const remaining = itemUses?.value ?? 0;
			const rawMax = itemUses?.max ?? 0;
			const maxNum = Number(rawMax);
			const hasValidMax = Number.isFinite(maxNum) ? maxNum > 0 : Boolean(rawMax);
			const maxStr = hasValidMax ? `/${rawMax}` : "";
			usesBracket = `<span style="color:#aaa;">[${remaining}${maxStr}]</span>`;

			if (hasValidMax && remaining === 0) {
				isExhausted = true;
			}
		}

		const activation = i.system.activation?.type || linkedActivity?.activation?.type;
		const actIcon = _getActivationIcon(activation);
		const rangeText = _formatRange(i);
		const showRange = rangeText && !rangeText.startsWith("5 ");
		const { damageText, damageHtml } = _getItemDamage(i, actor);

		const subInfoHtml = damageText
			? `<span class="nah-info-sub" title="${escapeHtml(damageText)}" style="font-size:0.78em; letter-spacing:0.5px; margin-left:4px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%;">${damageHtml || damageText}${showRange ? ` · ${rangeText}` : ""}</span>`
			: (rangeText ? `<span style="font-size:0.8em; color:#888; margin-left:4px;">${rangeText}</span>` : "");

		items[key]["all"].push({
			id: i.id,
			name: i.name,
			uses: usesBracket,
			img: i.img,
			isUnpreparedRitual,
			isExhausted,
			cost: `
                    <div class="nah-cost-wrapper" style="display:inline-flex; align-items:center; gap:4px; white-space:nowrap;">
                        ${actIcon}
                        ${tags}
                        ${compStr ? `<span class="nah-cost-text">${compStr}</span>` : ""}
                        ${subInfoHtml}
                    </div>
                `,
			description: i.system.description?.value || "",
		});
	});

	const sortOrder = [
		"0",
		"1",
		"2",
		"3",
		"4",
		"5",
		"6",
		"7",
		"8",
		"9",
		"pact",
		"innate",
		"atwill",
		"item",
	];
	const sortedKeys = Object.keys(items).sort((a, b) => {
		return sortOrder.indexOf(a) - sortOrder.indexOf(b);
	});

	const sortedItems = {};
	sortedKeys.forEach((key) => {
		sortedItems[key] = items[key];
		sortedItems[key]["all"].sort((a, b) => a.name.localeCompare(b.name));

		if (key === "0") {
			primaryLabels[key] = game.i18n.localize("NAH.Dnd5e.Cantrip");
			primaryTooltips[key] = game.i18n.localize("NAH.Dnd5e.CantripsDesc");
		} else if (key === "pact") {
			const pact = actor.system.spells?.pact || {};
			const max = pact.max || 0;
			const value = pact.value || 0;
			const displayStatus = max > 0 ? ` <span style="font-size:0.8em; opacity:0.8;">(${value}/${max})</span>` : "";

			primaryLabels[key] =
				`${game.i18n.localize("NAH.Dnd5e.Pact")}${displayStatus}`;
			primaryTooltips[key] = game.i18n.format("NAH.Dnd5e.PactDesc", {
				level: pact.level ?? 1,
			});
		} else if (key === "innate") {
			primaryLabels[key] = game.i18n.localize("NAH.Dnd5e.Innate");
			primaryTooltips[key] = game.i18n.localize("NAH.Dnd5e.InnateDesc");
		} else if (key === "atwill") {
			primaryLabels[key] = game.i18n.localize("NAH.Dnd5e.AtWill");
			primaryTooltips[key] = game.i18n.localize("NAH.Dnd5e.AtWillDesc");
		} else if (key === "item") {
			primaryLabels[key] = game.i18n.localize("NAH.Dnd5e.ItemSpells");
			primaryTooltips[key] = game.i18n.localize("NAH.Dnd5e.ItemSpellsDesc");
		} else {
			const slotData = actor.system.spells?.[`spell${key}`];
			const max = slotData?.max || 0;
			const value = slotData?.value || 0;
			const displayStatus = max > 0 ? ` <span style="font-size:0.8em; opacity:0.8;">(${value}/${max})</span>` : "";

			primaryLabels[key] =
				`${game.i18n.format("NAH.Dnd5e.Level", { level: key })}${displayStatus}`;
			primaryTooltips[key] = game.i18n.format("NAH.Dnd5e.LevelDesc", {
				level: key,
			});
		}
	});

	// Injects default "All" tab at the beginning of Spells
	if (Object.keys(sortedItems).length > 0) {
		const allItemsList = [];
		for (const [key, tabData] of Object.entries(sortedItems)) {
			const list = tabData?.all;
			if (!Array.isArray(list) || list.length === 0) continue;
			const cleanHeader = (primaryLabels[key] || key).replace(/<[^>]*>/g, "").trim();
			allItemsList.push({ isHeader: true, name: cleanHeader });
			allItemsList.push(...list.map((item) => ({ ...item })));
		}

		if (allItemsList.length > 0) {
			const allLabel =
				game.i18n.localize("NAH.UI.AllSpells") ||
				game.i18n.localize("NAH.UI.All") ||
				"All Spells";
			sortedItems.all = { all: allItemsList };
			primaryLabels.all = allLabel;
			primaryTooltips.all = allLabel;
			subLabels.all = { all: allLabel };

			const ordered = createOrderedItemsObject(sortedItems, "all");
			return {
				title: "SPELLBOOK",
				theme: "blue",
				hasTabs: true,
				hasSubTabs: true,
				items: ordered,
				tabLabels: primaryLabels,
				tabTooltips: primaryTooltips,
				subTabLabels: subLabels,
				headerStatsHtml: headerStatsHtml,
			};
		}
	}

	return {
		title: "SPELLBOOK",
		theme: "blue",
		hasTabs: true,
		hasSubTabs: true,
		items: sortedItems,
		tabLabels: primaryLabels,
		tabTooltips: primaryTooltips,
		subTabLabels: subLabels,
		headerStatsHtml: headerStatsHtml,
	};
}

/* -----------------------------------------
   3. FEATURES (Abilities - DnD5e v6)
   ----------------------------------------- */

const DND5E_ACTIVATION_GROUPS = [
	["action", "Action"],
	["bonus", "Bonus"],
	["reaction", "Reaction"],
	["legendary", "Legendary"],
	["mythic", "Mythic"],
	["lair", "Lair"],
	["crew", "Crew"],
	["special", "Special"],
	["time", "Time"],
	["other", "Other"],
];

function _dnd5eActivationGroup(type) {
	switch (String(type ?? "").toLowerCase()) {
		case "action": return "action";
		case "bonus": return "bonus";
		case "reaction": return "reaction";
		case "legendary": return "legendary";
		case "mythic": return "mythic";
		case "lair": return "lair";
		case "crew": return "crew";
		case "special": return "special";
		case "minute":
		case "hour":
		case "day":
		case "time": return "time";
		default: return "other";
	}
}

export function _getFeatureData(actor) {
	if (!actor?.items) {
		return { title: "ABILITIES", theme: "blue", hasTabs: true, hasSubTabs: true, items: {}, tabLabels: {}, subTabLabels: {} };
	}
	const items = {
		actions: { all: [] },
		traits: { all: [] },
	};

	const res = actor.system.resources;
	if (res) {
		["primary", "secondary", "tertiary"].forEach((r) => {
			if (res[r] && res[r].max > 0 && res[r].label) {
				items["actions"]["all"].push({
					id: `res-${r}`,
					name: res[r].label,
					uses: `<span style="color:#00dbff; font-size:0.85em;">[${res[r].value}/${res[r].max}]</span>`,
					img: "icons/svg/light.svg",
					favoritable: false,
					cost: "",
					description: game.i18n.localize("NAH.Dnd5e.ResourceTracked"),
				});
			}
		});
	}

	actor.items.forEach((i) => {
		if (i.type === "feat" || i.type === "race" || i.type === "background") {
			if (_isLegendaryItem(i, actor)) return;
			let { activationType, activationIcon } = _getItemActivityData(i);
			const resolved = _resolveFeatureUses(i, actor);

			let isExhausted = resolved.isExhausted;

			if (resolved.activationType && !activationType) {
				activationType = resolved.activationType;
				activationIcon = _getActivationIcon(activationType);
			}

			const hasAction =
				activationType && activationType !== "none" && activationType !== "";

			const rangeText = _formatRange(i);
			const showRange = rangeText && !rangeText.startsWith("5 ");
			const { damageText, damageHtml } = _getItemDamage(i, actor);

			let displayHtml = "";
			if (damageText) {
				displayHtml = `<span class="nah-info-sub" title="${escapeHtml(damageText)}" style="font-size:0.78em; letter-spacing:0.5px; margin-left:4px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%;">${damageHtml || damageText}${showRange ? ` · ${rangeText}` : ""}</span>`;
			}

			let costHtml = "";
			if (activationIcon || displayHtml) {
				costHtml = `
                    <div class="nah-cost-wrapper" style="display:inline-flex; align-items:center; gap:5px; white-space:nowrap;">
                        ${activationIcon}
                        ${displayHtml}
                    </div>
                `;
			}

			const itemData = {
				id: i.id,
				name: i.name,
				uses: resolved.usesBracket || "",
				img: i.img,
				cost: costHtml,
				description: i.system.description?.value || "",
				isExhausted: isExhausted,
				_activationType: activationType,
			};

			if (hasAction || resolved.hasUses || resolved.hasRecharge) {
				items["actions"]["all"].push(itemData);
			} else {
				items["traits"]["all"].push(itemData);
			}
		}
	});

	items["traits"]["all"].sort((a, b) => a.name.localeCompare(b.name));

	const config = game.settings.get(MODULE_ID, "configuration") || {};
	const groupByActivation = config.dnd5eGroupActionsByActivation === true;

	let finalItems = items;
	let finalTabLabels = { actions: "Actions", traits: "Traits" };
	let finalSubTabLabels = {
		actions: { all: "Abilities" },
		traits: { all: "Passive Traits" },
	};

	if (!groupByActivation) {
		items["actions"]["all"].sort((a, b) => a.name.localeCompare(b.name));
	} else {
		const groupedItems = {};
		const tabLabels = {};
		const subTabLabels = {};

		for (const [key, label] of DND5E_ACTIVATION_GROUPS) {
			const list = items["actions"]["all"]
				.filter((it) => _dnd5eActivationGroup(it._activationType) === key)
				.sort((a, b) => a.name.localeCompare(b.name));
			if (list.length === 0) continue;
			groupedItems[key] = { all: list };
			let tabLabel = label;
			if (key === "legendary" && actor.system?.resources?.legact?.max > 0) {
				const leg = actor.system.resources.legact;
				const rem = leg.value ?? (leg.max - (leg.spent ?? 0));
				tabLabel = `${label} <span style="font-size:0.8em; opacity:0.8;">(${rem}/${leg.max})</span>`;
			}
			tabLabels[key] = tabLabel;
			subTabLabels[key] = { all: tabLabel };
		}

		if (items["traits"]["all"].length > 0) {
			groupedItems["traits"] = { all: items["traits"]["all"] };
			tabLabels["traits"] = "Traits";
			subTabLabels["traits"] = { all: "Passive Traits" };
		}

		finalItems = groupedItems;
		finalTabLabels = tabLabels;
		finalSubTabLabels = subTabLabels;
	}

	// Injects default "All" tab at the beginning of Features
	{
		const allItemsList = [];
		for (const [key, tabData] of Object.entries(finalItems)) {
			if (key === "all") continue;
			const list = tabData?.all;
			if (!Array.isArray(list) || list.length === 0) continue;
			const cleanHeader = (finalTabLabels[key] || key).replace(/<[^>]*>/g, "").trim();
			allItemsList.push({ isHeader: true, name: cleanHeader });
			allItemsList.push(...list.map((item) => ({ ...item })));
		}

		if (allItemsList.length > 0) {
			const allLabel =
				game.i18n.localize("NAH.UI.AllFeatures") ||
				game.i18n.localize("NAH.UI.All") ||
				"All Features";
			finalItems.all = { all: allItemsList };
			finalTabLabels.all = allLabel;
			finalSubTabLabels.all = { all: allLabel };

			const ordered = createOrderedItemsObject(finalItems, "all");
			return {
				title: "ABILITIES",
				theme: "blue",
				hasTabs: true,
				hasSubTabs: true,
				items: ordered,
				tabLabels: finalTabLabels,
				subTabLabels: finalSubTabLabels,
			};
		}
	}

	return {
		title: "ABILITIES",
		theme: "blue",
		hasTabs: true,
		hasSubTabs: true,
		items: finalItems,
		tabLabels: finalTabLabels,
		subTabLabels: finalSubTabLabels,
	};
}

/* -----------------------------------------
   3.5. LEGENDARY (Legendary Actions & Resistance)
   ----------------------------------------- */
export function _getLegendaryData(actor) {
	if (!actor) {
		return { title: "LEGENDARY", theme: "purple", hasTabs: false, items: [] };
	}

	const items = [];
	const legact = actor.system?.resources?.legact;
	const legres = actor.system?.resources?.legres;

	// 1. Legendary Resistance (sorted at the top)
	const legResItems = [];
	const seenIds = new Set();

	if (actor.items) {
		actor.items.forEach((i) => {
			if (_isLegendaryResistanceItem(i, actor)) {
				legResItems.push(i);
				seenIds.add(i.id);
			}
		});
	}

	legResItems.sort((a, b) => a.name.localeCompare(b.name));

	if (legResItems.length > 0) {
		legResItems.forEach((item) => {
			const { activationIcon } = _getItemActivityData(item);
			const resolved = _resolveFeatureUses(item, actor);
			let usesBracket = resolved.usesBracket || "";
			if (!usesBracket && legres && Number(legres.max) > 0) {
				const rem = legres.value ?? (legres.max - (legres.spent ?? 0));
				usesBracket = `<span style="color:#aaa;">[${rem}/${legres.max}]</span>`;
			}
			items.push({
				id: item.id,
				name: item.name,
				uses: usesBracket,
				img: item.img || "icons/equipment/shield/heater-steel-crystal-red.webp",
				cost: activationIcon
					? `<div style="display:flex; align-items:center; gap:4px; white-space:nowrap;">${activationIcon}</div>`
					: "",
				description: item.system?.description?.value || "",
				isExhausted: resolved.isExhausted || (legres && (legres.value ?? 0) === 0),
			});
		});
	} else if (legres && Number(legres.max) > 0) {
		const rem = legres.value ?? (legres.max - (legres.spent ?? 0));
		const label = legres.label || game.i18n?.localize?.("DND5E.LegRes") || "Legendary Resistance";
		items.push({
			id: "res-legres",
			name: label,
			uses: `<span style="color:#aaa;">[${rem}/${legres.max}]</span>`,
			img: "icons/equipment/shield/heater-steel-crystal-red.webp",
			cost: "",
			description: game.i18n?.localize?.("DND5E.LegRes") || "If the creature fails a saving throw, it can choose to succeed instead.",
			isExhausted: rem === 0,
		});
	}

	// 2. Legendary Actions (sorted alphabetically after Legendary Resistance)
	const actionItems = [];
	if (actor.items) {
		actor.items.forEach((i) => {
			if (seenIds.has(i.id)) return;
			if (!_isLegendaryActionItem(i, actor)) return;

			const { activationIcon } = _getItemActivityData(i);
			const resolved = _resolveFeatureUses(i, actor);

			let isExhausted = resolved.isExhausted;
			let usesBracket = resolved.usesBracket || "";

			if (!usesBracket && legact && Number(legact.max) > 0) {
				const rem = legact.value ?? (legact.max - (legact.spent ?? 0));
				usesBracket = `<span style="color:#aaa;">[${rem}/${legact.max}]</span>`;
				if (rem === 0) isExhausted = true;
			}

			let displayHtml = "";
			const { damageFormula, damageType, damageText, damageHtml } = _getItemDamage(i, actor);
			const rangeText = _formatRange(i);
			const showRange = rangeText && !rangeText.startsWith("5 ");
			const text = damageText || damageFormula;
			if (text) {
				displayHtml = `<span class="nah-info-sub" title="${escapeHtml(text)}" style="font-size:0.78em; letter-spacing:0.5px; display:inline-flex; align-items:center; line-height:1.1; white-space:nowrap; min-width:0; overflow:hidden; text-overflow:ellipsis; max-width:100%;">${damageHtml || text}${showRange ? ` · ${rangeText}` : ""}</span>`;
			}

			let costHtml = "";
			if (displayHtml) {
				costHtml = `
					<div class="nah-cost-wrapper" style="display:inline-flex; align-items:center; gap:5px; white-space:nowrap;">
						${activationIcon}
						${displayHtml}
					</div>
				`;
			} else if (activationIcon) {
				costHtml = `
					<div style="display:inline-flex; align-items:center; gap:4px; white-space:nowrap;">
						${activationIcon}
					</div>
				`;
			}

			actionItems.push({
				id: i.id,
				name: i.name,
				uses: usesBracket,
				img: i.img,
				cost: costHtml,
				description: i.system?.description?.value || "",
				isExhausted,
			});
		});
	}

	if (actionItems.length === 0 && legact && Number(legact.max) > 0) {
		const legItem = actor.items?.find((i) => /^legendary actions?$/i.test((i.name || "").trim()));
		const rem = legact.value ?? (legact.max - (legact.spent ?? 0));
		const label = legItem?.name || legact.label || game.i18n?.localize?.("DND5E.LegAct") || "Legendary Actions";
		items.push({
			id: legItem?.id || "res-legact",
			name: label,
			uses: `<span style="color:#aaa;">[${rem}/${legact.max}]</span>`,
			img: legItem?.img || "icons/skills/melee/weapons-crossed-swords-teal.webp",
			cost: "",
			description: legItem?.system?.description?.value || game.i18n?.localize?.("DND5E.LegAct") || "The creature can take legendary actions at the end of another creature's turn.",
			isExhausted: rem === 0,
		});
	}

	actionItems.sort((a, b) => a.name.localeCompare(b.name));
	items.push(...actionItems);

	return {
		title: "LEGENDARY",
		theme: "purple",
		hasTabs: false,
		items: items,
	};
}

/* -----------------------------------------
   4. INVENTORY (Sidebar Layout)
   ----------------------------------------- */
export function _getInventoryData(actor) {
	if (!actor?.items) {
		return { title: "INVENTORY", theme: "red", hasTabs: true, hasSubTabs: true, items: {}, tabLabels: {}, tabTooltips: {}, subTabLabels: {} };
	}
	const categories = {
		weapon: {
			label: game.i18n.localize("NAH.Dnd5e.InvWeapons"),
			tooltip: game.i18n.localize("NAH.Dnd5e.InvWeaponsDesc"),
		},
		equipment: {
			label: game.i18n.localize("NAH.Dnd5e.InvGear"),
			tooltip: game.i18n.localize("NAH.Dnd5e.InvGearDesc"),
		},
		consumable: {
			label: game.i18n.localize("NAH.Dnd5e.InvConsum"),
			tooltip: game.i18n.localize("NAH.Dnd5e.InvConsumDesc"),
		},
		tool: {
			label: game.i18n.localize("NAH.Dnd5e.InvTools"),
			tooltip: game.i18n.localize("NAH.Dnd5e.InvToolsDesc"),
		},
		loot: {
			label: game.i18n.localize("NAH.Dnd5e.InvLoot"),
			tooltip: game.i18n.localize("NAH.Dnd5e.InvLootDesc"),
		},
		backpack: {
			label: game.i18n.localize("NAH.Dnd5e.InvContainer"),
			tooltip: game.i18n.localize("NAH.Dnd5e.InvContainerDesc"),
		},
	};

	const items = {};
	const primaryLabels = {};
	const primaryTooltips = {};
	const subLabels = {};

	Object.keys(categories).forEach((key) => {
		items[key] = { all: [] };
		primaryLabels[key] = categories[key].label;
		primaryTooltips[key] = categories[key].tooltip;
		subLabels[key] = { all: game.i18n.localize("NAH.UI.AllItems") };
	});

	actor.items.forEach((i) => {
		const type = i.type;
		if (!items[type]) return;

		if ((type === "consumable" || type === "loot") && i.system.quantity <= 0)
			return;

		const isEquipped = i.system.equipped;
		let equipIcon = "";

		if (isEquipped) {
			equipIcon = `<span style="color:#4ecdc4; font-weight:bold; border:1px solid #4ecdc4; padding:0 3px; border-radius:2px; font-size:0.8em; margin-right:5px;">E</span>`;
		}

		const equipActionButton = _buildInventoryEquipButton(i, isEquipped);
		const resolved = _resolveFeatureUses(i, actor);
		items[type]["all"].push({
			id: i.id,
			name: i.name,
			uses: resolved.usesBracket || "",
			img: i.img,
			hasInlineControls: Boolean(equipActionButton),
			cost: `
				<div style="display:flex; align-items:center; max-width:180px; gap:4px; flex-wrap:wrap; justify-content:flex-end;">
					${equipIcon}
					<span style="font-family:'Teko'; font-size:1.1em; color:var(--g-accent); margin-right:6px;">x${i.system.quantity}</span>
					${equipActionButton}
				</div>
			`,
			description: i.system.description?.value || "",
		});
	});

	Object.keys(items).forEach((key) => {
		if (items[key]["all"].length === 0) {
			delete items[key];
			delete primaryLabels[key];
			delete primaryTooltips[key];
			delete subLabels[key];
		} else {
			items[key]["all"].sort((a, b) => a.name.localeCompare(b.name));
		}
	});

	// Injects default "All" tab at the beginning of Items
	if (Object.keys(items).length > 0) {
		const allItemsList = [];
		for (const [key, tabData] of Object.entries(items)) {
			if (key === "all") continue;
			const list = tabData?.all;
			if (!Array.isArray(list) || list.length === 0) continue;
			const cleanHeader = (primaryLabels[key] || key).replace(/<[^>]*>/g, "").trim();
			allItemsList.push({ isHeader: true, name: cleanHeader });
			allItemsList.push(...list.map((item) => ({ ...item })));
		}

		if (allItemsList.length > 0) {
			const allLabel =
				game.i18n.localize("NAH.UI.AllItems") ||
				game.i18n.localize("NAH.UI.All") ||
				"All";
			items.all = { all: allItemsList };
			primaryLabels.all = allLabel;
			primaryTooltips.all = allLabel;
			subLabels.all = { all: allLabel };

			const ordered = createOrderedItemsObject(items, "all");
			return {
				title: "INVENTORY",
				theme: "red",
				hasTabs: true,
				hasSubTabs: true,
				items: ordered,
				tabLabels: primaryLabels,
				tabTooltips: primaryTooltips,
				subTabLabels: subLabels,
			};
		}
	}

	return {
		title: "INVENTORY",
		theme: "red",
		hasTabs: true,
		hasSubTabs: true,
		items: items,
		tabLabels: primaryLabels,
		tabTooltips: primaryTooltips,
		subTabLabels: subLabels,
	};
}

export function _buildInventoryEquipButton(item, equipped) {
	const isEquippableType = typeof item.system?.equipped === "boolean";
	if (!isEquippableType) return "";

	const activeStyle = equipped
		? "background:#4ecdc4; border-color:#4ecdc4; color:#102024;"
		: "background:rgba(30,30,30,0.8); border-color:#666; color:#ddd;";
	const label = equipped
		? game.i18n.localize("NAH.Dnd5e.ActionUnequip")
		: game.i18n.localize("NAH.Dnd5e.ActionEquip");

	return `
		<button type="button"
			onclick="event.stopPropagation(); window.ActionHUD.actionMenu.useItem('equip:${item.id}', event)"
			title="${label}"
			style="${activeStyle} border:1px solid; border-radius:4px; padding:1px 6px; font-size:0.85em; font-weight:700; line-height:1.55; cursor:pointer; min-height:22px;">
			${label}
		</button>
	`;
}

function _formatProfIndicator(multiplier) {
	if (multiplier === 2) {
		const title = game.i18n.localize("DND5E.Expertise") || "Expertise";
		return `<span class="nah-roll-prof expertise" title="${title}"><i class="fas fa-check-double"></i></span>`;
	}
	if (multiplier === 1) {
		const title = game.i18n.localize("DND5E.Proficient") || "Proficient";
		return `<span class="nah-roll-prof proficient" title="${title}"><i class="fas fa-check"></i></span>`;
	}
	if (multiplier === 0.5) {
		const title = game.i18n.localize("DND5E.HalfProficiency") || "Half Proficiency";
		return `<span class="nah-roll-prof half-prof" title="${title}"><i class="fas fa-adjust"></i></span>`;
	}
	const title = game.i18n.localize("DND5E.NotProficient") || "Not Proficient";
	return `<span class="nah-roll-prof none" title="${title}"><i class="far fa-circle"></i></span>`;
}

function _resolveAdvantageMode(actor, type, key, ablKey = "dex") {
	try {
		const AdvField = globalThis.dnd5e?.dataModels?.fields?.AdvantageModeField;
		if (AdvField && actor?.system) {
			let keyPaths = [];
			if (type === "save") {
				keyPaths = [`abilities.${key}.save.roll.mode`, "rolls.ability.save.mode"];
			} else if (type === "check") {
				keyPaths = [`abilities.${key}.check.roll.mode`, "rolls.ability.check.mode"];
			} else if (type === "skill") {
				keyPaths = [
					`abilities.${ablKey}.check.roll.mode`,
					"rolls.ability.check.mode",
					`skills.${key}.roll.mode`,
					"rolls.ability.skill.mode",
				];
			} else if (type === "initiative") {
				keyPaths = [
					`abilities.${ablKey}.check.roll.mode`,
					"attributes.init.roll.mode",
					"rolls.ability.check.mode",
				];
			}
			const res = AdvField.combineFields(actor.system, keyPaths);
			if (res.mode === 1 || (res.advantage && !res.disadvantage)) return "advantage";
			if (res.mode === -1 || (res.disadvantage && !res.advantage)) return "disadvantage";
			return "normal";
		}
	} catch (_err) {
		// Fallback to direct field check
	}

	let modeVal = 0;
	if (type === "save") {
		modeVal = actor?.system?.abilities?.[key]?.save?.roll?.mode ?? 0;
	} else if (type === "check") {
		modeVal = actor?.system?.abilities?.[key]?.check?.roll?.mode ?? 0;
	} else if (type === "skill") {
		modeVal = actor?.system?.skills?.[key]?.roll?.mode ?? actor?.system?.abilities?.[ablKey]?.check?.roll?.mode ?? 0;
	} else if (type === "initiative") {
		modeVal = actor?.system?.attributes?.init?.roll?.mode ?? 0;
	}

	if (modeVal === 1) return "advantage";
	if (modeVal === -1) return "disadvantage";
	return "normal";
}

function _formatAdvantageBadge(advMode) {
	if (advMode === "advantage") {
		const title = game.i18n.localize("DND5E.Advantage") || "Advantage";
		return `<span class="nah-adv-badge adv" title="${title}">ADV</span>`;
	}
	if (advMode === "disadvantage") {
		const title = game.i18n.localize("DND5E.Disadvantage") || "Disadvantage";
		return `<span class="nah-adv-badge dis" title="${title}">DIS</span>`;
	}
	return "";
}

/* -----------------------------------------
   5. UTILITY (Saves, Skills, Rests - DnD5e v6)
   ----------------------------------------- */
export function _getUtilityData(actor) {
	if (!actor?.system) {
		return { title: "UTILITY", theme: "blue", hasTabs: true, hasSubTabs: true, items: {}, tabLabels: {}, subTabLabels: {} };
	}
	const categories = {
		save: { label: game.i18n.localize("NAH.Dnd5e.Saves") },
		skill: { label: game.i18n.localize("NAH.Dnd5e.Skills") },
		check: { label: game.i18n.localize("NAH.Dnd5e.Checks") },
		rest: { label: game.i18n.localize("NAH.Dnd5e.Rest") },
		macro: { label: game.i18n.localize("NAH.Dnd5e.Macros") },
	};

	const items = {
		save: { all: [] },
		skill: { all: [] },
		check: { all: [] },
		rest: { all: [] },
		macro: { all: [] },
	};

	const profBonus = actor.system.attributes?.prof || 2;

	// Initiative (only show during active combat when the token has not rolled initiative yet)
	const init = actor.system.attributes?.init;
	if (init && shouldShowInitiative(actor)) {
		const initMod = init.total ?? init.mod ?? 0;
		const initProfMult = init.prof?.multiplier ?? (init.prof?.hasProficiency ? 1 : (actor.flags?.dnd5e?.jackOfAllTrades ? 0.5 : 0));
		const initAdvMode = _resolveAdvantageMode(actor, "initiative", "initiative", init.ability || "dex");
		const profHtml = _formatProfIndicator(initProfMult);
		const modStr = `${initMod >= 0 ? "+" : ""}${initMod}`;
		const advBadge = _formatAdvantageBadge(initAdvMode);

		items["check"]["all"].push({
			id: "check-initiative",
			name: "Initiative",
			img: "icons/svg/clockwork.svg",
			cost: `${profHtml} <span class="nah-roll-mod">${modStr}</span> ${advBadge}`.trim(),
			profIndicatorHtml: profHtml,
			rollModifierStr: modStr,
			advBadgeHtml: advBadge,
			isAbilityRoll: true,
			oneLineLayout: true,
			favoritable: false,
			description: getDnd5eTooltip("initiative"),
		});
	}

	// 1. Saves & Ability Checks (DnD5e v6: abl.save.value and abl.check.value)
	Object.entries(actor.system.abilities || {}).forEach(([key, abl]) => {
		const ablConfig = CONFIG.DND5E.abilities?.[key];
		const label = ablConfig?.label || abl.label || key.toUpperCase();
		const modVal = abl.mod ?? 0;
		const saveProfMult = abl.save?.prof?.multiplier ?? (typeof abl.proficient === "number" ? abl.proficient : (abl.proficient ? 1 : 0));
		const saveVal = abl.save?.value ?? (modVal + (abl.proficient || 0) * profBonus);
		const saveAdvMode = _resolveAdvantageMode(actor, "save", key);
		const saveProfHtml = _formatProfIndicator(saveProfMult);
		const saveModStr = `${saveVal >= 0 ? "+" : ""}${saveVal}`;
		const saveAdvBadge = _formatAdvantageBadge(saveAdvMode);

		const saveImg = ablConfig?.icon || "icons/svg/d20-highlight.svg";
		const checkImg = ablConfig?.icon || "icons/svg/d20-grey.svg";

		items["save"]["all"].push({
			id: `save-${key}`,
			name: `${label} Save`,
			img: saveImg,
			cost: `${saveProfHtml} <span class="nah-roll-mod">${saveModStr}</span> ${saveAdvBadge}`.trim(),
			profIndicatorHtml: saveProfHtml,
			rollModifierStr: saveModStr,
			advBadgeHtml: saveAdvBadge,
			isAbilityRoll: true,
			oneLineLayout: true,
			favoritable: false,
			description: getDnd5eTooltip("save", key, label),
		});

		const checkVal = abl.check?.value ?? modVal;
		const checkProfMult = abl.check?.prof?.multiplier ?? (actor.flags?.dnd5e?.jackOfAllTrades ? 0.5 : 0);
		const checkAdvMode = _resolveAdvantageMode(actor, "check", key);
		const checkProfHtml = checkProfMult > 0
			? _formatProfIndicator(checkProfMult)
			: `<span class="nah-roll-prof none" title="${game.i18n.localize("DND5E.NotProficient") || "Not Proficient"}"><i class="far fa-circle"></i></span>`;
		const checkModStr = `${checkVal >= 0 ? "+" : ""}${checkVal}`;
		const checkAdvBadge = _formatAdvantageBadge(checkAdvMode);

		items["check"]["all"].push({
			id: `check-${key}`,
			name: `${label} Check`,
			img: checkImg,
			cost: `${checkProfHtml} <span class="nah-roll-mod">${checkModStr}</span> ${checkAdvBadge}`.trim(),
			profIndicatorHtml: checkProfHtml,
			rollModifierStr: checkModStr,
			advBadgeHtml: checkAdvBadge,
			isAbilityRoll: true,
			oneLineLayout: true,
			favoritable: false,
			description: getDnd5eTooltip("check", key, label),
		});
	});

	// 2. Skills
	Object.entries(actor.system.skills || {}).forEach(([key, skill]) => {
		const skillConfig = CONFIG.DND5E.skills?.[key];
		let skillLabel = skillConfig?.label || skill.label || key;
		if (typeof skillLabel === "object") skillLabel = key;

		const totalVal = skill.total ?? 0;
		const ablKey = skill.ability || skillConfig?.ability || "str";
		const ablLabel = CONFIG.DND5E.abilities?.[ablKey]?.label || ablKey.toUpperCase();

		let skillProfMult = skill.value ?? 0;
		if (skillProfMult === 0 && actor.flags?.dnd5e?.jackOfAllTrades) {
			skillProfMult = 0.5;
		}
		const skillProfHtml = _formatProfIndicator(skillProfMult);
		const skillModStr = `${totalVal >= 0 ? "+" : ""}${totalVal}`;
		const skillAdvMode = _resolveAdvantageMode(actor, "skill", key, ablKey);
		const skillAdvBadge = _formatAdvantageBadge(skillAdvMode);

		const skillImg = skillConfig?.icon || "icons/svg/book.svg";

		items["skill"]["all"].push({
			id: `skill-${key}`,
			name: skillLabel,
			img: skillImg,
			cost: `${skillProfHtml} <span class="nah-roll-mod">${skillModStr}</span> ${skillAdvBadge}`.trim(),
			profIndicatorHtml: skillProfHtml,
			rollModifierStr: skillModStr,
			advBadgeHtml: skillAdvBadge,
			isAbilityRoll: true,
			oneLineLayout: true,
			favoritable: false,
			description: getDnd5eTooltip("skill", key, skillLabel, ablLabel),
		});
	});

	items["skill"]["all"].sort((a, b) => a.name.localeCompare(b.name));

	// 3. Rests
	items["rest"]["all"].push({
		id: "rest-short",
		name: game.i18n.localize("NAH.Dnd5e.ShortRest"),
		img: "icons/svg/tankard.svg",
		cost: "1h",
		rollModifierStr: "1h",
		isAbilityRoll: true,
		oneLineLayout: true,
		favoritable: false,
		description: game.i18n.localize("NAH.Dnd5e.ShortRestDesc"),
	});
	items["rest"]["all"].push({
		id: "rest-long",
		name: game.i18n.localize("NAH.Dnd5e.LongRest"),
		img: "icons/svg/sleep.svg",
		cost: "8h",
		rollModifierStr: "8h",
		isAbilityRoll: true,
		oneLineLayout: true,
		favoritable: false,
		description: game.i18n.localize("NAH.Dnd5e.LongRestDesc"),
	});

	// Macros
	const macroIds = actor.getFlag(MODULE_ID, "macros") || [];

	if (macroIds.length > 0) {
		macroIds.forEach((id) => {
			const macro = game.macros.get(id);
			if (macro) {
				items["macro"]["all"].push({
					id: `macro-${macro.id}`,
					name: macro.name,
					img: macro.img,
					cost: "",
					isAbilityRoll: true,
					oneLineLayout: true,
					favoritable: false,
					description: game.i18n.localize("NAH.UI.RightClickRemove"),
				});
			}
		});
	} else {
		items["macro"]["all"].push({
			id: "macro-help",
			name: game.i18n.localize("NAH.UI.DragMacrosHere"),
			img: "icons/svg/down.svg",
			cost: "",
			description: "Drag & Drop macros from the hotbar to the Action Menu.",
			isHeader: false,
			isAbilityRoll: true,
			oneLineLayout: true,
			favoritable: false,
		});
	}

	const primaryLabels = {};
	const primaryTooltips = {};
	const subTabLabels = {
		save: { all: game.i18n.localize("NAH.Dnd5e.Saves") || "Saves" },
		skill: { all: game.i18n.localize("NAH.Dnd5e.Skills") || "Skills" },
		check: { all: game.i18n.localize("NAH.Dnd5e.Checks") || "Checks" },
		rest: { all: game.i18n.localize("NAH.Dnd5e.Rest") || "Actions" },
		macro: { all: game.i18n.localize("NAH.Dnd5e.Macros") || "Custom Macros" },
	};

	Object.keys(categories).forEach((key) => {
		if (key === "macro" && items["macro"]["all"].length === 0) return;
		primaryLabels[key] = categories[key].label;
		primaryTooltips[key] = categories[key].label;
	});

	// Injects default "All" tab at the beginning of Abilities
	if (Object.keys(items).length > 0) {
		const allItemsList = [];
		for (const [key, tabData] of Object.entries(items)) {
			if (key === "all") continue;
			if (key === "macro" && macroIds.length === 0) continue;
			const list = tabData?.all;
			if (!Array.isArray(list) || list.length === 0) continue;
			const cleanHeader = (primaryLabels[key] || key).replace(/<[^>]*>/g, "").trim();
			allItemsList.push({ isHeader: true, name: cleanHeader });
			allItemsList.push(...list.map((item) => ({ ...item })));
		}

		if (allItemsList.length > 0) {
			const allLabel =
				game.i18n.localize("NAH.UI.AllAbilities") ||
				game.i18n.localize("NAH.UI.All") ||
				"All";
			items.all = { all: allItemsList };
			primaryLabels.all = allLabel;
			primaryTooltips.all = allLabel;
			subTabLabels.all = { all: allLabel };

			const ordered = createOrderedItemsObject(items, "all");
			return {
				title: game.i18n.localize("NAH.Titles.Utility"),
				theme: "blue",
				hasTabs: true,
				hasSubTabs: true,
				items: ordered,
				tabLabels: primaryLabels,
				tabTooltips: primaryTooltips,
				subTabLabels: subTabLabels,
			};
		}
	}

	return {
		title: game.i18n.localize("NAH.Titles.Utility"),
		theme: "blue",
		hasTabs: true,
		hasSubTabs: true,
		items: items,
		tabLabels: primaryLabels,
		tabTooltips: primaryTooltips,
		subTabLabels: subTabLabels,
	};
}
