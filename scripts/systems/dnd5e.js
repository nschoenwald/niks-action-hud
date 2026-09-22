import { BaseSystemAdapter, configProps, resolveConfiguredMax } from "./base.js";
import { MODULE_ID } from "../constants.js";

export class DnD5eAdapter extends BaseSystemAdapter {
	/* =========================================
	   HUD STATS & CONDITIONS
	   ========================================= */

	getStats(actor, config) {
		const stats = (config || []).map((attr) => {
			if (!attr.path || attr.path.trim() === "") {
				return {
					path: "",
					label: attr.label || "New Attribute",
					value: 3,
					max: 5,
					percent: 60,
					temp: 0,
					tempPercent: 0,
					subtype: "resource",
					...configProps(attr),
				};
			}

			if (attr.path === "combat.initiative") {
				const combatant = game.combat?.combatants?.find(
					(c) => c.actorId === actor.id,
				);
				const initiative = combatant?.initiative;
				const value = Number.isFinite(initiative) ? initiative : "—";
				return {
					path: attr.path,
					label: attr.label,
					value,
					max: 0,
					percent: 100,
					subtype: "resource",
					...configProps(attr),
				};
			}

			if (attr.path === "system.attributes.inspiration") {
				const inspired = Boolean(
					foundry.utils.getProperty(actor, "system.attributes.inspiration"),
				);
				const activeColor = attr.color || "#ffd166";
				const inactiveColor = "#6c6c6c";
				return {
					path: attr.path,
					label: attr.label,
					color: inspired ? activeColor : inactiveColor,
					value: inspired ? "★" : "☆",
					max: 1,
					percent: inspired ? 100 : 0,
					temp: 0,
					tempPercent: 0,
					subtype: "resource",
					...configProps(attr),
					style: attr.style || "badge",
					textColor: inspired ? (attr.textColor || "#2b1a00") : "#3d3d3d",
				};
			}

			let val = 0,
				max = 0,
				temp = 0;

			if (attr.path.startsWith("items.")) {
				const parts = attr.path.split(".");
				const itemId = parts[1];
				const prop = parts[2];
				const item = actor.items.get(itemId);
				if (item) {
					if (prop === "uses") {
						val = item.system.uses?.value ?? 0;
						max = item.system.uses?.max ?? 0;
					} else if (prop === "quantity") {
						val = item.system.quantity ?? 0;
						max = 0;
					}
				}
			} else {
				const rawVal = foundry.utils.getProperty(actor, attr.path);

				if (typeof rawVal === "object" && rawVal !== null) {
					val = rawVal.value ?? 0;
					if (rawVal.max !== undefined) max = rawVal.max;
					else max = foundry.utils.getProperty(actor, `${attr.path}.max`) ?? 0;
				} else {
					val = rawVal ?? 0;
					if (attr.path.endsWith(".value")) {
						const maxPath = attr.path.replace(".value", ".max");
						max = foundry.utils.getProperty(actor, maxPath) ?? 0;
					} else {
						max = foundry.utils.getProperty(actor, `${attr.path}.max`) ?? 0;
					}
				}

				if (attr.path === "system.attributes.hp")
					temp = actor.system.attributes.hp.temp || 0;
			}

			const configuredMax = resolveConfiguredMax(actor, attr);
			if (configuredMax !== null) max = configuredMax;

			let percent = 0;
			if (max > 0) percent = Math.clamp((val / max) * 100, 0, 100);
			else percent = val > 0 || val === 0 ? 100 : 0;

			let tempPercent = 0;
			if (max > 0) tempPercent = Math.clamp((temp / max) * 100, 0, 100);

			return {
				path: attr.path,
				label: attr.label,
				value: val,
				max: max,
				percent: percent,
				temp: temp,
				tempPercent: tempPercent,
				subtype: "resource",
				...configProps(attr),
			};
		});
		return stats;
	}

