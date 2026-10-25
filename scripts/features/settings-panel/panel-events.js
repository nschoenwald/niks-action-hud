/**
 * Declarative event table for the settings panel. Every DOM event the panel reacts to is one row of
 * `PANEL_EVENTS`; `bindPanelEvents` attaches a single listener per event type to the panel root, once,
 * and routes each event to the rows whose selector matches (`selector: null` means the root itself).
 * Rows are tried in order, synchronously, so `preventDefault()` still works; a handler that returns
 * `STOP` ends routing for that event. Async work is started by the handler and not awaited.
 */

import { activateTab } from "./panel-utils.js";
import { readFormValues } from "./form-reader.js";
import { refreshPreview } from "./live-preview.js";
import { onSave } from "./actions/index.js";
import { cycleSettingLock, canManageLocks } from "./settings-locks.js";

const STOP = Symbol("stop");

/** Pull the form into the draft and refresh the live preview. */
const syncDraft = (app) => {
	readFormValues(app, app.element);
	refreshPreview(app);
};

// ── Range sliders ───────────────────────────────────────

const updateRangeDisplay = (slider) => {
	const display = slider.parentElement?.querySelector(".hud-range-value");
	if (display) display.textContent = `${Number(slider.value)}${slider.dataset.unit || "x"}`;
};

/** Show each slider's current value next to it (called after every render). */
export const syncRangeDisplays = (root) => {
	root?.querySelectorAll('input[type="range"]').forEach(updateRangeDisplay);
};

// ── Customize HUD: category reordering ─────────────────

const dragState = new WeakMap();
const dragged = (app) => dragState.get(app) ?? null;

const CATEGORY_CARD = ".hud-category-card[draggable='true']";
const clearDragOver = (app) => app.element.querySelectorAll(".hud-category-card").forEach((card) => card.classList.remove("drag-over"));

const categoryDrag = {
	start(app, event, card) {
		dragState.set(app, card);
		card.classList.add("dragging");
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("text/plain", card.dataset.catIndex || "");
	},
	end(app) {
		dragged(app)?.classList.remove("dragging");
		dragState.delete(app);
		clearDragOver(app);
	},
	over(app, event, card) {
		event.preventDefault();
		event.dataTransfer.dropEffect = "move";
		card.classList.add("drag-over");
	},
	leave(app, event, card) {
		card.classList.remove("drag-over");
	},
	async drop(app, event, card) {
		event.preventDefault();
		card.classList.remove("drag-over");
		const source = dragged(app);
		if (!source || source === card) return;

		const from = Number(source.dataset.catIndex);
		const to = Number(card.dataset.catIndex);
		if (Number.isNaN(from) || Number.isNaN(to)) return;

		readFormValues(app, app.element);
		const list = app.draft.data.layoutCategories;
		if (Array.isArray(list) && list[from] && list[to]) {
			list.splice(to, 0, list.splice(from, 1)[0]);
			await app.render();
		}
	},
};

// ── Settings locks ──────────────────────────────────────

const LOCK_VISUALS = {
	unlocked: { icon: "fa-solid fa-lock-open", key: "NSL.Tooltip.Unlocked", fallback: "Unlocked — Click to soft-lock, right-click to hard-lock." },
	soft: { icon: "fa-solid fa-lock", key: "NSL.Tooltip.Soft", fallback: "Soft Locked — Applied once, players can override. Click for hard lock." },
	hard: { icon: "fa-solid fa-lock", key: "NSL.Tooltip.Hard", fallback: "Hard Locked — Enforced for all players. Click to unlock." },
};

function showLockState(icon, lock) {
	const state = lock ? lock.type : "unlocked";
	const visual = LOCK_VISUALS[state];
	icon.classList.remove("none", "unlocked", "soft", "hard");
	icon.classList.add(state);
	const glyph = icon.querySelector("i");
	if (glyph) glyph.className = visual.icon;
	icon.title = game.i18n.localize(visual.key) || visual.fallback;

	// Mirror the blocked state the template gives hard-locked rows (see setting-row.hbs).
	const row = icon.closest(".hud-cfg-row");
	if (!row) return;
	const hard = state === "hard";
	row.classList.toggle("is-blocked", hard);
	if (hard) {
		row.title = icon.title;
		row.dataset.blockedReason = icon.title;
	} else {
		row.removeAttribute("title");
		delete row.dataset.blockedReason;
	}
}

