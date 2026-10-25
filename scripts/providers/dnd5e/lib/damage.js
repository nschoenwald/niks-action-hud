import { _getPrimaryAttackActivity, _getPrimaryDamageActivity } from "./activities.js";
import { _readLoadedAmmo } from "./ammo.js";
import { _compactFormula, _simplifyRollFormula } from "./formatting.js";
import { escapeHtml } from "../../../core/escape.js";
import { readSetting } from "../../../core/setting-read.js";

/**
 * Check if a set, array, or string of damage types contains all valid damage types in CONFIG.DND5E.damageTypes.
 * @param {Set|Array|string} typesOrString
 * @returns {boolean}
 */
function isAllDamageTypes(typesOrString) {
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
			const loc = label ? game.i18n.localize(label) : "";
			return loc && strLower.includes(loc.toLowerCase());
		});
		return allLabelsPresent;
	}
	return false;
}

/**
 * Subtly tuned accent colors for DnD5e damage types optimized for dark HUD readability.
 */
const DAMAGE_TYPE_COLORS = Object.freeze({
	acid: "#9ecc4e",
	bludgeoning: "#799fe0",
	cold: "#8be0f7",
	fire: "#ff6e42",
	force: "#b86bfc",
	lightning: "#4dc2ff",
	necrotic: "#6bbe6b",
	piercing: "#cbd5e1",
	poison: "#b066f5",
	psychic: "#ff54ad",
	radiant: "#ffd154",
	slashing: "#f05252",
	thunder: "#63a4d8",
	healing: "#48d689",
	temphp: "#38bdf8",
	all: "#e2e8f0",
	any: "#e2e8f0",
});

/**
 * Retrieve the active client damage type display mode ("icons", "both", or "text").
 * @returns {"icons"|"both"|"text"}
 */
function getDamageTypeDisplayMode() {
	return readSetting("dnd5eDamageTypeDisplay") ?? "icons";
}

/** Localized label for a part that covers every damage type. */
const anyLabel = () => game.i18n.localize("NAH.Damage.Any");

/**
 * Retrieve the SVG icon path for a given damage type key.
 * @param {string} typeKey
 * @returns {string}
 */
function _getDamageTypeIcon(typeKey) {
	if (!typeKey) return "";
	if (isAllDamageTypes(typeKey)) return "systems/dnd5e/icons/svg/damage/all.svg";
	return CONFIG.DND5E?.damageTypes?.[typeKey]?.icon ?? CONFIG.DND5E?.healingTypes?.[typeKey]?.icon ?? "";
}

/**
 * Retrieve the subtle accent color for a given damage type key.
 * @param {string} typeKey
 * @returns {string}
 */
function _getDamageTypeColor(typeKey) {
	if (!typeKey) return "#ffffff";
	if (isAllDamageTypes(typeKey)) return DAMAGE_TYPE_COLORS.all;
	return DAMAGE_TYPE_COLORS[typeKey] ?? CONFIG.DND5E?.damageTypes?.[typeKey]?.color?.css ?? "#ffffff";
}

/**
 * One `{ key, label, icon, color }` entry per damage type of a part (one "any" entry when it covers every type).
 * @param {string|string[]} typeKeys
 * @param {string} combinedLabel  Label for the part as a whole, used when the keys are not damage types.
 */
function _damageTypeEntries(typeKeys, combinedLabel) {
	const keys = (Array.isArray(typeKeys) ? typeKeys : [typeKeys]).filter(Boolean);
	if (!keys.length) return [];
	if (isAllDamageTypes(keys.length === 1 ? keys[0] : keys)) {
		return [{ key: "any", label: combinedLabel, icon: _getDamageTypeIcon("any"), color: _getDamageTypeColor("any") }];
	}
	const entries = keys.map((key) => {
		const icon = _getDamageTypeIcon(key);
		const raw = CONFIG.DND5E?.damageTypes?.[key]?.label ?? CONFIG.DND5E?.healingTypes?.[key]?.label;
		return { key, label: raw ? game.i18n.localize(raw) : "", icon, color: icon ? _getDamageTypeColor(key) : "" };
	});
	// Keys that are not damage types (a free-text type) keep the part's own label.
	if (entries.length === 1 && !entries[0].label) entries[0].label = combinedLabel;
	return entries;
}

