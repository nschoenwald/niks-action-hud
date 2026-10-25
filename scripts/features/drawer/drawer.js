/**
 * Drawer feature: the flyout panel that lists a category's entries (panes, navigation, search, rows).
 * It renders from `store.drawer` and handles every interaction that happens inside the panel.
 */

import { escapeHtml } from "../../core/escape.js";
import { drawerNavFor } from "../../core/drawer-nav.js";
import { isHeading } from "../../providers/shared/drawer-model.js";
import { ref, parseRef } from "../../core/action-ref.js";
import { readProfile } from "../../core/profile.js";
import { MODULE_ID, DOM_IDS } from "../../core/ids.js";
import { scrollMemory } from "./scroll-memory.js";
import { setThemeClass } from "../../core/theme-class.js";
import { hudStore } from "../../core/store.js";
import { iconMarkup } from "../../core/icon-source.js";
import { isThemeAvailable, getDefaultTheme } from "../settings-panel/ui-constants.js";
import { ensureDockRoot } from "../dock/dock.js";
import { resolveDrawerSide } from "../dock/layout.js";
import { applyDrawerFilter } from "./search.js";
import { renderSegments, renderUses } from "./segments.js";
import { setDrawerToggle } from "../../core/drawer-toggles.js";
import { readSetting } from "../../core/setting-read.js";

const { renderTemplate } = foundry.applications.handlebars;
const loc = (key, fallback = "") => game.i18n?.localize?.(`NAH.${key}`) || fallback;

const SEARCH_DEBOUNCE_MS = 150;
const EDGE_CLEARANCE = 20;

let hud = null;
let paintSeq = 0;

// ── Pane selection ──────────────────────────────────────

/** The pane to show: the remembered one while it still exists, else the first. */
function shownPane(drawer, rememberedId) {
	const panes = Array.isArray(drawer.panes) ? drawer.panes : [];
	return panes.find((candidate) => candidate.id === rememberedId) ?? panes[0] ?? null;
}

/** Navigation entries for the template; none when there is only one pane. */
const paneLinks = (drawer, current) => (drawer.panes?.length > 1
	? drawer.panes.map((candidate) => ({ id: candidate.id, label: candidate.label, isActive: candidate === current }))
	: []);

// ── Row rendering ───────────────────────────────────────

const MUTED_NOTE = (text) =>
	`<div class="nah-row-entry"><div class="nah-row-body" style="justify-content:center; color:#888; font-style:italic;">${escapeHtml(text)}</div></div>`;


function headingMarkup(item) {
	const icon = iconMarkup(item.icon, {
		iconStyle: "margin-right: 6px; font-size: 0.9em; opacity: 0.85;",
		imageStyle: "width: 16px; height: 16px; margin-right: 6px; object-fit: contain; vertical-align: middle;",
	});
	return `<div class="nah-group-heading">${icon}<span>${escapeHtml(item.heading)}</span></div>`;
}

/** Attributes that identify a row. */
const rowDataAttrs = (item) => `data-action="use-item" data-item-id="${escapeHtml(item.id)}"`;

function pinButtonMarkup(item, isPinned) {
	if (item.pinnable === false) return "";
	const title = isPinned ? loc("Tooltips.RemoveFavorite", "Remove favorite") : loc("Tooltips.AddFavorite", "Add favorite");
	return `
		<button type="button" class="nah-pin-toggle${isPinned ? " active" : ""}"
				data-action="toggle-favorite"
				data-item-id="${escapeHtml(item.id)}"
				title="${escapeHtml(title)}">
			<i class="${isPinned ? "fas" : "far"} fa-star"></i>
		</button>`;
}

/** Sub-line content of a row, drawn from its typed segments. */
const costMarkup = (item) => (item.segments?.length ? renderSegments(item.segments, { muted: item.subtleInfo }) : "");

const PROFICIENCY_ICONS = Object.freeze({
	0: "far fa-circle",
	0.5: "fas fa-circle-half-stroke",
	1: "fas fa-circle-check",
	2: "fas fa-check-double",
});
const PROFICIENCY_CLASSES = Object.freeze({ 0: "none", 0.5: "half-prof", 1: "proficient", 2: "expertise" });

/** Proficiency indicator for saves, skills and tools; empty when the row carries no proficiency data. */
function proficiencyMarkup(item) {
	const icon = PROFICIENCY_ICONS[item.proficiency];
	if (!icon) return "";
	const label = escapeHtml(item.proficiencyLabel || "");
	return `<span class="nah-roll-prof ${PROFICIENCY_CLASSES[item.proficiency]}" title="${label}" aria-label="${label}"><i class="${icon}" aria-hidden="true"></i></span>`;
}

