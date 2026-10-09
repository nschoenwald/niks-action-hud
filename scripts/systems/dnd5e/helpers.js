/* =========================================
   INTERNAL HELPERS
   ========================================= */

export const escapeHtml = (value) =>
	String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

/**
 * Simplify a roll formula using dnd5e dice utilities if available, or basic evaluation.
 * @param {string} formula
 * @returns {string}
 */
export function _simplifyRollFormula(formula) {
	if (!formula) return "";
	if (globalThis.dnd5e?.dice?.simplifyRollFormula) {
		try {
			return globalThis.dnd5e.dice.simplifyRollFormula(formula, { preserveFlavor: false });
		} catch (err) {
			// ignore and continue
		}
	}
	try {
		const roll = new Roll(formula);
		if (roll.isDeterministic) {
			const total = roll.evaluateSync({ strict: false }).total;
			return String(total);
		}
	} catch (err) {
		// ignore
	}
	return formula;
}

/**
 * Compact a roll formula by stripping whitespace around mathematical operators.
 * e.g. "4d6 + 5" -> "4d6+5", "2d4 + 6d6 + 5" -> "2d4+6d6+5"
 * @param {string} formula
 * @returns {string}
 */
export function _compactFormula(formula) {
	if (!formula) return "";
	return String(formula)
		.replace(/\s*([+\-*/])\s*/g, "$1")
		.replace(/\s*\(\s*/g, "(")
		.replace(/\s*\)\s*/g, ")")
		.trim();
}

/**
 * Retrieve the primary (first) attack activity on an item.
 * @param {Item} item
 * @returns {Activity|null}
 */
export function _getPrimaryAttackActivity(item) {
	if (!item?.system?.activities) return null;
	if (typeof item.system.activities.getByType === "function") {
		const attacks = item.system.activities.getByType("attack");
		if (attacks?.length) return attacks[0];
	}
	const activities =
		item.system.activities.contents ||
		(Array.isArray(item.system.activities)
			? item.system.activities
			: Array.from(item.system.activities.values?.() ?? []));
	return activities.find((a) => a.type === "attack") || null;
}

/**
 * Retrieve the primary activity on an item if it deals damage.
 * @param {Item} item
 * @returns {Activity|null}
 */
export function _getPrimaryDamageActivity(item) {
	if (!item?.system?.activities) return null;
	const activities =
		item.system.activities.contents ||
		(Array.isArray(item.system.activities)
			? item.system.activities
			: Array.from(item.system.activities.values?.() ?? []));
	if (!activities.length) return null;

	const primary = activities.find((a) => a.type !== "cast") || activities[0];
	if (!primary || primary.type === "heal") return null;

	const hasDamage =
		(primary.damage?.parts && (primary.damage.parts.length > 0 || primary.damage.parts.size > 0)) ||
		primary.type === "damage" ||
		primary.type === "attack";
	if (hasDamage) return primary;

	if (typeof primary.getDamageConfig === "function") {
		try {
			const config = primary.getDamageConfig({});
			if (config?.rolls?.length > 0) return primary;
		} catch (_e) {}
	}

	return null;
}

/**
 * Check if a set, array, or string of damage types contains all valid damage types in CONFIG.DND5E.damageTypes.
 * @param {Set|Array|string} typesOrString
 * @returns {boolean}
 */
export function isAllDamageTypes(typesOrString) {
	if (!typesOrString) return false;
	const allConfigTypes = Object.keys(CONFIG.DND5E?.damageTypes || {});
	if (!allConfigTypes.length) return false;

	if (typesOrString instanceof Set) {
		return allConfigTypes.every((k) => typesOrString.has(k));
	}
	if (Array.isArray(typesOrString)) {
		const set = new Set(typesOrString.filter(Boolean));
		return allConfigTypes.every((k) => set.has(k)) || (set.size >= allConfigTypes.length && set.size >= 10);
	}
	if (typeof typesOrString === "string") {
		const str = typesOrString.trim();
		if (!str) return false;
		if (str.toLowerCase() === "any") return true;
		const strLower = str.toLowerCase();
		const allKeysPresent = allConfigTypes.every((k) => strLower.includes(k.toLowerCase()));
		if (allKeysPresent) return true;
		const allLabelsPresent = allConfigTypes.every((k) => {
			const label = CONFIG.DND5E?.damageTypes?.[k]?.label;
			const loc = label ? (game.i18n ? game.i18n.localize(label) : label) : "";
			return loc && strLower.includes(loc.toLowerCase());
		});
		return allLabelsPresent;
	}
	return false;
}

/**
 * Calculate total damage with all calculated bonuses from the primary activity.
 * Supports weapons, spells, features, etc.
 * Damage parts are grouped by damage type and formatted into a single string (e.g. "4d6+5 Slashing, 3d6 Acid").
 * @param {Item} item
 * @param {Actor} [actor]
 * @returns {{ damageFormula: string, damageType: string, damageText: string, damageHtml: string, parts: string[] }}
 */