/**
 * Format a single damage part into plain text and rich HTML based on the active display mode.
 * @param {string} compact
 * @param {string|string[]} typeKeys  The part's damage type key(s).
 * @param {string} typeStr            Localized label for all of the part's types.
 * @param {"icons"|"both"|"text"} [displayMode="icons"]
 * @returns {{ text: string, html: string, part: object|null }}
 */
function _formatDamagePart(compact, typeKeys, typeStr, displayMode = "icons") {
	if (!compact) return { text: "", html: "", part: null };
	const types = _damageTypeEntries(typeKeys, typeStr || "");
	if (!typeStr && !types.length) return { text: compact, html: compact, part: { formula: compact, types: [] } };

	const text = typeStr ? `${compact} ${typeStr}` : compact;
	const part = { formula: compact, types };
	const withIcons = types.filter((type) => type.icon);
	if (displayMode === "text" || !withIcons.length) {
		return { text, html: text, part };
	}

	const iconHtml = withIcons.map((type) => {
		const name = escapeHtml(type.label || type.key);
		return `<span class="nah-dmg-icon nah-dmg-${escapeHtml(type.key)}" style="background-color:${type.color}; -webkit-mask-image:url('${type.icon}'); mask-image:url('${type.icon}');" title="${name}" aria-label="${name}"></span>`;
	}).join("");

	if (displayMode === "both") {
		return { text, html: `${compact} ${iconHtml} ${typeStr}`, part };
	}

	// Default: "icons"
	return { text, html: `${compact} ${iconHtml}`, part };
}

/**
 * Calculate total damage with all calculated bonuses from the primary activity.
 * Supports weapons, spells, features, etc.
 * Damage parts are grouped by damage type and formatted with plain text and rich SVG icons.
 * @param {Item} item
 * @param {Actor} [actor]
 * @returns {{ damageFormula: string, damageType: string, damageText: string, damageHtml: string, parts: string[], damageParts: Array<{formula: string, types: object[]}>, damageDisplay: string }}
 */