/** "A" / "D" badge when the actor has advantage / disadvantage on this roll. */
function rollModeMarkup(item) {
	if (!item.rollMode) return "";
	const label = escapeHtml(item.rollModeLabel || "");
	const [cls, letter] = item.rollMode > 0 ? ["advantage", "A"] : ["disadvantage", "D"];
	return `<span class="nah-roll-mode ${cls}" title="${label}" aria-label="${label}">${letter}</span>`;
}

/** One entry row. Three layouts: ability-style roll, passive feature, and the standard two-line card. */
function rowMarkup(item, pinnedIds) {
	const isPinned = pinnedIds.has(item.id) && item.pinnable !== false;
	const pin = pinButtonMarkup(item, isPinned);
	const icon = iconMarkup(item.icon || "icons/svg/item-bag.svg", {
		imageClass: "nah-row-thumb nah-item-icon-img",
		iconClass: "nah-item-icon-fa",
	});
	const status = [
		item.isDepleted && "is-exhausted",
		item.isUnpreparedRitual && "is-ritual",
		item.isUnprepared && "is-unprepared",
		isPinned && "is-favorite",
	].filter(Boolean).join(" ");
	const name = `<span class="nah-item-name nah-font-display">${escapeHtml(item.name)}</span>`;
	const uses = item.uses ? `<span class="nah-item-uses">${renderUses(item.uses)}</span>` : "";

	const oneLine = (extraClass, meta) => `
		<div class="nah-action-card nah-row-entry nah-one-line-item ${extraClass} ${status}" ${rowDataAttrs(item)}>
			<div class="nah-item-icon-box">${icon}</div>
			<div class="nah-row-body nah-one-line-content">
				${name}
				<div class="nah-one-line-meta">${meta}${pin}</div>
			</div>
		</div>`;

	const subLine = costMarkup(item);
	const modifier = item.modifier;
	if (item.isAbilityRoll) {
		return oneLine("", modifier ? `${rollModeMarkup(item)}${proficiencyMarkup(item)}<span class="nah-roll-mod font-bold">${escapeHtml(modifier)}</span>` : subLine);
	}
	if (item.isFeature && !subLine) return oneLine("nah-feature-item", uses);

	const cost = subLine ? `<div class="nah-item-cost-container">${subLine}</div>` : "";
	const mod = modifier ? `<span class="nah-roll-mod font-bold">${escapeHtml(modifier)}</span>` : "";
	return `
		<div class="nah-action-card nah-row-entry ${status}" ${rowDataAttrs(item)}>
			<div class="nah-item-icon-box">${icon}</div>
			<div class="nah-row-body">
				<div class="nah-item-name-row">${name}</div>
				<div class="nah-item-sub-line">
					${cost}
					<div class="nah-item-right-meta">${uses}${mod}${pin}</div>
				</div>
			</div>
		</div>`;
}

/**
 * Render rows for display (shared with the cross-category search).
 * @param {Array<object>} items
 */
export function renderRows(items) {
	const pinnedIds = new Set(hud?.listFavorites?.() || []);
	if (!items.length) return MUTED_NOTE(loc("UI.EmptyDrawer", "Empty"));
	return items.map((item) => (isHeading(item) ? headingMarkup(item) : rowMarkup(item, pinnedIds))).join("");
}

// ── Placement and painting ──────────────────────────────

function fitToViewport(panel, dockEl) {
	if (!panel || !dockEl) return;
	panel.dataset.openX = "left";
	panel.dataset.openY = "down";

	const dockRect = dockEl.getBoundingClientRect();
	const panelRect = panel.getBoundingClientRect();
	const side = resolveDrawerSide(dockEl);

	// The ribbon and portrait can stick out past the dock's own box; keep the drawer clear of them.
	// Measured in the dock's own CSS pixels, so it only changes when the dock's contents were rewritten.
	if (!dockEl._paintGeneration || dockEl._overhangGeneration !== dockEl._paintGeneration) {
		const zoom = parseFloat(getComputedStyle(dockEl).zoom) || 1;
		let minLeft = dockRect.left;
		let maxRight = dockRect.right;
		for (const el of dockEl.querySelectorAll(`#${DOM_IDS.MENU} *`)) {
			if (el.closest(".nah-favorites-rail")) continue;
			const r = el.getBoundingClientRect();
			if (!r.width || !r.height) continue;
			minLeft = Math.min(minLeft, r.left);
			maxRight = Math.max(maxRight, r.right);
		}
		dockEl.style.setProperty("--nah-overhang-left", `${(dockRect.left - minLeft) / zoom}px`);
		dockEl.style.setProperty("--nah-overhang-right", `${(maxRight - dockRect.right) / zoom}px`);
		dockEl._overhangGeneration = dockEl._paintGeneration;
	}
	panel.dataset.openX = side === "right" ? "right" : "left";
	panel.dataset.openY = dockRect.top + (panelRect.height || 400) > window.innerHeight - EDGE_CLEARANCE ? "up" : "down";
}