export function _getItemDamage(item, actor = item?.actor) {
	let damageFormula = "";
	let damageType = "";
	let damageText = "";
	let damageHtml = "";
	const partTexts = [];

	try {
		const activity = _getPrimaryDamageActivity(item) || _getPrimaryAttackActivity(item);
		if (activity && typeof activity.getDamageConfig === "function") {
			const ammo = item.type === "weapon" ? _getDnd5eCurrentAmmo(item) : null;
			const damageConfig = activity.getDamageConfig(ammo ? { ammunition: ammo } : {});
			if (damageConfig?.rolls?.length) {
				const partsByType = new Map();

				for (const roll of damageConfig.rolls) {
					if (!roll?.parts?.length) continue;
					const rawFormula = roll.parts.filter(Boolean).join(" + ");
					const rollData = { ...(actor?.getRollData?.() ?? {}), ...(roll.data ?? {}) };
					let replaced = rawFormula;
					if (rawFormula.includes("@")) {
						replaced = Roll.replaceFormulaData(rawFormula, rollData, { missing: "0" });
					}

					const typeKeys = [];
					if (roll.options?.types?.length) {
						for (const t of roll.options.types) if (t) typeKeys.push(t);
					} else if (roll.options?.type) {
						typeKeys.push(roll.options.type);
					}

					let typeStr = "";
					if (isAllDamageTypes(typeKeys)) {
						typeStr = game.i18n ? game.i18n.localize("NAH.Damage.Any") : "any";
					} else {
						const typeLabels = typeKeys
							.map((k) => CONFIG.DND5E?.damageTypes?.[k]?.label ?? CONFIG.DND5E?.healingTypes?.[k]?.label ?? k)
							.map((label) => (game.i18n ? game.i18n.localize(label) : label))
							.filter(Boolean);

						typeStr = typeLabels.length > 0
							? (game.i18n?.getListFormatter
								? game.i18n.getListFormatter({ style: "narrow" }).format(typeLabels)
								: typeLabels.join(", "))
							: "";
					}

					if (!partsByType.has(typeStr)) {
						partsByType.set(typeStr, []);
					}
					partsByType.get(typeStr).push(replaced);
				}

				for (const [typeStr, formulas] of partsByType.entries()) {
					const combined = formulas.join(" + ");
					const simplified = _simplifyRollFormula(combined) || combined;
					const compact = _compactFormula(simplified);
					if (!compact) continue;
					partTexts.push(typeStr ? `${compact} ${typeStr}` : compact);
				}

				if (partTexts.length > 0) {
					damageText = partTexts.join(", ");
					damageHtml = `<span class="nah-info-sub" style="font-size:0.78em; letter-spacing:0.5px;">${damageText}</span>`;
					damageFormula = damageText;
					damageType = Array.from(partsByType.keys()).filter(Boolean).join(", ");
				}
			}
		}
	} catch (err) {
		console.warn(`Niks Action HUD | Error calculating damage for ${item?.name}:`, err);
	}

	// Fallback to item.labels if activity calculation yielded nothing
	if (!damageText) {
		const isWeapon = item.type === "weapon";
		const primaryDealsDamage = isWeapon || Boolean(_getPrimaryDamageActivity(item));
		if (primaryDealsDamage && item.labels?.damages?.length) {
			for (const d of item.labels.damages) {
				if (d.firstDamage === false) continue;
				const compact = _compactFormula(d.formula);
				if (!compact) continue;
				let typeLabel = "";
				if (d.damageType) {
					if (isAllDamageTypes(d.damageType)) {
						typeLabel = game.i18n ? game.i18n.localize("NAH.Damage.Any") : "any";
					} else {
						const raw = CONFIG.DND5E?.damageTypes?.[d.damageType]?.label ?? CONFIG.DND5E?.healingTypes?.[d.damageType]?.label ?? d.damageType;
						typeLabel = game.i18n ? game.i18n.localize(raw) : raw;
					}
				} else if (d.label && isAllDamageTypes(d.label)) {
					typeLabel = game.i18n ? game.i18n.localize("NAH.Damage.Any") : "any";
				} else if (activity?.damage?.parts && Array.from(activity.damage.parts).some((p) => isAllDamageTypes(p.types))) {
					typeLabel = game.i18n ? game.i18n.localize("NAH.Damage.Any") : "any";
				}
				partTexts.push(typeLabel ? `${compact} ${typeLabel}` : compact);
			}
			if (partTexts.length > 0) {
				damageText = partTexts.join(", ");
				damageHtml = `<span class="nah-info-sub" style="font-size:0.78em; letter-spacing:0.5px;">${damageText}</span>`;
				damageFormula = damageText;
			}
		}

		if (!damageText && isWeapon) {
			let formula = item.labels?.damage || item.system?.damage?.base?.formula || "";
			if (formula && formula.includes("@")) {
				const rollData = actor?.getRollData?.() ?? item.getRollData?.() ?? {};
				formula = Roll.replaceFormulaData(formula, rollData, { missing: "0" });
				formula = _simplifyRollFormula(formula);
			}
			const compact = _compactFormula(formula);
			let type = item.labels?.damageTypes || "";
			if (isAllDamageTypes(type) || isAllDamageTypes(item.system?.damage?.base?.types)) {
				type = game.i18n ? game.i18n.localize("NAH.Damage.Any") : "any";
			}
			if (compact) {
				damageText = type ? `${compact} ${type}` : compact;
				damageHtml = `<span class="nah-info-sub" style="font-size:0.78em; letter-spacing:0.5px;">${damageText}</span>`;
				damageFormula = damageText;
				damageType = type;
			}
		}
	}

	if (!damageType) {
		damageType = item.labels?.damageTypes || "";
	}
	if (isAllDamageTypes(damageType)) {
		damageType = game.i18n ? game.i18n.localize("NAH.Damage.Any") : "any";
	}

	return { damageFormula, damageType, damageText, damageHtml, parts: partTexts };
}

export const _getWeaponDamage = _getItemDamage;

export function _getWeapons(actor) {
	return actor.items
		.filter((i) => i.type === "weapon" && i.system.equipped)
		.map((i) => {
			const { damageFormula, damageType, damageText } = _getWeaponDamage(i, actor);
			const attackActivity = _getPrimaryAttackActivity(i);
			const toHit = attackActivity?.labels?.toHit || i.labels?.toHit || "";

			let displayHtml = "";

			// 2. Weapons with damage components
			const text = damageText || damageFormula;
			if (text) {
				displayHtml = `<span class="nah-info-sub" style="font-size:0.78em; letter-spacing:0.5px; display:inline-flex; align-items:center; line-height:1.1; white-space:nowrap;">${text}</span>`;
			}
			// 3. Weapons with attack roll but no base damage (e.g. net)
			else if (toHit) {
				displayHtml = `<span style="color:#aaa; font-size:0.9em;">Hit: ${toHit}</span>`;
			}
			// 4. Other special equipment with properties
			else {
				// Properties can be an Array or Set
				const props = Array.isArray(i.labels?.properties)
					? i.labels.properties.map((p) => p.label).join(", ")
					: i.labels?.properties || "";
				displayHtml = `<span style="color:#666; font-size:0.75em;">${props}</span>`;
			}

			return {
				id: i.id,
				name: i.name,
				img: i.img,
				description: i.system.description?.value || "",
				// Formatted HTML rendered in action cost container
				cost: displayHtml,
			};
		});
}

