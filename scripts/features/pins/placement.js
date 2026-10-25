/**
 * Where a dragged favorite lands relative to the slot under the pointer.
 */

const SLOT = ".nah-favorite[data-favorite-id]";

/** True when favorites are stacked in the side rail rather than laid out along the top. */
const isRailSlot = (slot) => Boolean(slot.closest('.nah-favorites-rail:not([data-layout="top"])'));

/** True when the pointer is in the far half of `slot` along the layout's main axis. */
function pointerPastMiddle(slot, event) {
	const box = slot.getBoundingClientRect();
	return isRailSlot(slot)
		? event.clientY > box.top + box.height / 2
		: event.clientX > box.left + box.width / 2;
}

/** The favorite slot under a pointer event, or null. */
export const slotUnder = (event) => event.target?.closest?.(SLOT) ?? null;

/** `{ targetId, after }` for the slot under the pointer, or null outside any slot. */
export function placementFor(event) {
	const slot = slotUnder(event);
	return slot ? { targetId: slot.dataset.favoriteId, after: pointerPastMiddle(slot, event) } : null;
}
