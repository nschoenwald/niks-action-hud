/**
 * Favorites manager for Nik's Action HUD.
 * Handles quick slot ordering, favorite filtering, reordering algorithms, and display preparation.
 */

export const DEFAULT_FAVORITE_VIEW_OPTIONS = Object.freeze({
	sortFirst: false,
	only: false,
});

export function normalizeFavoriteViewOptions(options = {}) {
	return {
		sortFirst: Boolean(options?.sortFirst),
		only: Boolean(options?.only),
	};
}

function buildFavoriteIndexMap(ids = []) {
	const map = new Map();
	ids.forEach((id, idx) => {
		const strId = String(id || "");
		if (strId && !map.has(strId)) map.set(strId, idx);
	});
	return map;
}

function checkIsFavorite(item, favoriteIndexMap) {
	if (item?.favoritable === false) return false;
	const id = String(item?.id ?? "");
	return id.length > 0 && favoriteIndexMap.has(id);
}

export function prepareFavoriteItems(items = [], favoriteIds = [], rawOptions = {}) {
	if (!Array.isArray(items) || !items.length) return [];
	const options = normalizeFavoriteViewOptions(rawOptions);
	if (!options.sortFirst && !options.only) return [...items];

	const favMap = buildFavoriteIndexMap(favoriteIds);
	const sections = [];
	let currentSection = { header: null, entries: [] };

	for (const item of items) {
		if (item?.isHeader) {
			if (currentSection.header || currentSection.entries.length) {
				sections.push(currentSection);
			}
			currentSection = { header: item, entries: [] };
		} else {
			currentSection.entries.push(item);
		}
	}
	if (currentSection.header || currentSection.entries.length) {
		sections.push(currentSection);
	}

	const processed = [];
	for (const sec of sections) {
		let list = sec.entries;
		if (options.only) {
			list = list.filter((it) => checkIsFavorite(it, favMap));
		}
		if (options.sortFirst && list.length > 1) {
			list = [...list].sort((a, b) => {
				const aFav = checkIsFavorite(a, favMap);
				const bFav = checkIsFavorite(b, favMap);
				if (aFav && bFav) return favMap.get(String(a.id)) - favMap.get(String(b.id));
				if (aFav) return -1;
				if (bFav) return 1;
				return 0;
			});
		}

		if (options.only && !list.length) continue;
		if (sec.header) processed.push(sec.header);
		processed.push(...list);
	}

	return processed;
}

export function reorderFavoriteIds(favoriteIds = [], sourceId, targetId = null, insertAfter = false) {
	const list = Array.isArray(favoriteIds) ? [...favoriteIds] : [];
	const srcIdx = list.indexOf(sourceId);
	if (srcIdx < 0 || sourceId === targetId) return list;

	const [moved] = list.splice(srcIdx, 1);
	if (targetId === null) {
		list.push(moved);
		return list;
	}

	const tgtIdx = list.indexOf(targetId);
	if (tgtIdx < 0) {
		list.push(moved);
		return list;
	}

	list.splice(tgtIdx + (insertAfter ? 1 : 0), 0, moved);
	return list;
}

export function areFavoriteOrdersEqual(arr1 = [], arr2 = []) {
	if (arr1.length !== arr2.length) return false;
	return arr1.every((val, i) => val === arr2[i]);
}
