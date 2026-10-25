/**
 * Pin ordering: where a dragged favorite ends up in the list.
 */

/**
 * The list with `pinId` taken out and put back right before `anchorId` (or right after it when
 * `after`). Returns the very same array when the order would not change, so callers can skip the save.
 */
export function placePin(ids, pinId, anchorId, after = false) {
	if (!Array.isArray(ids) || pinId === anchorId || !ids.includes(pinId) || !ids.includes(anchorId)) return ids;

	const rest = ids.filter((id) => id !== pinId);
	const slot = rest.indexOf(anchorId) + (after ? 1 : 0);
	const placed = [...rest.slice(0, slot), pinId, ...rest.slice(slot)];
	return placed.every((id, index) => id === ids[index]) ? ids : placed;
}
