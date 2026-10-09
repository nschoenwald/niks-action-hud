/**
 * Determine the optimal side (left or right) for an Action HUD submenu to open,
 * accounting for screen boundaries, available horizontal space, and user preference.
 */
export function resolveSubMenuSide({
	preference = "auto",
	spaceLeft = 0,
	spaceRight = 0,
	submenuWidth = 0,
	minPadding = 20,
} = {}) {
	if (preference === "left" || preference === "right") return preference;

	const needsRight = spaceLeft < (submenuWidth + minPadding);
	if (needsRight && spaceRight > spaceLeft) {
		return "right";
	}
	return "left";
}

/**
 * Calculate the default position for the Action HUD at the bottom edge of the canvas,
 * horizontally centered in the space between the player list (#players) and the macro hotbar (#hotbar).
 */
export function getDefaultActionMenuPos() {
	const hudWidth = 240;
	const players = document.getElementById("players");
	const hotbar = document.getElementById("hotbar");

	const pRect = players && players.offsetWidth > 0 ? players.getBoundingClientRect() : null;
	const hRect = hotbar && hotbar.offsetWidth > 0 ? hotbar.getBoundingClientRect() : null;

	let left = 240;
	let bottom = 20;

	if (pRect && hRect) {
		if (hRect.left > pRect.right + hudWidth) {
			left = Math.round(pRect.right + ((hRect.left - pRect.right - hudWidth) / 2));
		} else {
			left = Math.round(pRect.right + 16);
		}
		const baseBottom = Math.max(
			window.innerHeight - pRect.bottom,
			window.innerHeight - hRect.bottom
		);
		bottom = Math.max(16, Math.round(baseBottom));
	} else if (pRect) {
		left = Math.round(pRect.right + 20);
		bottom = Math.max(16, Math.round(window.innerHeight - pRect.bottom));
	} else if (hRect) {
		left = Math.max(20, Math.round(hRect.left - hudWidth - 20));
		bottom = Math.max(16, Math.round(window.innerHeight - hRect.bottom));
	}

	return {
		anchorX: "left",
		anchorY: "bottom",
		offsetX: Math.max(10, left),
		offsetY: Math.max(10, bottom),
	};
}
