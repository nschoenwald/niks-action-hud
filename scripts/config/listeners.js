/**
 * Event listeners and DOM bindings for Nik's Action HUD Configuration.
 * Exclusively designed for Foundry V14.
 */

import { switchTab } from "./helpers.js";
import { captureInputData } from "./capture.js";
import { triggerPreview } from "./preview.js";
import { onSave } from "./handlers.js";

export const bindNavigationListeners = (app) => {
	const root = app.element;
	if (!root) return;

	root.querySelectorAll(".hud-nav-item").forEach((item) => {
		item.addEventListener("click", (e) => {
			e.preventDefault();
			const tab = item.dataset.tab;
			if (tab) switchTab(app, tab, false);
		});
	});
};

export const bindInputLiveListeners = (app) => {
	const root = app.element;
	if (!root) return;

	// Real-time Range Sliders
	root.querySelectorAll('input[type="range"]').forEach((slider) => {
		const updateDisplay = () => {
			const display = slider.parentElement?.querySelector(".hud-range-value");
			if (display) {
				const unit = slider.dataset.unit || "x";
				display.textContent = `${Number(slider.value).toFixed(2)}${unit}`;
			}
		};

		slider.addEventListener("input", () => {
			updateDisplay();
			captureInputData(app, root);
			triggerPreview(app);
		});
		updateDisplay();
	});

	// Selects, Number inputs, and Color Inputs
	root.querySelectorAll("select, input[type='number'], input.hud-color-input").forEach((el) => {
		el.addEventListener("input", () => {
			captureInputData(app, root);
			triggerPreview(app);
		});
		el.addEventListener("change", () => {
			captureInputData(app, root);
			triggerPreview(app);
		});
	});

	// Toggle switches
	root.querySelectorAll(".hud-switch-input").forEach((toggle) => {
		toggle.addEventListener("change", () => {
			captureInputData(app, root);
			triggerPreview(app);
		});
	});

	// Keybinding: Ctrl+S / Cmd+S to save
	root.addEventListener("keydown", (e) => {
		if ((e.ctrlKey || e.metaKey) && e.key === "s") {
			e.preventDefault();
			onSave(app, e, root.querySelector('[data-action="save"]'));
		}
	});
};

export const bindFilePickers = (app) => {
	const root = app.element;
	if (!root) return;

	root.querySelectorAll("[data-file-picker]").forEach((btn) => {
		btn.addEventListener("click", (e) => {
			e.preventDefault();
			const targetName = btn.dataset.filePicker;
			const targetInput = root.querySelector(`input[name="${targetName}"]`);
			if (!targetInput) return;

			const current = targetInput.value;
			const fp = new FilePicker({
				type: btn.dataset.type || "image",
				current: current,
				callback: (path) => {
					targetInput.value = path;
					targetInput.dispatchEvent(new Event("change", { bubbles: true }));
				},
			});
			fp.render(true);
		});
	});
};

export const bindDragDrop = (app) => {
	const root = app.element;
	if (!root) return;

	const container = root.querySelector(".hud-categories-list");
	if (!container) return;

	let draggedCard = null;

	container.querySelectorAll(".hud-category-card[draggable='true']").forEach((card) => {
		card.addEventListener("dragstart", (e) => {
			draggedCard = card;
			card.classList.add("dragging");
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("text/plain", card.dataset.catIndex || "");
		});

		card.addEventListener("dragend", () => {
			if (draggedCard) draggedCard.classList.remove("dragging");
			draggedCard = null;
			container.querySelectorAll(".hud-category-card").forEach((c) => c.classList.remove("drag-over"));
		});

		card.addEventListener("dragover", (e) => {
			e.preventDefault();
			e.dataTransfer.dropEffect = "move";
			card.classList.add("drag-over");
		});

		card.addEventListener("dragleave", () => {
			card.classList.remove("drag-over");
		});

		card.addEventListener("drop", async (e) => {
			e.preventDefault();
			card.classList.remove("drag-over");

			if (!draggedCard || draggedCard === card) return;

			const fromIndex = Number(draggedCard.dataset.catIndex);
			const toIndex = Number(card.dataset.catIndex);

			if (Number.isNaN(fromIndex) || Number.isNaN(toIndex)) return;

			captureInputData(app, root);
			const list = app.tempData.customMenu;
			if (Array.isArray(list) && list[fromIndex] && list[toIndex]) {
				const item = list.splice(fromIndex, 1)[0];
				list.splice(toIndex, 0, item);
				await app.render();
			}
		});
	});
};
