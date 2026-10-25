import { usesBadge } from "../../shared/row-model.js";
import { _activityHasUses, _getActivities, _hasItemUses } from "./activities.js";
import { _isLegendaryActionItem, _isLegendaryResistanceItem } from "./legendary.js";

/** Result for prepared dnd5e uses (`max` evaluated, `value` = max - spent); `extra` adds e.g. the activity. */
function limitedUsesResult(uses, extra = {}) {
	const max = Number(uses.max) || 0;
	return {
		hasUses: true,
		badge: usesBadge(`[${uses.value}${max ? `/${max}` : ""}]`, "muted"),
		isDepleted: max > 0 && uses.value === 0,
		value: uses.value,
		max: max || null,
		...extra,
	};
}

const rechargeOf = (uses) => uses.recovery.find((r) => r.period === "recharge");


/**
 * Resolves uses, recharge, cross-item consumption, or legendary action data for an item or feature.
 *
 * @param {Item5e} item
 * @param {Actor5e} actor
 * @param {Set<string>} [visited=new Set()]
 * @returns {{
 *   hasUses: boolean,
 *   hasRecharge?: boolean,
 *   isDepleted: boolean,
 *   badge?: { text: string, tone: string, icon?: string, title?: string },
 *   value?: number|null,
 *   max?: number|null,
 *   activationType?: string,
 *   activity?: object,
 *   consumedItem?: object
 * }}
 */