export function _getSpells(actor) {
	const items = actor.items.filter((i) => i.type === "spell");
	const spells = {};
	const labels = {};

	// Initialize levels 0-9 and construct tab labels
	for (let i = 0; i <= 9; i++) {
		spells[i] = [];
		if (i === 0) {
			labels[i] = "C";
		} else {
			const slots = actor.system.spells[`spell${i}`];
			if (slots && slots.max > 0) {
				labels[i] = `${i} (${slots.value}/${slots.max})`;
			} else {
				labels[i] = `${i}`;
			}
		}
	}

	// Format Warlock Pact Magic labels
	if (actor.system.spells.pact && actor.system.spells.pact.max > 0) {
		const pact = actor.system.spells.pact;
		labels[pact.level] = `P${pact.level} (${pact.value}/${pact.max})`;
	}

	items.forEach((i) => {
		const lvl = i.system.level ?? 0;

		if (spells[lvl]) {
			// Parse spell components (V, S, M)
			// [V14 Compatible Only]: In DnD5e v6+ / Foundry V14, system.properties is strictly a Set<string>.
			// Legacy Array support from older versions has been dropped.
			const compList = [];
			const props = i.system.properties;
			if (props instanceof Set) {
				if (props.has("vocal")) compList.push("V");
				if (props.has("somatic")) compList.push("S");
				if (props.has("material")) compList.push("M");
			}

			const compStr = compList.join(", ");
			const descRaw = i.system.description?.value || "";

			let displayCost = compStr;
			const cachedFor = i.getFlag?.("dnd5e", "cachedFor") ?? i.flags?.dnd5e?.cachedFor;
			let linkedAct = i.system?.linkedActivity;
			if (!linkedAct && cachedFor && actor) {
				try {
					const data = foundry.utils.parseUuid(cachedFor, { relative: actor });
					const [itemId, , activityId] = (data?.embedded ?? []).slice(-3);
					linkedAct = actor.items?.get(itemId)?.system?.activities?.get(activityId) ?? null;
				} catch (e) {
					linkedAct = null;
				}
			}
			let displayName = i.name;
			if (linkedAct && _activityHasUses(linkedAct)) {
				const actUses = linkedAct.uses;
				const isActRecharge = Boolean(
					linkedAct.hasRecharge ||
					actUses?.recovery?.[0]?.period === "recharge" ||
					actUses?.recovery?.some?.((r) => r.period === "recharge")
				);
				if (isActRecharge) {
					const isCharged = (actUses?.value ?? 0) >= 1 && !linkedAct.isOnCooldown;
					const formula = actUses?.recovery?.[0]?.formula || "6";
					const readyLabel = game.i18n.localize("NAH.Dnd5e.Ready");
					const rechargeLabel = game.i18n.localize("NAH.Dnd5e.Recharge");
					displayName = isCharged ? `${i.name} [${readyLabel}]` : `${i.name} [${rechargeLabel} ${formula}+]`;
				} else {
					const remaining = actUses?.value ?? 0;
					const rawMax = actUses?.max ?? 0;
					const maxNum = Number(rawMax);
					const hasValidMax = Number.isFinite(maxNum) ? maxNum > 0 : Boolean(rawMax);
					const maxStr = hasValidMax ? `/${rawMax}` : "";
					displayName = `${i.name} [${remaining}${maxStr}]`;
				}
			} else if (linkedAct?.item && _hasItemUses(linkedAct.item)) {
				const res = _resolveFeatureUses(linkedAct.item, actor);
				if (res.hasUses) {
					const maxStr = res.max !== null && res.max !== undefined ? `/${res.max}` : "";
					displayName = `${i.name} [${res.value ?? 0}${maxStr}]`;
				}
			} else if (_hasItemUses(i)) {
				const itemUses = i.system.uses;
				const remaining = itemUses?.value ?? 0;
				const rawMax = itemUses?.max ?? 0;
				const maxNum = Number(rawMax);
				const hasValidMax = Number.isFinite(maxNum) ? maxNum > 0 : Boolean(rawMax);
				const maxStr = hasValidMax ? `/${rawMax}` : "";
				displayName = `${i.name} [${remaining}${maxStr}]`;
			}

			spells[lvl].push({
				id: i.id,
				name: displayName,
				img: i.img,
				cost: compStr,
				description: descRaw,
			});
		}
	});

	return { items: spells, labels: labels };
}

/**
 * Check if a DnD5e item has item-level uses configured
 */
export function _hasItemUses(item) {
	if (!item) return false;
	const uses = item.system?.uses;
	return Boolean(
		item.hasLimitedUses ||
		(uses && (
			(Number(uses.max) > 0) ||
			(typeof uses.max === "string" && uses.max.trim() !== "" && uses.max !== "0") ||
			(Number(uses.value) > 0)
		))
	);
}

/**
 * Check if a DnD5e activity has its own activity uses configured
 */
export function _activityHasUses(activity) {
	if (!activity) return false;
	const actUses = activity.uses;
	if (!actUses) return false;
	const maxNum = Number(actUses.max);
	const hasMax = (Number.isFinite(maxNum) && maxNum > 0) ||
		(typeof actUses.max === "string" && actUses.max.trim() !== "" && actUses.max !== "0");
	const hasSourceMax = Boolean(
		activity._source?.uses?.max &&
		activity._source.uses.max !== "0" &&
		activity._source.uses.max !== 0
	);
	const hasValue = typeof actUses.value === "number" && actUses.value > 0;
	const hasTarget = Boolean(activity.consumption?.targets?.some((t) => t.type === "activityUses"));
	const hasRecharge = Boolean(
		activity.hasRecharge ||
		actUses.recovery?.some?.((r) => r.period === "recharge")
	);
	return Boolean(hasMax || hasSourceMax || hasValue || hasTarget || hasRecharge);
}

/**
 * Get all activities for an item safely across collections and arrays
 */
export function _getActivities(item) {
	if (!item?.system?.activities) return [];
	if (Array.isArray(item.system.activities)) return item.system.activities;
	if (Array.isArray(item.system.activities.contents)) return item.system.activities.contents;
	if (typeof item.system.activities.values === "function") return Array.from(item.system.activities.values());
	return Object.values(item.system.activities);
}

/**
 * Resolves the single activity with uses if an item has NO item uses, but exactly one activity with activity uses.
 * Returns null if the item has item uses, or if there isn't exactly one activity with activity uses.
 */
export function _getSingleActivityUses(item) {
	if (!item || _hasItemUses(item)) return null;
	const activities = _getActivities(item);
	const withUses = activities.filter((a) => a.type !== "cast" && _activityHasUses(a));
	if (withUses.length === 1) {
		return withUses[0];
	}
	return null;
}

/**
 * Checks if an item is a Legendary Resistance feature.
 */
export function _isLegendaryResistanceItem(item, actor) {
	if (!item) return false;
	const id = (item.identifier || item.system?.identifier || "").toLowerCase();
	if (id === "legendary-resistance" || id.startsWith("legendary-resistance")) return true;
	const name = (item.name || "").trim().toLowerCase();
	if (/^legendary resistance(\b|$)/i.test(name)) return true;

	const activities = _getActivities(item);
	if (activities.some((a) => a.consumption?.targets?.some((t) => t.type === "attribute" && t.target?.includes("legres")))) {
		return true;
	}
	return false;
}

/**
 * Checks if an item is a Legendary Action feature or action.
 */
export function _isLegendaryActionItem(item, actor) {
	if (!item) return false;
	if (_isLegendaryResistanceItem(item, actor)) return false;

	const name = (item.name || "").trim();
	if (/^legendary actions?$/i.test(name)) return false;

	const { activationType } = _getItemActivityData(item);
	if (activationType === "legendary") return true;
	if (item.system?.activation?.type === "legendary") return true;

	const activities = _getActivities(item);
	if (activities.some((a) => a.activation?.type === "legendary" || a.consumption?.targets?.some((t) => t.type === "attribute" && t.target?.includes("legact")))) {
		return true;
	}
	return false;
}

/**
 * Checks if an item is any legendary item (resistance or action).
 */
export function _isLegendaryItem(item, actor) {
	if (!item) return false;
	return _isLegendaryResistanceItem(item, actor) || _isLegendaryActionItem(item, actor);
}

/**
 * Checks if a creature/actor possesses legendary actions and/or legendary resistance.
 */
export function _actorHasLegendary(actor) {
	if (!actor) return false;
	const legact = actor.system?.resources?.legact;
	if (legact && (Number(legact.max) > 0 || Number(legact.value) > 0 || Number(legact.spent) > 0)) return true;
	const legres = actor.system?.resources?.legres;
	if (legres && (Number(legres.max) > 0 || Number(legres.value) > 0 || Number(legres.spent) > 0)) return true;

	if (actor.items) {
		for (const item of actor.items) {
			if (_isLegendaryResistanceItem(item, actor)) return true;
			if (_isLegendaryActionItem(item, actor)) return true;
		}
	}
	return false;
}

