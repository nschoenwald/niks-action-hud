import { MODULE_ID } from "../../constants.js";

/**
 * Escapes HTML characters for safe template interpolation.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
	if (!str) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * Formats weapon damage formula into a readable string.
 * @param {Item} weapon
 * @param {Actor} [actor=null]
 * @returns {string}
 */
export function formatWeaponDamage(weapon, actor = null) {
	if (!weapon?.system) return "";
	const sys = weapon.system;

	if (typeof sys.damage === "string" && sys.damage) {
		return sys.damage;
	}

	let baseDie = "";
	if (typeof sys.getDamageFormula === "function") {
		baseDie = sys.getDamageFormula();
	} else if (sys.damage) {
		baseDie = sys.damage.oneHanded || sys.damage.twoHanded || "";
	}

	if (!baseDie) return "";
	if (/^d\d+/i.test(baseDie)) {
		baseDie = `1${baseDie}`;
	}

	let mod = 0;
	if (actor?.system?.abilities) {
		const strMod = Number(actor.system.abilities.str?.mod ?? 0);
		const dexMod = Number(actor.system.abilities.dex?.mod ?? 0);
		const isRanged = sys.type === "ranged" || sys.range === "far";
		const isFinesse = Boolean(sys.isFinesse || (typeof sys.hasProperty === "function" && sys.hasProperty("finesse")));

		if (isFinesse) {
			mod = Math.max(strMod, dexMod);
		} else if (isRanged) {
			mod = dexMod;
		} else {
			mod = strMod;
		}
	}

	if (mod > 0) return `${baseDie}+${mod}`;
	if (mod < 0) return `${baseDie}${mod}`;
	return baseDie;
}

/**
 * Formats a range key into localized short or standard text.
 * @param {string} rangeKey
 * @returns {string}
 */
export function formatRange(rangeKey) {
	if (!rangeKey) return "";
	const shortKey = CONFIG.SHADOWDARK?.RANGES_SHORT?.[rangeKey];
	if (shortKey) return game.i18n?.localize?.(shortKey) || rangeKey;

	const spellKey = CONFIG.SHADOWDARK?.SPELL_RANGES?.[rangeKey];
	if (spellKey) return game.i18n?.localize?.(spellKey) || rangeKey;

	const fullKey = CONFIG.SHADOWDARK?.RANGES?.[rangeKey];
	if (fullKey) return game.i18n?.localize?.(fullKey) || rangeKey;

	return String(rangeKey);
}

/**
 * Formats a duration object or key into a readable label.
 * @param {object|string} duration
 * @returns {string}
 */
export function formatDuration(duration) {
	if (!duration) return "";
	if (typeof duration === "string") {
		const key = CONFIG.SHADOWDARK?.SPELL_DURATIONS?.[duration] || CONFIG.SHADOWDARK?.EFFECT_DURATIONS?.[duration];
		return key ? (game.i18n?.localize?.(key) || duration) : duration;
	}

	const type = duration.type;
	if (!type) return "";
	const typeLabel = CONFIG.SHADOWDARK?.SPELL_DURATIONS?.[type] || CONFIG.SHADOWDARK?.EFFECT_DURATIONS?.[type];
	const localizedType = typeLabel ? (game.i18n?.localize?.(typeLabel) || type) : type;

	if (["instant", "focus", "permanent", "unlimited"].includes(type)) {
		return localizedType;
	}

	const val = duration.value;
	return val ? `${val} ${localizedType}` : localizedType;
}

/**
 * Builds a visual progress indicator for active light sources (e.g. "◆ ◆ ◆ ◇").
 * @param {Item} item
 * @returns {{ pips: string, timeRemaining: string, remainingMinutes: number, active: boolean }}
 */