export function _getItemDamage(item, actor = item?.actor) {
	let damageFormula = "";
	let damageType = "";
	let damageText = "";
	let damageHtml = "";
	const partTexts = [];
	const partHtmls = [];
	const partData = [];
	const displayMode = getDamageTypeDisplayMode();
	let activity = null;
	// The actor's roll data, built once per item (each roll part below only adds its own data on top).
	let actorRollData;
	const baseRollData = () => (actorRollData ??= actor?.getRollData() ?? {});

	try {
		activity = _getPrimaryDamageActivity(item) || _getPrimaryAttackActivity(item);
		if (activity) {
			const ammo = item.type === "weapon" ? _readLoadedAmmo(item) : null;
			const damageConfig = activity.getDamageConfig(ammo ? { ammunition: ammo } : {});
			if (damageConfig?.rolls?.length) {
				// One DamageRoll per configured part, merged per damage type by dnd5e's own aggregation.
				const rawRolls = damageConfig.rolls.map(({ base, data, options, parts }) => {
					if (!parts?.length) return null;
					const cleanedParts = parts.filter(Boolean).map((p) => String(p).trim()).filter(Boolean);
					if (!cleanedParts.length) return null;

					let rawFormula = "";
					for (const part of cleanedParts) {
						if (!rawFormula) {
							rawFormula = part;
						} else if (part.startsWith("+") || part.startsWith("-")) {
							rawFormula += ` ${part}`;
						} else {
							rawFormula += ` + ${part}`;
						}
					}
					rawFormula = rawFormula.replace(/^\s*\+\s*/, "").trim();
					if (!rawFormula) return null;

					const rollData = { ...baseRollData(), ...(data ?? {}) };
					let formula = rawFormula;
					if (formula.includes("@")) {
						formula = Roll.replaceFormulaData(formula, rollData, { missing: "0" });
					}
					formula = formula.replace(/^\s*\+\s*/, "").trim();

					try {
						const rollOptions = { base, ...options };
						if (isAllDamageTypes(rollOptions.types)) {
							rollOptions.type = "any";
						}
						return new CONFIG.Dice.DamageRoll(formula, rollData, rollOptions);
					} catch (err) {
						return null;
					}
				}).filter(Boolean);

				let aggregatedRolls = [];
				try {
					aggregatedRolls = dnd5e.dice.aggregateDamageRolls(rawRolls);
				} catch (err) {
					aggregatedRolls = [];
				}

				if (aggregatedRolls.length > 0) {
					const collectedTypes = [];
					for (const roll of aggregatedRolls) {
						try {
							roll.simplify();
						} catch (err) {
							// ignore
						}
						let formula = _simplifyRollFormula(roll.formula) || roll.formula;
						formula = formula.replace(/^\s*\+\s*/, "").trim();
						const compact = _compactFormula(formula);
						if (!compact) continue;

						const typeKey = roll.options?.type;
						const typeKeys = roll.options?.types?.length ? roll.options.types : (typeKey ? [typeKey] : []);

						let typeStr = "";
						if (isAllDamageTypes(typeKey) || isAllDamageTypes(typeKeys)) {
							typeStr = anyLabel();
						} else {
							const typeLabels = typeKeys
								.map((k) => CONFIG.DND5E?.damageTypes?.[k]?.label ?? CONFIG.DND5E?.healingTypes?.[k]?.label ?? k)
								.map((label) => game.i18n.localize(label))
								.filter(Boolean);

							typeStr = typeLabels.length > 0
								? game.i18n.getListFormatter({ style: "narrow" }).format(typeLabels)
								: "";
						}

						if (typeStr) collectedTypes.push(typeStr);
						const formatted = _formatDamagePart(compact, typeKeys, typeStr, displayMode);
						if (formatted.text) {
							partTexts.push(formatted.text);
							partHtmls.push(formatted.html);
							partData.push(formatted.part);
						}
					}

					if (partTexts.length > 0) {
						damageText = partTexts.join(", ");
						damageHtml = partHtmls.join(", ");
						damageFormula = damageText;
						damageType = Array.from(new Set(collectedTypes)).join(", ");
					}
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
				const rawType = d.damageType || "";
				if (d.damageType) {
					if (isAllDamageTypes(d.damageType)) {
						typeLabel = anyLabel();
					} else {
						const raw = CONFIG.DND5E?.damageTypes?.[d.damageType]?.label ?? CONFIG.DND5E?.healingTypes?.[d.damageType]?.label ?? d.damageType;
						typeLabel = game.i18n.localize(raw);
					}
				} else if (d.label && isAllDamageTypes(d.label)) {
					typeLabel = anyLabel();
				} else if (activity?.damage?.parts?.some((p) => isAllDamageTypes(p.types))) {
					typeLabel = anyLabel();
				}
				const formatted = _formatDamagePart(compact, rawType, typeLabel, displayMode);
				if (formatted.text) {
					partTexts.push(formatted.text);
					partHtmls.push(formatted.html);
					partData.push(formatted.part);
				}
			}
			if (partTexts.length > 0) {
				damageText = partTexts.join(", ");
				damageHtml = partHtmls.join(", ");
				damageFormula = damageText;
			}
		}

		if (!damageText && isWeapon) {
			let formula = item.labels?.damage || item.system?.damage?.base?.formula || "";
			if (formula && formula.includes("@")) {
				const rollData = actor ? baseRollData() : item.getRollData();
				formula = Roll.replaceFormulaData(formula, rollData, { missing: "0" });
				formula = _simplifyRollFormula(formula);
			}
			const compact = _compactFormula(formula);
			let type = item.labels?.damageTypes || "";
			const rawType = type;
			if (isAllDamageTypes(type) || isAllDamageTypes(item.system?.damage?.base?.types)) {
				type = anyLabel();
			}
			if (compact) {
				const formatted = _formatDamagePart(compact, rawType, type, displayMode);
				damageText = formatted.text;
				damageHtml = formatted.html;
				damageFormula = damageText;
				damageType = type;
				partTexts.push(damageText);
				partHtmls.push(damageHtml);
				partData.push(formatted.part);
			}
		}
	}

	if (!damageType) {
		damageType = item.labels?.damageTypes || "";
	}
	if (isAllDamageTypes(damageType)) {
		damageType = anyLabel();
	}

	return { damageFormula, damageType, damageText, damageHtml, parts: partTexts, damageParts: partData, damageDisplay: displayMode };
}

