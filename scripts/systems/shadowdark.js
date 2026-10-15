import { BaseSystemAdapter } from "./base.js";
import { MODULE_ID } from "../constants.js";
import * as ActionMenu from "./shadowdark/action-menu.js";
import * as Helpers from "./shadowdark/helpers.js";

/**
 * Register roll hooks once during initialization so fast-forwarded modifier shortcuts
 * (Alt = Advantage, Ctrl/Cmd = Disadvantage) properly set mainRoll.advantage on Shadowdark rolls.
 */
Hooks.once("init", () => {
	const SD_ROLL_HOOKS = [
		"SD-Stat-Check",
		"SD-Player-Attack",
		"SD-NPC-Attack",
		"SD-Player-Spell",
		"SD-NPC-Spell-Cast",
		"SD-Player-classAbility",
	];

	for (const hook of SD_ROLL_HOOKS) {
		Hooks.on(hook, (config) => {
			if (config && config._nahAdvantage !== undefined && config.mainRoll) {
				config.mainRoll.advantage = config._nahAdvantage;
			}
		});
	}
});

/**
 * Shadowdark RPG System Adapter for Nik's Action HUD.
 * Built natively for Foundry V14 and Shadowdark RPG v4.x+.
 */
export class ShadowdarkAdapter extends BaseSystemAdapter {
	constructor() {
		super("shadowdark");
	}

	actorHasLegendary(_actor) {
		return false;
	}

	/* =========================================
	   STAT ROLLS (Shadowdark API)
	   ========================================= */

	rollStat(actor, path, event) {
		if (!actor?.system) return null;
		const ev = event || {};
		const shiftKey = Boolean(ev.shiftKey);
		const altKey = Boolean(ev.altKey);
		const ctrlKey = Boolean(ev.ctrlKey || ev.metaKey);

		let skipPrompt = shiftKey;
		let adv = undefined;
		if (altKey) {
			adv = 1;
			skipPrompt = true;
		} else if (ctrlKey) {
			adv = -1;
			skipPrompt = true;
		}

		const rollOptions = { skipPrompt, advantage: adv, adv, _nahAdvantage: adv };

		// Ability checks: system.abilities.{key}.value or .mod
		const abilityMatch = path.match(/^system\.abilities\.(\w+)\.(?:value|mod)$/);
		if (abilityMatch) {
			const abilityId = abilityMatch[1].toLowerCase();
			return actor.system.rollStatCheck?.(abilityId, rollOptions) ?? null;
		}

		// Initiative
		if (path === "combat.initiative" || path === "system.attributes.initiative") {
			return actor.rollInitiative?.({ createCombatants: true, rerollInitiative: true, event: ev }) ?? null;
		}

		return null;
	}

	isStatRollable(path) {
		if (/^system\.abilities\.\w+\.(?:value|mod)$/.test(path)) return true;
		if (path === "combat.initiative" || path === "system.attributes.initiative") return true;
		return false;
	}

	/* =========================================
	   QUICK SLOTS & FAVORITES RESOLUTION
	   ========================================= */