const cycleLock = (direction) => (app, event, icon) => {
	if (!canManageLocks()) return undefined;
	event.preventDefault();
	event.stopPropagation();
	cycleSettingLock(icon.dataset.settingKey, direction).then((lock) => showLockState(icon, lock));
	return STOP;
};

// ── The table ───────────────────────────────────────────

const FORM_INPUTS = "select, input[type='number'], input.hud-color-input";

/** One row per reaction: { type: DOM event, selector: what it is delegated from, handle(app, event, target) }. */
const PANEL_EVENTS = [
	// Navigation
	{ type: "click", selector: ".hud-nav-item", handle: (app, event, item) => {
		event.preventDefault();
		if (item.dataset.tab) activateTab(app, item.dataset.tab, false);
	} },

	// Form inputs keep the draft and the live preview in step
	{ type: "input", selector: 'input[type="range"]', handle: (app, event, slider) => { updateRangeDisplay(slider); syncDraft(app); } },
	{ type: "input", selector: FORM_INPUTS, handle: (app) => syncDraft(app) },
	{ type: "change", selector: FORM_INPUTS, handle: (app) => syncDraft(app) },
	{ type: "change", selector: ".hud-switch-input", handle: (app) => syncDraft(app) },
	{ type: "change", selector: ".hud-nav-option input", handle: (app) => syncDraft(app) },
	{ type: "change", selector: '.hud-chip input[type="checkbox"]', handle: (app, event, checkbox) => {
		checkbox.closest(".hud-chip")?.classList.toggle("active", checkbox.checked);
		syncDraft(app);
	} },

	// Ctrl/Cmd+S saves
	{ type: "keydown", selector: null, handle: (app, event) => {
		if (!(event.ctrlKey || event.metaKey) || event.key !== "s") return;
		event.preventDefault();
		onSave(app, event, app.element.querySelector('[data-action="save"]'));
	} },


	// Greyed-out settings (GM-only or hard-locked): explain why they do not react
	{ type: "click", selector: ".hud-cfg-row.is-blocked .hud-cfg-control, .hud-cfg-group.is-blocked :is(.hud-theme-grid, .hud-chip-group)", handle: (app, event, control) => {
		event.preventDefault();
		const reason = control.closest("[data-blocked-reason]")?.dataset.blockedReason;
		if (reason) ui.notifications.info(reason);
		return STOP;
	} },

	// Settings locks (niks-settings-locks)
	{ type: "click", selector: ".hud-lock-icon[data-setting-key]", handle: cycleLock("forward") },
	{ type: "contextmenu", selector: ".hud-lock-icon[data-setting-key]", handle: cycleLock("backward") },

	// Customize HUD: reorder category cards
	{ type: "dragstart", selector: CATEGORY_CARD, handle: categoryDrag.start },
	{ type: "dragend", selector: CATEGORY_CARD, handle: categoryDrag.end },
	{ type: "dragover", selector: `.hud-categories-list ${CATEGORY_CARD}`, handle: categoryDrag.over },
	{ type: "dragleave", selector: `.hud-categories-list ${CATEGORY_CARD}`, handle: categoryDrag.leave },
	{ type: "drop", selector: `.hud-categories-list ${CATEGORY_CARD}`, handle: categoryDrag.drop },
];

/** Attach one listener per event type to the panel root. Call once, when the panel first renders. */
export function bindPanelEvents(app) {
	const root = app.element;
	if (!root) return;

	for (const type of new Set(PANEL_EVENTS.map((row) => row.type))) {
		const rows = PANEL_EVENTS.filter((row) => row.type === type);
		root.addEventListener(type, (event) => {
			for (const { selector, handle } of rows) {
				const target = selector === null ? root : event.target.closest?.(selector);
				if (!target || !root.contains(target)) continue;
				if (handle(app, event, target) === STOP) return;
			}
		});
	}
}
