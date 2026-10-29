/** Dragging the dock and scaling it with the corner handle. */

import { updateClientStore } from "../../core/client-store.js";
import { followPointer } from "../interaction/pointer-session.js";
import { MODULE_ID } from "../../core/ids.js";
import { RESIZE_SENSITIVITY_PX, SCALE_LIMITS } from "./constants.js";
import { hud } from "./context.js";
import { currentZoom, dockZoom, fitToViewport, placeRoot, syncRailSide } from "./layout.js";
import { cornerEdges, defaultDockPosition, dockPositionFromRect, readDockPosition } from "./geometry.js";

let placementTimer = null;
let scaleSaveTimer = null;
let indicatorTimer = null;

// ── Movement and scale ──────────────────────────────────

/** Pin the dropped dock to its nearest window corner, apply that and save it (debounced). */
function commitPlacement(root) {
	const position = dockPositionFromRect(root.getBoundingClientRect(), window.innerWidth, window.innerHeight);
	placeRoot(root, position, currentZoom(root));
	syncRailSide(root);

	clearTimeout(placementTimer);
	placementTimer = setTimeout(async () => {
		try {
			// The dock already sits at its new place; saving it must not repaint the HUD.
			await updateClientStore("hudPlacement", (placement) => {
				placement.dockPosition = position;
			}, { skipRefresh: true });
		} catch (err) {
			console.warn(`[${MODULE_ID}] Could not save HUD placement:`, err);
		}
	}, 150);
}

/** Drag the dock with the pointer until release, with the lifted animation and a guard against the trailing click. */
export function beginMove(root, startEvt) {
	hud.closeDrawer();
	hud.dismissHoverCard(true);
	root._justDragged = true;
	root.classList.add("is-moving");
	const rect = root.getBoundingClientRect();
	const origin = { x: rect.left, y: rect.top, px: startEvt.clientX, py: startEvt.clientY };
	root.style.cursor = "grabbing";
	document.body.style.cursor = "grabbing";

	let moved = false;
	followPointer({
		onMove: (e) => {
			e.preventDefault();
			moved = true;
			const zoom = parseFloat(root.style.zoom) || parseFloat(getComputedStyle(root).zoom) || 1;
			Object.assign(root.style, {
				left: `${(origin.x + e.clientX - origin.px) / zoom}px`,
				top: `${(origin.y + e.clientY - origin.py) / zoom}px`,
				right: "auto",
				bottom: "auto",
			});
		},
		onEnd: () => {
			root.style.cursor = "";
			document.body.style.cursor = "";
			root.classList.remove("is-moving");
			setTimeout(() => { root._justDragged = false; }, 250);
			if (moved) commitPlacement(root);
		},
	});
}

function showScaleIndicator(root, scale, isReset = false) {
	let badge = root.querySelector(".nah-scale-indicator");
	if (!badge) {
		badge = document.createElement("div");
		badge.id = "nah-scale-indicator";
		badge.className = "nah-scale-indicator";
		root.appendChild(badge);
	}
	const pct = Math.round(scale * 100);
	badge.textContent = isReset ? `Scale: ${pct}% (Reset)` : `Scale: ${pct}%`;
	badge.classList.add("visible");
	clearTimeout(indicatorTimer);
	indicatorTimer = setTimeout(() => badge.classList.remove("visible"), 1200);
}

function applyLiveScale(root, playerScale, position = null) {
	root.style.setProperty("--nah-base-scale", playerScale);
	fitToViewport(root, dockZoom(playerScale), position || root._dockPosition);
}

function setScale(root, requested, isReset = false, position = null) {
	const scale = Math.max(SCALE_LIMITS.min, Math.min(SCALE_LIMITS.max, requested));
	applyLiveScale(root, scale, position);
	showScaleIndicator(root, scale, isReset);
	clearTimeout(scaleSaveTimer);
	scaleSaveTimer = setTimeout(async () => {
		// Settle on the saved (rounded) scale here instead of refreshing the whole HUD: only the dock's
		// own fitting, the rail side and the open drawer's placement depend on it.
		const saved = Math.round(scale * 20) / 20;
		applyLiveScale(root, saved, position);
		syncRailSide(root);
		try {
			await updateClientStore("hudPlacement", (placement) => { placement.hudScale = saved; }, { skipRefresh: true });
		} catch (_err) { /* scale is cosmetic; ignore save failures */ }
		await hud.repaintDock();
		hud.refitDrawer();
	}, 200);
}

export function bindResizeHandle(root) {
	const handle = root.querySelector(".nah-resize-handle");
	const resolvePosition = () => {
		if (root._dockPosition) return root._dockPosition;
		const placement = game.settings.get(MODULE_ID, "hudPlacement") || {};
		const fallback = defaultDockPosition();
		return placement.dockPosition ? readDockPosition(placement.dockPosition, fallback) : fallback;
	};

	handle.addEventListener("dblclick", (event) => {
		event.preventDefault();
		event.stopPropagation();
		setScale(root, 1.0, true, resolvePosition());
	});
	handle.addEventListener("pointerdown", (event) => {
		if (event.button) return;
		event.preventDefault();
		event.stopPropagation();

		const placement = game.settings.get(MODULE_ID, "hudPlacement") || {};
		const position = resolvePosition();
		const startScale = parseFloat(root.style.getPropertyValue("--nah-base-scale"))
			|| placement.hudScale
			|| 1.0;
		const startX = event.clientX;
		const startY = event.clientY;
		let scale = startScale;

		handle.classList.add("is-resizing");
		root.classList.add("is-resizing");
		const { vertical, horizontal } = cornerEdges(root.dataset.corner);
		const isNesw = (vertical === "bottom" && horizontal === "left") || (vertical === "top" && horizontal === "right");
		document.body.style.cursor = isNesw ? "nesw-resize" : "nwse-resize";

		const dirX = horizontal === "left" ? 1 : -1;
		const dirY = vertical === "bottom" ? -1 : 1;

		followPointer({
			passive: false,
			onMove: (e) => {
				e.preventDefault();
				const dx = (e.clientX - startX) * dirX;
				const dy = (e.clientY - startY) * dirY;
				const proj = (dx + dy) / Math.SQRT2;
				const sensitivity = e.shiftKey ? (RESIZE_SENSITIVITY_PX * 2) : RESIZE_SENSITIVITY_PX;
				const deltaScale = proj / sensitivity;
				scale = Math.max(SCALE_LIMITS.min, Math.min(SCALE_LIMITS.max, startScale + deltaScale));
				applyLiveScale(root, scale, position);
				showScaleIndicator(root, scale);
			},
			onEnd: () => {
				handle.classList.remove("is-resizing");
				root.classList.remove("is-resizing");
				document.body.style.cursor = "";
				setScale(root, Math.round(scale * 20) / 20, false, position);
			},
		});
	});
}