export const actorHasLegendary = _actorHasLegendary;

/**
 * Resolves uses, recharge, cross-item consumption, or legendary action data for an item or feature.
 *
 * @param {Item5e} item
 * @param {Actor5e} actor
 * @param {Set<string>} [visited=new Set()]
 * @returns {{
 *   hasUses: boolean,
 *   hasRecharge?: boolean,
 *   isExhausted: boolean,
 *   costHtml: string,
 *   value?: number|null,
 *   max?: number|null,
 *   isLegendary?: boolean,
 *   activationType?: string,
 *   activity?: object,
 *   consumedItem?: object
 * }}
 */
export function _resolveFeatureUses(item, actor, visited = new Set()) {
	if (!item) {
		return { hasUses: false, costHtml: `<span style="font-size:0.8em; color:#666;">-</span>`, isExhausted: false, value: null, max: null };
	}
	if (visited.has(item.id)) {
		return { hasUses: false, costHtml: `<span style="font-size:0.8em; color:#666;">-</span>`, isExhausted: false, value: null, max: null };
	}
	visited.add(item.id);

	const activities = _getActivities(item);
	const { activationType } = _getItemActivityData(item);

	// 0. Check if this is Legendary Resistance
	if (_isLegendaryResistanceItem(item, actor)) {
		const legres = actor?.system?.resources?.legres;
		if (legres && Number(legres.max) > 0) {
			const rem = legres.value ?? (legres.max - (legres.spent ?? 0));
			const max = legres.max ?? 0;
			const isExhausted = rem === 0;
			return {
				hasUses: true,
				costHtml: `<span style="font-size:0.8em; color:#aaa;">[${rem}/${max}]</span>`,
				usesBracket: `<span style="color:#aaa;">[${rem}/${max}]</span>`,
				isExhausted,
				value: rem,
				max,
				isLegendaryResistance: true,
			};
		}
	}

	// 1. Check if this is a Legendary Action or consumes legendary actions
	const legact = actor?.system?.resources?.legact;
	const isLegendaryAct = _isLegendaryActionItem(item, actor);

	if (isLegendaryAct && legact && legact.max > 0) {
		const remaining = legact.value ?? (legact.max - (legact.spent ?? 0));
		const max = legact.max ?? 0;
		let cost = 1;
		const legActivity = activities.find((a) => a.activation?.type === "legendary" || a.consumption?.targets?.some((t) => t.type === "attribute" && t.target?.includes("legact")));
		if (legActivity) {
			const actCost = Number(legActivity.activation?.value);
			if (Number.isFinite(actCost) && actCost > 0) cost = actCost;
			else {
				const target = legActivity.consumption?.targets?.find((t) => t.type === "attribute" && t.target?.includes("legact"));
				if (target && Number(target.value) > 0) cost = Number(target.value);
			}
		} else if (item.system?.activation?.type === "legendary") {
			const sysCost = Number(item.system.activation.cost ?? item.system.activation.value);
			if (Number.isFinite(sysCost) && sysCost > 0) cost = sysCost;
		}

		const isExhausted = remaining < cost || remaining === 0;
		const costPrefix = cost > 1 ? `[${cost}] ` : "";
		const costHtml = `<span style="font-size:0.8em; color:#aaa;">${costPrefix}[${remaining}/${max}]</span>`;
		const usesBracket = `<span style="color:#aaa;">${costPrefix}[${remaining}/${max}]</span>`;

		return {
			hasUses: true,
			costHtml,
			usesBracket,
			isExhausted,
			value: remaining,
			max: max,
			isLegendary: true,
			activationType: "legendary",
		};
	}

	// 2. Item-level recharge
	const recharge = item.system?.recharge;
	const uses = item.system?.uses;
	const hasItemRecharge = Boolean(
		(recharge && recharge.value) ||
		item.hasRecharge ||
		(uses?.recovery?.[0]?.period === "recharge")
	);
	if (hasItemRecharge) {
		const isCharged = recharge?.charged ?? (!item.isOnCooldown);
		const recVal = recharge?.value ?? (uses?.recovery?.[0]?.formula || "6");
		if (isCharged) {
			const readyLabel = game.i18n.localize("NAH.Dnd5e.Ready");
			return {
				hasUses: true,
				hasRecharge: true,
				costHtml: `<span style="color:#4ecdc4; font-size:0.8em; font-weight:bold;"><i class="fas fa-bolt"></i> [${readyLabel}]</span>`,
				usesBracket: `<span style="color:#4ecdc4;"><i class="fas fa-bolt"></i> [${readyLabel}]</span>`,
				isExhausted: false,
				value: 1,
				max: 1,
			};
		} else {
			const rechargeLabel = game.i18n.localize("NAH.Dnd5e.Recharge");
			return {
				hasUses: true,
				hasRecharge: true,
				costHtml: `<span style="color:#ff6b6b; font-size:0.8em;"><i class="fas fa-dice-d6"></i> [${rechargeLabel} ${recVal}+]</span>`,
				usesBracket: `<span style="color:#ff6b6b;"><i class="fas fa-dice-d6"></i> [${rechargeLabel} ${recVal}+]</span>`,
				isExhausted: true,
				value: 0,
				max: 1,
			};
		}
	}

	// 3. Item-level limited uses
	if (_hasItemUses(item)) {
		const remaining = uses?.value ?? 0;
		const rawMax = uses?.max ?? 0;
		const maxNum = Number(rawMax);
		const hasValidMax = Number.isFinite(maxNum) ? maxNum > 0 : Boolean(rawMax);
		const maxStr = hasValidMax ? `/${rawMax}` : "";
		return {
			hasUses: true,
			costHtml: `<span style="font-size:0.8em; color:#aaa;">[${remaining}${maxStr}]</span>`,
			usesBracket: `<span style="color:#aaa;">[${remaining}${maxStr}]</span>`,
			isExhausted: hasValidMax && remaining === 0,
			value: remaining,
			max: hasValidMax ? maxNum : null,
		};
	}

	// 4. Activity-level recharge (excluding cast activities which belong to the cast spells)
	const nonCastActivities = activities.filter((a) => a.type !== "cast");
	const actRecharge = nonCastActivities.find((a) => Boolean(
		a.hasRecharge || a.uses?.recovery?.some((r) => r.period === "recharge")
	));
	if (actRecharge) {
		const actUses = actRecharge.uses;
		const isCharged = (actUses?.value ?? 0) >= 1 && !actRecharge.isOnCooldown;
		const formula = actUses?.recovery?.[0]?.formula || "6";
		const readyLabel = game.i18n.localize("NAH.Dnd5e.Ready");
		const rechargeLabel = game.i18n.localize("NAH.Dnd5e.Recharge");
		return {
			hasUses: true,
			hasRecharge: true,
			costHtml: isCharged
				? `<span style="color:#4ecdc4; font-size:0.8em; font-weight:bold;"><i class="fas fa-bolt"></i> [${readyLabel}]</span>`
				: `<span style="color:#ff6b6b; font-size:0.8em;"><i class="fas fa-dice-d6"></i> [${rechargeLabel} ${formula}+]</span>`,
			usesBracket: isCharged
				? `<span style="color:#4ecdc4;"><i class="fas fa-bolt"></i> [${readyLabel}]</span>`
				: `<span style="color:#ff6b6b;"><i class="fas fa-dice-d6"></i> [${rechargeLabel} ${formula}+]</span>`,
			isExhausted: !isCharged,
			value: isCharged ? 1 : 0,
			max: 1,
			activity: actRecharge,
		};
	}

	// 5. Activity-level direct uses (excluding cast activities)
	const activitiesWithUses = nonCastActivities.filter(_activityHasUses);
	if (activitiesWithUses.length === 1) {
		const actWithUses = activitiesWithUses[0];
		const actUses = actWithUses.uses;
		const remaining = actUses?.value ?? 0;
		const rawMax = actUses?.max ?? 0;
		const maxNum = Number(rawMax);
		const hasValidMax = Number.isFinite(maxNum) ? maxNum > 0 : Boolean(rawMax);
		const maxStr = hasValidMax ? `/${rawMax}` : "";
		return {
			hasUses: true,
			costHtml: `<span style="font-size:0.8em; color:#aaa;">[${remaining}${maxStr}]</span>`,
			usesBracket: `<span style="color:#aaa;">[${remaining}${maxStr}]</span>`,
			isExhausted: hasValidMax && remaining === 0,
			value: remaining,
			max: hasValidMax ? maxNum : null,
			activity: actWithUses,
		};
	} else if (activitiesWithUses.length > 1) {
		const allSame = activitiesWithUses.every(
			(a) => a.uses?.value === activitiesWithUses[0].uses?.value && a.uses?.max === activitiesWithUses[0].uses?.max
		);
		if (allSame) {
			const actUses = activitiesWithUses[0].uses;
			const remaining = actUses?.value ?? 0;
			const rawMax = actUses?.max ?? 0;
			const maxNum = Number(rawMax);
			const hasValidMax = Number.isFinite(maxNum) ? maxNum > 0 : Boolean(rawMax);
			const maxStr = hasValidMax ? `/${rawMax}` : "";
			return {
				hasUses: true,
				costHtml: `<span style="font-size:0.8em; color:#aaa;">[${remaining}${maxStr}]</span>`,
				usesBracket: `<span style="color:#aaa;">[${remaining}${maxStr}]</span>`,
				isExhausted: hasValidMax && remaining === 0,
				value: remaining,
				max: hasValidMax ? maxNum : null,
				activity: activitiesWithUses[0],
			};
		}
		const summary = activitiesWithUses.map((a) => `${a.uses?.value ?? 0}/${a.uses?.max ?? 0}`).join(", ");
		return {
			hasUses: true,
			costHtml: `<span style="font-size:0.8em; color:#aaa;">[${summary}]</span>`,
			usesBracket: `<span style="color:#aaa;">[${summary}]</span>`,
			isExhausted: activitiesWithUses.every((a) => (a.uses?.value ?? 0) === 0),
			value: activitiesWithUses[0].uses?.value ?? 0,
			max: Number(activitiesWithUses[0].uses?.max) || null,
			activity: activitiesWithUses[0],
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
						const isExhausted = res.value !== null ? (res.value < costVal || res.value === 0) : res.isExhausted;
						return {
							hasUses: true,
							hasRecharge: res.hasRecharge,
							costHtml: `<span style="font-size:0.8em; color:#aaa;" title="${consumedItem.name}">${costPrefix}[${res.value ?? 0}${maxStr}]</span>`,
							usesBracket: `<span style="color:#aaa;" title="${consumedItem.name}">${costPrefix}[${res.value ?? 0}${maxStr}]</span>`,
							isExhausted,
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
					const rem = leg.value ?? (leg.max - (leg.spent ?? 0));
					const costVal = Number(t.value) || 1;
					const costPrefix = costVal > 1 ? `[${costVal}] ` : "";
					return {
						hasUses: true,
						costHtml: `<span style="font-size:0.8em; color:#aaa;">${costPrefix}[${rem}/${leg.max}]</span>`,
						usesBracket: `<span style="color:#aaa;">${costPrefix}[${rem}/${leg.max}]</span>`,
						isExhausted: rem < costVal || rem === 0,
						value: rem,
						max: leg.max,
						isLegendary: true,
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
							costHtml: `<span style="font-size:0.8em; color:#00dbff;">${costPrefix}[${rem}/${res.max}]</span>`,
							usesBracket: `<span style="color:#00dbff;">${costPrefix}[${rem}/${res.max}]</span>`,
							isExhausted: rem < costVal || rem === 0,
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
						costHtml: `<span style="font-size:0.8em; color:#00dbff;">${costPrefix}[${rem}${maxStr}]</span>`,
						usesBracket: `<span style="color:#00dbff;">${costPrefix}[${rem}${maxStr}]</span>`,
						isExhausted: hasValidMax ? rem < costVal || rem === 0 : false,
						value: rem,
						max: hasValidMax ? maxNum : null,
					};
				}
			} else if (t.type === "hitDice" && actor?.classes) {
				const totalHd = Object.values(actor.classes).reduce((acc, cls) => acc + (cls.system?.hd?.value ?? 0), 0);
				const maxHd = Object.values(actor.classes).reduce((acc, cls) => acc + (cls.system?.hd?.max ?? cls.system?.levels ?? 0), 0);
				if (maxHd > 0) {
					const costVal = Number(t.value) || 1;
					const costPrefix = costVal > 1 ? `[${costVal}] ` : "";
					return {
						hasUses: true,
						costHtml: `<span style="font-size:0.8em; color:#aaa;">${costPrefix}[${totalHd}/${maxHd} HD]</span>`,
						usesBracket: `<span style="color:#aaa;">${costPrefix}[${totalHd}/${maxHd} HD]</span>`,
						isExhausted: totalHd < costVal || totalHd === 0,
						value: totalHd,
						max: maxHd,
					};
				}
			}
		}
	}

	// 8. Legacy item consume fallback (item.system.consume)
	if (item.system?.consume?.target) {
		const consume = item.system.consume;
		if (consume.type === "charges") {
			const consumedItem = actor?.items?.get(consume.target);
			if (consumedItem && !visited.has(consumedItem.id)) {
				const res = _resolveFeatureUses(consumedItem, actor, visited);
				if (res.hasUses) {
					const costVal = Number(consume.amount) || 1;
					const costPrefix = costVal > 1 ? `[${costVal}] ` : "";
					const maxStr = res.max !== null && res.max !== undefined ? `/${res.max}` : "";
					return {
						hasUses: true,
						hasRecharge: res.hasRecharge,
						costHtml: `<span style="font-size:0.8em; color:#aaa;" title="${consumedItem.name}">${costPrefix}[${res.value ?? 0}${maxStr}]</span>`,
						usesBracket: `<span style="color:#aaa;" title="${consumedItem.name}">${costPrefix}[${res.value ?? 0}${maxStr}]</span>`,
						isExhausted: res.value !== null ? (res.value < costVal || res.value === 0) : res.isExhausted,
						value: res.value,
						max: res.max,
						consumedItem,
					};
				}
			}
		} else if (consume.type === "attribute" && actor?.system) {
			const rawPath = consume.target.replace(/^system\./, "");
			if (rawPath.includes("legact") && actor.system.resources?.legact?.max > 0) {
				const leg = actor.system.resources.legact;
				const rem = leg.value ?? (leg.max - (leg.spent ?? 0));
				const costVal = Number(consume.amount) || 1;
				const costPrefix = costVal > 1 ? `[${costVal}] ` : "";
				return {
					hasUses: true,
					costHtml: `<span style="font-size:0.8em; color:#aaa;">${costPrefix}[${rem}/${leg.max}]</span>`,
					usesBracket: `<span style="color:#aaa;">${costPrefix}[${rem}/${leg.max}]</span>`,
					isExhausted: rem < costVal || rem === 0,
					value: rem,
					max: leg.max,
					isLegendary: true,
					activationType: "legendary",
				};
			}
			const val = foundry.utils.getProperty(actor.system, `${rawPath}.value`) ?? foundry.utils.getProperty(actor.system, rawPath) ?? 0;
			const maxObj = foundry.utils.getProperty(actor.system, `${rawPath.replace(/\.value$/, "")}.max`);
			const maxNum = Number(maxObj);
			const hasValidMax = Number.isFinite(maxNum) && maxNum > 0;
			if (hasValidMax || (typeof val === "number" && val > 0)) {
				const costVal = Number(consume.amount) || 1;
				const costPrefix = costVal > 1 ? `[${costVal}] ` : "";
				const maxStr = hasValidMax ? `/${maxNum}` : "";
				return {
					hasUses: true,
					costHtml: `<span style="font-size:0.8em; color:#00dbff;">${costPrefix}[${val}${maxStr}]</span>`,
					usesBracket: `<span style="color:#00dbff;">${costPrefix}[${val}${maxStr}]</span>`,
					isExhausted: hasValidMax ? val < costVal || val === 0 : false,
					value: val,
					max: hasValidMax ? maxNum : null,
				};
			}
		}
	}

	return {
		hasUses: false,
		hasRecharge: false,
		costHtml: `<span style="font-size:0.8em; color:#666;">-</span>`,
		isExhausted: false,
		value: null,
		max: null,
	};
}

