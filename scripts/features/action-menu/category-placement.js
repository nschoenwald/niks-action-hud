const normalizeCategoryId = (value) => {
	if (value === null || value === undefined) return null;
	const id = String(value).trim();
	return id || null;
};

const getCategoryId = (category) => normalizeCategoryId(category?.id);

export const normalizeAdapterPlacement = (value) => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;

	const beforeId = normalizeCategoryId(value.beforeId);
	const afterId = normalizeCategoryId(value.afterId);
	if (!beforeId && !afterId) return null;

	return { beforeId, afterId };
};

const normalizeLegacyPosition = (value) => {
	if (value === "" || value === null || value === undefined) return null;
	const position = Number(value);
	return Number.isInteger(position) && position >= 1 ? position : null;
};

export const createAdapterPlacementForGap = (baseCategories, requestedGap) => {
	const categories = Array.isArray(baseCategories)
		? baseCategories.filter((category) => getCategoryId(category))
		: [];
	if (!categories.length) return null;

	const numericGap = Number(requestedGap);
	const gap = Number.isFinite(numericGap)
		? Math.min(Math.max(Math.trunc(numericGap), 0), categories.length)
		: categories.length;

	return {
		beforeId: gap < categories.length ? getCategoryId(categories[gap]) : null,
		afterId: gap > 0 ? getCategoryId(categories[gap - 1]) : null,
	};
};

const resolveAdapterGap = (baseCategories, placement, legacyPosition) => {
	const normalized = normalizeAdapterPlacement(placement);
	const indexById = new Map();
	baseCategories.forEach((category, index) => {
		const id = getCategoryId(category);
		if (id && !indexById.has(id)) indexById.set(id, index);
	});

	// Prefer the following category. This keeps a custom button immediately before
	// its saved anchor even when actor-specific categories appear in between.
	if (normalized?.beforeId && indexById.has(normalized.beforeId)) {
		return indexById.get(normalized.beforeId);
	}
	if (normalized?.afterId && indexById.has(normalized.afterId)) {
		return indexById.get(normalized.afterId) + 1;
	}

	// Temporary compatibility with the unreleased numeric implementation.
	const position = normalizeLegacyPosition(legacyPosition);
	if (position !== null) {
		return Math.min(position - 1, baseCategories.length);
	}

	return baseCategories.length;
};

/**
 * Insert categories relative to stable adapter category ids.
 * Entries sharing a gap retain their source order. Missing anchors fall back
 * from beforeId to afterId, then to the end of the adapter category list.
 */
export const insertCategoriesByAnchors = (baseCategories, entries) => {
	const categories = Array.isArray(baseCategories)
		? baseCategories.filter(Boolean)
		: [];
	const buckets = Array.from({ length: categories.length + 1 }, () => []);

	(Array.isArray(entries) ? entries : [])
		.map((entry, index) => ({
			category: entry?.category,
			placement: entry?.placement,
			legacyPosition: entry?.legacyPosition,
			order: Number.isInteger(entry?.order) ? entry.order : index,
		}))
		.filter((entry) => entry.category)
		.sort((a, b) => a.order - b.order)
		.forEach((entry) => {
			const gap = resolveAdapterGap(
				categories,
				entry.placement,
				entry.legacyPosition,
			);
			buckets[gap].push(entry.category);
		});

	const result = [];
	for (let gap = 0; gap <= categories.length; gap += 1) {
		result.push(...buckets[gap]);
		if (gap < categories.length) result.push(categories[gap]);
	}
	return result;
};

/** Resolve the nearest adapter rows surrounding a custom row in the editor. */
export const deriveAdapterPlacementFromRows = (rows, rowIndex) => {
	if (!Array.isArray(rows) || !Number.isInteger(rowIndex)) return null;

	let afterId = null;
	for (let index = rowIndex - 1; index >= 0; index -= 1) {
		afterId = normalizeCategoryId(rows[index]?.adapterId);
		if (afterId) break;
	}

	let beforeId = null;
	for (let index = rowIndex + 1; index < rows.length; index += 1) {
		beforeId = normalizeCategoryId(rows[index]?.adapterId);
		if (beforeId) break;
	}

	return normalizeAdapterPlacement({ beforeId, afterId });
};
