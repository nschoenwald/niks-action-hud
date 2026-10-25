/**
 * Canvas docking and flyout positioning calculations for Nik's Action HUD.
 */

/**
 * Decides which side of the dock the flyout drawer opens on.
 *
 * @param {object} options
 * @param {"left"|"right"|"auto"} [options.forced="auto"] - Side chosen in the settings, if any.
 * @param {"left"|"right"} [options.preferred="right"] - Side used in auto mode when it has room (the inward side).
 * @param {number} [options.roomLeft=0] - Free screen width left of the dock.
 * @param {number} [options.roomRight=0] - Free screen width right of the dock.
 * @param {number} [options.drawerWidth=360] - Width the drawer needs, in screen pixels.
 * @param {number} [options.edgeGap=20] - Gap kept between the drawer and the screen edge.
 * @returns {"left"|"right"}
 */
export function chooseDrawerSide({ forced = "auto", preferred = "right", roomLeft = 0, roomRight = 0, drawerWidth = 360, edgeGap = 20 } = {}) {
	if (forced === "left" || forced === "right") return forced;

	const needed = drawerWidth + edgeGap;
	const room = { left: roomLeft, right: roomRight };
	const other = preferred === "left" ? "right" : "left";
	if (room[preferred] >= needed) return preferred;
	if (room[other] >= needed) return other;

	// Neither side has enough room: use the roomier one.
	return roomRight > roomLeft ? "right" : "left";
}

/**
 * Computes initial screen placement coordinates for the HUD, docking it horizontally
 * between Foundry's bottom UI elements (#players and #hotbar).
 *
 * @returns {{ corner: string, x: number, y: number }}
 */
export function defaultDockPosition() {
	const DEFAULT_HUD_WIDTH = 240;
	const SAFE_MARGIN = 16;
	const playersEl = document.getElementById("players");
	const hotbarEl = document.getElementById("hotbar");

	const playersBounds = playersEl?.offsetWidth > 0 ? playersEl.getBoundingClientRect() : null;
	const hotbarBounds = hotbarEl?.offsetWidth > 0 ? hotbarEl.getBoundingClientRect() : null;

	let posX = 240;
	let posY = 20;

	if (playersBounds && hotbarBounds) {
		const availableGap = hotbarBounds.left - playersBounds.right;
		if (availableGap > DEFAULT_HUD_WIDTH + SAFE_MARGIN * 2) {
			posX = Math.round(playersBounds.right + (availableGap - DEFAULT_HUD_WIDTH) / 2);
		} else {
			posX = Math.round(playersBounds.right + SAFE_MARGIN);
		}
		const bottomOffset = Math.max(
			window.innerHeight - playersBounds.bottom,
			window.innerHeight - hotbarBounds.bottom
		);
		posY = Math.max(SAFE_MARGIN, Math.round(bottomOffset));
	} else if (playersBounds) {
		posX = Math.round(playersBounds.right + SAFE_MARGIN);
		posY = Math.max(SAFE_MARGIN, Math.round(window.innerHeight - playersBounds.bottom));
	} else if (hotbarBounds) {
		posX = Math.max(SAFE_MARGIN, Math.round(hotbarBounds.left - DEFAULT_HUD_WIDTH - SAFE_MARGIN));
		posY = Math.max(SAFE_MARGIN, Math.round(window.innerHeight - hotbarBounds.bottom));
	}

	return { corner: "bottom-left", x: Math.max(10, posX), y: Math.max(10, posY) };
}

// ── Dock position ───────────────────────────────────────
// A dock position is `{ corner, x, y }`: the screen corner the dock is pinned to ("bottom-left", …) and its
// distance in screen pixels from that corner's side edge (x) and top/bottom edge (y).

const CORNERS = new Set(["top-left", "top-right", "bottom-left", "bottom-right"]);

/** The two edges a corner touches: `{ vertical: "top"|"bottom", horizontal: "left"|"right" }`. */
export function cornerEdges(corner) {
	const [vertical, horizontal] = String(corner).split("-");
	return { vertical, horizontal };
}

/** A valid dock position from stored data, with `fallback` for anything missing or malformed. */
export function readDockPosition(raw, fallback) {
	if (!raw || typeof raw !== "object" || !CORNERS.has(raw.corner)) return { ...fallback };
	const distance = (value, otherwise) => (Number.isFinite(Number(value)) && value !== null && value !== "" ? Math.max(0, Number(value)) : otherwise);
	return { corner: raw.corner, x: distance(raw.x, fallback.x), y: distance(raw.y, fallback.y) };
}

/** Pin a dock rect (screen pixels) to the corner of the window its centre is closest to. */
export function dockPositionFromRect(rect, viewportWidth, viewportHeight) {
	const horizontal = rect.left + rect.width / 2 < viewportWidth / 2 ? "left" : "right";
	const vertical = rect.top + rect.height / 2 < viewportHeight / 2 ? "top" : "bottom";
	const x = horizontal === "left" ? rect.left : viewportWidth - rect.right;
	const y = vertical === "top" ? rect.top : viewportHeight - rect.bottom;
	return { corner: `${vertical}-${horizontal}`, x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) };
}
