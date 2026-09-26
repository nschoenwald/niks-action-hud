import { MODULE_ID } from "../../constants.js";

/**
 * 초기 설정값으로 들어갈 기본 레이아웃 정의
 * systemId가 지정된 항목은 HUD에서 자동으로 해당 기능을 연결합니다.
 */
export function getDefaultActorPresets() {
	return [
		{
			id: "builtin-spellcaster",
			name: "Spellcaster",
			builtin: true,
			includes: { style: false, layout: false, attributes: true, imageRules: false },
			data: {
				attributes: [
					{
						path: "system.attributes.spell.dc",
						label: "Spell DC",
						color: "#9966ff",
						style: "badge",
						icon: "fas fa-hat-wizard",
						textColor: "#ffffff",
						textStrokeColor: "#000000",
						badgeScale: 1.0,
					},
				],
			},
		},
	];
}

export function getDefaultLayout() {
	return [
		{
			systemId: "attack",
			label: game.i18n?.localize?.("IBHUD.Category.Attacks") || game.i18n?.localize?.("IBHUD.Category.Attack") || "Attacks",
			icon: "fas fa-swords",
			type: "submenu",
			useSidebar: false,
		},
		{
			systemId: "magic",
			label: game.i18n?.localize?.("IBHUD.Category.Spells") || game.i18n?.localize?.("IBHUD.Category.Magic") || "Spells",
			icon: "fas fa-wand-magic-sparkles",
			type: "submenu",
			useSidebar: true,
		},
		{
			systemId: "feature",
			label: game.i18n?.localize?.("IBHUD.Category.Features") || game.i18n?.localize?.("IBHUD.Category.Feature") || "Features",
			icon: "fas fa-bolt",
			type: "submenu",
			useSidebar: true,
		},
		{
			systemId: "utility",
			label: game.i18n?.localize?.("IBHUD.Category.Abilities") || game.i18n?.localize?.("IBHUD.Category.Utility") || "Abilities",
			icon: "fas fa-dice-d20",
			type: "submenu",
			useSidebar: true,
		},
		{
			systemId: "item",
			label: game.i18n?.localize?.("IBHUD.Category.Items") || game.i18n?.localize?.("IBHUD.Category.Inventory") || "Items",
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
			game.i18n.localize("NIKS_ACTION_HUD.Tooltips.Initiative") || "Determine turn order in combat."
		);
	}

	if (type === "save") {
		const desc = game.i18n.localize(`NIKS_ACTION_HUD.Tooltips.SaveDescriptions.${key}`) || "";
		if (desc && !desc.startsWith("NIKS_ACTION_HUD")) {
			return desc;
		}
		return `Roll ${label} Saving Throw`;
	}

	if (type === "check") {
		const desc = game.i18n.localize(`NIKS_ACTION_HUD.Tooltips.CheckDescriptions.${key}`) || "";
		if (desc && !desc.startsWith("NIKS_ACTION_HUD")) {
			return desc;
		}
		return `Roll ${label} Check`;
	}

	if (type === "skill") {
		const desc = game.i18n.localize(`NIKS_ACTION_HUD.Tooltips.SkillDescriptions.${key}`) || "";
		if (desc && !desc.startsWith("NIKS_ACTION_HUD")) {
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
			res = { ...this._getWeaponData(actor), title: menuData.label };
			break;
		case "magic":
		case "spells":
		case "spell":
			res = { ...this._getSpellData(actor), title: menuData.label };
			break;
		case "feature":
		case "features":
			res = { ...this._getFeatureData(actor), title: menuData.label };
			break;
		case "utility":
		case "abilities":
		case "ability":
			res = { ...this._getUtilityData(actor), title: menuData.label };
			break;
		case "item":
		case "items":
		case "inventory":
			res = { ...this._getInventoryData(actor), title: menuData.label };
			break;
		default:
			res = { title: menuData.label, items: [] };
			break;
	}
	return res;
}

export async function _getSystemSubMenuData(actor, systemId, menuData) {
	const res = this._getSystemSubMenuDataSync(actor, systemId, menuData);
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
			const damageFormula = i.labels?.damage || "";
			const damageType = i.labels?.damageTypes || "";
			const toHit = i.labels?.toHit || "";

			const { activationIcon } = this._getItemActivityData(i);

			const rangeText = this._formatRange(i);
			const showRange = rangeText && !rangeText.startsWith("5 ");

			let displayHtml = "";
			if (damageFormula) {
				displayHtml = `
                        <div style="display:flex; flex-direction:column; align-items:flex-end; line-height:1.1;">
                            <span class="ib-info-main" style="font-weight:bold; font-size:0.95em;">${damageFormula}</span>
                            <span class="ib-info-sub" style="font-size:0.7em; text-transform:uppercase; letter-spacing:0.5px;">${damageType}${showRange ? ` · ${rangeText}` : ""}</span>
                        </div>
                    `;
			} else if (toHit) {
				displayHtml = `<span style="color:#aaa; font-size:0.9em;">Hit: ${toHit}${showRange ? ` · ${rangeText}` : ""}</span>`;
			} else {
				displayHtml = `<span style="color:#666; font-size:0.75em;">${i.labels?.properties || ""}${showRange ? ` · ${rangeText}` : ""}</span>`;
			}

			const ammoHtml = this._buildDnd5eAmmoHtml(i);

			return {
				id: i.id,
				name: i.name,
				img: i.img,
				description: i.system.description?.value || "",
				cost: `
                        <div class="ib-cost-wrapper">
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

	const spellDC = actor.system.attributes?.spell?.dc ?? null;

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

		const isActivitySpell = !!i.getFlag("dnd5e", "cachedFor");
		if (isActivitySpell) {
			const linkedActivity = i.system.linkedActivity;
			if (!linkedActivity?.displayInSpellbook) return;
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
			tags += `<span class="ib-tag conc" title="Concentration">C</span>`;
		}

		if (hasProp("ritual")) {
			if (isUnpreparedRitual) {
				const ritualTagLabel = game.i18n.localize("NIKS_ACTION_HUD.Spells.RitualTag") || "Ritual";
				const ritualTitle = game.i18n.localize("NIKS_ACTION_HUD.Spells.UnpreparedRitualTitle") || "Ritual Only (Unprepared)";
				tags += `<span class="ib-tag ritual ib-tag-unprepared" title="${ritualTitle}">${ritualTagLabel}</span>`;
			} else {
				tags += `<span class="ib-tag ritual" title="Ritual">R</span>`;
			}
		}

		const activation = i.system.activation?.type;
		const actIcon = this._getActivationIcon(activation);
		const rangeText = this._formatRange(i);
		items[key]["all"].push({
			id: i.id,
			name: i.name,
			img: i.img,
			isUnpreparedRitual,
			cost: `
                    <div class="ib-cost-wrapper">
                        ${actIcon}
                        ${tags}
                        <span class="ib-cost-text">${compStr}</span>
                        ${rangeText ? `<span style="font-size:0.8em; color:#888; margin-left:4px;">${rangeText}</span>` : ""}
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

	const dcBadgeHtml = spellDC ? ` <span class="ib-dc-badge">DC ${spellDC}</span>` : "";

	const sortedItems = {};
	sortedKeys.forEach((key) => {
		sortedItems[key] = items[key];
		sortedItems[key]["all"].sort((a, b) => a.name.localeCompare(b.name));

		if (key === "0") {
			primaryLabels[key] = game.i18n.localize("IBHUD.Dnd5e.Cantrip") + dcBadgeHtml;
			primaryTooltips[key] = spellDC
				? `${game.i18n.localize("IBHUD.Dnd5e.CantripsDesc")} (DC ${spellDC})`
				: game.i18n.localize("IBHUD.Dnd5e.CantripsDesc");
		} else if (key === "pact") {
			const pact = actor.system.spells?.pact || {};
			const max = pact.max || 0;
			const value = pact.value || 0;
			const displayStatus = max > 0 ? `(${value}/${max})` : "";

			primaryLabels[key] =
				`${game.i18n.localize("IBHUD.Dnd5e.Pact")} <span style="font-size:0.8em; opacity:0.8;">${displayStatus}</span>`;
			primaryTooltips[key] = game.i18n.format("IBHUD.Dnd5e.PactDesc", {
				level: pact.level ?? 1,
			});
		} else if (key === "innate") {
			primaryLabels[key] = game.i18n.localize("IBHUD.Dnd5e.Innate");
			primaryTooltips[key] = game.i18n.localize("IBHUD.Dnd5e.InnateDesc");
		} else if (key === "atwill") {
			primaryLabels[key] = game.i18n.localize("IBHUD.Dnd5e.AtWill");
			primaryTooltips[key] = game.i18n.localize("IBHUD.Dnd5e.AtWillDesc");
		} else if (key === "item") {
			primaryLabels[key] = game.i18n.localize("IBHUD.Dnd5e.ItemSpells");
			primaryTooltips[key] = game.i18n.localize("IBHUD.Dnd5e.ItemSpellsDesc");
		} else {
			const slotData = actor.system.spells?.[`spell${key}`];
			const max = slotData?.max || 0;
			const value = slotData?.value || 0;
			const displayStatus = max > 0 ? `(${value}/${max})` : "";

			primaryLabels[key] =
				`${game.i18n.format("IBHUD.Dnd5e.Level", { level: key })} <span style="font-size:0.8em; opacity:0.8;">${displayStatus}</span>`;
			primaryTooltips[key] = game.i18n.format("IBHUD.Dnd5e.LevelDesc", {
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
				game.i18n.localize("NIKS_ACTION_HUD.UI.AllSpells") ||
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
					name: `${res[r].label}`,
					img: "icons/svg/light.svg",
					favoritable: false,
					cost: `
                            <div class="ib-cost-wrapper">
                                <span class="ib-cost-text" style="color:#00dbff">
                                    (${res[r].value}/${res[r].max})
                                </span>
                            </div>
                        `,
					description: game.i18n.localize("IBHUD.Dnd5e.ResourceTracked"),
				});
			}
		});
	}

	actor.items.forEach((i) => {
		if (i.type === "feat") {
			const uses = i.system.uses;
			const recharge = i.system.recharge;

			const { activationType, activationIcon } = this._getItemActivityData(i);

			const hasUses = uses && (uses.max > 0 || uses.value > 0);
			const hasAction =
				activationType && activationType !== "none" && activationType !== "";
			const hasRecharge = recharge && recharge.value;

			let costHtml = "";
			let isExhausted = false;

			if (hasRecharge) {
				if (recharge.charged) {
					costHtml = `<span style="color:#4ecdc4; font-size:0.8em; font-weight:bold;"><i class="fas fa-bolt"></i> ${game.i18n.localize("IBHUD.Dnd5e.Ready")}</span>`;
				} else {
					costHtml = `<span style="color:#ff6b6b; font-size:0.8em;"><i class="fas fa-dice-d6"></i> ${game.i18n.localize("IBHUD.Dnd5e.Recharge")} ${recharge.value}+</span>`;
				}
			} else if (hasUses) {
				const remaining = uses.value || 0;
				const max = uses.max || 0;
				const maxStr = max > 0 ? `/${max}` : "";
				costHtml = `<span style="font-size:0.8em; color:#aaa;">(${remaining}${maxStr})</span>`;

				if (max > 0 && remaining === 0) isExhausted = true;
			} else {
				costHtml = `<span style="font-size:0.8em; color:#666;">-</span>`;
			}

			const itemData = {
				id: i.id,
				name: i.name,
				img: i.img,
				cost: `
                        <div style="display:flex; align-items:center; gap:4px; white-space:nowrap;">
                            ${activationIcon}
                            ${costHtml}
                        </div>
                    `,
				description: i.system.description?.value || "",
				isExhausted: isExhausted,
				_activationType: activationType,
			};

			if (hasAction || hasUses || hasRecharge) {
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
			tabLabels[key] = label;
			subTabLabels[key] = { all: label };
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
				game.i18n.localize("NIKS_ACTION_HUD.UI.AllFeatures") ||
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
   4. INVENTORY (Sidebar Layout)
   ----------------------------------------- */
export function _getInventoryData(actor) {
	if (!actor?.items) {
		return { title: "INVENTORY", theme: "red", hasTabs: true, hasSubTabs: true, items: {}, tabLabels: {}, tabTooltips: {}, subTabLabels: {} };
	}
	const categories = {
		weapon: {
			label: game.i18n.localize("IBHUD.Dnd5e.InvWeapons"),
			tooltip: game.i18n.localize("IBHUD.Dnd5e.InvWeaponsDesc"),
		},
		equipment: {
			label: game.i18n.localize("IBHUD.Dnd5e.InvGear"),
			tooltip: game.i18n.localize("IBHUD.Dnd5e.InvGearDesc"),
		},
		consumable: {
			label: game.i18n.localize("IBHUD.Dnd5e.InvConsum"),
			tooltip: game.i18n.localize("IBHUD.Dnd5e.InvConsumDesc"),
		},
		tool: {
			label: game.i18n.localize("IBHUD.Dnd5e.InvTools"),
			tooltip: game.i18n.localize("IBHUD.Dnd5e.InvToolsDesc"),
		},
		loot: {
			label: game.i18n.localize("IBHUD.Dnd5e.InvLoot"),
			tooltip: game.i18n.localize("IBHUD.Dnd5e.InvLootDesc"),
		},
		backpack: {
			label: game.i18n.localize("IBHUD.Dnd5e.InvContainer"),
			tooltip: game.i18n.localize("IBHUD.Dnd5e.InvContainerDesc"),
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
		subLabels[key] = { all: game.i18n.localize("IBHUD.UI.AllItems") };
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

		const equipActionButton = this._buildInventoryEquipButton(i, isEquipped);

		items[type]["all"].push({
			id: i.id,
			name: i.name,
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
				game.i18n.localize("NIKS_ACTION_HUD.UI.AllItems") ||
				game.i18n.localize("IBHUD.UI.AllItems") ||
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
		? game.i18n.localize("IBHUD.Dnd5e.ActionUnequip")
		: game.i18n.localize("IBHUD.Dnd5e.ActionEquip");

	return `
		<button type="button"
			onclick="event.stopPropagation(); window.ActionHUD.actionMenu.useItem('equip:${item.id}', event)"
			title="${label}"
			style="${activeStyle} border:1px solid; border-radius:4px; padding:1px 6px; font-size:0.85em; font-weight:700; line-height:1.55; cursor:pointer; min-height:22px;">
			${label}
		</button>
	`;
}

/* -----------------------------------------
   5. UTILITY (Saves, Skills, Rests - DnD5e v6)
   ----------------------------------------- */
export function _getUtilityData(actor) {
	if (!actor?.system) {
		return { title: "UTILITY", theme: "blue", hasTabs: true, hasSubTabs: true, items: {}, tabLabels: {}, subTabLabels: {} };
	}
	const categories = {
		save: { label: game.i18n.localize("IBHUD.Dnd5e.Saves") },
		skill: { label: game.i18n.localize("IBHUD.Dnd5e.Skills") },
		check: { label: game.i18n.localize("IBHUD.Dnd5e.Checks") },
		rest: { label: game.i18n.localize("IBHUD.Dnd5e.Rest") },
		macro: { label: game.i18n.localize("IBHUD.Dnd5e.Macros") },
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
		items["check"]["all"].push({
			id: "check-initiative",
			name: "Initiative",
			img: "icons/svg/clockwork.svg",
			cost: `${initMod >= 0 ? "+" : ""}${initMod}`,
			description: getDnd5eTooltip("initiative"),
		});
	}

	// 1. Saves & Ability Checks (DnD5e v6: abl.save.value and abl.check.value)
	Object.entries(actor.system.abilities || {}).forEach(([key, abl]) => {
		const ablConfig = CONFIG.DND5E.abilities?.[key];
		const label = ablConfig?.label || abl.label || key.toUpperCase();
		const modVal = abl.mod ?? 0;
		const checkVal = abl.check?.value ?? modVal;
		const saveVal = abl.save?.value ?? (modVal + (abl.proficient || 0) * profBonus);

		const saveIcon = abl.proficient
			? '<i class="fas fa-check-circle" style="color:#4ecdc4;"></i>'
			: "";

		const saveImg = ablConfig?.icon || "icons/svg/d20-highlight.svg";
		const checkImg = ablConfig?.icon || "icons/svg/d20-grey.svg";

		items["save"]["all"].push({
			id: `save-${key}`,
			name: `${label} Save`,
			img: saveImg,
			cost: `${saveIcon} ${saveVal >= 0 ? "+" : ""}${saveVal}`,
			description: getDnd5eTooltip("save", key, label),
		});

		items["check"]["all"].push({
			id: `check-${key}`,
			name: `${label} Check`,
			img: checkImg,
			cost: `${checkVal >= 0 ? "+" : ""}${checkVal}`,
			description: getDnd5eTooltip("check", key, label),
		});
	});

	// 2. Skills
	Object.entries(actor.system.skills || {}).forEach(([key, skill]) => {
		const skillConfig = CONFIG.DND5E.skills?.[key];
		let skillLabel = skillConfig?.label || skill.label || key;
		if (typeof skillLabel === "object") skillLabel = key;

		const totalVal = skill.total ?? 0;

		let icon = "";
		if (skill.value === 1)
			icon = '<i class="fas fa-check" style="color:#aaa; font-size:0.8em;"></i>';
		if (skill.value === 2)
			icon = '<i class="fas fa-check-double" style="color:#4ecdc4; font-size:0.8em;"></i>';

		const skillImg = skillConfig?.icon || "icons/svg/book.svg";
		const ablKey = skill.ability || skillConfig?.ability || "str";
		const ablLabel = CONFIG.DND5E.abilities?.[ablKey]?.label || ablKey.toUpperCase();

		items["skill"]["all"].push({
			id: `skill-${key}`,
			name: skillLabel,
			img: skillImg,
			cost: `<div style="display:flex; gap:5px; align-items:center;">${icon} <span>${totalVal >= 0 ? "+" : ""}${totalVal}</span></div>`,
			description: getDnd5eTooltip("skill", key, skillLabel, ablLabel),
		});
	});

	items["skill"]["all"].sort((a, b) => a.name.localeCompare(b.name));

	// 3. Rests
	items["rest"]["all"].push({
		id: "rest-short",
		name: game.i18n.localize("IBHUD.Dnd5e.ShortRest"),
		img: "icons/svg/tankard.svg",
		cost: "1h",
		description: game.i18n.localize("IBHUD.Dnd5e.ShortRestDesc"),
	});
	items["rest"]["all"].push({
		id: "rest-long",
		name: game.i18n.localize("IBHUD.Dnd5e.LongRest"),
		img: "icons/svg/sleep.svg",
		cost: "8h",
		description: game.i18n.localize("IBHUD.Dnd5e.LongRestDesc"),
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
					description: game.i18n.localize("IBHUD.UI.RightClickRemove"),
				});
			}
		});
	} else {
		items["macro"]["all"].push({
			id: "macro-help",
			name: game.i18n.localize("IBHUD.UI.DragMacrosHere"),
			img: "icons/svg/down.svg",
			cost: "",
			description: "Drag & Drop macros from the hotbar to the Action Menu.",
			isHeader: false,
			favoritable: false,
		});
	}

	const primaryLabels = {};
	const primaryTooltips = {};
	const subTabLabels = {
		save: { all: game.i18n.localize("IBHUD.Dnd5e.Saves") || "Saves" },
		skill: { all: game.i18n.localize("IBHUD.Dnd5e.Skills") || "Skills" },
		check: { all: game.i18n.localize("IBHUD.Dnd5e.Checks") || "Checks" },
		rest: { all: game.i18n.localize("IBHUD.Dnd5e.Rest") || "Actions" },
		macro: { all: game.i18n.localize("IBHUD.Dnd5e.Macros") || "Custom Macros" },
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
				game.i18n.localize("NIKS_ACTION_HUD.UI.AllAbilities") ||
				game.i18n.localize("NIKS_ACTION_HUD.UI.All") ||
				"All";
			items.all = { all: allItemsList };
			primaryLabels.all = allLabel;
			primaryTooltips.all = allLabel;
			subTabLabels.all = { all: allLabel };

			const ordered = createOrderedItemsObject(items, "all");
			return {
				title: game.i18n.localize("IBHUD.Titles.Utility"),
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
		title: game.i18n.localize("IBHUD.Titles.Utility"),
		theme: "blue",
		hasTabs: true,
		hasSubTabs: true,
		items: items,
		tabLabels: primaryLabels,
		tabTooltips: primaryTooltips,
		subTabLabels: subTabLabels,
	};
}
