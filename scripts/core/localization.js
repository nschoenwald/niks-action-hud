/**
 * Localization helper for Action HUD categories and submenu titles.
 * Translates default and system categories according to the current client locale,
 * while preserving user-defined custom category labels.
 */

const SYSTEM_CATEGORY_I18N = Object.freeze({
	attacks: "NAH.Categories.Attacks",
	spells: "NAH.Categories.Spells",
	features: "NAH.Categories.Features",
	talents: "NAH.Categories.Abilities",
	legendary: "NAH.Categories.Legendary",
	abilities: "NAH.Categories.Abilities",
	items: "NAH.Categories.Items",
	inventory: "NAH.Categories.Inventory",
});

const DEFAULT_CATEGORY_LABELS = Object.freeze({
	// English
	"attacks": "NAH.Categories.Attacks",
	"attack": "NAH.Categories.Attacks",
	"spells": "NAH.Categories.Spells",
	"spellbook": "NAH.Categories.Spells",
	"features": "NAH.Categories.Features",
	"feature": "NAH.Categories.Features",
	"legendary": "NAH.Categories.Legendary",
	"abilities": "NAH.Categories.Abilities",
	"items": "NAH.Categories.Items",
	"inventory": "NAH.Categories.Inventory",
	"weapons": "NAH.Categories.Attacks",

	// French
	"attaques": "NAH.Categories.Attacks",
	"attaque": "NAH.Categories.Attacks",
	"sorts": "NAH.Categories.Spells",
	"aptitudes": "NAH.Categories.Features",
	"aptitude": "NAH.Categories.Features",
	"légendaire": "NAH.Categories.Legendary",
	"légendaires": "NAH.Categories.Legendary",
	"legendaire": "NAH.Categories.Legendary",
	"caractéristiques": "NAH.Categories.Abilities",
	"caracteristiques": "NAH.Categories.Abilities",
	"inventaire": "NAH.Categories.Items",
	"objets": "NAH.Categories.Items",
	"objet": "NAH.Categories.Items",

	// German
	"angriffe": "NAH.Categories.Attacks",
	"angriff": "NAH.Categories.Attacks",
	"zauber": "NAH.Categories.Spells",
	"merkmale": "NAH.Categories.Features",
	"merkmal": "NAH.Categories.Features",
	"legendär": "NAH.Categories.Legendary",
	"legendaer": "NAH.Categories.Legendary",
	"fähigkeiten": "NAH.Categories.Abilities",
	"faehigkeiten": "NAH.Categories.Abilities",
	"gegenstände": "NAH.Categories.Items",
	"gegenstaende": "NAH.Categories.Items",
	"inventar": "NAH.Categories.Inventory",

	// Spanish
	"ataques": "NAH.Categories.Attacks",
	"ataque": "NAH.Categories.Attacks",
	"conjuros": "NAH.Categories.Spells",
	"rasgos": "NAH.Categories.Features",
	"rasgo": "NAH.Categories.Features",
	"legendario": "NAH.Categories.Legendary",
	"habilidades": "NAH.Categories.Abilities",
	"habilidad": "NAH.Categories.Abilities",

	// Italian
	"attacchi": "NAH.Categories.Attacks",
	"attacco": "NAH.Categories.Attacks",
	"incantesimi": "NAH.Categories.Spells",
	"incantesimo": "NAH.Categories.Spells",
	"privilegi": "NAH.Categories.Features",
	"privilegio": "NAH.Categories.Features",
	"leggendaria": "NAH.Categories.Legendary",
	"leggendarie": "NAH.Categories.Legendary",
	"caratteristiche": "NAH.Categories.Abilities",
	"caratteristica": "NAH.Categories.Abilities",
	"oggetti": "NAH.Categories.Items",
	"oggetto": "NAH.Categories.Items",
});

/**
 * Localizes a category label or title.
 * @param {string} label - Stored category label or title
 * @param {string|null} [sectionId=null] - Optional system category identifier
 * @returns {string} The localized label or the original label
 */
export function localizeCategory(label, sectionId = null) {
	const raw = String(label || "").trim();
	if (!raw && !sectionId) return "";

	// 1. Direct i18n key match
	if (raw && (raw.startsWith("NAH.") || raw.startsWith("DND5E.")) && game.i18n?.has?.(raw)) {
		return game.i18n.localize(raw);
	}

	const lower = raw.toLowerCase();
	const sysId = sectionId ? String(sectionId).trim().toLowerCase() : null;

	// 2. Standard system ID with default label or empty label
	if (sysId && SYSTEM_CATEGORY_I18N[sysId]) {
		const i18nKey = SYSTEM_CATEGORY_I18N[sysId];
		if (!raw || DEFAULT_CATEGORY_LABELS[lower] || lower === sysId) {
			if (game.i18n?.has?.(i18nKey)) {
				return game.i18n.localize(i18nKey);
			}
		}
	}

	// 3. Known default label translation
	if (DEFAULT_CATEGORY_LABELS[lower]) {
		const i18nKey = DEFAULT_CATEGORY_LABELS[lower];
		if (game.i18n?.has?.(i18nKey)) {
			return game.i18n.localize(i18nKey);
		}
	}

	// 4. Fallback to generic localization if available
	if (raw && game.i18n?.has?.(raw)) {
		return game.i18n.localize(raw);
	}

	return raw;
}