export function getLightSourceInfo(item) {
	if (!item?.system?.light?.isSource) {
		return { pips: "", timeRemaining: "", remainingMinutes: 0, active: false };
	}

	const light = item.system.light;
	const active = Boolean(light.active);
	const remainingSecs = Number(light.remainingSecs || 0);
	const longevityMins = Number(light.longevityMins || 60);
	const maxSeconds = longevityMins * 60;
	const remainingMinutes = Math.ceil(remainingSecs / 60);

	let pips = [];
	for (let i = 0; i < 4; i++) {
		if (remainingSecs > (maxSeconds * i) / 4) {
			pips.push("◆");
		} else {
			pips.push("◇");
		}
	}
	const pipsStr = pips.join(" ");

	let timeRemaining = "";
	if (remainingSecs <= 0) {
		timeRemaining = game.i18n?.localize?.("SHADOWDARK.chat.light_source.expired") || "Expired";
	} else if (remainingSecs < 60) {
		timeRemaining = game.i18n?.localize?.("SHADOWDARK.inventory.item.light_seconds_remaining") || "< 1m";
	} else {
		timeRemaining = game.i18n?.format?.("SHADOWDARK.inventory.item.light_remaining", { timeRemaining: remainingMinutes })
			|| `${remainingMinutes}m`;
	}

	return {
		pips: active ? pipsStr : "◇ ◇ ◇ ◇",
		timeRemaining,
		remainingMinutes,
		active,
	};
}

/**
 * Builds rich HTML tooltip content for Shadowdark actions and items.
 * @param {string} type - "attack"|"spell"|"ability"|"item"|"check"|"luck"
 * @param {Item|object} item - Item instance or synthetic descriptor
 * @param {Actor} [actor=null]
 * @returns {string}
 */
export function buildShadowdarkTooltip(type, item, actor = null) {
	if (!item) return "";

	if (type === "check") {
		const key = item.key || item.id?.replace("check-", "");
		const label = item.name || CONFIG.SHADOWDARK?.ABILITIES_LONG?.[key] || key?.toUpperCase();
		const desc = getAbilityDescription(key);
		return `
			<div class="nah-tooltip-content nah-sd-tooltip">
				<div class="nah-tooltip-header">
					<span class="nah-tooltip-title">${escapeHtml(label)} Check</span>
					${item.cost ? `<span class="nah-tooltip-cost">${escapeHtml(item.cost)}</span>` : ""}
				</div>
				<div class="nah-tooltip-body">
					<p>${escapeHtml(desc)}</p>
				</div>
			</div>
		`;
	}

	if (type === "luck") {
		const available = actor?.system?.luck?.available;
		const remaining = actor?.system?.luck?.remaining;
		const desc = game.i18n?.localize?.("NAH.Shadowdark.LuckTooltip")
			|| "Spend Luck to reroll any roll you just made. You must take the new result.";
		return `
			<div class="nah-tooltip-content nah-sd-tooltip">
				<div class="nah-tooltip-header">
					<span class="nah-tooltip-title">Luck</span>
					<span class="nah-tooltip-cost">${available ? "Available" : "Spent"}${remaining !== undefined && remaining > 0 ? ` (${remaining})` : ""}</span>
				</div>
				<div class="nah-tooltip-body">
					<p>${escapeHtml(desc)}</p>
				</div>
			</div>
		`;
	}

	if (type === "initiative") {
		const dexMod = actor?.system?.abilities?.dex?.mod ?? 0;
		const bonusStr = dexMod >= 0 ? `+${dexMod}` : `${dexMod}`;
		const desc = game.i18n?.localize?.("NAH.Tooltips.Initiative") || "Roll initiative to determine turn order in combat.";
		return `
			<div class="nah-tooltip-content nah-sd-tooltip">
				<div class="nah-tooltip-header">
					<span class="nah-tooltip-title">Initiative</span>
					<span class="nah-tooltip-cost">DEX (${bonusStr})</span>
				</div>
				<div class="nah-tooltip-body">
					<p>${escapeHtml(desc)}</p>
				</div>
			</div>
		`;
	}

	const name = item.name || "Action";
	const sys = item.system || {};
	let subHeader = "";
	let tags = [];

	if (type === "spell" || sys.isSpell) {
		const tier = sys.tier ? `Tier ${sys.tier}` : "Spell";
		const duration = formatDuration(sys.duration);
		const range = formatRange(sys.range);
		subHeader = tier;
		if (duration) tags.push(`⏱ ${duration}`);
		if (range) tags.push(`🎯 ${range}`);
		if (sys.lost) tags.push(`⚠️ Lost`);
	} else if (type === "attack" || sys.isWeapon) {
		const dmg = formatWeaponDamage(item, actor);
		const typeStr = sys.type || (sys.isWeapon ? "Weapon" : "Attack");
		subHeader = typeStr;
		if (dmg) tags.push(`⚔️ ${dmg}`);
		if (sys.range) tags.push(`🎯 ${formatRange(sys.range)}`);
	} else if (sys.light?.isSource) {
		const lightInfo = getLightSourceInfo(item);
		subHeader = "Light Source";
		tags.push(lightInfo.active ? `🔥 ${lightInfo.pips}` : `🌑 Extinguished`);
		if (lightInfo.timeRemaining) tags.push(lightInfo.timeRemaining);
	}

	const description = sys.description?.value || sys.description || "";
	const cleanDesc = typeof description === "string" ? description.replace(/<[^>]*>?/gm, "").trim() : "";

	return `
		<div class="nah-tooltip-content nah-sd-tooltip">
			<div class="nah-tooltip-header">
				<span class="nah-tooltip-title">${escapeHtml(name)}</span>
				${subHeader ? `<span class="nah-tooltip-cost">${escapeHtml(subHeader)}</span>` : ""}
			</div>
			${tags.length ? `<div class="nah-tooltip-tags">${tags.map(t => `<span class="nah-sd-tag">${escapeHtml(t)}</span>`).join(" ")}</div>` : ""}
			${cleanDesc ? `<div class="nah-tooltip-body"><p>${escapeHtml(cleanDesc.slice(0, 300))}${cleanDesc.length > 300 ? "..." : ""}</p></div>` : ""}
		</div>
	`;
}

