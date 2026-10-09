/**
 * Category override manager for Action HUD.
 * Merges user-configured appearance and visibility overrides onto system categories.
 */

function sanitizeNumber(val, fallback = 0) {
	if (val === "" || val === null || val === undefined) return fallback;
	const num = Number(val);
	return Number.isFinite(num) ? num : fallback;
}

export function getAdapterCategoryAppearance(category = {}) {
	return {
		label: category.label || "",
		icon: category.icon || "",
		img: category.img || "",
		buttonImg: category.buttonImg || "",
		buttonScale: sanitizeNumber(category.buttonScale, 1),
		buttonX: sanitizeNumber(category.buttonX, 0),
		buttonY: sanitizeNumber(category.buttonY, 0),
		buttonFrameLayers: Array.isArray(category.buttonFrameLayers) ? [...category.buttonFrameLayers] : [],
		buttonFrameColor: category.buttonFrameColor || "",
		fontFamily: category.fontFamily || "",
		textColor: category.textColor || "",
		tabVisibility: category._tabVisibility || category.tabVisibility || "always",
		visibility: {
			mode: category._visibility?.mode || category.visibility?.mode || "all",
			actorTypes: Array.isArray(category._visibility?.actorTypes || category.visibility?.actorTypes)
				? [...(category._visibility?.actorTypes || category.visibility?.actorTypes)]
				: [],
			actorIds: Array.isArray(category._visibility?.actorIds || category.visibility?.actorIds)
				? [...(category._visibility?.actorIds || category.visibility?.actorIds)]
				: [],
		},
	};
}

export function getAdapterCategoryOverride(overrides, categoryId) {
	if (!overrides || typeof overrides !== "object") return null;
	const found = overrides[String(categoryId || "")];
	return found && typeof found === "object" ? found : null;
}

export function mergeAdapterCategoryAppearance(baseAppearance, override) {
	const base = getAdapterCategoryAppearance(baseAppearance);
	if (!override || typeof override !== "object") return base;

	const keys = [
		"label",
		"icon",
		"img",
		"buttonImg",
		"buttonScale",
		"buttonX",
		"buttonY",
		"buttonFrameColor",
		"fontFamily",
		"textColor",
		"tabVisibility",
	];

	const merged = { ...base };
	for (const k of keys) {
		if (k in override) merged[k] = override[k];
	}
	if ("buttonFrameLayers" in override && Array.isArray(override.buttonFrameLayers)) {
		merged.buttonFrameLayers = [...override.buttonFrameLayers];
	}
	if ("visibility" in override) {
		merged.visibility = {
			mode: override.visibility?.mode || "all",
			actorTypes: Array.isArray(override.visibility?.actorTypes) ? [...override.visibility.actorTypes] : [],
			actorIds: Array.isArray(override.visibility?.actorIds) ? [...override.visibility.actorIds] : [],
		};
	}
	return merged;
}

export function applyAdapterCategoryOverride(category, overrides) {
	if (!category?.id) return category;
	const override = getAdapterCategoryOverride(overrides, category.id);
	if (!override) return category;

	const appearance = mergeAdapterCategoryAppearance(category, override);
	return {
		...category,
		...appearance,
		_visibility: appearance.visibility,
		_tabVisibility: appearance.tabVisibility,
	};
}

export function isAdapterCategoryOverrideEmpty(override) {
	return !override || typeof override !== "object" || Object.keys(override).length === 0;
}
