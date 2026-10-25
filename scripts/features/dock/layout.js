/** Where the dock sits (corner position, zoom) and which side the drawer and rail use. */

import { readProfile } from "../../core/profile.js";
import { MODULE_ID } from "../../core/ids.js";
import { defaultDockPosition, chooseDrawerSide, cornerEdges, readDockPosition } from "./geometry.js";
import { isThemeAvailable, getDefaultTheme } from "../settings-panel/ui-constants.js";
import { REFERENCE_AREA, WINDOW_FACTOR_RANGE, BASE_SCALE, DRAWER_EDGE_CLEARANCE, DRAWER_WIDTH } from "./constants.js";
import { readSetting } from "../../core/setting-read.js";

// ── Layout (position, scale, theme) ─────────────────────

/** The player's HUD opacity in percent (30-100). */
function readHudOpacity(profile) {
	const stored = game.settings.settings?.has(`${MODULE_ID}.hudOpacity`)
		? readSetting("hudOpacity")
		: profile.hudOpacity;
	const value = Number(stored);
	return Number.isFinite(value) ? Math.min(100, Math.max(30, value)) : 100;
}

/** The player's tooltip font size scale in percent (75-150). */
function readTooltipScale(profile) {
	const stored = game.settings.settings?.has(`${MODULE_ID}.tooltipScale`)
		? readSetting("tooltipScale")
		: profile.tooltipScale;
	const value = Number(stored);
	return Number.isFinite(value) ? Math.min(150, Math.max(75, value)) : 100;
}

/** Where the dock sits, how large it is and which theme it wears. */
export function computeLayout(profile) {
	const placement = readSetting("hudPlacement") || {};
	const stored = placement.dockPosition ?? profile.dockPosition;
	const fallback = defaultDockPosition();

	const themeId = isThemeAvailable(profile.theme) ? profile.theme : getDefaultTheme();
	const fadeSetting = game.settings.settings?.has(`${MODULE_ID}.fadeWhenIdle`) ? readSetting("fadeWhenIdle") : profile.fadeWhenIdle;

	return {
		position: stored ? readDockPosition(stored, fallback) : fallback,
		zoom: dockZoom(placement.hudScale || 1),
		theme: themeId,
		fadeWhenIdle: fadeSetting ?? true,
		font: profile.fontFamily || "",
		buttonShape: profile.buttonShape || "",
		hudOpacity: readHudOpacity(profile),
		tooltipScale: readTooltipScale(profile),
	};
}

/**
 * How much the window size grows or shrinks the dock: the square root of the window's area against a
 * 1080p window (so it tracks both width and height), kept within `WINDOW_FACTOR_RANGE`.
 */
function windowFactor() {
	const [low, high] = WINDOW_FACTOR_RANGE;
	const factor = Math.sqrt((window.innerWidth * window.innerHeight) / REFERENCE_AREA);
	return Math.min(high, Math.max(low, factor));
}

/** CSS zoom for the dock: the player's own scale on top of the base size and the window factor. */
export const dockZoom = (playerScale) => Number((playerScale * BASE_SCALE * windowFactor()).toFixed(3));

/** Pin the dock to its corner. Distances are screen pixels, so they are divided by the dock's own zoom. */
export function placeRoot(root, position, zoom) {
	root._dockPosition = position;
	const { vertical, horizontal } = cornerEdges(position.corner);
	Object.assign(root.style, { left: "auto", right: "auto", top: "auto", bottom: "auto" });
	root.style[horizontal] = `${position.x / zoom}px`;
	root.style[vertical] = `${position.y / zoom}px`;
	root.dataset.corner = position.corner;
}

export function currentZoom(root) {
	return parseFloat(root.style.zoom) || parseFloat(getComputedStyle(root).zoom) || 1.0;
}

/**
 * Horizontal midpoint of the game canvas in screen pixels. The canvas spans the whole window and the sidebar
 * overlays it, so opening or collapsing the sidebar does not move the midpoint.
 */
function canvasMidpoint() {
	const board = document.getElementById("board");
	const rect = board?.tagName === "CANVAS" ? board.getBoundingClientRect() : null;
	return rect?.width ? rect.left + rect.width / 2 : window.innerWidth / 2;
}

/**
 * The side of the dock that faces the middle of the canvas: right when the dock's centre lies in the left half,
 * left otherwise. The drawer, the favorites rail and their hover cards all unfold towards it.
 */
export function inwardSideFor(root) {
	const rect = root.getBoundingClientRect();
	return rect.left + rect.width / 2 <= canvasMidpoint() ? "right" : "left";
}

/** Which side of the dock the drawer opens on, from the configured preference and the dock's on-screen position. */
export function resolveDrawerSide(root) {
	const preference = game.settings.settings.has(`${MODULE_ID}.drawerSide`)
		? readSetting("drawerSide")
		: readProfile().drawerSide;
	const rect = root.getBoundingClientRect();
	return chooseDrawerSide({
		forced: preference || "auto",
		preferred: inwardSideFor(root),
		roomLeft: rect.left,
		roomRight: window.innerWidth - rect.right,
		drawerWidth: DRAWER_WIDTH * currentZoom(root),
		edgeGap: DRAWER_EDGE_CLEARANCE,
	});
}

/** The rail sits on the inward side of the dock (see `inwardSideFor`). */
export function railSideFor(root) {
	return inwardSideFor(root);
}

/** Re-evaluate the rail side (after the dock moved) without repainting. */
export function syncRailSide(root) {
	if (root.dataset.favoritesLayout === "top") return;
	const railSide = railSideFor(root);
	root.dataset.railSide = railSide;
	const rail = root.querySelector(".nah-favorites-rail");
	if (rail) rail.dataset.side = railSide;
}
