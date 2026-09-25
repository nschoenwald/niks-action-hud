import { onDrop } from "./drop.js";
import { enableLongPressDrag } from "./drag.js";
import { MODULE_ID } from "../../constants.js";

const PRIMARY_FAVORITE_DRAG_TYPE = "application/x-niks-action-hud-favorite";

const closestElement = (target, selector) =>
	target && typeof target.closest === "function" ? target.closest(selector) : null;

const clearFavoriteDropIndicators = (rootElement) => {
	rootElement
		.querySelectorAll(".ib-quick-slot.drop-before, .ib-quick-slot.drop-after")
		.forEach((slot) => slot.classList.remove("drop-before", "drop-after"));
};

const isFavoriteDragEvent = (event) => {
	const types = Array.from(event.dataTransfer?.types || []);
	return types.includes(PRIMARY_FAVORITE_DRAG_TYPE);
};

let outsideClickAttached = false;
export const bindOutsideClickListener = (ActionMenu) => {
	if (outsideClickAttached) return;
	outsideClickAttached = true;

	document.addEventListener(
		"click",
		(event) => {
			const subContainer = document.getElementById(ActionMenu.SUB_ID);
			if (!subContainer || !subContainer.classList.contains("active")) return;

			const root = document.getElementById(ActionMenu.ROOT_ID);
			const clickedInsideHud =
				(root && root.contains(event.target)) ||
				subContainer.contains(event.target);

			if (!clickedInsideHud) {
				subContainer.classList.remove("active");
				ActionMenu.hideTooltip(true);
			}
		},
		true // capture phase
	);
};

export const bindSubMenuEvents = (ActionMenu) => {
	const subMenuContainer = document.getElementById(ActionMenu.SUB_ID);
	if (!subMenuContainer) return;

	subMenuContainer.addEventListener(
		"drop",
		(event) => {
			if (isFavoriteDragEvent(event)) {
				event.preventDefault();
				event.stopPropagation();
				subMenuContainer.classList.remove("drag-hover");
				return;
			}
			void onDrop(ActionMenu, event);
		},
	);

	subMenuContainer.addEventListener("dragenter", (e) => {
		e.preventDefault();
		if (isFavoriteDragEvent(e)) {
			e.stopPropagation();
			return;
		}
		subMenuContainer.classList.add("drag-hover");
	});

	subMenuContainer.addEventListener("dragover", (e) => {
		e.preventDefault();
		if (isFavoriteDragEvent(e)) e.stopPropagation();
	});

	subMenuContainer.addEventListener("dragleave", (e) => {
		if (isFavoriteDragEvent(e)) {
			e.stopPropagation();
			subMenuContainer.classList.remove("drag-hover");
			return;
		}
		if (!subMenuContainer.contains(e.relatedTarget)) {
			subMenuContainer.classList.remove("drag-hover");
		}
	});
};

