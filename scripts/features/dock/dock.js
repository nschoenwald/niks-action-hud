/**
 * Dock feature: the always-visible HUD strip (identity header, favorites, category ribbon).
 * Owns its rendering, delegated input, drag-to-move and scale gestures. It is driven entirely by
 * the central store and never decides what data the HUD shows.
 */

import { bindFavoriteReorder } from "../pins/reorder.js";
import { readProfile } from "../../core/profile.js";
import { DOM_IDS } from "../../core/ids.js";
import { hudStore } from "../../core/store.js";
import { pressClosesDrawer } from "./outside-click.js";
import { setThemeClass } from "../../core/theme-class.js";
import { armGesture } from "../interaction/pointer-session.js";
import { openFavoritePicker } from "../pins/picker.js";
const { renderTemplate } = foundry.applications.handlebars;
import { DRAG_THRESHOLD_PX, HOLD_DRAG_MS, NO_DRAG_SELECTOR, TEMPLATE_DIR, loc } from "./constants.js";
import { bindRuntime, hud } from "./context.js";
import { computeLayout, placeRoot, railSideFor } from "./layout.js";
import { buildCategoryModels, buildFavoriteModels, buildHeaderModel, favoritesLayoutFor, fitFavoritesRail, fitIdentityName, fitRibbonLabels, placeholderMarkup } from "./models.js";
import { beginMove, bindResizeHandle } from "./movement.js";
import { cancelPendingPortraitClick, centerOnToken, createPortraitMenu, schedulePortraitClick } from "./portrait-menu.js";
import { triggerTurnAlertIfPending } from "./turn-alert.js";

/**
 * Dock feature: the always-visible HUD strip (identity header, favorites, category ribbon).
 * Owns its rendering, delegated input, drag-to-move and scale gestures. It is driven entirely by
 * the central store and never decides what data the HUD shows.
 */



let paintSeq = 0;

// ── DOM scaffold ────────────────────────────────────────

const RESIZE_ICON = `
	<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M12 2L2 12M12 6.5L6.5 12M12 11L11 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
	</svg>`;

/** Create (once) the persistent dock skeleton: drawer slot, top stack, ribbon bar, resize handle. */
export function ensureDockRoot() {
	let root = document.getElementById(DOM_IDS.DOCK);
	if (root) return root;

	root = document.createElement("div");
	root.id = DOM_IDS.DOCK;
	root.innerHTML = `
		<div id="${DOM_IDS.DRAWER_SLOT}"></div>
		<div class="nah-banner-stack"></div>
		<div id="${DOM_IDS.MENU}" class="nah-category-bar"></div>
		<div class="nah-resize-handle" title="${loc("UI.ScaleHandle", "Drag to resize HUD")}">${RESIZE_ICON}</div>`;
	document.body.appendChild(root);
	bindDockInput(root);
	return root;
}

function removeDockRoot() {
	document.getElementById(DOM_IDS.DOCK)?.remove();
}