/**
 * Returns a short evocative description for an ability check.
 * @param {string} abilityKey
 * @returns {string}
 */
export function getAbilityDescription(abilityKey) {
	const map = {
		str: "Brawn, muscle power, athletics, melee force, lifting, and breaking.",
		dex: "Agility, reflexes, stealth, acrobatics, balance, and ranged finesse.",
		con: "Endurance, stamina, vitality, resisting poisons, hazards, and cold.",
		int: "Memory, lore, reason, ancient languages, deductive logic, and arcane knowledge.",
		wis: "Perception, insight, instincts, vigilance, and holy intuition.",
		cha: "Presence, willpower, leadership, intimidation, charm, and patron pacts.",
	};
	return map[abilityKey?.toLowerCase()] || "Roll a d20 ability check against difficulty.";
}

export const SHADOWDARK_ABILITY_ICONS = {
	str: `modules/${MODULE_ID}/assets/icons/abilities/strength.svg`,
	dex: `modules/${MODULE_ID}/assets/icons/abilities/dexterity.svg`,
	con: `modules/${MODULE_ID}/assets/icons/abilities/constitution.svg`,
	int: `modules/${MODULE_ID}/assets/icons/abilities/intelligence.svg`,
	wis: `modules/${MODULE_ID}/assets/icons/abilities/wisdom.svg`,
	cha: `modules/${MODULE_ID}/assets/icons/abilities/charisma.svg`,
};

/**
 * Returns the icon path for a given ability key.
 * @param {string} abilityKey
 * @returns {string}
 */
export function getAbilityIcon(abilityKey) {
	return SHADOWDARK_ABILITY_ICONS[abilityKey?.toLowerCase()] || "icons/svg/d20-highlight.svg";
}