// Features and resources list
export function _getFeatures(actor) {
	const items = [];
	const res = actor.system.resources;
	if (res) {
		["primary", "secondary", "tertiary"].forEach((r) => {
			if (res[r] && res[r].max > 0 && res[r].label) {
				items.push({
					id: `res-${r}`,
					name: `${res[r].label} <span style="color:#00dbff; font-size:0.85em">[${res[r].value}/${res[r].max}]</span>`,
					img: "icons/svg/light.svg",
					favoritable: false,
					cost: "",
					description: "Resource Tracked",
				});
			}
		});
	}
	actor.items.forEach((i) => {
		if (i.type === "feat" || i.type === "race" || i.type === "background") {
			const resolved = _resolveFeatureUses(i, actor);
			if (resolved.hasUses || resolved.hasRecharge) {
				const displayName = resolved.usesBracket
					? `${i.name} ${resolved.usesBracket}`
					: i.name;
				items.push({
					id: i.id,
					name: displayName,
					img: i.img,
					cost: "",
					description: i.system.description?.value || "",
				});
			}
		}
	});
	return items;
}

// Consumables list
export function _getConsumables(actor) {
	const items = [];

	actor.items.forEach((i) => {
		// Consumable or loot items with quantity
		if (
			i.type === "consumable" ||
			(i.type === "loot" && i.system.quantity > 0)
		) {
			items.push({
				id: i.id,
				name: i.name,
				img: i.img,
				cost: `x${i.system.quantity}`, // Quantity display badge
			});
		}
	});

	return items;
}

