/**
 * Category placement and insertion coordinator for Action HUD.
 * Manages category relative anchoring, index resolution, and custom menu positioning.
 */

function cleanId(val) {
	if (val === null || val === undefined) return null;
	const trimmed = String(val).trim();
	return trimmed.length > 0 ? trimmed : null;
}

export function normalizeAdapterPlacement(placement) {
	if (!placement || typeof placement !== "object" || Array.isArray(placement)) return null;
	const beforeId = cleanId(placement.beforeId);
	const afterId = cleanId(placement.afterId);
	if (!beforeId && !afterId) return null;
	return { beforeId, afterId };
}

export function createAdapterPlacementForGap(baseCategories = [], requestedGap = 0) {
	const valid = (baseCategories || []).filter((c) => cleanId(c?.id));
	if (!valid.length) return null;

	const gapIndex = Math.min(Math.max(Math.trunc(Number(requestedGap) || 0), 0), valid.length);
	return {
		beforeId: gapIndex < valid.length ? cleanId(valid[gapIndex]?.id) : null,
		afterId: gapIndex > 0 ? cleanId(valid[gapIndex - 1]?.id) : null,
	};
}

function resolveInsertionIndex(baseCategories, placement) {
	const normalized = normalizeAdapterPlacement(placement);
	if (!normalized) return baseCategories.length;

	const idToIndex = new Map();
	baseCategories.forEach((cat, idx) => {
		const id = cleanId(cat?.id);
		if (id && !idToIndex.has(id)) idToIndex.set(id, idx);
	});

	if (normalized.beforeId && idToIndex.has(normalized.beforeId)) {
		return idToIndex.get(normalized.beforeId);
	}
	if (normalized.afterId && idToIndex.has(normalized.afterId)) {
		return idToIndex.get(normalized.afterId) + 1;
	}
	return baseCategories.length;
}

export function insertCategoriesByAnchors(baseCategories = [], customEntries = []) {
	const base = Array.isArray(baseCategories) ? baseCategories.filter(Boolean) : [];
	const slots = Array.from({ length: base.length + 1 }, () => []);

	const sorted = (customEntries || [])
		.map((e, idx) => ({
			category: e?.category,
			placement: e?.placement,
			order: Number.isInteger(e?.order) ? e.order : idx,
		}))
		.filter((e) => Boolean(e.category))
		.sort((a, b) => a.order - b.order);

	for (const entry of sorted) {
		const slotIdx = resolveInsertionIndex(base, entry.placement);
		slots[slotIdx].push(entry.category);
	}

	const assembled = [];
	for (let i = 0; i <= base.length; i++) {
		assembled.push(...slots[i]);
		if (i < base.length) assembled.push(base[i]);
	}
	return assembled;
}

export function deriveAdapterPlacementFromRows(rows = [], rowIndex = 0) {
	if (!Array.isArray(rows) || !Number.isInteger(rowIndex)) return null;

	let afterId = null;
	for (let i = rowIndex - 1; i >= 0; i--) {
		afterId = cleanId(rows[i]?.adapterId);
		if (afterId) break;
	}

	let beforeId = null;
	for (let i = rowIndex + 1; i < rows.length; i++) {
		beforeId = cleanId(rows[i]?.adapterId);
		if (beforeId) break;
	}

	return normalizeAdapterPlacement({ beforeId, afterId });
}
