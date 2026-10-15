import { BaseSystemAdapter } from "./base.js";
import { MODULE_ID } from "../constants.js";
import * as ActionMenu from "./dnd5e/action-menu.js";
import * as Helpers from "./dnd5e/helpers.js";

/**
 * DnD5e 6.x System Adapter for Nik's Action HUD.
 * Built natively for Foundry V14 and DnD5e 6.x Activities architecture.
 */
export class DnD5eAdapter extends BaseSystemAdapter {
	constructor() {
		super("dnd5e");
	}

	actorHasLegendary(actor) {
		return Helpers._actorHasLegendary(actor);
	}

	/* =========================================
	   STAT ROLLS (DnD5e v6 API)
	   ========================================= */

	rollStat(actor, path, event) {
		const ev = event || {};
		const fastForward = ev.ctrlKey || ev.metaKey || false;
		const dialogOptions = { configure: !fastForward, event: ev };

		// system.abilities.{key}.save.value -> saving throw
		const saveMatch = path.match(/^system\.abilities\.(\w+)\.save(?:\.value)?$/);
		if (saveMatch) {
			const abilityId = saveMatch[1];
			return actor.rollSavingThrow?.({ ability: abilityId, event: ev }, dialogOptions) ?? null;
		}

		// system.abilities.{key}.check.value or .value or .mod -> ability check
		const abilityMatch = path.match(/^system\.abilities\.(\w+)\.(?:check\.value|value|mod)$/);
		if (abilityMatch) {
			const abilityId = abilityMatch[1];
			return actor.rollAbilityCheck?.({ ability: abilityId, event: ev }, dialogOptions) ?? null;
		}

		// system.skills.{key}.total/.value/.passive -> skill roll
		const skillMatch = path.match(/^system\.skills\.(\w+)\.(value|total|passive)$/);
		if (skillMatch) {
			const skillId = skillMatch[1];
			return actor.rollSkill?.({ skill: skillId, event: ev }, dialogOptions) ?? null;
		}

		// Initiative
		if (path === "system.attributes.init.total" || path === "combat.initiative") {
			return actor.rollInitiativeDialog?.({ event: ev }) ?? null;
		}

		return null;
	}

	isStatRollable(path) {
		if (/^system\.abilities\.\w+\.save(?:\.value)?$/.test(path)) return true;
		if (/^system\.abilities\.\w+\.(?:check\.value|value|mod)$/.test(path)) return true;
		if (/^system\.skills\.\w+\.(value|total|passive)$/.test(path)) return true;
		if (path === "system.attributes.init.total") return true;
		if (path === "combat.initiative") return true;
		return false;
	}

	/* =========================================
	   QUICK SLOTS & FAVORITES RESOLUTION
	   ========================================= */