// Update uses on item or activity
export async function updateAttribute(actor, path, input) {
	// Item and activity uses update handling
	if (path.startsWith("items.")) {
		const parts = path.split(".");
		const itemId = parts[1];
		const property = parts[2]; // 'uses' or 'quantity'

		const item = actor.items.get(itemId);
		if (!item) return;

		let current = 0;
		let max = 0;
		let updatePath = "";

		if (property === "uses") {
			const isSpentLogic = item.system.uses?.spent !== undefined;
			current = item.system.uses?.value ?? 0;
			max = item.system.uses?.max ?? 0;
			updatePath = isSpentLogic ? "system.uses.spent" : "system.uses.value";

			if ((!max || max === 0) && item.type === "spell" && item.system?.linkedActivity?.uses) {
				const linkedAct = item.system.linkedActivity;
				const actSpentLogic = linkedAct.uses?.spent !== undefined;
				const actCurrent = linkedAct.uses?.value ?? 0;
				const actMax = Number(linkedAct.uses?.max) || 0;
				let newValue = actCurrent;
				if (input.startsWith("+") || input.startsWith("-")) {
					newValue += Number(input);
				} else {
					newValue = Number(input);
				}
				if (actMax > 0) newValue = Math.clamp(newValue, 0, actMax);
				else newValue = Math.max(0, newValue);

				const actUpdateVal = actSpentLogic ? Math.max(0, actMax - newValue) : newValue;
				const actPath = actSpentLogic ? "uses.spent" : "uses.value";
				if (linkedAct.item && typeof linkedAct.item.updateActivity === "function") {
					return await linkedAct.item.updateActivity(linkedAct.id, { [actPath]: actUpdateVal });
				}
			} else if ((!max || max === 0)) {
				const resolved = _resolveFeatureUses(item, actor);
				if (resolved?.consumedItem) {
					return await updateAttribute(actor, `items.${resolved.consumedItem.id}.uses`, input);
				} else if (resolved?.isLegendary && actor.system?.resources?.legact?.max > 0) {
					return await updateAttribute(actor, "system.resources.legact.value", input);
				} else if (resolved?.activity && typeof item.updateActivity === "function") {
					const act = resolved.activity;
					const actSpentLogic = act.uses?.spent !== undefined;
					const actCurrent = act.uses?.value ?? 0;
					const actMax = Number(act.uses?.max) || 0;
					let newValue = actCurrent;
					if (String(input).startsWith("+") || String(input).startsWith("-")) {
						newValue += Number(input);
					} else {
						newValue = Number(input);
					}
					if (actMax > 0) newValue = Math.clamp(newValue, 0, actMax);
					else newValue = Math.max(0, newValue);

					const actUpdateVal = actSpentLogic ? Math.max(0, actMax - newValue) : newValue;
					const actPath = actSpentLogic ? "uses.spent" : "uses.value";
					return await item.updateActivity(act.id, { [actPath]: actUpdateVal });
				} else if (typeof _getSingleActivityUses === "function") {
					const singleAct = _getSingleActivityUses(item);
					if (singleAct) {
						const actSpentLogic = singleAct.uses?.spent !== undefined;
						const actCurrent = singleAct.uses?.value ?? 0;
						const actMax = Number(singleAct.uses?.max) || 0;
						let newValue = actCurrent;
						if (input.startsWith("+") || input.startsWith("-")) {
							newValue += Number(input);
						} else {
							newValue = Number(input);
						}
						if (actMax > 0) newValue = Math.clamp(newValue, 0, actMax);
						else newValue = Math.max(0, newValue);

						const actUpdateVal = actSpentLogic ? Math.max(0, actMax - newValue) : newValue;
						const actPath = actSpentLogic ? "uses.spent" : "uses.value";
						if (typeof item.updateActivity === "function") {
							return await item.updateActivity(singleAct.id, { [actPath]: actUpdateVal });
						}
					}
				}
			}
		} else if (property === "quantity") {
			current = item.system.quantity ?? 0;
			max = 9999;
			updatePath = "system.quantity";
		}

		let newValue = current;
		if (input.startsWith("+") || input.startsWith("-")) {
			newValue += Number(input);
		} else {
			newValue = Number(input);
		}

		if (max > 0) newValue = Math.clamp(newValue, 0, max);
		else newValue = Math.max(0, newValue);

		const remainingToSpent = property === "uses" && updatePath === "system.uses.spent";
		await item.update({ [updatePath]: remainingToSpent ? Math.max(0, max - newValue) : newValue });
	} else if (path.includes("resources.legact") || path.includes("resources.legres")) {
		const resKey = path.includes("resources.legact") ? "legact" : "legres";
		const res = actor.system?.resources?.[resKey];
		if (res) {
			const current = res.value ?? (res.max - (res.spent ?? 0));
			const max = res.max ?? 0;
			let newValue = current;
			const inputStr = String(input ?? "").trim();
			if (inputStr.startsWith("+") || inputStr.startsWith("-")) {
				newValue += Number(inputStr);
			} else {
				newValue = Number(inputStr);
			}
			if (max > 0) newValue = Math.clamp(newValue, 0, max);
			else newValue = Math.max(0, newValue);

			const spent = max > 0 ? Math.max(0, max - newValue) : 0;
			await actor.update({ [`system.resources.${resKey}.spent`]: spent });
		}
	}
}