	getDefaultAttributes() {
		return [
			{
				path: "system.attributes.hp",
				label: "HP",
				color: "#e61c34",
				style: "bar",
			},
			{
				path: "system.attributes.ac.value",
				label: "AC",
				color: "#6a8caf",
				style: "badge",
				icon: "fas fa-shield-alt",
				textColor: "#ffffff",
				textStrokeColor: "#000000",
				badgeScale: 1.0,
			},
			{
				path: "system.attributes.movement.walk",
				label: "Speed",
				color: "#f4d03f",
				style: "badge",
				icon: "fas fa-running",
				textColor: "#000000",
				textStrokeColor: "#ffffff",
				badgeScale: 1.0,
			},
			{
				path: "system.attributes.inspiration",
				label: "Inspiration",
				color: "#ffd166",
				style: "badge",
				icon: "fas fa-star",
				textColor: "#2b1a00",
				textStrokeColor: "#fff6d5",
				badgeScale: 1.0,
			},
		];
	}

	getTrackableAttributes(actor) {
		const paths = [];
		const system = actor.system;

		paths.push({ path: "system.attributes.hp", label: "Hit Points (HP)" });
		paths.push({ path: "system.attributes.hp.temp", label: "Temporary HP" });

		if (system.attributes.ac) {
			paths.push({
				path: "system.attributes.ac.value",
				label: "Armor Class (AC)",
				style: "badge",
				icon: "fas fa-shield-alt",
				color: "#6a8caf",
				textColor: "#ffffff",
				textStrokeColor: "#000000",
			});
		}
		if (system.attributes.init) {
			paths.push({ path: "system.attributes.init.total", label: "Initiative" });
		}
		if (system.attributes.movement) {
			paths.push({
				path: "system.attributes.movement.walk",
				label: "Speed (Walk)",
				style: "badge",
				icon: "fas fa-running",
				color: "#f4d03f",
				textColor: "#000000",
				textStrokeColor: "#ffffff",
			});
		}
		if (system.attributes.spell?.dc) {
			paths.push({
				path: "system.attributes.spell.dc",
				label: "Spell DC",
				style: "badge",
				icon: "fas fa-hat-wizard",
				color: "#9966ff",
				textColor: "#ffffff",
				textStrokeColor: "#000000",
			});
		}
		if (system.attributes.exhaustion !== undefined) {
			paths.push({ path: "system.attributes.exhaustion", label: "Exhaustion" });
		}
		if (system.attributes.inspiration !== undefined) {
			paths.push({
				path: "system.attributes.inspiration",
				label: "Inspiration",
				style: "badge",
				icon: "fas fa-star",
				color: "#ffd166",
				textColor: "#000000",
				textStrokeColor: "#ffffff",
			});
		}

		if (system.abilities) {
			for (const [key, ability] of Object.entries(system.abilities)) {
				const label = CONFIG.DND5E?.abilities?.[key]?.label || key.toUpperCase();
				paths.push({
					path: `system.abilities.${key}.value`,
					label: `${label} Score`,
				});
				paths.push({
					path: `system.abilities.${key}.mod`,
					label: `${label} Mod`,
				});
				paths.push({
					path: `system.abilities.${key}.save.value`,
					label: `${label} Save`,
					style: "badge",
					icon: "fas fa-shield-alt",
					color: "#4ecdc4",
					textColor: "#ffffff",
					textStrokeColor: "#000000",
				});
			}
		}

		if (system.skills) {
			for (const [key, skill] of Object.entries(system.skills)) {
				const label = CONFIG.DND5E?.skills?.[key]?.label || skill.label || key;
				paths.push({
					path: `system.skills.${key}.total`,
					label: `${label}`,
					style: "badge",
					icon: "fas fa-dice-d20",
					color: "#6a8caf",
					textColor: "#ffffff",
					textStrokeColor: "#000000",
				});
			}
		}

		["primary", "secondary", "tertiary"].forEach((res) => {
			if (system.resources && system.resources[res]) {
				const label = system.resources[res].label || res.toUpperCase();
				paths.push({
					path: `system.resources.${res}`,
					label: `RES: ${label}`,
					style: "dots",
				});
			}
		});

		if (system.spells) {
			for (const [key, val] of Object.entries(system.spells)) {
				if (val.max > 0) {
					const label =
						key === "pact"
							? "Pact Slots"
							: `Spell LV${key.replace("spell", "")}`;
					paths.push({
						path: `system.spells.${key}`,
						label: label,
						style: "dots",
					});
				}
			}
		}

		if (system.details?.xp) {
			paths.push({ path: "system.details.xp", label: "Experience (XP)" });
		}

		if (actor.items) {
			actor.items.forEach((item) => {
				if (item.system.uses && item.system.uses.max > 0) {
					paths.push({
						path: `items.${item.id}.uses`,
						label: `ITEM: ${item.name} (Uses)`,
						style: "dots",
					});
				}
				if (item.system.quantity !== undefined) {
					paths.push({
						path: `items.${item.id}.quantity`,
						label: `QTY: ${item.name}`,
					});
				}
			});
		}

		return paths;
	}