	resolveQuickSlotData(actor, itemId) {
		if (itemId.startsWith("save-")) {
			const key = itemId.replace("save-", "");
			const label = CONFIG.DND5E?.abilities?.[key]?.label || key.toUpperCase();
			const fallback = Helpers.getAbilityIcon ? Helpers.getAbilityIcon(key, "icons/svg/d20-highlight.svg") : "icons/svg/d20-highlight.svg";
			const img = CONFIG.DND5E?.abilities?.[key]?.icon || fallback;
			const desc = this.getDnd5eTooltip ? this.getDnd5eTooltip("save", key, label) : "";
			return { img, name: `${label} Save`, type: "Saving Throw", description: desc };
		}
		if (itemId === "check-initiative") {
			const desc = this.getDnd5eTooltip ? this.getDnd5eTooltip("initiative") : "";
			return { img: "icons/svg/clockwork.svg", name: "Initiative", type: "Initiative", description: desc };
		}
		if (itemId.startsWith("check-")) {
			const key = itemId.replace("check-", "");
			const label = CONFIG.DND5E?.abilities?.[key]?.label || key.toUpperCase();
			const fallback = Helpers.getAbilityIcon ? Helpers.getAbilityIcon(key, "icons/svg/d20-grey.svg") : "icons/svg/d20-grey.svg";
			const img = CONFIG.DND5E?.abilities?.[key]?.icon || fallback;
			const desc = this.getDnd5eTooltip ? this.getDnd5eTooltip("check", key, label) : "";
			return { img, name: `${label} Check`, type: "Ability Check", description: desc };
		}
		if (itemId.startsWith("skill-")) {
			const key = itemId.replace("skill-", "");
			const label = CONFIG.DND5E?.skills?.[key]?.label || actor?.system?.skills?.[key]?.label || key;
			const img = CONFIG.DND5E?.skills?.[key]?.icon || "icons/svg/book.svg";
			const ablKey = actor?.system?.skills?.[key]?.ability || CONFIG.DND5E?.skills?.[key]?.ability || "str";
			const ablLabel = CONFIG.DND5E?.abilities?.[ablKey]?.label || ablKey.toUpperCase();
			const desc = this.getDnd5eTooltip ? this.getDnd5eTooltip("skill", key, label, ablLabel) : "";
			return { img, name: label, type: "Skill Check", description: desc };
		}
		if (itemId === "rest-short") {
			return {
				img: "icons/svg/tankard.svg",
				name: game.i18n?.localize?.("NAH.Dnd5e.ShortRest") || "Short Rest",
				type: "Rest",
				description: game.i18n?.localize?.("NAH.Dnd5e.ShortRestDesc") || "Take a Short Rest (1 hour).",
			};
		}
		if (itemId === "rest-long") {
			return {
				img: "icons/svg/sleep.svg",
				name: game.i18n?.localize?.("NAH.Dnd5e.LongRest") || "Long Rest",
				type: "Rest",
				description: game.i18n?.localize?.("NAH.Dnd5e.LongRestDesc") || "Take a Long Rest (8 hours).",
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
		return null;
	}

	/**
	 * Retrieve uses data for a favorited action or item (DnD5e 6.x).
	 * Checks item-level limited uses first, then single activity uses,
	 * as well as explicit activity IDs, linked item macros, and system resources.
	 * @param {Actor} actor
	 * @param {string} itemId
	 * @param {Item|Object|null} [item=null]
	 * @returns {{ value: number, max: number|null, label: string, isExhausted: boolean }|null}
	 */
	getFavoriteUses(actor, itemId, item = null) {
		if (!actor || !itemId) return null;

		let targetItem = item;
		let targetActivity = null;

		// 1. Explicit activity composite ID: activity:<itemId>:<activityId>
		if (itemId.startsWith("activity:")) {
			const parts = itemId.split(":");
			const actItemId = parts[1];
			const actId = parts[2];
			targetItem = actor.items?.get(actItemId) || targetItem;
			targetActivity = targetItem?.system?.activities?.get(actId) || null;
			if (targetActivity && Helpers._activityHasUses(targetActivity)) {
				return this._formatFavoriteUses(targetActivity.uses, targetActivity, targetItem, actor);
			}
			if (targetItem && Helpers._hasItemUses(targetItem)) {
				return this._formatFavoriteUses(targetItem.system?.uses, null, targetItem, actor);
			}
		}

		// 2. Custom macros linked to an actor item via sourceId flag
		if (itemId.startsWith("macro-")) {
			const realId = itemId.replace("macro-", "");
			const macro =
				(typeof fromUuidSync === "function" ? fromUuidSync(realId) : null) ||
				game.macros?.get(realId);
			if (macro?.flags?.[MODULE_ID]?.sourceId) {
				try {
					const linked = (typeof fromUuidSync === "function" ? fromUuidSync(macro.flags[MODULE_ID].sourceId) : null);
					if (linked && linked.actor?.id === actor.id) {
						targetItem = linked;
					}
				} catch (_e) {}
			}
		}

		// 3. System resources (Legendary Resistance, Legendary Actions, Class Resources)
		if (itemId === "res-legres") {
			const legres = actor.system?.resources?.legres;
			const max = Number(legres?.max) || 0;
			if (max > 0) {
				const current = Number(legres.value ?? (max - (legres.spent ?? 0))) || 0;
				const value = Math.max(0, current);
				return {
					value,
					max,
					label: `${value}/${max}`,
					isExhausted: value <= 0,
				};
			}
		}

		if (itemId === "res-legact") {
			const legact = actor.system?.resources?.legact;
			const max = Number(legact?.max) || 0;
			if (max > 0) {
				const current = Number(legact.value ?? (max - (legact.spent ?? 0))) || 0;
				const value = Math.max(0, current);
				return {
					value,
					max,
					label: `${value}/${max}`,
					isExhausted: value <= 0,
				};
			}
		}

		if (itemId.startsWith("res-")) {
			const resKey = itemId.replace("res-", "");
			const resource = actor.system?.resources?.[resKey];
			const max = Number(resource?.max) || 0;
			if (max > 0) {
				const current = Number(resource.value ?? (max - (resource.spent ?? 0))) || 0;
				const value = Math.max(0, current);
				return {
					value,
					max,
					label: `${value}/${max}`,
					isExhausted: value <= 0,
				};
			}
		}

		// 4. Resolve standard actor item
		if (!targetItem || !targetItem.system) {
			targetItem = actor.items?.get(itemId);
		}

		if (!targetItem || !targetItem.system) return null;

		// 5. Item-level limited uses attached directly to the item
		if (Helpers._hasItemUses(targetItem)) {
			return this._formatFavoriteUses(targetItem.system.uses, null, targetItem, actor);
		}

		// 6. Exactly one activity with activity uses on the item
		const singleActivity = Helpers._getSingleActivityUses(targetItem);
		if (singleActivity && Helpers._activityHasUses(singleActivity)) {
			return this._formatFavoriteUses(singleActivity.uses, singleActivity, targetItem, actor);
		}

		return null;
	}

	_formatFavoriteUses(uses, activity = null, targetItem = null, actor = null) {
		if (!uses) return null;

		// Recharge check (item recharge or activity recharge)
		const hasRecharge = Boolean(
			activity?.hasRecharge ||
			targetItem?.hasRecharge ||
			targetItem?.system?.recharge?.value ||
			uses.recovery?.some?.((r) => r.period === "recharge")
		);

		if (hasRecharge) {
			const isCharged = (Number(uses.value) >= 1 || uses.value === undefined) &&
				!activity?.isOnCooldown &&
				!targetItem?.isOnCooldown;
			const value = isCharged ? 1 : 0;
			let isExhausted = !isCharged;
			if (isExhausted && actor) {
				const isSpell = targetItem?.type === "spell" || activity?.type === "cast";
				if (isSpell) {
					const spellLevel = targetItem?.system?.level ?? activity?.spell?.level ?? 1;
					if (Helpers.actorHasAvailableSpellSlots(actor, spellLevel)) {
						isExhausted = false;
					}
				}
			}
			return {
				value,
				max: 1,
				label: isCharged ? "1/1" : "0/1",
				isExhausted,
				hasRecharge: true,
			};
		}

		const rawMax = uses.max;
		const maxNum = Number(rawMax);
		const hasValidMax = Number.isFinite(maxNum) && maxNum > 0;

		let val = uses.value;
		if (val === undefined || val === null) {
			if (hasValidMax && uses.spent !== undefined) {
				val = Math.max(0, maxNum - Number(uses.spent || 0));
			} else {
				val = 0;
			}
		}
		const value = Math.max(0, Number(val) || 0);

		if (!hasValidMax && value <= 0) return null;

		const label = hasValidMax ? `${value}/${maxNum}` : `${value}`;
		let isExhausted = hasValidMax ? value <= 0 : false;
		if (isExhausted && actor) {
			const isSpell = targetItem?.type === "spell" || activity?.type === "cast";
			if (isSpell) {
				const spellLevel = targetItem?.system?.level ?? activity?.spell?.level ?? 1;
				if (Helpers.actorHasAvailableSpellSlots(actor, spellLevel)) {
					isExhausted = false;
				}
			}
		}

		return {
			value,
			max: hasValidMax ? maxNum : null,
			label,
			isExhausted,
		};
	}

	/* =========================================
	   ITEM USE & ACTIVITY EXECUTION
	   ========================================= */

	async useItem(actor, itemId, event = null) {
		if (!actor || !itemId) return;

		if (itemId === "res-legres") {
			const legres = actor.system?.resources?.legres;
			const current = legres?.value ?? ((legres?.max ?? 0) - (legres?.spent ?? 0));
			if (current <= 0) {
				ui.notifications.warn(game.i18n.localize("NAH.Notifications.NoUsesLeft") || "No uses remaining.");
				return;
			}
			const newValue = Math.max(0, current - 1);
			await actor.update({ "system.resources.legres.value": newValue });
			ChatMessage.create?.({
				speaker: ChatMessage.getSpeaker({ actor }),
				content: `<div class="dnd5e chat-card"><strong>${actor.name}</strong> uses Legendary Resistance (${newValue}/${legres.max} remaining).</div>`,
			});
			return;
		}

		if (itemId === "res-legact") {
			const legact = actor.system?.resources?.legact;
			const current = legact?.value ?? ((legact?.max ?? 0) - (legact?.spent ?? 0));
			if (current <= 0) {
				ui.notifications.warn(game.i18n.localize("NAH.Notifications.NoUsesLeft") || "No uses remaining.");
				return;
			}
			const newValue = Math.max(0, current - 1);
			await actor.update({ "system.resources.legact.value": newValue });
			ChatMessage.create?.({
				speaker: ChatMessage.getSpeaker({ actor }),
				content: `<div class="dnd5e chat-card"><strong>${actor.name}</strong> spends a Legendary Action (${newValue}/${legact.max} remaining).</div>`,
			});
			return;
		}

		if (itemId.startsWith("res-")) {
			const resKey = itemId.replace("res-", "");
			const resource = actor.system?.resources?.[resKey];
			if (resource) {
				const current = resource.value ?? 0;
				if (current <= 0) {
					ui.notifications.warn(game.i18n.localize("NAH.Notifications.NoUsesLeft") || "No uses remaining.");
					return;
				}
				const newValue = Math.max(0, current - 1);
				await actor.update({ [`system.resources.${resKey}.value`]: newValue });
				ChatMessage.create?.({
					speaker: ChatMessage.getSpeaker({ actor }),
					content: `<div class="dnd5e chat-card"><strong>${actor.name}</strong> uses ${resource.label || resKey} (${newValue}/${resource.max} remaining).</div>`,
				});
				return;
			}
		}

		if (itemId.startsWith("equip:")) {
			return this._toggleItemEquip(actor, itemId.replace("equip:", ""));
		}

		if (itemId.startsWith("ammo:")) {
			const parts = itemId.split(":");
			const weaponId = parts[1];
			const command = parts[2];
			const cleanEvent = event || window.event;
			return this._handleDnd5eAmmoAction(actor, weaponId, command, cleanEvent);
		}

		const ev = event || window.event;
		const ctrlKey = ev?.ctrlKey || ev?.metaKey || false;
		const shiftKey = ev?.shiftKey || false;
		const altKey = ev?.altKey || false;

		const isBinding = (action) => {
			if (!ev) return false;
			const bindings = game.keybindings?.get?.("dnd5e", action) || [];
			if (!bindings.length) return false;
			return bindings.some((b) => {
				const key = b.key || "";
				const modifiers = b.modifiers || [];
				const reqShift = modifiers.includes("Shift") || key.includes("Shift");
				const reqAlt = modifiers.includes("Alt") || key.includes("Alt");
				const reqCtrl =
					modifiers.includes("Control") ||
					modifiers.includes("Meta") ||
					key.includes("Control") ||
					key.includes("Meta") ||
					key.includes("Os") ||
					key.includes("OS");

				if (reqShift && !shiftKey) return false;
				if (reqAlt && !altKey) return false;
				if (reqCtrl && !ctrlKey) return false;

				if (key && !["Shift", "Alt", "Control", "Meta", "Os", "OS"].some((k) => key.includes(k))) {
					if (ev.code !== key && ev.key !== key) return false;
				}
				return true;
			});
		};

		const skipNormal = isBinding("skipDialogNormal");
		const skipAdvantage = isBinding("skipDialogAdvantage");
		const skipDisadvantage = isBinding("skipDialogDisadvantage");

		let fastForward = skipNormal || skipAdvantage || skipDisadvantage;
		let advantage = null;
		let disadvantage = null;

		if (skipNormal) {
			advantage = false;
			disadvantage = false;
		} else if (skipAdvantage) {
			advantage = true;
			disadvantage = false;
		} else if (skipDisadvantage) {
			advantage = false;
			disadvantage = true;
		} else if (shiftKey) {
			fastForward = true;
		} else if (altKey) {
			fastForward = true;
			advantage = true;
		} else if (ctrlKey) {
			fastForward = true;
			disadvantage = true;
		}

		const dialogOptions = {
			configure: !fastForward,
			fastForward: fastForward,
			event: ev,
		};

		const config = {
			event: ev,
		};

		if (advantage !== null) {
			config.advantage = advantage;
			dialogOptions.advantage = advantage;
		}
		if (disadvantage !== null) {
			config.disadvantage = disadvantage;
			dialogOptions.disadvantage = disadvantage;
		}

		// Initiative
		if (itemId === "check-initiative" || itemId === "initiative") {
			if (fastForward && typeof actor.rollInitiative === "function") {
				return actor.rollInitiative({ createCombatants: true, event: ev });
			}
			if (typeof actor.rollInitiativeDialog === "function") {
				return actor.rollInitiativeDialog({ event: ev, ...config }, dialogOptions);
			}
			if (typeof actor.rollInitiative === "function") {
				return actor.rollInitiative({ createCombatants: true, event: ev });
			}
			return;
		}

		// Saving Throws
		if (itemId.startsWith("save-")) {
			const ability = itemId.replace("save-", "");
			if (ability === "concentration" && typeof actor.rollConcentration === "function") {
				return actor.rollConcentration({ event: ev, legacy: false, ...config }, dialogOptions);
			}
			if (ability === "death" && typeof actor.rollDeathSave === "function") {
				return actor.rollDeathSave({ event: ev, legacy: false, ...config }, dialogOptions);
			}
			if (typeof actor.rollSavingThrow === "function") {
				return actor.rollSavingThrow({ ability, event: ev, ...config }, dialogOptions);
			}
			if (typeof actor.rollAbilitySave === "function") {
				return actor.rollAbilitySave(ability, dialogOptions);
			}
			return;
		}

		// Ability Checks
		if (itemId.startsWith("check-")) {
			const ability = itemId.replace("check-", "");
			if (ability === "concentration" && typeof actor.rollConcentration === "function") {
				return actor.rollConcentration({ event: ev, legacy: false, ...config }, dialogOptions);
			}
			if (ability === "death" && typeof actor.rollDeathSave === "function") {
				return actor.rollDeathSave({ event: ev, legacy: false, ...config }, dialogOptions);
			}
			if (typeof actor.rollAbilityCheck === "function") {
				return actor.rollAbilityCheck({ ability, event: ev, ...config }, dialogOptions);
			}
			if (typeof actor.rollAbilityTest === "function") {
				return actor.rollAbilityTest(ability, dialogOptions);
			}
			return;
		}

		// Skill Checks
		if (itemId.startsWith("skill-")) {
			const skill = itemId.replace("skill-", "");
			if (typeof actor.rollSkill === "function") {
				return actor.rollSkill({ skill, event: ev, ...config }, dialogOptions);
			}
			return;
		}

		// Short & Long Rests
		if (itemId === "rest-short") {
			if (typeof actor.shortRest === "function") {
				return actor.shortRest();
			}
			return;
		}

		if (itemId === "rest-long") {
			if (typeof actor.longRest === "function") {
				return actor.longRest();
			}
			return;
		}

		// Death Saves & Concentration
		if (itemId === "deathSave") {
			if (typeof actor.rollDeathSave === "function") {
				return actor.rollDeathSave({ event: ev, legacy: false, ...config }, dialogOptions);
			}
			return;
		}

		if (itemId === "concentration") {
			if (typeof actor.rollConcentration === "function") {
				return actor.rollConcentration({ event: ev, legacy: false, ...config }, dialogOptions);
			}
			return;
		}

		// Custom Macros
		if (itemId.startsWith("macro-")) {
			const macroId = itemId.replace("macro-", "");
			if (macroId === "help") return;
			const macro = (await fromUuid(macroId)) || game.macros?.get(macroId);
			if (macro) {
				return macro.execute({ actor, token: actor.token });
			}
			ui.notifications.warn(`Macro not found: ${macroId}`);
			return;
		}

		// Activity invocation if a specific activity is targeted
		if (itemId.startsWith("activity:")) {
			const parts = itemId.split(":");
			const actItemId = parts[1];
			const actId = parts[2];
			const actItem = actor.items.get(actItemId);
			const activity = actItem?.system?.activities?.get(actId);
			if (activity && typeof activity.use === "function") {
				return activity.use(config, dialogOptions);
			}
			if (actItem && typeof actItem.use === "function") {
				return actItem.use(config, dialogOptions);
			}
		}

		let item = actor.items.get(itemId);
		if (!item && this.findSyntheticItem) item = this.findSyntheticItem(actor, itemId);
		if (!item) {
			ui.notifications.warn(`Item not found: ${itemId}`);
			return;
		}

		// Consumable handling
		if (item.type === "consumable" && typeof item.consume === "function") {
			return item.consume();
		}

		// Standard item use via DnD5e 6.x item.use (prompts ActivityChoiceDialog when multiple usable activities exist)
		if (typeof item.use === "function") {
			return item.use(config, dialogOptions);
		}
		if (typeof item.roll === "function") {
			return item.roll(config, dialogOptions);
		}
	}

	async _toggleItemEquip(actor, itemId) {
		if (!actor?.isOwner && !game.user.isGM) {
			ui.notifications.warn(game.i18n.localize("NAH.UI.NoPermission"));
			return;
		}

		let item = actor.items.get(itemId);
		if (!item && this.findSyntheticItem) item = this.findSyntheticItem(actor, itemId);
		if (!item) return;

		const current = Boolean(item.system?.equipped);
		try {
			await item.update({ "system.equipped": !current });
		} catch (error) {
			console.warn("Action HUD | DnD5e equip toggle failed:", error);
			ui.notifications.warn(game.i18n.localize("NAH.Notifications.UpdateFailed"));
		}
	}

	findSyntheticItem(actor, itemId) {
		if (itemId === "res-legres") {
			return {
				id: "res-legres",
				name: game.i18n?.localize?.("DND5E.LegRes") || "Legendary Resistance",
				img: "icons/equipment/shield/heater-steel-crystal-red.webp",
				type: "feat",
				system: {
					description: {
						value: game.i18n?.localize?.("DND5E.LegRes") || "If the creature fails a saving throw, it can choose to succeed instead.",
					},
				},
			};
		}
		if (itemId === "res-legact") {
			return {
				id: "res-legact",
				name: game.i18n?.localize?.("DND5E.LegAct") || "Legendary Actions",
				img: "icons/skills/melee/weapons-crossed-swords-teal.webp",
				type: "feat",
				system: {
					description: {
						value: game.i18n?.localize?.("DND5E.LegAct") || "The creature can take legendary actions at the end of another creature's turn.",
					},
				},
			};
		}
		return null;
	}

	_processCustomItem(actor, savedItem, targetArray, isPersonal, meta = {}) {
		if (!savedItem || !savedItem.id || !savedItem.type) return;

		const item = ActionMenu.resolveItemFromCustomEntry(actor, savedItem);
		if (item) {
			const formatted = ActionMenu.formatDnd5eItemForHUD(item, actor, {
				isPersonal,
				meta,
				macroId: savedItem.type === "Macro" ? savedItem.id : null,
				flavor: savedItem.flavor || "",
			});
			if (formatted) {
				targetArray.push(formatted);
				return;
			}
		}

		super._processCustomItem(actor, savedItem, targetArray, isPersonal, meta);
	}
}

// Mix in ActionMenu and Helpers methods
Object.assign(DnD5eAdapter.prototype, ActionMenu, Helpers);