export function _resolveFeatureUses(item, actor, visited = new Set()) {
	if (!item) {
		return { hasUses: false, isDepleted: false, value: null, max: null };
	}
	if (visited.has(item.id)) {
		return { hasUses: false, isDepleted: false, value: null, max: null };
	}
	visited.add(item.id);

	const activities = _getActivities(item);

	// 0. Check if this is Legendary Resistance
	if (_isLegendaryResistanceItem(item)) {
		const legres = actor?.system?.resources?.legres;
		if (legres?.max > 0) {
			return {
				hasUses: true,
				badge: usesBadge(`[${legres.value}/${legres.max}]`, "muted"),
				isDepleted: legres.value === 0,
				value: legres.value,
				max: legres.max,
			};
		}
	}

	// 1. Check if this is a Legendary Action or consumes legendary actions
	const legact = actor?.system?.resources?.legact;
	const isLegendaryAct = _isLegendaryActionItem(item);

	if (isLegendaryAct && legact?.max > 0) {
		const remaining = legact.value;
		const max = legact.max;
		let cost = 1;
		const legActivity = activities.find((a) => a.activation?.type === "legendary" || a.consumption?.targets?.some((t) => t.type === "attribute" && t.target?.includes("legact")));
		if (legActivity) {
			const actCost = Number(legActivity.activation?.value);
			if (Number.isFinite(actCost) && actCost > 0) cost = actCost;
			else {
				const target = legActivity.consumption?.targets?.find((t) => t.type === "attribute" && t.target?.includes("legact"));
				if (target && Number(target.value) > 0) cost = Number(target.value);
			}
		}

		const isDepleted = remaining < cost || remaining === 0;
		const costPrefix = cost > 1 ? `[${cost}] ` : "";

		return {
			hasUses: true,
			badge: usesBadge(`${costPrefix}[${remaining}/${max}]`, "muted"),
			isDepleted,
			value: remaining,
			max: max,
			activationType: "legendary",
		};
	}

	// 2. Item-level recharge
	const uses = item.system?.uses;
	if (item.hasRecharge) {
		const isCharged = !item.isOnCooldown;
		const recVal = rechargeOf(uses).formula;
		if (isCharged) {
			const readyLabel = game.i18n.localize("NAH.Dnd5e.UsesReady");
			return {
				hasUses: true,
				hasRecharge: true,
				badge: usesBadge(`[${readyLabel}]`, "ready", { icon: "fa-bolt" }),
				isDepleted: false,
				value: 1,
				max: 1,
			};
		} else {
			const rechargeLabel = game.i18n.format("NAH.Dnd5e.RechargeOn", { val: recVal });
			return {
				hasUses: true,
				hasRecharge: true,
				badge: usesBadge(`[${rechargeLabel}]`, "recharge", { icon: "fa-dice-d6" }),
				isDepleted: true,
				value: 0,
				max: 1,
			};
		}
	}

	// 3. Item-level limited uses
	if (_hasItemUses(item)) return limitedUsesResult(uses);

	// 4. Activity-level recharge (excluding cast activities which belong to the cast spells)
	const nonCastActivities = activities.filter((a) => a.type !== "cast");
	const actRecharge = nonCastActivities.find((a) => a.uses && rechargeOf(a.uses));
	if (actRecharge) {
		const actUses = actRecharge.uses;
		const isCharged = actUses.value >= 1;
		const formula = rechargeOf(actUses).formula;
		const readyLabel = game.i18n.localize("NAH.Dnd5e.UsesReady");
		const rechargeLabel = game.i18n.format("NAH.Dnd5e.RechargeOn", { val: formula });
		return {
			hasUses: true,
			hasRecharge: true,
			badge: isCharged
				? usesBadge(`[${readyLabel}]`, "ready", { icon: "fa-bolt" })
				: usesBadge(`[${rechargeLabel}]`, "recharge", { icon: "fa-dice-d6" }),
			isDepleted: !isCharged,
			value: isCharged ? 1 : 0,
			max: 1,
			activity: actRecharge,
		};
	}

	// 5. Activity-level direct uses (excluding cast activities)
	const activitiesWithUses = nonCastActivities.filter(_activityHasUses);
	if (activitiesWithUses.length) {
		const [first] = activitiesWithUses;
		const allSame = activitiesWithUses.every((a) => a.uses.value === first.uses.value && a.uses.max === first.uses.max);
		if (allSame) return limitedUsesResult(first.uses, { activity: first });
		const summary = activitiesWithUses.map((a) => `${a.uses.value}/${Number(a.uses.max) || 0}`).join(", ");
		return {
			hasUses: true,
			badge: usesBadge(`[${summary}]`, "muted"),
			isDepleted: activitiesWithUses.every((a) => a.uses.value === 0),
			value: first.uses.value,
			max: Number(first.uses.max) || null,
			activity: first,
		};
	}

	// 6. Cross-item uses consumption (activity consumption target type === "itemUses", excluding cast activities)
	for (const act of nonCastActivities) {
		const targets = act.consumption?.targets || [];
		for (const t of targets) {
			if (t.type === "itemUses" && t.target && t.target !== item.id) {
				const consumedItem = actor?.items?.get(t.target);
				if (consumedItem && !visited.has(consumedItem.id)) {
					const res = _resolveFeatureUses(consumedItem, actor, visited);
					if (res.hasUses) {
						const costVal = Number(t.value) || 1;
						const costPrefix = costVal > 1 ? `[${costVal}] ` : "";
						const maxStr = res.max !== null && res.max !== undefined ? `/${res.max}` : "";
						const isDepleted = res.value !== null ? (res.value < costVal || res.value === 0) : res.isDepleted;
						return {
							hasUses: true,
							hasRecharge: res.hasRecharge,
							badge: usesBadge(`${costPrefix}[${res.value ?? 0}${maxStr}]`, "muted", { title: `${consumedItem.name}` }),
							isDepleted,
							value: res.value,
							max: res.max,
							consumedItem,
						};
					}
				}
			}
		}
	}

	// 7. Attribute / Resource consumption (activity consumption target type === "attribute", excluding cast activities)
	for (const act of nonCastActivities) {
		const targets = act.consumption?.targets || [];
		for (const t of targets) {
			if (t.type === "attribute" && t.target && actor?.system) {
				const rawPath = t.target.replace(/^system\./, "");
				// Check for legact first
				if (rawPath.includes("legact") && actor.system.resources?.legact?.max > 0) {
					const leg = actor.system.resources.legact;
					const rem = leg.value;
					const costVal = Number(t.value) || 1;
					const costPrefix = costVal > 1 ? `[${costVal}] ` : "";
					return {
						hasUses: true,
						badge: usesBadge(`${costPrefix}[${rem}/${leg.max}]`, "muted"),
						isDepleted: rem < costVal || rem === 0,
						value: rem,
						max: leg.max,
						activationType: "legendary",
					};
				}

				// Check primary/secondary/tertiary resources or other actor resources
				const resKeyMatch = rawPath.match(/^resources\.(primary|secondary|tertiary)/);
				if (resKeyMatch) {
					const rKey = resKeyMatch[1];
					const res = actor.system.resources?.[rKey];
					if (res && res.max > 0) {
						const rem = res.value ?? 0;
						const costVal = Number(t.value) || 1;
						const costPrefix = costVal > 1 ? `[${costVal}] ` : "";
						return {
							hasUses: true,
							badge: usesBadge(`${costPrefix}[${rem}/${res.max}]`, "accent"),
							isDepleted: rem < costVal || rem === 0,
							value: rem,
							max: res.max,
						};
					}
				}

				// General attribute with value & max
				let currentVal = foundry.utils.getProperty(actor.system, rawPath);
				if (typeof currentVal === "object" && currentVal !== null) {
					currentVal = currentVal.value;
				}
				const maxPath = `${rawPath.replace(/\.value$/, "")}.max`;
				const maxVal = foundry.utils.getProperty(actor.system, maxPath);
				const rem = typeof currentVal === "number" ? currentVal : Number(currentVal);
				const maxNum = Number(maxVal);
				const hasValidMax = Number.isFinite(maxNum) && maxNum > 0;
				if (hasValidMax || (Number.isFinite(rem) && rem > 0)) {
					const costVal = Number(t.value) || 1;
					const costPrefix = costVal > 1 ? `[${costVal}] ` : "";
					const maxStr = hasValidMax ? `/${maxNum}` : "";
					return {
						hasUses: true,
						badge: usesBadge(`${costPrefix}[${rem}${maxStr}]`, "accent"),
						isDepleted: hasValidMax ? rem < costVal || rem === 0 : false,
						value: rem,
						max: hasValidMax ? maxNum : null,
					};
				}
			} else if (t.type === "hitDice" && actor?.classes) {
				const totalHd = Object.values(actor.classes).reduce((acc, cls) => acc + cls.system.hd.value, 0);
				const maxHd = Object.values(actor.classes).reduce((acc, cls) => acc + cls.system.hd.max, 0);
				if (maxHd > 0) {
					const costVal = Number(t.value) || 1;
					const costPrefix = costVal > 1 ? `[${costVal}] ` : "";
					return {
						hasUses: true,
						badge: usesBadge(`${costPrefix}[${totalHd}/${maxHd} HD]`, "muted"),
						isDepleted: totalHd < costVal || totalHd === 0,
						value: totalHd,
						max: maxHd,
					};
				}
			}
		}
	}

	return {
		hasUses: false,
		hasRecharge: false,
		isDepleted: false,
		value: null,
		max: null,
	};
}