	getConditions(actor) {
		const source = actor.appliedEffects ?? actor.effects ?? [];
		const exhaustionLevel =
			Number(foundry.utils.getProperty(actor, "system.attributes.exhaustion")) || 0;
		const seen = new Set();
		const conditions = [];
		let sawExhaustion = false;

		for (const e of source) {
			if (e.active === false) continue;
			// [V14 Compatible Only]: In Foundry V14, ActiveEffect#statuses is strictly a Set<string>.
			// Array support from V13 and earlier has been dropped.
			const hasStatus = e.statuses instanceof Set && e.statuses.size > 0;
			if (!e.isTemporary && !hasStatus) continue;

			const src = e.img || e.icon;
			if (!src) continue;
			if (e.id && seen.has(e.id)) continue;
			if (e.id) seen.add(e.id);

			const isExhaustion =
				(e.statuses instanceof Set && e.statuses.has("exhaustion")) ||
				e.flags?.core?.statusId === "exhaustion";
			if (isExhaustion) sawExhaustion = true;

			conditions.push({
				id: e.id || e.flags?.core?.statusId || e.slug || e.name || "unknown",
				src,
				name: e.name || e.label || "Unknown",
				value: isExhaustion && exhaustionLevel > 0 ? exhaustionLevel : e.value ?? null,
			});
		}

		if (!sawExhaustion && exhaustionLevel > 0) {
			const baseIcon =
				CONFIG.DND5E?.conditionTypes?.exhaustion?.icon ||
				CONFIG.statusEffects?.find((s) => s.id === "exhaustion")?.img;
			if (baseIcon) {
				const dot = baseIcon.lastIndexOf(".");
				conditions.push({
					id: "exhaustion",
					src: dot > -1
						? `${baseIcon.slice(0, dot)}-${exhaustionLevel}${baseIcon.slice(dot)}`
						: `${baseIcon}-${exhaustionLevel}`,
					name: game.i18n.localize("DND5E.Exhaustion") || "Exhaustion",
					value: exhaustionLevel,
				});
			}
		}

		return conditions;
	}

	async removeCondition(actor, conditionId) {
		let effect = actor.effects.get(conditionId);
		if (!effect) {
			effect = actor.effects.find((e) => e.statuses?.has(conditionId));
		}

		const isExhaustion =
			conditionId === "exhaustion" ||
			effect?.statuses?.has("exhaustion") ||
			effect?.flags?.core?.statusId === "exhaustion" ||
			effect?.name?.toLowerCase().includes("exhaustion");

		if (isExhaustion) {
			const currentLevel = actor.system.attributes?.exhaustion || 0;

			if (currentLevel > 1) {
				await actor.update({
					"system.attributes.exhaustion": currentLevel - 1,
				});
				ui.notifications.info(
					`Exhaustion level reduced to ${currentLevel - 1}.`,
				);
			} else {
				await actor.update({ "system.attributes.exhaustion": 0 });
				ui.notifications.info("Exhaustion removed.");
			}
			return;
		}

		if (effect) {
			await effect.delete();
			ui.notifications.info(`Removed condition: ${effect.name}`);
			return;
		}

		if (typeof actor.toggleStatusEffect === "function") {
			await actor.toggleStatusEffect(conditionId, { active: false });
		}
	}

