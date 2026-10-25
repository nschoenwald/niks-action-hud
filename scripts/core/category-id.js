/**
 * Ribbon category identity: `s_<sectionId>` for every category a game system provides. Entries that
 * were never saved (the starter layout) derive the same ids on the fly.
 */

export const sectionCategoryId = (sectionId) => `s_${sectionId}`;

/** Id for a layout entry ("" for entries without a system section, which the HUD ignores). */
export function categoryIdOf(entry) {
	if (entry?.id) return String(entry.id);
	return entry?.sectionId ? sectionCategoryId(entry.sectionId) : "";
}

/** Position of the layout entry with this id, or -1. */
function findLayoutIndex(layout, id) {
	const wanted = String(id ?? "");
	if (!wanted) return -1;
	return Array.isArray(layout) ? layout.findIndex((entry) => categoryIdOf(entry) === wanted) : -1;
}

/** The layout entry with this id, or null. */
export function findLayoutEntry(layout, id) {
	const position = findLayoutIndex(layout, id);
	return position >= 0 ? layout[position] : null;
}