/** Re-render the dock from the current store state. */
async function paintDock() {
	const seq = ++paintSeq;
	const state = hudStore.get();
	if (!state.actor) {
		removeDockRoot();
		return;
	}

	const profile = readProfile();
	const root = ensureDockRoot();
	const layout = computeLayout(profile);
	const { position, zoom, theme, buttonShape } = layout;
	applySurfaceAlpha(layout.hudOpacity);
	applyTooltipScale(layout.tooltipScale);

	setThemeClass(root, theme);
	root.classList.toggle("faded-ui", layout.fadeWhenIdle);
	root.classList.toggle("has-open-drawer", Boolean(state.drawer));
	if (buttonShape) root.dataset.buttonShape = buttonShape;
	else delete root.dataset.buttonShape;

	root.style.setProperty("--nah-scale", String(zoom));
	root.style.zoom = String(zoom);
	if (layout.font) root.style.setProperty("--nah-font-family", `'${layout.font}'`);
	placeRoot(root, position, zoom || 1);

	const topStack = root.querySelector(".nah-banner-stack");
	const bar = root.querySelector(`#${DOM_IDS.MENU}`);
	const handle = root.querySelector(".nah-resize-handle");

	const header = buildHeaderModel(profile);
	if (!header) {
		delete root._paintedKey;
		topStack.innerHTML = "";
		setThemeClass(bar, theme);
		bar.style.display = "";
		bar.innerHTML = placeholderMarkup();
		root._paintGeneration = (root._paintGeneration ?? 0) + 1;
		handle.style.display = "none";
		return;
	}
	bar.style.display = "";
	handle.style.display = "";
	triggerTurnAlertIfPending(root, header);

	const favLayout = favoritesLayoutFor(profile);
	const railSide = favLayout === "rail" ? railSideFor(root) : "";
	const [bannerMarkup, railHtml, ribbonHtml] = await Promise.all([
		renderTemplate(`${TEMPLATE_DIR}/dock-header.hbs`, header),
		renderTemplate(`${TEMPLATE_DIR}/favorites.hbs`, {
			slots: buildFavoriteModels(),
			railSide,
			layout: favLayout,
			addTitle: loc("Favorites.AddTitle", "Add favorite"),
		}),
		renderTemplate(`${TEMPLATE_DIR}/category-ribbon.hbs`, { categories: buildCategoryModels(), buttonShape }),
	]);

	// A newer paint (or removal) may have superseded this one while templates were loading.
	if (seq !== paintSeq || !root.isConnected) return;

	// Most refreshes (an HP change, someone else's initiative) leave the dock's markup as it was.
	// Rewriting it anyway would re-measure every label, restart the turn animation and drop hover
	// state, so the DOM is only touched when the markup or anything the fitting depends on changed.
	const paintKey = [theme, buttonShape, layout.font, zoom, favLayout, railSide, bannerMarkup, railHtml, ribbonHtml].join("\u0000");
	if (root._paintedKey === paintKey) return;
	root._paintedKey = paintKey;

	topStack.innerHTML = favLayout === "top" ? railHtml : "";
	root.dataset.favoritesLayout = favLayout;
	if (railSide) root.dataset.railSide = railSide;
	else delete root.dataset.railSide;
	setThemeClass(bar, theme);
	if (buttonShape) bar.dataset.buttonShape = buttonShape;
	else delete bar.dataset.buttonShape;
	bar.innerHTML = `${bannerMarkup}${ribbonHtml}${favLayout === "rail" ? railHtml : ""}`;
	// Counts DOM rewrites, so measurements of the dock's contents (drawer overhang) know when to redo them.
	root._paintGeneration = (root._paintGeneration ?? 0) + 1;
	fitRibbonLabels(root);
	fitIdentityName(root);
	fitFavoritesRail(root);
}

/**
 * Repaint the dock from the current state although its markup may be unchanged (after its scale or
 * the loaded fonts changed, which the fitting passes depend on). Uses the drawers already built.
 */
export function repaintDock() {
	const root = document.getElementById(DOM_IDS.DOCK);
	if (!root || !hudStore.get().actor) return Promise.resolve();
	delete root._paintedKey;
	return paintDock();
}

/** Apply theme/scale/font changes from the settings panel without a full repaint. */
/** Panels, buttons and tooltips all read this one value (see themes/engine.css). */
function applySurfaceAlpha(percent) {
	document.documentElement.style.setProperty("--nah-surface-alpha", `${percent}%`);
}

function applyTooltipScale(percent) {
	document.documentElement.style.setProperty("--nah-tooltip-scale", `${percent}`);
}

export function pushPreview(data) {
	const root = document.getElementById(DOM_IDS.DOCK);
	if (!root || !data) return;
	if (data.hudOpacity !== undefined) applySurfaceAlpha(data.hudOpacity);
	if (data.tooltipScale !== undefined) applyTooltipScale(data.tooltipScale);
	if (data.theme) setThemeClass(root, data.theme);
	if (data.font) root.style.setProperty("--nah-font-family", `'${data.font}'`);
}

// ── Delegated input ─────────────────────────────────────

const CLICK_ACTIONS = {
	"category-action": async (el) => {
		const id = el.dataset.categoryId || el.dataset.category;
		if (id) await hud.toggleDrawer(id);
	},
	"use-favorite": (el, event) => {
		if (!el.dataset.favoriteId) return;
		el.classList.remove("is-used");
		void el.offsetWidth; // restart the animation on rapid clicks
		el.classList.add("is-used");
		el.addEventListener("animationend", () => el.classList.remove("is-used"), { once: true });
		hud.useItem(el.dataset.favoriteId, event);
	},
	"toggle-overflow": (el) => el.closest(".nah-fav-overflow")?.classList.toggle("is-open"),
	"add-favorite": (el) => openFavoritePicker(hud, el),
	"open-sheet": (_el, event) => schedulePortraitClick(event),
	"end-turn": (el) => window.NikHUD?.endTurn?.(el.dataset.actorId, el.dataset.tokenId),
};