	/* =========================================
	   STAT ROLL (DnD5e v6)
	   ========================================= */

	rollStat(actor, path, event) {
		const ev = event || {};
		const fastForward = ev.ctrlKey || ev.metaKey || false;
		const dialogOptions = { configure: !fastForward, event: ev };

		// system.abilities.{key}.save.value → saving throw
		const saveMatch = path.match(/^system\.abilities\.(\w+)\.save(?:\.value)?$/);
		if (saveMatch) {
			const abilityId = saveMatch[1];
			return actor.rollSavingThrow?.({ ability: abilityId, event: ev }, dialogOptions) ?? null;
		}

		// system.abilities.{key}.check.value or .value or .mod → ability check
		const abilityMatch = path.match(/^system\.abilities\.(\w+)\.(?:check\.value|value|mod)$/);
		if (abilityMatch) {
			const abilityId = abilityMatch[1];
			return actor.rollAbilityCheck?.({ ability: abilityId, event: ev }, dialogOptions) ?? null;
		}

		// system.skills.{key}.total/.value/.passive → skill roll
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
	   QUICK SLOT & ITEM USAGE (DnD5e v6)
	   ========================================= */

	resolveQuickSlotData(actor, itemId) {
		if (itemId.startsWith("save-")) {
			const key = itemId.replace("save-", "");
			const label = CONFIG.DND5E?.abilities?.[key]?.label || key.toUpperCase();
			const img = CONFIG.DND5E?.abilities?.[key]?.icon || "icons/svg/d20-highlight.svg";
			return { img, name: `${label} Save` };
		}
		if (itemId === "check-initiative") {
			return { img: "icons/svg/clockwork.svg", name: "Initiative" };
		}
		if (itemId.startsWith("check-")) {
			const key = itemId.replace("check-", "");
			const label = CONFIG.DND5E?.abilities?.[key]?.label || key.toUpperCase();
			const img = CONFIG.DND5E?.abilities?.[key]?.icon || "icons/svg/d20-grey.svg";
			return { img, name: `${label} Check` };
		}
		if (itemId.startsWith("skill-")) {
			const key = itemId.replace("skill-", "");
			const label = CONFIG.DND5E?.skills?.[key]?.label || actor?.system?.skills?.[key]?.label || key;
			const img = CONFIG.DND5E?.skills?.[key]?.icon || "icons/svg/book.svg";
			return { img, name: label };
		}
		if (itemId === "rest-short") {
			return { img: "icons/svg/regen.svg", name: "Short Rest" };
		}
		if (itemId === "rest-long") {
			return { img: "icons/svg/sleep.svg", name: "Long Rest" };
		}
		return null;
	}

	async useItem(actor, itemId, event = null) {
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
				const requiresShift = modifiers.includes("Shift") || key.includes("Shift");
				const requiresAlt = modifiers.includes("Alt") || key.includes("Alt");
				const requiresCtrl =
					modifiers.includes("Control") ||
					modifiers.includes("Meta") ||
					key.includes("Control") ||
					key.includes("Meta") ||
					key.includes("Os") ||
					key.includes("OS");

				if (requiresShift && !shiftKey) return false;
				if (requiresAlt && !altKey) return false;
				if (requiresCtrl && !ctrlKey) return false;

				if (
					key &&
					!["Shift", "Alt", "Control", "Meta", "Os", "OS"].some((k) =>
						key.includes(k),
					)
				) {
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
		} else {
			if (shiftKey && !altKey) advantage = true;
			else if (altKey && !shiftKey) disadvantage = true;
			else if (shiftKey && altKey) {
				advantage = false;
				disadvantage = false;
			}
			if (ctrlKey) fastForward = true;
		}

		const config = {
			event: ev,
		};
		if (advantage !== null) config.advantage = advantage;
		if (disadvantage !== null) config.disadvantage = disadvantage;

		const dialogOptions = {
			configure: !fastForward,
			event: ev,
		};

		// ----------------------------------------------------
		// [A] Utility actions (saves, checks, skills, rests, macros)
		// ----------------------------------------------------
		if (itemId === "macro-help") return;

		if (itemId.startsWith("macro-")) {
			const uuid = itemId.replace("macro-", "");
			const macro = (await fromUuid(uuid)) || game.macros.get(uuid);
			if (macro) {
				return macro.execute({ actor: actor, token: actor.token });
			} else {
				ui.notifications.warn("Macro not found (deleted?).");
				return;
			}
		}

		if (itemId.startsWith("save-")) {
			const abilityId = itemId.replace("save-", "");
			const rollConfig = { ability: abilityId, ...config };
			return actor.rollSavingThrow(rollConfig, dialogOptions);
		}

		if (itemId === "check-initiative") {
			return actor.rollInitiativeDialog(dialogOptions);
		}

		if (itemId.startsWith("check-")) {
			const abilityId = itemId.replace("check-", "");
			const rollConfig = { ability: abilityId, ...config };
			return actor.rollAbilityCheck(rollConfig, dialogOptions);
		}

		if (itemId.startsWith("skill-")) {
			const skillId = itemId.replace("skill-", "");
			const rollConfig = { skill: skillId, ...config };
			return actor.rollSkill(rollConfig, dialogOptions);
		}

		if (itemId === "rest-short") {
			return actor.shortRest({ dialog: true });
		}
		if (itemId === "rest-long") {
			return actor.longRest({ dialog: true });
		}

		if (itemId.startsWith("res-")) return;

		// ----------------------------------------------------
		// [B] Items / Features / Spells / Attacks (DnD5e v6 Activity Engine)
		// ----------------------------------------------------
		const parts = itemId.split("_");
		const realItemId = parts[0];
		const command = parts[1];

		let item = actor.items.get(realItemId);
		if (!item && this.findSyntheticItem) {
			item = this.findSyntheticItem(actor, realItemId);
		}

		if (!item) return;

		// Attack activity roll
		if (command === "attack") {
			const attackActivity =
				item.system.activities?.find?.((a) => a.type === "attack") ||
				item.system.activities?.contents?.find?.((a) => a.type === "attack") ||
				item.system.activities?.contents?.[0];
			if (attackActivity && typeof attackActivity.rollAttack === "function") {
				return attackActivity.rollAttack(config, dialogOptions);
			}
			return item.use(config, dialogOptions);
		}

		// Damage activity roll
		if (command === "damage") {
			const damageActivity =
				item.system.activities?.find?.((a) => a.type === "damage" || a.type === "attack" || a.type === "save") ||
				item.system.activities?.contents?.find?.((a) => a.type === "damage" || a.type === "attack" || a.type === "save") ||
				item.system.activities?.contents?.[0];
			if (damageActivity && typeof damageActivity.rollDamage === "function") {
				return damageActivity.rollDamage(config, dialogOptions);
			}
			return item.use(config, dialogOptions);
		}

		// Standard item use via v6 Activity Engine
		return item.use(config, dialogOptions);
	}

	async _toggleItemEquip(actor, itemId) {
		if (!actor?.isOwner && !game.user.isGM) {
			ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
			return;
		}

		let item = actor.items.get(itemId);
		if (!item && this.findSyntheticItem) item = this.findSyntheticItem(actor, itemId);
		if (!item) return;

		const current = Boolean(item.system?.equipped);
		try {
			await item.update({ "system.equipped": !current });
		} catch (error) {
			console.warn("ActionHUD | DnD5e equip toggle failed:", error);
			ui.notifications.warn(game.i18n.localize("IBHUD.Notifications.UpdateFailed"));
		}
	}
}

import * as ActionMenu from "./dnd5e/action-menu.js";
import * as Helpers from "./dnd5e/helpers.js";
import * as StatusEffects from "./dnd5e/status-effects.js";

Object.assign(DnD5eAdapter.prototype, ActionMenu, Helpers, StatusEffects);
