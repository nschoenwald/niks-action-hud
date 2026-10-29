/** Where the dock sits (corner position, zoom) and which side the drawer and rail use. */

import { readProfile } from "../../core/profile.js";
import { MODULE_ID } from "../../core/ids.js";
import { defaultDockPosition, chooseDrawerSide, cornerEdges, readDockPosition } from "./geometry.js";
import { isThemeAvailable, getDefaultTheme } from "../settings-panel/ui-constants.js";
import { REFERENCE_AREA, WINDOW_FACTOR_RANGE, DRAWER_EDGE_CLEARANCE, DRAWER_WIDTH, VIEWPORT_MARGIN_PX, MIN_FIT_ZOOM } from "./constants.js";
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
	const minimizeButton = Boolean(game.settings.settings?.has(`${MODULE_ID}.minimizeButton`) ? readSetting("minimizeButton") : profile.minimizeButton);

	return {
		position: stored ? readDockPosition(stored, fallback) : fallback,
		zoom: dockZoom(placement.hudScale || 1),
		theme: themeId,
		fadeWhenIdle: fadeSetting ?? true,
		minimizeButton,
		// Without the button there is no way back, so the saved state only applies while it is shown.
		minimized: minimizeButton && Boolean(placement.minimized),
		font: profile.fontFamily || "",
		buttonShape: profile.buttonShape || "",
		hudOpacity: readHudOpacity(profile),
		tooltipScale: readTooltipScale(profile),
	};
}

/** Whether the dock grows and shrinks with the window (client setting, on by default). */
function scalesWithWindow() {
	if (!game.settings.settings?.has(`${MODULE_ID}.scaleWithWindow`)) return readProfile().scaleWithWindow ?? true;
	return readSetting("scaleWithWindow") !== false;
}

/**
 * How much the window size grows or shrinks the dock: the square root of the window's area against a
 * 1080p window (so it tracks both width and height), kept within `WINDOW_FACTOR_RANGE`. 1 when the
 * player turned "Scale with window size" off.
 */
function windowFactor() {
	if (!scalesWithWindow()) return 1;
	const [low, high] = WINDOW_FACTOR_RANGE;
	const factor = Math.sqrt((window.innerWidth * window.innerHeight) / REFERENCE_AREA);
	return Math.min(high, Math.max(low, factor));
}

/**
 * Foundry's Interface Scale (core UI settings). Read from the `--ui-scale` property Foundry sets on <body>,
 * so an unsaved preview in Foundry's settings counts too, with the stored setting as fallback.
 */
function interfaceScale() {
	let value = parseFloat(getComputedStyle(document.body).getPropertyValue("--ui-scale"));
	if (!Number.isFinite(value)) {
		try {
			value = Number(game.settings.get("core", "uiConfig")?.uiScale);
		} catch (_err) {
			value = 1;
		}
	}
	return Number.isFinite(value) && value > 0 ? Math.min(1.5, Math.max(0.5, value)) : 1;
}

/** CSS zoom for the dock: the player's own scale times Foundry's Interface Scale and the window factor. */
export const dockZoom = (playerScale) => Number((playerScale * interfaceScale() * windowFactor()).toFixed(3));

/** Set the dock's zoom. Hover cards follow it, so they stay in proportion to the HUD. */
function applyZoom(root, zoom) {
	root.style.zoom = String(zoom);
	root.style.setProperty("--nah-scale", String(zoom));
	document.documentElement.style.setProperty("--nah-hud-zoom", String(zoom));
}

/**
 * Pin the dock to its corner. Distances are screen pixels, so they are divided by the dock's own zoom.
 * The dock is held inside the window: a distance that would push it past the far edge (a smaller window,
 * a larger scale) is shortened for display only, and the saved position is kept for when there is room again.
 */
export function placeRoot(root, position, zoom) {
	root._dockPosition = position;
	const { vertical, horizontal } = cornerEdges(position.corner);
	Object.assign(root.style, { left: "auto", right: "auto", top: "auto", bottom: "auto" });
	const { width, height } = root.getBoundingClientRect();
	const x = Math.max(0, Math.min(position.x, window.innerWidth - width - VIEWPORT_MARGIN_PX));
	const y = Math.max(0, Math.min(position.y, window.innerHeight - height - VIEWPORT_MARGIN_PX));
	root.style[horizontal] = `${x / zoom}px`;
	root.style[vertical] = `${y / zoom}px`;
	root.dataset.corner = position.corner;
}

/**
 * Apply `zoom` and place the dock at `position`, shrinking the zoom when the dock would be taller than the
 * window (the player's saved scale is unchanged, so it grows back once there is room).
 * @returns {number} The zoom actually applied.
 */
export function fitToViewport(root, zoom, position = root._dockPosition) {
	const cssHeight = root.getBoundingClientRect().height / currentZoom(root);
	const room = window.innerHeight - VIEWPORT_MARGIN_PX * 2;
	const fitted = cssHeight > 0 && cssHeight * zoom > room
		? Number(Math.min(zoom, Math.max(MIN_FIT_ZOOM, room / cssHeight)).toFixed(3))
		: zoom;
	applyZoom(root, fitted || 1);
	if (position) placeRoot(root, position, fitted || 1);
	return fitted;
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