/**
 * Generate action activation type badge element
 */
export function _getActivationIcon(activationType) {
	if (!activationType) return "";
	const type = String(activationType).toLowerCase();

	// Activation badge label mapping
	let label = "";
	let classType = "";

	switch (type) {
		case "action":
			label = "A";
			classType = "action";
			break;
		case "bonus":
			label = "BA";
			classType = "bonus";
			break;
		case "reaction":
			label = "R";
			classType = "reaction";
			break;
		case "minute":
		case "hour":
		case "day":
			label = "T";
			classType = "time";
			break;
		case "legendary":
			label = "L";
			classType = "legendary";
			break;
		case "lair":
			label = "LA";
			classType = "lair";
			break;
		case "crew":
			label = "C";
			classType = "crew";
			break;
		case "special":
			label = "S";
			classType = "special";
			break;
		default:
			label = type.substring(0, 1).toUpperCase();
			classType = "default";
			break;
	}

	// Render nah-act-icon with activation type class (action, bonus, reaction, etc.)
	return `<span class="nah-act-icon ${classType}" title="${type}">${label}</span>`;
}

/**
 * Extract activation data from item activities
 */
export function _getItemActivityData(item) {
	let activationType = "";
	let activationIcon = "";

	// 1. Inspect DnD5e 6.x activities
	const activities = _getActivities(item);
	if (activities.length > 0) {
		const mainActivity = activities.find((a) => a.activation?.type) || activities[0];
		if (mainActivity?.activation?.type) {
			activationType = mainActivity.activation.type;
		}
	} else if (item.system?.activation) {
		activationType = item.system.activation.type;
	}

	// Generate badge markup
	if (activationType) {
		activationIcon = _getActivationIcon(activationType);
	}

	return { activationType, activationIcon };
}

/* -----------------------------------------
   AMMUNITION HELPERS (D&D 5e)
   ----------------------------------------- */

export function _getDnd5eCurrentAmmo(weapon) {
	const attackActivity = _getPrimaryAttackActivity(weapon) || weapon.system?.activities?.contents?.[0];
	if (!attackActivity) return null;

	let ammoId = weapon.getFlag("dnd5e", `last.${attackActivity.id}.ammunition`);
	if (!ammoId) {
		const options = weapon.system?.ammunitionOptions ?? [];
		ammoId = options[0]?.value;
	}
	if (!ammoId) return null;
	return weapon.actor?.items?.get(ammoId) || null;
}

export function _formatRange(item) {
	if (item.labels?.range) return item.labels.range;

	const range = item.system?.range;
	if (!range?.units) return "";

	const u = range.units;
	if (u === "touch") return "Touch";
	if (u === "self") return "Self";
	if (u === "spec" || u === "any") return range.special || "Special";

	if (!range.value) return "";
	if (range.long) return `${range.value}/${range.long} ${u}`;
	return `${range.value} ${u}`;
}