/** Press on the dock: Alt/Shift/header drag after travel, anywhere else after a hold. */
function bindPointerGestures(root) {
	root.addEventListener("pointerdown", (event) => {
		if (event.button !== 0 || event.target.closest(".nah-resize-handle")) return;

		if (event.target.closest(NO_DRAG_SELECTOR)) return;

		const onHeader = event.target.closest(".nah-actor-banner") && !event.target.closest(".nah-portrait-frame, button");
		const deliberate = event.altKey || event.shiftKey || onHeader;
		// A slow click on a button must stay a click: only empty dock areas start a drag by holding.
		if (!deliberate && event.target.closest(".nah-hud-btn, .nah-favorite, .nah-fav-add, .nah-fav-more, [data-action]")) return;
		if (deliberate) {
			event.preventDefault();
			event.stopPropagation();
		}
		armGesture(event, {
			mode: deliberate ? "travel" : "hold",
			threshold: DRAG_THRESHOLD_PX,
			holdMs: HOLD_DRAG_MS,
			onTrigger: (down) => beginMove(root, down),
		});
	});
}

let windowListenersBound = false;
function bindWindowListeners() {
	if (windowListenersBound) return;
	windowListenersBound = true;

	document.addEventListener("pointerdown", (event) => {
		const overflow = document.querySelector(".nah-fav-overflow.is-open");
		if (overflow && !overflow.contains(event.target)) overflow.classList.remove("is-open");
		if (!hudStore.get().drawer) return;
		const root = document.getElementById(DOM_IDS.DOCK);
		const drawer = document.getElementById(DOM_IDS.DRAWER_SLOT);
		if (pressClosesDrawer(event.target, { dock: root, drawer })) hud.closeDrawer();
	}, true);
}

function bindDockInput(root) {
	bindWindowListeners();
	createPortraitMenu(root);
	bindFavoriteReorder(root, {
		move: (pinId, anchorId, after) => hud.movePin(pinId, anchorId, after),
		onLift: () => hud.dismissHoverCard(true),
	});
	bindResizeHandle(root);
	bindPointerGestures(root);

	root.addEventListener("click", async (event) => {
		if (root._justDragged) {
			root._justDragged = false;
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		const el = event.target.closest("[data-action]");
		// Drawer rows are routed by the drawer feature.
		if (!el || el.closest(`#${DOM_IDS.DRAWER_SLOT}`)) return;
		await CLICK_ACTIONS[el.dataset.action]?.(el, event);
	});

	root.addEventListener("dblclick", (event) => {
		if (!event.target.closest(".nah-portrait-frame[data-action]")) return;
		cancelPendingPortraitClick();
		centerOnToken();
	});

	root.addEventListener("contextmenu", (event) => {
		const slot = event.target.closest("[data-favorite-id]");
		if (!slot || slot.closest(`#${DOM_IDS.DRAWER_SLOT}`)) return;
		event.preventDefault();
		event.stopPropagation();
		hud.openFavoriteDialog(slot.dataset.favoriteId);
	});

	root.addEventListener("pointerover", (event) => {
		const slot = event.target.closest("[data-favorite-id]");
		if (slot && !slot.closest(`#${DOM_IDS.DRAWER_SLOT}`)) hud.revealHoverCard(slot.dataset.favoriteId, slot);
	});
	root.addEventListener("pointerout", (event) => {
		const slot = event.target.closest("[data-favorite-id]");
		if (slot && !slot.closest(`#${DOM_IDS.DRAWER_SLOT}`) && !slot.contains(event.relatedTarget)) hud.dismissHoverCard();
	});
}

/** Wire the dock to the store: repaint whenever the subject or edit state changes. */
export function mountDock(runtime) {
	bindRuntime(runtime);
	hudStore.watch(["actor", "token", "revision"], () => paintDock());

	// Labels are fitted to their measured width: once late web fonts arrive, measure again.
	document.fonts?.addEventListener?.("loadingdone", () => void repaintDock());
}

