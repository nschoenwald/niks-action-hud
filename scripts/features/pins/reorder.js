/**
 * Reordering favorites by pressing a slot and dragging it over another. The press is tracked with
 * the shared pointer session, so it does not depend on the browser's native drag and drop (which
 * the dock keeps only for dropping items and macros from elsewhere).
 */

import { armGesture, followPointer } from "../interaction/pointer-session.js";
import { placementFor, slotUnder } from "./placement.js";

const HINT_CLASSES = ["insert-before", "insert-after"];
const TRAVEL_PX = 6;

/**
 * @param {HTMLElement} root     The dock root; presses on favorite slots inside it start a reorder.
 * @param {object} actions
 * @param {(pinId: string, anchorId: string, after: boolean) => unknown} actions.move
 * @param {() => void} [actions.onLift]
 * @param {(x: number, y: number) => Element|null} [actions.hit]   Element under a point (defaults to the document's).
 */
export function bindFavoriteReorder(root, { move, onLift, hit = (x, y) => document.elementFromPoint(x, y) }) {
	root.addEventListener("pointerdown", (event) => {
		if (event.button || event.altKey || event.shiftKey) return; // Alt/Shift presses move the whole dock
		const slot = slotUnder(event);
		if (!slot || slot.closest(".nah-drawer-pane")) return;
		armGesture(event, { mode: "travel", threshold: TRAVEL_PX, onTrigger: () => lift(slot) });
	});

	function lift(slot) {
		const sourceId = slot.dataset.favoriteId;
		onLift?.();
		slot.classList.add("is-lifted");
		root._justDragged = true;

		const aimAt = (pointer) => placementFor({ target: hit(pointer.clientX, pointer.clientY), clientX: pointer.clientX, clientY: pointer.clientY });
		const clearHints = () => {
			for (const el of root.querySelectorAll(".nah-favorite.insert-before, .nah-favorite.insert-after")) el.classList.remove(...HINT_CLASSES);
		};

		followPointer({
			onMove: (pointer) => {
				clearHints();
				const spot = aimAt(pointer);
				const target = spot && spot.targetId !== sourceId ? root.querySelector(`.nah-favorite[data-favorite-id="${CSS.escape(spot.targetId)}"]`) : null;
				target?.classList.add(spot.after ? "insert-after" : "insert-before");
			},
			onEnd: (pointer) => {
				clearHints();
				slot.classList.remove("is-lifted");
				const spot = pointer ? aimAt(pointer) : null;
				if (spot && spot.targetId !== sourceId) move(sourceId, spot.targetId, spot.after);
				setTimeout(() => { root._justDragged = false; }, 250);
			},
		});
	}
}
