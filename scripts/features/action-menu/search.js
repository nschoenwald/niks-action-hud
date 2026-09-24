
import { buildListItems } from "./renderer.js";

export const filterList = async (ActionMenu, query) => {
	const term = query.toLowerCase().trim();
	const container = $(`#${ActionMenu.SUB_ID}`);
	const currentCat = container.data("active-cat");
	const wrapper = container
		.children(".ib-sub-menu-wrapper")
		.filter((_, element) =>
			$(element).attr("data-category") === String(currentCat),
		)
		.first();
	if (!wrapper.length) return;

	const shell = wrapper.children(".ib-sub-menu").first();
	const data = container.data("menu-data");
	const scrollArea = shell.find(".ib-scroll-area").first();
	const tabsContainer = shell.find("#ib-tabs-container").first();

	if (!term) {
		// Search modifies DOM directly without updating the morph cache.
		// Invalidate so renderSubMenu forces a full DOM rebuild.
		if (shell.length) {
			shell.data("last-list-html", null);
		}

		tabsContainer.show();

		const isCurrentRender = await ActionMenu.renderSubMenu(currentCat);
		if (
			!isCurrentRender ||
			String(container.data("active-cat")) !== String(currentCat)
		) return;

		const updatedWrapper = container
			.children(".ib-sub-menu-wrapper")
			.filter((_, element) =>
				$(element).attr("data-category") === String(currentCat),
			)
			.first();
		const input = updatedWrapper.find(".ib-search-input").first();
		input.val("");
		input.focus();
		return;
	}

	tabsContainer.hide();

	const allItems = [];

	const collectItems = (node) => {
		if (Array.isArray(node)) {
			allItems.push(...node);
		} else if (typeof node === "object" && node !== null) {
			for (const child of Object.values(node)) {
				collectItems(child);
			}
		}
	};

	if (data?.items) {
		collectItems(data.items);
	}

	const getItemKey = (item) => {
		if (item.id !== undefined && item.id !== null && item.id !== "") {
			return `id:${item.id}`;
		}
		if (item.uuid) {
			return `uuid:${item.uuid}`;
		}
		return `name:${item.name || ""}:${item.type || ""}`;
	};

	const seen = new Set();
	const filtered = [];

	for (const item of allItems) {
		if (!item || item.isHeader) continue;

		const rawName = String(item.name || "").toLowerCase();
		const cleanName = rawName.replace(/<[^>]*>/g, "").trim();
		if (!rawName.includes(term) && !cleanName.includes(term)) continue;

		const key = getItemKey(item);
		if (seen.has(key)) continue;
		seen.add(key);

		filtered.push(item);
	}

	if (filtered.length === 0) {
		const noResults = game.i18n.localize("IBHUD.UI.NoSearchResults") || "No results found";
		scrollArea.html(
			`<div class="ib-list-item" style="justify-content:center; color:#888;">${noResults}</div>`,
		);
	} else {
		scrollArea.html(buildListItems(ActionMenu, filtered));
	}
};
