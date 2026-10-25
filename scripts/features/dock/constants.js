/** Shared constants of the dock feature. */

import { MODULE_ID, DOM_IDS } from "../../core/ids.js";

export const TEMPLATE_DIR = `modules/${MODULE_ID}/templates/hud`;
export const loc = (key, fallback = "") => game.i18n?.localize?.(`NAH.${key}`) || fallback;
export const SCALE_LIMITS = Object.freeze({ min: 0.5, max: 2.5 });
/** Pixels of drag along the resize diagonal required for a 1.0 (100%) change in HUD scale. */
export const RESIZE_SENSITIVITY_PX = 600;
/** Window area (in CSS pixels²) at which the dock is drawn at its base size, and how far the window may shrink or grow it. */
export const REFERENCE_AREA = 1920 * 1080;
export const WINDOW_FACTOR_RANGE = Object.freeze([0.75, 1.25]);
/** Size the HUD has at 100%: the old 105% became the default. Saved scales stay relative to this. */
export const BASE_SCALE = 1.05;
export const HOLD_DRAG_MS = 300;
export const DRAG_THRESHOLD_PX = 6;
export const TOP_RAIL_MIN_COLUMNS = 6;
export const PORTRAIT_OVERHANG_PX = 28;
export const RAIL_COLUMNS = 2;
export const DRAWER_WIDTH = 360;
export const DRAWER_EDGE_CLEARANCE = 20;
export const NO_DRAG_SELECTOR = `#${DOM_IDS.DRAWER_SLOT}, .nah-drawer-pane, .nah-resize-handle, .nah-turn-pass, .nah-favorites-rail, input, textarea, select`;