function ensureDrawerContainer() {
	const dockEl = ensureDockRoot();
	return { dockEl, container: dockEl.querySelector(`#${DOM_IDS.DRAWER_SLOT}`) };
}

function hideDrawer(container, dockEl) {
	scrollMemory.forget(container.dataset);
	delete container._paintedHtml;
	delete container.dataset.searchHeight;
	container.classList.remove("active");
	delete container.dataset.activeCat;
	dockEl?.classList.remove("has-open-drawer");
}


/** Render the drawer for `categoryId` from the store's drawer state. */
export async function paintDrawer(categoryId) {
	const seq = ++paintSeq;
	const { dockEl, container } = ensureDrawerContainer();
	const state = hudStore.get().drawer;

	// Read the scroll offset while the drawer is still displayed: a hidden element reports 0.
	const scrollArea = container.querySelector(".nah-scroller");
	const previousScroll = scrollMemory.begin(container.dataset, scrollArea?.scrollTop);

	const drawer = await hud.loadDrawer(hud.currentActor, categoryId);
	if (seq !== paintSeq) return;
	if (!drawer) {
		scrollMemory.settle(container.dataset);
		hideDrawer(container, dockEl);
		return;
	}

	const profile = readProfile();
	let theme = profile.theme || getDefaultTheme();
	if (!isThemeAvailable(theme)) theme = getDefaultTheme();
	setThemeClass(container, theme);

	const current = shownPane(drawer, state?.pane);
	const links = paneLinks(drawer, current);
	hudStore.patch({ drawer: { ...state, categoryId, pane: current?.id ?? null } }, { silent: true });

	// The offset only carries over a repaint of the same pane; a different category or pane starts at the top.
	const keepScroll = scrollMemory.enter(container.dataset, `${categoryId}|${current?.id ?? ""}`);

	const query = state?.query || "";
	// A held search height only applies while that search runs (switching category clears the query).
	if (!query) delete container.dataset.searchHeight;

	// Keep scroll position and search focus across re-renders.
	const previousInput = container.querySelector(".nah-finder-field");
	const hadFocus = Boolean(previousInput && document.activeElement === previousInput);
	const caret = hadFocus ? previousInput.selectionStart : null;

	const html = await renderTemplate(`modules/${MODULE_ID}/templates/hud/drawer.hbs`, {
		categoryId,
		categoryTitle: drawer.title || "Category",
		searchQuery: query,
		sideNav: links.length > 0 && drawerNavFor(categoryId, readProfile().layoutCategories, hud.provider?.getStarterLayout?.()) === "side",
		links,
		toggles: Array.isArray(drawer.toggles) ? drawer.toggles : [],
		itemsHtml: query ? "" : renderRows(current?.rows ?? []),
	});
	if (seq !== paintSeq) return;

	// A refresh that leaves this drawer as it was (most do) keeps its DOM: scroll position, focus
	// and hover state stay as they are and nothing is re-measured. Search results are redone below.
	const unchanged = container._paintedHtml === html && container.classList.contains("active") && container.dataset.activeCat === String(categoryId);
	if (unchanged) {
		scrollMemory.settle(container.dataset);
		fitToViewport(container, dockEl);
		if (query) await applyDrawerFilter(hud, query);
		return;
	}
	container.innerHTML = html;
	container._paintedHtml = html;

	scrollMemory.settle(container.dataset);
	container.classList.add("active");
	container.dataset.activeCat = String(categoryId);
	dockEl.classList.add("has-open-drawer");
	fitToViewport(container, dockEl);

	if (hadFocus) {
		const input = container.querySelector(".nah-finder-field");
		input?.focus();
		if (input && caret !== null) input.setSelectionRange(caret, caret);
	}

	if (query) {
		await applyDrawerFilter(hud, query);
		return;
	}
	const area = container.querySelector(".nah-scroller");
	if (area && keepScroll && previousScroll > 0) area.scrollTop = previousScroll;
}

/** Bring the panel in line with the store: open/repaint when a category is selected, hide otherwise. */
async function syncDrawer() {
	const { drawer, actor } = hudStore.get();
	const { dockEl, container } = ensureDrawerContainerIfDockExists();
	if (!container) return;
	if (!drawer || !actor) {
		hideDrawer(container, dockEl);
		hud.dismissHoverCard(true);
		return;
	}
	await paintDrawer(drawer.categoryId);
}

/** Re-place the open drawer after the dock changed size, without repainting it. */
export function refitDrawer() {
	const { dockEl, container } = ensureDrawerContainerIfDockExists();
	if (container?.classList.contains("active")) fitToViewport(container, dockEl);
}

function ensureDrawerContainerIfDockExists() {
	const dockEl = document.getElementById(DOM_IDS.DOCK);
	return { dockEl, container: dockEl?.querySelector(`#${DOM_IDS.DRAWER_SLOT}`) ?? null };
}

