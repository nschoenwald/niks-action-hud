export function getCustomMenuIndex(categoryId) {
	if (!categoryId?.startsWith("custom-")) return -1;
	const index = Number.parseInt(categoryId.slice("custom-".length), 10);
	return Number.isInteger(index) && index >= 0 ? index : -1;
}

export function isActionMenuCategoryVisible(category, customMenu = [], inCombat = false) {
	const index = getCustomMenuIndex(category?.id);
	const visibility = category?._tabVisibility
		|| (index >= 0 ? customMenu?.[index]?.tabVisibility : null)
		|| "always";

	if (visibility === "combatOnly") return inCombat;
	if (visibility === "hideInCombat") return !inCombat;
	if (visibility === "never") return false;
	return true;
}

export function canRestoreActionMenuCategory(
	categoryId,
	categories,
	customMenu = [],
	inCombat = false,
) {
	return (Array.isArray(categories) ? categories : []).some((category) =>
		String(category?.id) === String(categoryId) &&
		isActionMenuCategoryVisible(category, customMenu, inCombat),
	);
}