export const bindRootEvents = (ActionMenu) => {
	const rootElement = document.getElementById(ActionMenu.ROOT_ID);
	if (!rootElement) return;

	bindOutsideClickListener(ActionMenu);

	const dropText = game.i18n.localize("IBHUD.UI.DropMacro");
	let favoriteDrag = null;
	let suppressQuickSlotClickUntil = 0;

	const isFavoriteDrag = (event) => {
		if (favoriteDrag) return true;
		return isFavoriteDragEvent(event);
	};

	const finishFavoriteDrag = () => {
		clearFavoriteDropIndicators(rootElement);
		rootElement
			.querySelectorAll(".ib-quick-slot.is-dragging")
			.forEach((slot) => slot.classList.remove("is-dragging"));
		rootElement.classList.remove("drag-hover");
		favoriteDrag = null;
		suppressQuickSlotClickUntil = performance.now() + 250;
	};

	rootElement.addEventListener("click", (event) => {
		const slot = closestElement(event.target, ".ib-quick-slot[data-favorite-id]");
		if (!slot) return;

		event.preventDefault();
		event.stopPropagation();
		if (performance.now() < suppressQuickSlotClickUntil) return;

		ActionMenu.hideTooltip(true);
		const favoriteId = slot.dataset.favoriteId;
		if (favoriteId) ActionMenu.useItem(favoriteId, event);
	});

	rootElement.addEventListener("contextmenu", (event) => {
		const slot = closestElement(event.target, ".ib-quick-slot[data-favorite-id]");
		if (!slot) return;

		event.preventDefault();
		event.stopPropagation();
		ActionMenu.hideTooltip(true);
		const favoriteId = slot.dataset.favoriteId;
		if (favoriteId) void ActionMenu.removeFavorite(favoriteId);
	});

	rootElement.addEventListener("dragstart", (event) => {
		const slot = closestElement(event.target, ".ib-quick-slot[data-favorite-id]");
		if (!slot || !event.dataTransfer) return;

		const favoriteId = slot.dataset.favoriteId;
		if (!favoriteId || !ActionMenu.currentActor) return;

		ActionMenu.hideTooltip(true);
		game.tooltip?.deactivate?.();

		favoriteDrag = {
			favoriteId,
			actor: ActionMenu.currentActor,
		};
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData(PRIMARY_FAVORITE_DRAG_TYPE, favoriteId);
		event.dataTransfer.setData("text/plain", favoriteId);
		slot.classList.add("is-dragging");
		rootElement.classList.remove("drag-hover");
		event.stopPropagation();
	});

	rootElement.addEventListener("dragend", () => {
		if (favoriteDrag) finishFavoriteDrag();
	});

	rootElement.addEventListener("drop", (event) => {
		if (!isFavoriteDrag(event)) {
			void onDrop(ActionMenu, event);
			return;
		}

		event.preventDefault();
		event.stopImmediatePropagation();
		const container = closestElement(event.target, ".ib-quick-slot-container");
		const targetSlot = closestElement(event.target, ".ib-quick-slot[data-favorite-id]");
		const sourceId =
			favoriteDrag?.favoriteId ||
			event.dataTransfer?.getData(PRIMARY_FAVORITE_DRAG_TYPE);
		const actor = favoriteDrag?.actor || ActionMenu.currentActor;
		const targetId = targetSlot?.dataset.favoriteId || null;
		const insertAfter = targetSlot
			? event.clientX >=
				targetSlot.getBoundingClientRect().left +
					targetSlot.getBoundingClientRect().width / 2
			: true;

		finishFavoriteDrag();
		if (container && sourceId && actor) {
			void ActionMenu.reorderFavorites(sourceId, targetId, insertAfter, actor);
		}
	});

	rootElement.addEventListener("dragover", (event) => {
		if (!isFavoriteDrag(event)) {
			event.preventDefault();
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
		clearFavoriteDropIndicators(rootElement);

		const container = closestElement(event.target, ".ib-quick-slot-container");
		const targetSlot = closestElement(event.target, ".ib-quick-slot[data-favorite-id]");
		if (!container || !targetSlot || targetSlot.dataset.favoriteId === favoriteDrag?.favoriteId) {
			return;
		}

		const rect = targetSlot.getBoundingClientRect();
		const insertAfter = event.clientX >= rect.left + rect.width / 2;
		targetSlot.classList.add(insertAfter ? "drop-after" : "drop-before");
	});

	rootElement.addEventListener("dragenter", (event) => {
		event.preventDefault();
		if (isFavoriteDrag(event)) return;
		rootElement.classList.add("drag-hover");
		rootElement.setAttribute("data-drag-text", dropText);
	});

	rootElement.addEventListener("dragleave", (event) => {
		event.preventDefault();
		if (!rootElement.contains(event.relatedTarget)) {
			if (isFavoriteDrag(event)) clearFavoriteDropIndicators(rootElement);
			rootElement.classList.remove("drag-hover");
		}
	});

	enableLongPressDrag(ActionMenu, rootElement);
};

export const checkEditMode = (ActionMenu) => {
	const isEdit = window.ActionHUD?.isEditMode;
	if (isEdit) {
		ActionMenu.toggleEditMode(true);
	}
};