	resolveQuickSlotData(actor, itemId) {
		if (itemId.startsWith("check-")) {
			const key = itemId.replace("check-", "");
			if (key === "initiative") {
				const dexMod = actor?.system?.abilities?.dex?.mod ?? 0;
				const dexStr = dexMod >= 0 ? `+${dexMod}` : `${dexMod}`;
				return {
					img: "icons/svg/clockwork.svg",
					name: "Initiative",
					type: "Initiative",
					cost: dexStr,
					rollModifierStr: dexStr,
					isAbilityRoll: true,
					oneLineLayout: true,
					description: `Roll initiative (DEX ${dexStr})`,
				};
			}

			const label = game.i18n?.localize?.(CONFIG.SHADOWDARK?.ABILITIES_LONG?.[key]) || key.toUpperCase();
			const mod = actor?.system?.abilities?.[key]?.mod ?? 0;
			const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
			return {
				img: Helpers.getAbilityIcon(key),
				name: `${label} Check`,
				type: "Ability Check",
				cost: modStr,
				rollModifierStr: modStr,
				isAbilityRoll: true,
				oneLineLayout: true,
				description: `Score ${actor?.system?.abilities?.[key]?.value ?? 10} (${modStr})`,
			};
		}

		if (itemId === "action-luck") {
			const luck = actor?.system?.luck;
			const isPulp = Boolean(game.settings.get?.("shadowdark", "usePulpMode"));
			const remaining = isPulp ? Number(luck?.remaining ?? 0) : undefined;
			const available = isPulp ? (remaining > 0) : Boolean(luck?.available);
			return {
				img: available
					? "icons/magic/control/buff-luck-fortune-green.webp"
					: "icons/magic/symbols/clover-luck-white-green.webp",
				name: "Luck",
				type: "Luck",
				description: isPulp ? `Pulp Luck: ${remaining} remaining` : (available ? "Luck Token Available" : "Luck Spent"),
			};
		}

		if (itemId === "action-roll-hp") {
			return {
				img: "icons/svg/heal.svg",
				name: "Roll Hit Points",
				type: "HP",
				description: "Roll NPC Max & Current HP",
			};
		}

		if (itemId.startsWith("wand:")) {
			const parts = itemId.split(":");
			const wandId = parts[1];
			const spellUuid = parts[2];
			const wand = actor?.items?.get(wandId);
			const spellDoc = typeof fromUuidSync === "function" && spellUuid ? fromUuidSync(spellUuid) : null;
			const spellName = spellDoc?.name || (spellUuid ? spellUuid.split(".").pop().replace(/-/g, " ") : "Spell");
			return {
				img: wand?.img || "icons/weapons/wands/wand-gem-violet.webp",
				name: `${wand?.name || "Wand"}: ${spellName}`,
				type: "Wand",
				description: spellDoc ? `Tier ${spellDoc.system?.tier || 1} • Wand Spell` : "Wand Spell",
			};
		}

		if (itemId.startsWith("macro-")) {
			const macroId = itemId.replace("macro-", "");
			const macro = game.macros?.get(macroId);
			if (macro) {
				return {
					img: macro.img,
					name: macro.name,
					type: "Macro",
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
				description: item.system?.description?.value || item.system?.description || "",
			};
		}

		return null;
	}

	/**
	 * Retrieve uses data for a favorited item or action.
	 * @param {Actor} actor
	 * @param {string} itemId
	 * @param {Item|object|null} [item=null]
	 * @returns {{ value: number, max: number|null, label: string, isExhausted: boolean }|null}
	 */
	getFavoriteUses(actor, itemId, item = null) {
		if (!actor || !itemId) return null;

		// 1. Luck
		if (itemId === "action-luck") {
			const luck = actor.system?.luck;
			if (!luck) return null;
			const isPulp = Boolean(game.settings.get?.("shadowdark", "usePulpMode"));
			if (isPulp && luck.remaining !== undefined) {
				const rem = Number(luck.remaining || 0);
				return {
					value: rem,
					max: null,
					label: `${rem}`,
					isExhausted: rem <= 0,
				};
			}
			const available = Boolean(luck.available);
			return {
				value: available ? 1 : 0,
				max: 1,
				label: available ? "Ready" : "0/1",
				isExhausted: !available,
			};
		}

		// 2. Wand Spell
		if (itemId.startsWith("wand:")) {
			const parts = itemId.split(":");
			const wand = actor.items?.get(parts[1]);
			const spellUuid = parts[2];
			const spEntry = wand?.system?.spells?.find((s) => s.uuid === spellUuid);
			const isLost = Boolean(wand?.system?.broken || spEntry?.lost);
			return {
				value: isLost ? 0 : 1,
				max: 1,
				label: isLost ? "LOST" : "1/1",
				isExhausted: isLost,
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
				isExhausted: val <= 0,
			};
		}

		// Spell with lost state
		if (targetItem.type === "Spell" || targetItem.type === "NPC Spell" || targetItem.system.isSpell) {
			const isLost = Boolean(targetItem.system.lost);
			return {
				value: isLost ? 0 : 1,
				max: 1,
				label: isLost ? "LOST" : "1/1",
				isExhausted: isLost,
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
				isExhausted: !active || remainingMinutes <= 0,
			};
		}

		// Potions and Ammunition: track quantity
		if (targetItem.type === "Potion" || targetItem.system.isAmmunition) {
			const qty = Number(targetItem.system.quantity ?? 1);
			return {
				value: qty,
				max: null,
				label: `x${qty}`,
				isExhausted: qty <= 0,
			};
		}

		return null;
	}

	/* =========================================
	   ITEM USE & ACTION EXECUTION
	   ========================================= */

	async executeAction(actor, actionId) {
		return this.useItem(actor, actionId);
	}

	async useItem(actor, itemId, event = null) {
		if (!actor || !itemId) return;

		const ev = event || window.event || {};
		const shiftKey = Boolean(ev.shiftKey);
		const altKey = Boolean(ev.altKey);
		const ctrlKey = Boolean(ev.ctrlKey || ev.metaKey);

		let skipPrompt = shiftKey;
		let adv = undefined;
		if (altKey) {
			adv = 1;
			skipPrompt = true;
		} else if (ctrlKey) {
			adv = -1;
			skipPrompt = true;
		}

		const rollOptions = { skipPrompt, advantage: adv, adv, _nahAdvantage: adv };

		// 1. Luck spend or prompt
		if (itemId === "action-luck") {
			return this._handleLuckAction(actor);
		}

		// 2. Initiative
		if (itemId === "check-initiative" || itemId === "initiative") {
			if (typeof actor.rollInitiative === "function") {
				return actor.rollInitiative({ createCombatants: true, rerollInitiative: true, event: ev });
			}
			return;
		}

		// 3. Roll HP (NPCs)
		if (itemId === "action-roll-hp") {
			if (typeof actor.system?.rollHP === "function") {
				return actor.system.rollHP();
			}
			return;
		}

		// 4. Ability Checks
		if (itemId.startsWith("check-")) {
			const ability = itemId.replace("check-", "").toLowerCase();
			if (typeof actor.system?.rollStatCheck === "function") {
				return actor.system.rollStatCheck(ability, rollOptions);
			}
			return;
		}

		// 5. Restore lost spell or wand
		if (itemId.startsWith("restoreSpell:")) {
			const realId = itemId.replace("restoreSpell:", "");
			return this.restoreItem(actor, realId);
		}

		// 6. Equip Toggle
		if (itemId.startsWith("equip:")) {
			const realId = itemId.replace("equip:", "");
			return this._toggleItemEquip(actor, realId);
		}

		// 7. Light source toggle
		if (itemId.startsWith("toggleLight:")) {
			const realId = itemId.replace("toggleLight:", "");
			return this._toggleLight(actor, realId);
		}

		// 8. Drink potion
		if (itemId.startsWith("drinkPotion:")) {
			const realId = itemId.replace("drinkPotion:", "");
			if (typeof actor.usePotion === "function") return actor.usePotion(realId);
			if (typeof actor.system?.usePotion === "function") return actor.system.usePotion(realId);
			return;
		}

		// 9. Wand spell invocation
		if (itemId.startsWith("wand:")) {
			const parts = itemId.split(":");
			const wandId = parts[1];
			const spellUuid = parts[2];
			const wand = actor.items.get(wandId);
			if (wand) {
				return actor.system.castSpell(spellUuid, {
					itemUuid: wand.uuid,
					...rollOptions,
				});
			}
			return;
		}

		// 10. Custom Macro
		if (itemId.startsWith("macro-")) {
			const macroId = itemId.replace("macro-", "");
			const macro = (await fromUuid(macroId)) || game.macros?.get(macroId);
			if (macro) {
				return macro.execute({ actor, token: actor.token });
			}
			ui.notifications.warn(`Macro not found: ${macroId}`);
			return;
		}

		// 11. Standard Actor Items
		const item = actor.items.get(itemId);
		if (!item) {
			ui.notifications.warn(`Item not found: ${itemId}`);
			return;
		}

		// Weapons (Player or NPC)
		if (item.system?.isWeapon) {
			return actor.system.rollAttack(item.uuid, rollOptions);
		}
		if (item.type === "NPC Attack" || item.type === "NPC Special Attack") {
			return actor.system.rollAttack(item.id, rollOptions);
		}

		// Spells (Player or NPC)
		if (item.type === "Spell" || item.type === "NPC Spell" || item.system?.isSpell) {
			return actor.system.castSpell(item.uuid, rollOptions);
		}

		// Scrolls
		if (item.system?.isScroll) {
			return actor.system.castSpell(item.system.spellUuid, {
				itemUuid: item.uuid,
				...rollOptions,
			});
		}

		// Wands (generic item click)
		if (item.system?.isWand) {
			const spells = item.system.spells?.filter((s) => !s.lost) || [];
			if (spells.length === 0) {
				ui.notifications.warn(game.i18n?.localize?.("SHADOWDARK.error.wand.broken") || "Wand is broken or spells lost.");
				return;
			}
			const targetSpellUuid = spells[0].uuid;
			return actor.system.castSpell(targetSpellUuid, {
				itemUuid: item.uuid,
				...rollOptions,
			});
		}

		// Potions
		if (item.type === "Potion") {
			if (typeof actor.usePotion === "function") return actor.usePotion(item.id);
			if (typeof actor.system?.usePotion === "function") return actor.system.usePotion(item.id);
		}

		// Light Source
		if (item.system?.light?.isSource) {
			return this._toggleLight(actor, item.id);
		}

		// Class Abilities
		if (item.type === "Class Ability" || item.system?.isAbility) {
			if (typeof actor.useAbility === "function") {
				return actor.useAbility(item.id, rollOptions);
			}
			if (typeof actor.system?.useAbility === "function") {
				return actor.system.useAbility(item.uuid, rollOptions);
			}
		}

		// NPC Features, Talents, Boons: display chat card if supported
		if (item.type === "NPC Feature" || item.type === "Talent" || item.type === "Boon") {
			if (typeof item.displayCard === "function") {
				return item.displayCard();
			}
			if (typeof actor.displayCard === "function") {
				return actor.displayCard(item);
			}
		}

		// Default fallback
		if (typeof item.sheet?.render === "function") {
			return item.sheet.render(true);
		}
	}

	async _handleLuckAction(actor) {
		const luck = actor.system?.luck;
		if (!luck) return;

		const isPulp = Boolean(game.settings.get?.("shadowdark", "usePulpMode"));
		const hasLuck = isPulp ? (Number(luck.remaining ?? 0) > 0) : Boolean(luck.available);
		if (!hasLuck) {
			ui.notifications.warn(game.i18n?.localize?.("NAH.Shadowdark.NoLuckLeft") || "No Luck remaining.");
			return;
		}

		new Dialog({
			title: game.i18n?.localize?.("NAH.Shadowdark.SpendLuck") || "Spend Luck",
			content: `<p>${game.i18n?.localize?.("NAH.Shadowdark.SpendLuckConfirm") || "Do you want to spend a Luck point to reroll your last check or test?"}</p>`,
			buttons: {
				spend: {
					icon: '<i class="fas fa-clover"></i>',
					label: game.i18n?.localize?.("NAH.Shadowdark.SpendLuck") || "Spend Luck",
					callback: async () => {
						if (typeof actor.system?.useLuckToken === "function") {
							await actor.system.useLuckToken(true);
						} else {
							await actor.update({ "system.luck.available": false });
						}
					},
				},
				cancel: {
					icon: '<i class="fas fa-times"></i>',
					label: game.i18n?.localize?.("Cancel") || "Cancel",
				},
			},
			default: "spend",
		}).render(true);
	}

	async _toggleLight(actor, itemId) {
		if (!actor?.isOwner && !game.user.isGM) {
			ui.notifications.warn(game.i18n?.localize?.("NAH.UI.NoPermission") || "No permission.");
			return;
		}

		const item = actor.items.get(itemId);
		if (!item?.system?.light?.isSource) return;

		// If character sheet has native _toggleLightSource, call it directly
		if (typeof actor.sheet?._toggleLightSource === "function") {
			return await actor.sheet._toggleLightSource(item);
		}

		// Otherwise, execute complete Shadowdark light toggling logic
		const active = !item.system.light.active;
		if (active) {
			const activeLightSources = typeof actor.getActiveLightSources === "function"
				? await actor.getActiveLightSources()
				: actor.items.filter((i) => i.system?.light?.active);
			for (const ls of activeLightSources) {
				if (ls.id !== item.id) {
					await ls.update({ "system.light.active": false });
				}
			}
		}

		const dataUpdate = { "system.light.active": active };
		if (!item.system.light.hasBeenUsed) {
			dataUpdate["system.light.hasBeenUsed"] = true;
		}
		await item.update(dataUpdate);

		if (typeof actor.toggleLight === "function") {
			await actor.toggleLight(active, item.id);
		}

		const tracker = game.shadowdark?.lightSourceTracker;
		if (tracker && typeof tracker.toggleLightSource === "function") {
			tracker.toggleLightSource(actor, item);
		}
	}

	async _toggleItemEquip(actor, itemId) {
		if (!actor?.isOwner && !game.user.isGM) {
			ui.notifications.warn(game.i18n?.localize?.("NAH.UI.NoPermission") || "No permission.");
			return;
		}

		const item = actor.items.get(itemId);
		if (!item) return;

		const current = Boolean(item.system?.equipped);
		const willEquip = !current;
		try {
			await item.update({
				"system.equipped": willEquip,
				"system.stashed": false,
			});

			if (willEquip && item.system?.isAShield) {
				const updates = [];
				const physical = actor.system?.getPhysicalItems ? actor.system.getPhysicalItems() : actor.items;
				for (const pi of physical) {
					if (pi.id !== item.id && pi.system?.isWeapon && pi.system?.equipped && pi.system?.handedness === "2h") {
						if (pi.system.isVersatile) {
							updates.push({ _id: pi.id, "system.handedness": "1h" });
						} else {
							updates.push({ _id: pi.id, "system.equipped": false });
						}
					}
				}
				if (updates.length > 0) {
					await actor.updateEmbeddedDocuments("Item", updates);
				}
			}
		} catch (error) {
			console.warn("Nik's Action HUD | Shadowdark equip toggle failed:", error);
			ui.notifications.warn(game.i18n?.localize?.("NAH.Notifications.UpdateFailed") || "Failed to update item.");
		}
	}

	async restoreItem(actor, itemId) {
		if (!actor?.isOwner && !game.user.isGM) {
			ui.notifications.warn(game.i18n?.localize?.("NAH.UI.NoPermission") || "No permission.");
			return false;
		}

		if (itemId.startsWith("wand:")) {
			const parts = itemId.split(":");
			const wand = actor.items.get(parts[1]);
			const spellUuid = parts[2];
			if (wand?.system?.setSpellLost) {
				await wand.system.setSpellLost(spellUuid, false);
				ui.notifications.info(`Restored spell on wand: ${wand.name}`);
				return true;
			}
		}

		const item = actor.items.get(itemId);
		if (!item) return false;

		if ((item.type === "Spell" || item.type === "NPC Spell" || item.system?.isSpell) && item.system?.lost) {
			await item.update({ "system.lost": false });
			ui.notifications.info(`Regained spell: ${item.name}`);
			return true;
		}

		if (item.system?.isWand) {
			const spells = (item.system.spells || []).map((s) => foundry.utils.mergeObject(s, { lost: false }));
			await item.update({ "system.spells": spells, "system.broken": false });
			ui.notifications.info(`Restored wand: ${item.name}`);
			return true;
		}

		if (item.system?.uses && item.system.uses.max) {
			await item.update({ "system.uses.available": item.system.uses.max });
			ui.notifications.info(`Restored uses for: ${item.name}`);
			return true;
		}

		return false;
	}

	findSyntheticItem(actor, itemId) {
		if (itemId.startsWith("check-")) {
			const key = itemId.replace("check-", "");
			if (key === "initiative") {
				return {
					id: "check-initiative",
					name: "Initiative",
					img: "icons/svg/clockwork.svg",
					type: "Initiative",
					system: {
						description: {
							value: game.i18n?.localize?.("NAH.Tooltips.Initiative") || "Roll initiative to determine combat turn order.",
						},
					},
				};
			}

			const label = game.i18n?.localize?.(CONFIG.SHADOWDARK?.ABILITIES_LONG?.[key]) || key.toUpperCase();
			return {
				id: `check-${key}`,
				name: `${label} Check`,
				img: Helpers.getAbilityIcon(key),
				type: "Ability Check",
				system: {
					description: {
						value: Helpers.getAbilityDescription(key),
					},
				},
			};
		}

		if (itemId === "action-luck") {
			return {
				id: "action-luck",
				name: "Luck",
				img: "icons/magic/control/buff-luck-fortune-green.webp",
				type: "Luck",
				system: {
					description: {
						value: game.i18n?.localize?.("NAH.Shadowdark.LuckTooltip")
							|| "Spend Luck to reroll any roll you just made. You must take the new result.",
					},
				},
			};
		}

		if (itemId === "action-roll-hp") {
			return {
				id: "action-roll-hp",
				name: "Roll Hit Points",
				img: "icons/svg/heal.svg",
				type: "HP",
				system: {
					description: {
						value: "Roll max and current hit points for this NPC based on level and CON modifier.",
					},
				},
			};
		}

		if (itemId.startsWith("wand:")) {
			const parts = itemId.split(":");
			const wandId = parts[1];
			const spellUuid = parts[2];
			const wand = actor?.items?.get(wandId);
			const spellDoc = typeof fromUuidSync === "function" && spellUuid ? fromUuidSync(spellUuid) : null;
			const spellName = spellDoc?.name || (spellUuid ? spellUuid.split(".").pop().replace(/-/g, " ") : "Spell");
			return {
				id: itemId,
				name: `${wand?.name || "Wand"}: ${spellName}`,
				img: wand?.img || "icons/weapons/wands/wand-gem-violet.webp",
				type: "Wand",
				system: {
					description: {
						value: spellDoc?.system?.description?.value || spellDoc?.system?.description || wand?.system?.description || "Cast spell contained in wand.",
					},
				},
			};
		}

		return null;
	}

	async createSystemMacro(dropData) {
		if (dropData.type !== "Item") return null;
		const item = await Item.fromDropData(dropData);
		if (!item) return null;

		const rootName = "Action HUD Actions";
		let folder = game.folders.find(
			(f) => (f.name === rootName || f.name === "Action HUD Macros") && f.type === "Macro"
		);
		if (!folder) {
			folder = await Folder.create({
				name: rootName,
				type: "Macro",
				color: "#4a344f",
				sorting: "a",
			});
		}

		const existing = game.macros.find(
			(m) => m.name === item.name && m.command?.includes(item.id) && m.folder?.id === folder.id
		);
		if (existing) return existing;

		const command = `ActionHUD.useItem("${item.id}");`;

		return await Macro.create({
			name: item.name,
			type: "script",
			img: item.img,
			command,
			folder: folder.id,
			flags: { [MODULE_ID]: { sourceId: item.uuid } },
		});
	}

	_processCustomItem(actor, savedItem, targetArray, isPersonal, meta = {}) {
		if (!savedItem || !savedItem.id || !savedItem.type) return;

		// 1. Synthetic checks, initiative, luck, hp
		if (savedItem.id.startsWith("check-") || savedItem.id === "action-luck" || savedItem.id === "action-roll-hp") {
			const synth = this.findSyntheticItem(actor, savedItem.id) || this.resolveQuickSlotData(actor, savedItem.id);
			if (synth) {
				const isCheck = savedItem.id.startsWith("check-");
				targetArray.push({
					id: savedItem.id,
					name: synth.name || savedItem.name,
					img: synth.img || savedItem.img,
					cost: synth.cost || "",
					rollModifierStr: synth.rollModifierStr || synth.cost || "",
					isAbilityRoll: Boolean(synth.isAbilityRoll ?? isCheck),
					oneLineLayout: true,
					description: synth.description?.value || synth.description || savedItem.flavor || "",
					isPersonal,
					customCatIndex: meta.catIdx,
					customTabIndex: meta.tabIdx,
					customItemIndex: meta.itemIdx,
				});
				return;
			}
		}

		// 2. Physical / Actor items
		const item = actor?.items?.get(savedItem.id) ||
			(typeof fromUuidSync === "function" ? fromUuidSync(savedItem.id) : null) ||
			actor?.items?.getName(savedItem.name);

		if (item) {
			let cost = "";
			let desc = savedItem.flavor || "";
			let hasInlineControls = false;
			const equipped = Boolean(item.system?.equipped);

			if (item.system?.isWeapon) {
				const dmg = Helpers.formatWeaponDamage(item, actor);
				const range = Helpers.formatRange(item.system.range);
				const equipBtn = `<button type="button" class="nah-sd-equip-btn ${equipped ? "equipped" : "unequipped"}" onclick="event.stopPropagation(); ActionHUD.actionMenu.useItem('equip:${item.id}', event)" title="${equipped ? "Unequip" : "Equip"}">${equipped ? "Equipped" : "Equip"}</button>`;
				cost = `
					<div style="display:flex; align-items:center; gap:6px;">
						<span style="font-weight:700; color:var(--sd-torch-bright, #fbbf24); font-size:0.88em;">${dmg || ""}</span>
						${equipBtn}
					</div>
				`;
				desc = range || (equipped ? "Equipped" : "Unequipped");
				hasInlineControls = true;
			} else if (item.type === "Spell" || item.type === "NPC Spell" || item.system?.isSpell) {
				const isLost = Boolean(item.system?.lost);
				const duration = Helpers.formatDuration(item.system?.duration);
				const range = Helpers.formatRange(item.system?.range);
				desc = [duration, range].filter(Boolean).join(" • ");
				if (isLost) {
					const restoreBtn = `<button type="button" class="nah-sd-restore-btn" onclick="event.stopPropagation(); ActionHUD.actionMenu.useItem('restoreSpell:${item.id}', event)" title="Restore">Restore</button>`;
					cost = `<div style="display:flex; align-items:center; gap:6px;"><span class="nah-sd-lost-badge">LOST</span>${restoreBtn}</div>`;
					hasInlineControls = true;
				} else {
					cost = duration || `Tier ${item.system?.tier || 1}`;
				}
			} else if (item.system?.light?.isSource) {
				const info = Helpers.getLightSourceInfo(item);
				const toggleBtn = `<button type="button" class="nah-sd-light-btn ${info.active ? "burning" : "extinguished"}" onclick="event.stopPropagation(); ActionHUD.actionMenu.useItem('toggleLight:${item.id}', event)" title="${info.active ? "Extinguish" : "Ignite"}">${info.active ? "Extinguish" : "Ignite"}</button>`;
				cost = `
					<div style="display:flex; align-items:center; gap:6px;">
						<span style="font-size:0.85em; color:${info.active ? "var(--sd-torch-bright, #fbbf24)" : "var(--sd-bone-muted, #888)"}; font-weight:700;">${info.active ? info.pips : "OFF"}</span>
						${toggleBtn}
					</div>
				`;
				desc = info.active ? `Burning (${info.timeRemaining})` : "Extinguished";
				hasInlineControls = true;
			} else if (item.type === "Potion") {
				const qty = Number(item.system?.quantity || 1);
				const drinkBtn = `<button type="button" class="nah-sd-drink-btn" onclick="event.stopPropagation(); ActionHUD.actionMenu.useItem('drinkPotion:${item.id}', event)" title="Drink">Drink</button>`;
				cost = `
					<div style="display:flex; align-items:center; gap:6px;">
						<span style="font-size:0.85em; font-weight:700; color:var(--sd-torch-bright, #fbbf24);">x${qty}</span>
						${drinkBtn}
					</div>
				`;
				desc = "Drink Potion";
				hasInlineControls = true;
			} else if (item.type === "Class Ability" && item.system?.limitedUses && item.system?.uses) {
				const cur = Number(item.system.uses.available ?? 0);
				const max = Number(item.system.uses.max ?? 0);
				cost = max > 0 ? `${cur}/${max}` : `${cur}`;
				desc = item.system.group || "Class Ability";
			}

			targetArray.push({
				id: item.id,
				name: item.name,
				img: item.img || savedItem.img || "icons/svg/item-bag.svg",
				cost,
				description: desc,
				equipped,
				hasInlineControls,
				isPersonal,
				customCatIndex: meta.catIdx,
				customTabIndex: meta.tabIdx,
				customItemIndex: meta.itemIdx,
			});
			return;
		}

		super._processCustomItem(actor, savedItem, targetArray, isPersonal, meta);
	}
}

// Mix in ActionMenu and Helpers methods
Object.assign(ShadowdarkAdapter.prototype, ActionMenu, Helpers);
