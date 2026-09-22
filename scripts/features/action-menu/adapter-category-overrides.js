const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const cloneLayers = (layers) => (
	Array.isArray(layers) ? layers.map((layer) => ({ ...layer })) : []
);

const normalizeVisibility = (visibility) => ({
	mode: visibility?.mode || "all",
	actorTypes: Array.isArray(visibility?.actorTypes)
		? [...visibility.actorTypes].sort()
		: [],
	actorIds: Array.isArray(visibility?.actorIds)
		? [...visibility.actorIds]
		: [],
});

const normalizeNumber = (value, fallback) => {
	if (value === "" || value === null || value === undefined) return fallback;
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
};

export const getAdapterCategoryAppearance = (category = {}) => ({
	label: category.label || "",
	icon: category.icon || "",
	img: category.img || "",
	buttonImg: category.buttonImg || "",
	buttonScale: normalizeNumber(category.buttonScale, 1),
	buttonX: normalizeNumber(category.buttonX, 0),
	buttonY: normalizeNumber(category.buttonY, 0),
	buttonFrameLayers: cloneLayers(category.buttonFrameLayers),
	buttonFrameColor: category.buttonFrameColor || "",
	fontFamily: category.fontFamily || "",
	textColor: category.textColor || "",
	tabVisibility: category._tabVisibility || category.tabVisibility || "always",
	visibility: normalizeVisibility(category._visibility || category.visibility),
});

export const getAdapterCategoryOverride = (overrides, categoryId) => {
	if (!overrides || typeof overrides !== "object") return null;
	const override = overrides[String(categoryId || "")];
	return override && typeof override === "object" ? override : null;
};

export const mergeAdapterCategoryAppearance = (baseAppearance, override) => {
	const base = getAdapterCategoryAppearance(baseAppearance);
	if (!override || typeof override !== "object") return base;

	const merged = { ...base };
	for (const key of [
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
	]) {
		if (hasOwn(override, key)) merged[key] = override[key];
	}
	if (hasOwn(override, "buttonFrameLayers")) {
		merged.buttonFrameLayers = cloneLayers(override.buttonFrameLayers);
	}
	if (hasOwn(override, "visibility")) {
		merged.visibility = normalizeVisibility(override.visibility);
	}
	return merged;
};

export const applyAdapterCategoryOverride = (category, overrides) => {
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
};

export const isAdapterCategoryOverrideEmpty = (override) => (
	!override
	|| typeof override !== "object"
	|| Object.keys(override).length === 0
);
