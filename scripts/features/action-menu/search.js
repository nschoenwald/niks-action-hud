
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

	let allItems = [];

	const collectItems = (node) => {
		if (Array.isArray(node)) {
			allItems = allItems.concat(node);
		} else if (typeof node === "object" && node !== null) {
			for (const child of Object.values(node)) {
				collectItems(child);
			}
		}
	};

	if (data.items) {
		collectItems(data.items);
	}

	const filtered = allItems.filter((item) => {
		if (item.isHeader) return false;
		return item.name.toLowerCase().includes(term);
	});

	if (filtered.length === 0) {
		const noResults = game.i18n.localize("IBHUD.UI.NoSearchResults");
		scrollArea.html(
			`<div class="ib-list-item" style="justify-content:center; color:#888;">${noResults}</div>`,
		);
	} else {
		scrollArea.html(buildListItems(ActionMenu, filtered));
	}
};