// ── Delegated input ─────────────────────────────────────

let searchTimer = null;

const submitSearch = (value) => {
	clearTimeout(searchTimer);
	searchTimer = setTimeout(() => void applyDrawerFilter(hud, value), SEARCH_DEBOUNCE_MS);
};

/** Client preference: dismiss the drawer once an entry has been used. */
function closesAfterUse() {
	if (game.settings.settings.has(`${MODULE_ID}.closeDrawerOnUse`)) return Boolean(readSetting("closeDrawerOnUse"));
	return Boolean(readProfile().closeDrawerOnUse);
}

/** Inline row commands (`item-command` refs) that count as using an action. */
const CLOSING_COMMANDS = new Set(["potion"]);

const CLICK_ACTIONS = {
	"use-item": (el, event) => {
		if (!el.dataset.itemId) return;
		hud.useItem(el.dataset.itemId, event);
		if (closesAfterUse()) hud.closeDrawer();
	},
	"toggle-favorite": (el, event) => {
		event.stopPropagation();
		if (el.dataset.itemId) hud.toggleFavorite(el.dataset.itemId);
	},
	"ammo-action": (el, event) => {
		event.stopPropagation();
		if (el.dataset.weaponId && el.dataset.command) hud.useItem(ref.ammo(el.dataset.weaponId, el.dataset.command), event);
	},
	"equip-item": (el, event) => {
		event.stopPropagation();
		if (el.dataset.itemId) hud.useItem(ref.equip(el.dataset.itemId), event);
	},
	"item-command": (el, event) => {
		event.stopPropagation();
		if (!el.dataset.command) return;
		hud.useItem(el.dataset.command, event);
		// Drinking is using an action; equip / light / restore toggles keep the drawer open.
		if (CLOSING_COMMANDS.has(parseRef(el.dataset.command).kind) && closesAfterUse()) hud.closeDrawer();
	},
	"show-pane": (el) => el.dataset.category && el.dataset.paneId && hud.showPane(el.dataset.category, el.dataset.paneId),
	"close-drawer": () => hud.closeDrawer(),
	"drawer-toggle": (el) => el.dataset.toggleId && setDrawerToggle(el.dataset.toggleId, el.getAttribute("aria-pressed") !== "true"),
	"clear-search": async (el) => {
		clearTimeout(searchTimer);
		const container = el.closest(`#${DOM_IDS.DRAWER_SLOT}`);
		const input = container.querySelector(".nah-finder-field");
		if (input) input.value = "";
		await applyDrawerFilter(hud, "");
		container.querySelector(".nah-finder-field")?.focus();
	},
};

function openRowMenu(card, event) {
	event.preventDefault();
	event.stopPropagation();
	const itemId = card.dataset.itemId;

	if (event.ctrlKey || event.metaKey) {
		hud.useItem(itemId, event);
		if (closesAfterUse()) hud.closeDrawer();
		return;
	}
	hud.openItem(itemId);
}

function bindDrawerInput(container) {
	container.addEventListener("click", async (event) => {
		const el = event.target.closest("[data-action]");
		if (el) await CLICK_ACTIONS[el.dataset.action]?.(el, event);
	});

	container.addEventListener("input", (event) => {
		const input = event.target.closest('[data-action="filter-drawer"]');
		if (input) submitSearch(input.value);
	});
	container.addEventListener("keydown", (event) => {
		const input = event.target.closest('[data-action="filter-drawer"]');
		if (!input || event.key !== "Escape" || !input.value) return;
		event.preventDefault();
		clearTimeout(searchTimer);
		input.value = "";
		void applyDrawerFilter(hud, "");
	});

	container.addEventListener("contextmenu", (event) => {
		const card = event.target.closest(".nah-action-card");
		if (card) openRowMenu(card, event);
	});

	container.addEventListener("pointerover", (event) => {
		const card = event.target.closest(".nah-action-card");
		if (card?.dataset.itemId) hud.revealHoverCard(card.dataset.itemId, card);
	});
	container.addEventListener("pointerout", (event) => {
		const card = event.target.closest(".nah-action-card");
		if (card && !card.contains(event.relatedTarget)) hud.dismissHoverCard();
	});
	container.addEventListener("scroll", () => {
		hud.dismissHoverCard(true);
	}, { capture: true, passive: true });
}

/** Wire the drawer to the store. Input is bound the first time the container exists. */
export function mountDrawer(runtime) {
	hud = runtime;
	hudStore.watch(["drawer", "actor", "revision"], () => {
		const { container } = ensureDrawerContainerIfDockExists();
		if (container && !container.dataset.inputBound) {
			container.dataset.inputBound = "true";
			bindDrawerInput(container);
		}
		return syncDrawer();
	});
}
