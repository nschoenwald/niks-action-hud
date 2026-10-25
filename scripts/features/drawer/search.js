import { escapeHtml } from "../../core/escape.js";
import { renderRows } from "./drawer.js";
import { hudStore } from "../../core/store.js";
import { loadDrawer, listCategories } from "../registry/registry.js";
import { shouldShowCategory } from "../registry/gating.js";
import { localizeCategory } from "../../core/localization.js";
import { sectionCategoryId } from "../../core/category-id.js";
import { buildIndex, fold, search } from "./search-index.js";
import { heading } from "../../providers/shared/drawer-model.js";



/**
 * Toggles drawer chrome (tabs, sidebar, clear button) between search and browse mode.
 * @param {HTMLElement} shell
 * @param {boolean} searching
 */
function setSearchMode(shell, searching) {
	shell.classList.toggle("is-searching", searching);
	if (searching) shell.dataset.isSearching = "true";
	else delete shell.dataset.isSearching;

	for (const el of shell.querySelectorAll(".nah-spell-pages, .nah-rail-pane")) {
		el.style.display = searching ? "none" : "";
	}

	const searchBox = shell.querySelector(".nah-finder-wrap");
	if (!searchBox) return;
	let clearBtn = searchBox.querySelector(".nah-search-clear");
	if (searching && !clearBtn) {
		const title = game.i18n?.localize?.("NAH.UI.ClearSearch") || "Clear search";
		searchBox.insertAdjacentHTML(
			"beforeend",
			`<button type="button" class="nah-search-clear" data-action="clear-search" title="${escapeHtml(title)}"><i class="fas fa-times"></i></button>`,
		);
	} else if (!searching && clearBtn) {
		clearBtn.remove();
		clearBtn = null;
	}
}

/**
 * Keep the drawer at the height it had before the search started, so results don't resize it (they
 * scroll inside instead). Measured once per search, before the tabs are hidden, and remembered on the
 * drawer slot so it survives repaints. The computed height is in the drawer's own CSS pixels, which
 * stay correct under the dock's zoom.
 */
function holdHeight(container, shell) {
	if (!container.dataset.searchHeight) {
		const height = parseFloat(getComputedStyle(shell).height);
		if (height > 0) container.dataset.searchHeight = String(Math.round(height));
	}
	if (container.dataset.searchHeight) shell.style.height = `${container.dataset.searchHeight}px`;
}

/** Record the active search text in the store without triggering a repaint. */
function setQuery(text) {
	const drawer = hudStore.get().drawer;
	if (drawer) hudStore.patch({ drawer: { ...drawer, query: text } }, { silent: true });
}

let cachedIndex = null;

/** The searchable index for the actor, rebuilt when the HUD revision or actor changes. */
async function indexFor(hud, actor, categories, activeCat) {
	const { revision } = hudStore.get();
	if (cachedIndex?.actorId === actor.id && cachedIndex.revision === revision && cachedIndex.activeCat === activeCat) return cachedIndex.entries;

	const drawers = await Promise.all(categories.map(async (category) => {
		try {
			return { category, data: await loadDrawer(hud, actor, category.id, category) };
		} catch (err) {
			console.warn(`Nik's Action HUD | Search could not load category "${category.id}":`, err);
			return { category, data: null };
		}
	}));
	const entries = buildIndex(drawers);
	cachedIndex = { actorId: actor.id, revision, activeCat, entries };
	return entries;
}

/** System sections the ribbon does not list (removed from the layout), so their actions stay findable. */
function offRibbonSections(hud, actor, listed) {
	const covered = new Set(listed.map((cat) => cat.sectionId).filter(Boolean));
	const hasLegendary = Boolean(hud.provider?.actorHasLegendary?.(actor));
	return (hud.provider?.getStarterLayout?.() ?? [])
		.filter((entry) => entry.sectionId && !covered.has(entry.sectionId) && (entry.sectionId !== "legendary" || hasLegendary))
		.map((entry) => ({ id: sectionCategoryId(entry.sectionId), sectionId: entry.sectionId, label: entry.label, icon: entry.icon }));
}

/**
 * Categories worth searching: every drawer the actor can reach, whether or not the ribbon shows it
 * right now. Order sets which header a shared action lands under: the open drawer, then the visible
 * ribbon, then hidden ones, then system sections missing from the layout.
 */
function searchableCategories(hud, actor, activeCat) {
	const all = listCategories(hud, actor) || [];
	const isOpen = (cat) => String(cat.id) === String(activeCat);
	const shown = new Set(all.filter((cat) => shouldShowCategory(cat, { hud, actor })));

	const ordered = [
		...all.filter(isOpen),
		...all.filter((cat) => !isOpen(cat) && shown.has(cat)),
		...all.filter((cat) => !isOpen(cat) && !shown.has(cat)),
		...offRibbonSections(hud, actor, all),
	];
	if (activeCat && !ordered.some(isOpen)) ordered.unshift({ id: activeCat });
	return ordered;
}

/**
 * Group hits under one header per category, in the order the categories were indexed.
 * Matched by id: the cached index keeps the category objects from when it was built.
 */
function groupHits(hits, categories) {
	const rows = [];
	for (const category of categories) {
		const mine = hits.filter((hit) => String(hit.category?.id) === String(category.id));
		if (!mine.length) continue;
		rows.push(heading(localizeCategory(category.label, category.sectionId) || "Actions", category.img || category.icon || ""));
		rows.push(...mine.map((hit) => hit.row));
	}
	return rows;
}

/**
 * Filter the open drawer by the query, searching every visible category of the actor and
 * clustering hits under category headers. An empty query restores the normal tab view.
 */
export async function applyDrawerFilter(hud, query) {
	const term = fold(query);
	const container = document.getElementById(hud.DRAWER_ID);
	if (!container) return;

	const activeCat = hudStore.get().drawer?.categoryId;
	const shell = container.querySelector(".nah-drawer-pane");
	const scrollArea = shell?.querySelector(".nah-scroller");
	if (!shell || !scrollArea) return;

	const ticket = (hud._searchSequence = (hud._searchSequence || 0) + 1);

	if (!term) {
		setQuery("");
		delete container.dataset.searchHeight;
		shell.style.height = "";
		setSearchMode(shell, false);
		if (activeCat) await hud.paintDrawer(activeCat);
		return;
	}

	setQuery(String(query ?? "").trim());
	// Results replace the drawer's rows, so its painted markup no longer describes the DOM.
	delete container._paintedHtml;
	holdHeight(container, shell);
	setSearchMode(shell, true);

	const actor = hud.currentActor;
	if (!actor) return;

	const categories = searchableCategories(hud, actor, activeCat);
	const entries = await indexFor(hud, actor, categories, activeCat);
	if (hud._searchSequence !== ticket || !scrollArea.isConnected) return;

	const hits = search(entries, term);
	if (!hits.length) {
		const emptyText = game.i18n?.has?.("NAH.UI.SearchNoMatch") ? game.i18n.localize("NAH.UI.SearchNoMatch") : "No matching actions found.";
		scrollArea.innerHTML = `<div class="nah-row-entry"><div class="nah-row-body" style="justify-content:center; color:#888; font-style:italic;">${escapeHtml(emptyText)}</div></div>`;
	} else {
		scrollArea.innerHTML = renderRows(groupHits(hits, categories));
	}
	scrollArea.scrollTop = 0;
}
