export const DEFAULT_FAVORITE_VIEW_OPTIONS = Object.freeze({
	sortFirst: false,
	only: false,
});

export const normalizeFavoriteViewOptions = (options) => ({
	sortFirst: options?.sortFirst === true,
	only: options?.only === true,
});

const getFavoriteRank = (favoriteIds) => {
	const ranks = new Map();
	for (const id of favoriteIds || []) {
		const normalizedId = String(id);
		if (!ranks.has(normalizedId)) ranks.set(normalizedId, ranks.size);
	}
	return ranks;
};

const isFavoriteItem = (item, favoriteRanks) =>
	item?.favoritable !== false && favoriteRanks.has(String(item?.id ?? ""));

const transformGroupItems = (items, favoriteRanks, options) => {
	let result = options.only
		? items.filter((item) => isFavoriteItem(item, favoriteRanks))
		: [...items];

	if (!options.sortFirst || result.length < 2) return result;

	return result
		.map((item, index) => ({ item, index }))
		.sort((left, right) => {
			const leftRank = isFavoriteItem(left.item, favoriteRanks)
				? favoriteRanks.get(String(left.item.id))
				: Number.POSITIVE_INFINITY;
			const rightRank = isFavoriteItem(right.item, favoriteRanks)
				? favoriteRanks.get(String(right.item.id))
				: Number.POSITIVE_INFINITY;

			return leftRank - rightRank || left.index - right.index;
		})
		.map(({ item }) => item);
};

/**
 * Apply favorite view options without moving rows across list headers.
 * This keeps system groupings intact while allowing the quick-slot order to
 * drive favorite rows inside each group.
 */
export const prepareFavoriteItems = (items, favoriteIds, rawOptions) => {
	if (!Array.isArray(items) || items.length === 0) return [];

	const options = normalizeFavoriteViewOptions(rawOptions);
	if (!options.sortFirst && !options.only) return [...items];

	const favoriteRanks = getFavoriteRank(favoriteIds);
	const groups = [];
	let currentGroup = { header: null, items: [] };

	for (const item of items) {
		if (item?.isHeader) {
			if (currentGroup.header || currentGroup.items.length > 0) {
				groups.push(currentGroup);
			}
			currentGroup = { header: item, items: [] };
		} else {
			currentGroup.items.push(item);
		}
	}

	if (currentGroup.header || currentGroup.items.length > 0) {
		groups.push(currentGroup);
	}

	return groups.flatMap((group) => {
		const groupItems = transformGroupItems(group.items, favoriteRanks, options);
		if (options.only && groupItems.length === 0) return [];
		return group.header ? [group.header, ...groupItems] : groupItems;
	});
};

/** Move one opaque favorite ID relative to another without interpreting it. */
export const reorderFavoriteIds = (
	favoriteIds,
	sourceId,
	targetId = null,
	insertAfter = false,
) => {
	const result = Array.isArray(favoriteIds) ? [...favoriteIds] : [];
	const sourceIndex = result.indexOf(sourceId);
	if (sourceIndex < 0) return result;
	if (targetId === sourceId) return result;

	if (targetId !== null && !result.includes(targetId)) return result;

	const [movedId] = result.splice(sourceIndex, 1);
	if (targetId === null) {
		result.push(movedId);
		return result;
	}

	const targetIndex = result.indexOf(targetId);
	result.splice(targetIndex + (insertAfter ? 1 : 0), 0, movedId);
	return result;
};

export const areFavoriteOrdersEqual = (left, right) =>
	left.length === right.length && left.every((id, index) => id === right[index]);
