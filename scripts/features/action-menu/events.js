import { onDrop } from "./drop.js";
import { enableLongPressDrag } from "./drag.js";
import { MODULE_ID, DOM_IDS } from "../../constants.js";

const PRIMARY_FAVORITE_DRAG_TYPE = "application/x-niks-action-hud-favorite";

const closest = (target, selector) => (target?.closest ? target.closest(selector) : null);

const clearFavoriteDropIndicators = (root) => {
	if (!root) return;
	root
		.querySelectorAll(".nah-quick-slot.drop-before, .nah-quick-slot.drop-after")
		.forEach((el) => el.classList.remove("drop-before", "drop-after"));
};

const isFavoriteDragEvent = (event) => {
	const types = Array.from(event.dataTransfer?.types || []);
	return types.includes(PRIMARY_FAVORITE_DRAG_TYPE);
};

let outsideClickAttached = false;
export function bindOutsideClickListener(ActionMenu) {
	if (outsideClickAttached) return;
	outsideClickAttached = true;

	document.addEventListener(
		"click",
		(event) => {
			const sub = document.getElementById(ActionMenu.SUB_ID);
			if (!sub || !sub.classList.contains("active")) return;

			const root = document.getElementById(ActionMenu.ROOT_ID);
			const inside = (root && root.contains(event.target)) || sub.contains(event.target);

			if (!inside) {
				sub.classList.remove("active");
				root?.classList.remove("has-active-submenu");
				ActionMenu.hideTooltip(true);
			}
		},
		true
	);
}

export function bindSubMenuEvents(ActionMenu) {
	const sub = document.getElementById(ActionMenu.SUB_ID);
	if (!sub) return;

	sub.addEventListener("drop", (event) => {
		if (isFavoriteDragEvent(event)) {
			event.preventDefault();
			event.stopPropagation();
			sub.classList.remove("drag-hover");
			return;
		}
		void onDrop(ActionMenu, event);
	});

	sub.addEventListener("dragenter", (e) => {
		e.preventDefault();
		if (isFavoriteDragEvent(e)) {
			e.stopPropagation();
			return;
		}
		sub.classList.add("drag-hover");
	});

	sub.addEventListener("dragover", (e) => {
		e.preventDefault();
		if (isFavoriteDragEvent(e)) e.stopPropagation();
	});

	sub.addEventListener("dragleave", (e) => {
		if (isFavoriteDragEvent(e)) {
			e.stopPropagation();
			sub.classList.remove("drag-hover");
			return;
		}
		if (!sub.contains(e.relatedTarget)) {
			sub.classList.remove("drag-hover");
		}
	});
}

export function bindRootEvents(ActionMenu) {
	const root = document.getElementById(ActionMenu.ROOT_ID);
	if (!root) return;

	bindOutsideClickListener(ActionMenu);

	const dropText = game.i18n.localize("NAH.UI.DropMacro") || "Drop Macro";
	let favoriteDrag = null;
	let suppressClickUntil = 0;

	const isFavDrag = (e) => Boolean(favoriteDrag || isFavoriteDragEvent(e));

	const finishFavDrag = () => {
		clearFavoriteDropIndicators(root);
		root
			.querySelectorAll(".nah-quick-slot.is-dragging")
			.forEach((s) => s.classList.remove("is-dragging"));
		root.classList.remove("drag-hover");
		favoriteDrag = null;
		suppressClickUntil = performance.now() + 250;
	};

	root.addEventListener("click", (event) => {
		const slot = closest(event.target, ".nah-quick-slot[data-favorite-id]");
		if (!slot) return;

		event.preventDefault();
		event.stopPropagation();
		if (performance.now() < suppressClickUntil) return;

		ActionMenu.hideTooltip(true);
		const fid = slot.dataset.favoriteId;
		if (fid) ActionMenu.useItem(fid, event);
	});

	root.addEventListener("contextmenu", (event) => {
		const slot = closest(event.target, ".nah-quick-slot[data-favorite-id]");
		if (!slot) return;

		event.preventDefault();
		event.stopPropagation();
		ActionMenu.hideTooltip(true);
		const fid = slot.dataset.favoriteId;
		if (fid) void ActionMenu.openFavoriteDialog(fid);
	});

	root.addEventListener("dragstart", (event) => {
		const slot = closest(event.target, ".nah-quick-slot[data-favorite-id]");
		if (!slot || !event.dataTransfer) return;

		const fid = slot.dataset.favoriteId;
		if (!fid || !ActionMenu.currentActor) return;

		ActionMenu.hideTooltip(true);
		favoriteDrag = { favoriteId: fid, actor: ActionMenu.currentActor };
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData(PRIMARY_FAVORITE_DRAG_TYPE, fid);
		event.dataTransfer.setData("text/plain", fid);
		slot.classList.add("is-dragging");
		root.classList.remove("drag-hover");
		event.stopPropagation();
	});

	root.addEventListener("dragend", () => {
		if (favoriteDrag) finishFavDrag();
	});

	root.addEventListener("drop", (event) => {
		if (!isFavDrag(event)) {
			void onDrop(ActionMenu, event);
			return;
		}

		event.preventDefault();
		event.stopImmediatePropagation();
		const container = closest(event.target, ".nah-quick-slot-container");
		const targetSlot = closest(event.target, ".nah-quick-slot[data-favorite-id]");
		const sourceId = favoriteDrag?.favoriteId || event.dataTransfer?.getData(PRIMARY_FAVORITE_DRAG_TYPE);
		const actor = favoriteDrag?.actor || ActionMenu.currentActor;
		const targetId = targetSlot?.dataset.favoriteId || null;
		const insertAfter = targetSlot ? event.clientX >= targetSlot.getBoundingClientRect().left + targetSlot.getBoundingClientRect().width / 2 : true;

		finishFavDrag();
		if (container && sourceId && actor) {
			void ActionMenu.reorderFavorites(sourceId, targetId, insertAfter, actor);
		}
	});

	root.addEventListener("dragover", (event) => {
		if (!isFavDrag(event)) {
			event.preventDefault();
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
		clearFavoriteDropIndicators(root);

		const container = closest(event.target, ".nah-quick-slot-container");
		const targetSlot = closest(event.target, ".nah-quick-slot[data-favorite-id]");
		if (!container || !targetSlot || targetSlot.dataset.favoriteId === favoriteDrag?.favoriteId) return;

		const rect = targetSlot.getBoundingClientRect();
		const insertAfter = event.clientX >= rect.left + rect.width / 2;
		targetSlot.classList.add(insertAfter ? "drop-after" : "drop-before");
	});

	root.addEventListener("dragenter", (event) => {
		event.preventDefault();
		if (isFavDrag(event)) return;
		root.classList.add("drag-hover");
		root.setAttribute("data-drag-text", dropText);
	});

	root.addEventListener("dragleave", (event) => {
		event.preventDefault();
		if (!root.contains(event.relatedTarget)) {
			if (isFavDrag(event)) clearFavoriteDropIndicators(root);
			root.classList.remove("drag-hover");
		}
	});

	enableLongPressDrag(ActionMenu, root);
}

export function checkEditMode(ActionMenu) {
	if (window.ActionHUD?.isEditMode) {
		ActionMenu.toggleEditMode(true);
	}
}