export function _buildDnd5eAmmoHtml(weapon) {
	// [V14 Compatible Only]: In DnD5e v6+ (Foundry V14), weapon.system.properties is strictly a Set<string>
	const usesAmmo = weapon.system.properties instanceof Set && weapon.system.properties.has("amm");
	if (!usesAmmo) return "";

	const weaponId = weapon.id;
	const ammo = _getDnd5eCurrentAmmo(weapon);

	if (!ammo) {
		return `
			<div style="display:flex; align-items:center; gap:3px; margin-top:2px;">
				<span style="
					background: rgba(80, 30, 30, 0.8);
					border: 1px solid #a44;
					border-radius: 3px;
					padding: 1px 6px;
					font-size: 0.8em;
					color: #fa0;
					line-height: 1.2;
				">⚠ No ammo</span>
				<button type="button"
					onclick="event.stopPropagation(); ActionHUD.useItem('ammo:${weaponId}:dropdown', event)"
					title="Select Ammo"
					style="background: rgba(40, 60, 40, 0.8); border: 1px solid #585; color: #ada; border-radius: 3px; padding: 1px 5px; font-size: 0.8em; cursor: pointer; line-height: 1.2;"
					onmouseover="this.style.background='#585'; this.style.color='#fff';"
					onmouseout="this.style.background='rgba(40, 60, 40, 0.8)'; this.style.color='#ada';">
					▼
				</button>
			</div>`;
	}

	const count = ammo.system.quantity ?? 0;
	const isLow = count <= 3 && count > 0;
	const isEmpty = count === 0;
	const badgeBg = isEmpty ? "rgba(80, 30, 30, 0.8)" : "rgba(40, 60, 40, 0.8)";
	const badgeBorder = isEmpty ? "#a44" : "#585";
	const countColor = isEmpty ? "#f66" : isLow ? "#fa0" : "#ada";
	const ammoImg = ammo.img ? `<img src="${ammo.img}" style="width:14px; height:14px; border:0; border-radius:2px; margin-right:3px; vertical-align:middle;" />` : "";

	return `
		<div style="display:flex; align-items:center; gap:3px; margin-top:2px;">
			<span style="
				display:inline-flex; align-items:center;
				background: ${badgeBg};
				border: 1px solid ${badgeBorder};
				border-radius: 3px;
				padding: 1px 6px;
				font-size: 0.8em;
				color: #ccc;
				line-height: 1.2;
				max-width: 130px;
				overflow: hidden;
			">
				${ammoImg}<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:80px;">${ammo.name}</span>
				<span style="font-family:'Teko',sans-serif; font-size:1.1em; color:${countColor}; margin-left:4px;">x${count}</span>
			</span>
			<button type="button"
				onclick="event.stopPropagation(); ActionHUD.useItem('ammo:${weaponId}:dropdown', event)"
				title="Select Ammo"
				style="background: rgba(40, 60, 40, 0.8); border: 1px solid #585; color: #ada; border-radius: 3px; padding: 1px 5px; font-size: 0.8em; cursor: pointer; line-height: 1.2;"
				onmouseover="this.style.background='#585'; this.style.color='#fff';"
				onmouseout="this.style.background='rgba(40, 60, 40, 0.8)'; this.style.color='#ada';">
				▼
			</button>
			<button type="button"
				onclick="event.stopPropagation(); ActionHUD.useItem('ammo:${weaponId}:minus', event)"
				title="Decrease Ammo"
				style="background: rgba(50, 50, 50, 0.8); border: 1px solid #666; color: #eee; border-radius: 3px; padding: 1px 5px; font-size: 0.8em; cursor: pointer; line-height: 1.2;"
				onmouseover="this.style.background='#eee'; this.style.color='#000';"
				onmouseout="this.style.background='rgba(50, 50, 50, 0.8)'; this.style.color='#eee';">
				−
			</button>
			<button type="button"
				onclick="event.stopPropagation(); ActionHUD.useItem('ammo:${weaponId}:plus', event)"
				title="Increase Ammo"
				style="background: rgba(50, 50, 50, 0.8); border: 1px solid #666; color: #eee; border-radius: 3px; padding: 1px 5px; font-size: 0.8em; cursor: pointer; line-height: 1.2;"
				onmouseover="this.style.background='#eee'; this.style.color='#000';"
				onmouseout="this.style.background='rgba(50, 50, 50, 0.8)'; this.style.color='#eee';">
				+
			</button>
		</div>`;
}

export async function _handleDnd5eAmmoAction(actor, weaponId, command, event) {
	const weapon = actor.items.get(weaponId);
	if (!weapon) return;

	if (command === "dropdown") {
		const ammoOptions = weapon.system.ammunitionOptions ?? [];

		let listHtml = "";
		if (ammoOptions.length === 0) {
			listHtml = `<div style="padding:8px; color:#999; font-size:0.9em; text-align:center;">No ammunition found</div>`;
		} else {
			const currentAmmo = _getDnd5eCurrentAmmo(weapon);
			ammoOptions.forEach(opt => {
				const a = opt.item;
				const qty = a.system.quantity ?? 0;
				const ammoImg = a.img ? `<img src="${a.img}" style="width:18px; height:18px; border:0; border-radius:2px; margin-right:6px; vertical-align:middle;" />` : "";
				const isSelected = currentAmmo?.id === a.id;
				const selectedStyle = isSelected ? "border-left: 3px solid #5a5; padding-left: 5px;" : "padding-left: 8px;";
				const isDepleted = qty === 0;
				listHtml += `
					<div class="niks-ammo-option" data-ammo-id="${a.id}" style="
						display:flex; align-items:center; padding:4px 8px; cursor:pointer;
						${selectedStyle}
						border-bottom: 1px solid rgba(255,255,255,0.05);
					"
					onmouseover="this.style.background='rgba(255,255,255,0.1)';"
					onmouseout="this.style.background='transparent';">
						${ammoImg}
						<span style="flex:1; color:${isDepleted ? '#666' : '#ddd'}; font-size:0.9em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${a.name}</span>
						<span style="font-family:'Teko',sans-serif; font-size:1.1em; color:${isDepleted ? '#666' : '#ada'}; margin-left:8px;">x${qty}</span>
					</div>`;
			});
		}

		const dropdown = document.createElement("div");
		dropdown.className = "niks-ammo-dropdown";
		dropdown.style.cssText = `
			position: fixed; z-index: 99999;
			background: rgba(20, 20, 20, 0.95);
			border: 1px solid #585;
			border-radius: 4px;
			min-width: 180px;
			max-width: 300px;
			max-height: 300px;
			overflow-y: auto;
			box-shadow: 0 4px 12px rgba(0,0,0,0.6);
		`;
		dropdown.innerHTML = `
			<div style="padding:6px 8px; border-bottom:1px solid #585; color:#ada; font-size:0.85em; font-weight:bold;">
				Select Ammo
			</div>
			${listHtml}
		`;

		const clickX = event.clientX ?? 300;
		const clickY = event.clientY ?? 300;
		dropdown.style.left = `${clickX}px`;
		dropdown.style.top = `${clickY}px`;
		document.body.appendChild(dropdown);

		const rect = dropdown.getBoundingClientRect();
		if (rect.right > window.innerWidth) dropdown.style.left = `${window.innerWidth - rect.width - 8}px`;
		if (rect.bottom > window.innerHeight) dropdown.style.top = `${window.innerHeight - rect.height - 8}px`;

		dropdown.querySelectorAll(".niks-ammo-option").forEach(optEl => {
			optEl.addEventListener("click", async (ev) => {
				ev.stopPropagation();
				const ammoId = optEl.dataset.ammoId;
				try {
					const activities = weapon.system.activities?.contents || [];
					const attackActivity = activities.find(a => a.type === "attack") || activities[0];
					if (attackActivity) {
						await weapon.setFlag("dnd5e", `last.${attackActivity.id}.ammunition`, ammoId);
					}
				} catch (err) {
					console.warn("Nik's Action HUD | DnD5e ammo selection failed:", err);
				}
				dropdown.remove();
			});
		});

		const closeHandler = (ev) => {
			if (!dropdown.contains(ev.target)) {
				dropdown.remove();
				document.removeEventListener("pointerdown", closeHandler, true);
			}
		};
		setTimeout(() => document.addEventListener("pointerdown", closeHandler, true), 50);
		return;
	}

	if (command === "plus") {
		const ammo = _getDnd5eCurrentAmmo(weapon);
		if (!ammo) return;
		await ammo.update({ "system.quantity": (ammo.system.quantity ?? 0) + 1 });
		return;
	}

	if (command === "minus") {
		const ammo = _getDnd5eCurrentAmmo(weapon);
		if (!ammo) return;
		const newQty = Math.max((ammo.system.quantity ?? 0) - 1, 0);
		await ammo.update({ "system.quantity": newQty });
		return;
	}
}
