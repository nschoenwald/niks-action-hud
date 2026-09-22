import { deriveAdapterPlacementFromRows } from "../features/action-menu/category-placement.js";
import {
	getAdapterCategoryOverride,
	mergeAdapterCategoryAppearance,
} from "../features/action-menu/adapter-category-overrides.js";
import { buildCategoryButtonHtml } from "../features/action-menu/renderer.js";

const _getAdapterVisibilityTarget = (app, adapterId) => {
	if (!adapterId) return null;
	if (!app.tempData.adapterCategoryOverrides) {
		app.tempData.adapterCategoryOverrides = {};
	}
	const overrides = app.tempData.adapterCategoryOverrides;
	const current = overrides[adapterId] && typeof overrides[adapterId] === "object"
		? overrides[adapterId]
		: {};
	overrides[adapterId] = current;
	if (!Object.prototype.hasOwnProperty.call(current, "visibility")) {
		const editorRow = app._adapterCategoryEditorRows?.find(
			(row) => row.id === adapterId,
		);
		current.visibility = foundry.utils.deepClone(
			editorRow?.effective?.visibility
				|| { mode: "all", actorTypes: [], actorIds: [] },
		);
	}
	return current;
};

export const bindThemeListeners = (app) => {
	const themeSelect = app.element.querySelector('select[name="theme"]');
	if (!themeSelect) return;

	themeSelect.addEventListener("change", (event) => {
		app._captureInputData(app.element);
		const newTheme = event.target.value;

		app.tempData.theme = newTheme;
		app.tempData.globalNameColor = "";

		if (Array.isArray(app.tempData.globalAttributes)) {
			for (const attr of app.tempData.globalAttributes) {
				attr.labelColor = "";
				attr.valueColor = "";
			}
		}

		if (app.tempData.actorSettings) {
			const keysToReset = ["barsX", "barsY", "nameX", "nameY", "dotsX", "dotsY"];
			for (const actorId in app.tempData.actorSettings) {
				const settings = app.tempData.actorSettings[actorId];
				if (settings) {
					keysToReset.forEach((key) => {
						delete settings[key];
					});
				}
			}
		}

		app.render();
		setTimeout(() => {
			if (app.currentEditId === "global") {
				app._triggerPreviewGlobal();
			} else {
				app._triggerPreview();
			}
		}, 100);
	});
};

export const bindFontListeners = (app) => {
	const fontSelects = app.element.querySelectorAll('select[name="fontFamily"], select[name="fontFamilySub"]');
	fontSelects.forEach((select) => {
		select.addEventListener("change", () => {
			app._captureInputData(app.element);
			app._triggerPreviewGlobal();
		});
	});

	const actionMenuFontSelect = app.element.querySelector('select[name="actionMenuFont"]');
	if (actionMenuFontSelect) {
		actionMenuFontSelect.addEventListener("change", () => {
			app._captureInputData(app.element);

			const font = actionMenuFontSelect.value;
			const root = document.getElementById("ib-action-root");
			const tooltip = document.getElementById("ib-rich-tooltip");

			if (root) {
				if (font) {
					root.classList.add("am-custom-font");
					root.style.setProperty("--am-font-family", `'${font}'`);
				} else {
					root.classList.remove("am-custom-font");
					root.style.removeProperty("--am-font-family");
				}
			}
			if (tooltip) {
				if (font) {
					tooltip.classList.add("am-custom-font");
					tooltip.style.setProperty("--am-font-family", `'${font}'`);
				} else {
					tooltip.classList.remove("am-custom-font");
					tooltip.style.removeProperty("--am-font-family");
				}
			}
		});
	}
};

export const bindEffectListeners = (app) => {
	const inputs = app.element.querySelectorAll('[name^="effects."]');

	inputs.forEach((input) => {
		const handler = () => {
			if (input.type === "range") {
				const label = input.parentElement.querySelector("label");
				if (label) {
					const name = label.innerText.split("(")[0].trim();
					let unit = "%";
					if (input.name.includes("blur")) unit = "px";
					else if (
						input.name.includes("Alpha") ||
						input.name.includes("Opacity")
					)
						unit = "";
					label.innerText = `${name} (${input.value}${unit})`;
				}
			}

			const match = input.name.match(/effects\.(\d+)\./);
			const index = match ? parseInt(match[1]) : null;

			app._triggerPreviewGlobal(index);
		};

		input.addEventListener("input", handler);
		input.addEventListener("change", handler);
	});
};

export const bindGlobalListeners = (app) => {
	const globalInputs = app.element.querySelectorAll(
		'input[name^="global"], input[name^="actionMenu"], input[name^="responsive"], input[name="layoutMode"]',
	);

	globalInputs.forEach((input) => {
		input.addEventListener("input", (event) => {
			app._previewFocusField = event.target.name || "";
			app._updateGlobalLabel(event.target);
			app._triggerPreviewGlobal();
		});

		input.addEventListener("change", (event) => {
			app._previewFocusField = event.target.name || "";
			if (event.target.name === "layoutMode") {
				app._captureInputData(app.element);
				app._triggerPreviewGlobal();
				app.render();
				return;
			}

			app._updateGlobalLabel(event.target);

			app._triggerPreviewGlobal();
		});
	});

	const collapseCheck = app.element.querySelector('input[name="collapseCards"]');
	if (collapseCheck) {
		collapseCheck.addEventListener("change", () => {
			app._captureInputData(app.element);
			app._triggerPreviewGlobal();
		});
	}
};

export const bindStyleListeners = (app) => {
	const formatInputs = app.element.querySelectorAll('input[name="format"]');
	formatInputs.forEach((input) => {
		input.addEventListener("change", () => app._triggerPreview());
	});

	const conditionsLayoutSelects = app.element.querySelectorAll('select[name="conditionsLayout"]');
	conditionsLayoutSelects.forEach((select) => {
		select.addEventListener("change", () => {
			app._previewFocusField = select.name || "";
			if (app.currentEditId === "global") {
				app._triggerPreviewGlobal();
			} else {
				app._triggerPreview();
			}
		});
	});

	const styleInputs = app.element.querySelectorAll(".adjust-item input");
	styleInputs.forEach((input) => {
		// effects.*, rules.* 인풋은 전용 리스너(bindEffectListeners 등)에서 처리
		if (input.name?.startsWith("effects.") || input.name?.startsWith("rules.")) return;
		input.addEventListener("input", () => {
			app._previewFocusField = input.name || "";
			app._triggerPreview();
		});
		input.addEventListener("change", () => {
			app._previewFocusField = input.name || "";
			app._triggerPreview();
		});
	});

	const collapseInputs = app.element.querySelectorAll(
		'input[name="collapseSize"], input[name="collapseWidth"], input[name="collapseHeight"], input[name="collapseBorderRadius"], input[name="collapsePortraitX"], input[name="collapsePortraitY"], input[name="collapsePortraitScale"], input[name="collapseUseCustomColors"], input[name="collapseBorderColor"], input[name="collapseBgColor"]',
	);
	collapseInputs.forEach((input) => {
		input.addEventListener("input", () => app._triggerPreview());
		input.addEventListener("change", () => app._triggerPreview());
	});

	const imgInput = app.element.querySelector('input[name="customImg"]');
	if (imgInput) {
		imgInput.addEventListener("change", () => app._triggerPreview());
		imgInput.addEventListener("input", () => app._triggerPreview());
	}

	const portraitInputs = app.element.querySelectorAll(
		'[name^="portraitVariants."], input[name="activePortraitVariantId"]',
	);
	portraitInputs.forEach((input) => {
		input.addEventListener("input", () => {
			app._previewFocusField = input.name || "";
			app._triggerPreview();
		});
		input.addEventListener("change", () => {
			app._previewFocusField = input.name || "";
			app._triggerPreview();
		});
	});

	const portraitLayerInputs = app.element.querySelectorAll('[name^="portraitLayers."]');
	portraitLayerInputs.forEach((input) => {
		input.addEventListener("input", () => {
			app._previewFocusField = input.name || "";
			if (app.currentEditId === "global") {
				app._triggerPreviewGlobal();
			} else {
				app._triggerPreview();
			}
		});
		input.addEventListener("change", () => {
			app._previewFocusField = input.name || "";
			if (app.currentEditId === "global") {
				app._triggerPreviewGlobal();
			} else {
				app._triggerPreview();
			}
		});
	});

	const cardBgLayerInputs = app.element.querySelectorAll('[name^="cardBgLayers."]');
	cardBgLayerInputs.forEach((input) => {
		input.addEventListener("input", () => {
			app._previewFocusField = input.name || "";
			if (app.currentEditId === "global") {
				app._triggerPreviewGlobal();
			} else {
				app._triggerPreview();
			}
		});
		input.addEventListener("change", () => {
			app._previewFocusField = input.name || "";
			if (app.currentEditId === "global") {
				app._triggerPreviewGlobal();
			} else {
				app._triggerPreview();
			}
		});
	});

	const amLayerInputs = app.element.querySelectorAll('[name^="amMenuLayers."], [name^="amSubMenuLayers."]');
	amLayerInputs.forEach((input) => {
		input.addEventListener("input", () => {
			app._previewFocusField = input.name || "";
			app._triggerPreviewGlobal();
		});
		input.addEventListener("change", () => {
			app._previewFocusField = input.name || "";
			app._triggerPreviewGlobal();
		});
	});

	const amElementInputs = app.element.querySelectorAll(
		'input[name^="amButton"], input[name^="amMenuHeader"], input[name^="amSidebar"], input[name^="amTab"], input[name^="amQuickSlot"], input[name^="amIdentity"], input[name^="amPortrait"], input[name^="amSideTab"], input[name^="amListItem"], select[name$=".blend"][name*="Layers"]',
	);
	amElementInputs.forEach((input) => {
		input.addEventListener("input", () => {
			app._previewFocusField = input.name || "";
			app._triggerPreviewGlobal();
		});
		input.addEventListener("change", () => {
			app._previewFocusField = input.name || "";
			app._triggerPreviewGlobal();
		});
	});

	const btnFrameInputs = app.element.querySelectorAll(
		'input[name*=".btnFrame."], select[name*=".btnFrame."], input[name$="btnFrameColor"]',
	);
	btnFrameInputs.forEach((input) => {
		input.addEventListener("input", () => app._triggerPreviewGlobal());
		input.addEventListener("change", () => app._triggerPreviewGlobal());
	});

	const zIndexInputs = app.element.querySelectorAll('input[name$=".zIndex"]');
	zIndexInputs.forEach((input) => {
		input.addEventListener("change", () => {
			app._captureInputData(app.element);
			const openIds = [];
			app.element.querySelectorAll("details[data-am-element]").forEach((d) => {
				if (d.open) openIds.push(d.dataset.amElement);
			});
			const panel = app.element?.querySelector?.(".tab-content.active");
			const scroll = panel ? panel.scrollTop : 0;
			app.render();
			setTimeout(() => {
				for (const id of openIds) {
					const d = app.element.querySelector(`details[data-am-element="${id}"]`);
					if (d) d.open = true;
				}
				const p = app.element?.querySelector?.(".tab-content.active");
				if (p) p.scrollTop = scroll;
			}, 100);
		});
	});

	const baseStyleInputs = app.element.querySelectorAll('[name^="baseStyle."]');

	baseStyleInputs.forEach((input) => {
		const handler = () => {
			if (input.type === "range") {
				const labelSpan = input.parentElement.querySelector(".val-disp");
				if (labelSpan) {
					labelSpan.innerText = input.value;
				}
			}

			app._triggerPreview();
		};

		input.addEventListener("input", handler);
		input.addEventListener("change", handler);
	});

	const ruleInputs = app.element.querySelectorAll('[name^="rules."]');

	ruleInputs.forEach((input) => {
		const handler = (event) => {
			const match = event.target.name.match(/rules\.(\d+)\./);
			const index = match ? parseInt(match[1]) : null;

			app._triggerPreview(index);
		};

		input.addEventListener("change", handler);
		input.addEventListener("input", handler);
	});

	const ruleTypeSelects = app.element.querySelectorAll(".rule-type-select");
	ruleTypeSelects.forEach((select) => {
		select.addEventListener("change", (event) => {
			const ruleIndex = select.dataset.ruleIndex;
			const row = select.closest(".rule-row");
			if (!row) return;

			const type = event.target.value;
			const hiddenInput = row.querySelector(`input[name="rules.${ruleIndex}.type"]`);
			if (hiddenInput) hiddenInput.value = type;

			const statFields = row.querySelector(".rule-stat-fields");
			const statusFields = row.querySelector(".rule-status-fields");

			if (type === "status") {
				if (statFields) statFields.style.display = "none";
				if (statusFields) statusFields.style.display = "";
			} else {
				if (statFields) statFields.style.display = "";
				if (statusFields) statusFields.style.display = "none";
			}

			app._triggerPreview(parseInt(ruleIndex));
		});
	});

	const attributeInputs = app.element.querySelectorAll('[name^="attributes."]');
	attributeInputs.forEach((input) => {
		const handler = () => {
			app._previewFocusField = input.name || "";
			app._triggerPreview();
		};
		input.addEventListener("input", handler);
		input.addEventListener("change", handler);
	});
};

export const bindFilePickers = (app) => {
	const pickerBtns = app.element.querySelectorAll(".file-picker-btn");

	pickerBtns.forEach((btn) => {
		btn.addEventListener("click", (event) => {
			event.preventDefault();
			const targetName = btn.dataset.target;
			const input = app.element.querySelector(`input[name="${targetName}"]`);
			if (!input) return;

			const pickerType = "image";

			new FilePicker({
				type: pickerType,
				current: input.value || "",
				callback: (path) => {
					input.value = path;
					input.dispatchEvent(new Event("change", { bubbles: true }));

					let index = null;

					const effectMatch = targetName.match(/effects\.(\d+)\./);
					if (effectMatch) {
						index = parseInt(effectMatch[1]);
					}

					const ruleMatch = targetName.match(/rules\.(\d+)\./);
					if (ruleMatch) {
						index = parseInt(ruleMatch[1]);
					}

					app._triggerPreview(index);
				},
			}).render(true);
		});
	});
};

export const bindNavigationListeners = (app) => {
	const navItems = app.element.querySelectorAll(".sheet-tabs .item");
	navItems.forEach((nav) => {
		nav.addEventListener("click", (event) => {
			event.preventDefault();
			const targetTab = nav.dataset.tab;
			app._switchTab(targetTab);
		});
	});
};

export const bindTrackingListeners = (app) => {
	const syncOptionSummaryIcon = (input) => {
		if (input.type !== "checkbox") return;
		const field = input.name.split(".").at(-1);
		const details = input.closest("details.attr-options-details");
		const icon = Array.from(
			details?.querySelectorAll("[data-option-field]") || [],
		).find((candidate) => candidate.dataset.optionField === field);
		if (icon) icon.hidden = !input.checked;
	};

	if (!(app._openTrackingOptionKeys instanceof Set)) {
		app._openTrackingOptionKeys = new Set();
	}
	app.element.querySelectorAll("details.attr-options-details").forEach((details) => {
		details.addEventListener("toggle", () => {
			const owner = app.currentEditId || "global";
			const key = `${owner}:${details.dataset.attrIndex}`;
			if (details.open) app._openTrackingOptionKeys.add(key);
			else app._openTrackingOptionKeys.delete(key);
		});
	});

	const inputs = app.element.querySelectorAll(
		'input[name^="attributes."], select[name^="attributes."]',
	);

	inputs.forEach((input) => {
		input.addEventListener("input", () => {
			syncOptionSummaryIcon(input);
			app._triggerPreview();
		});
		input.addEventListener("change", () => {
			syncOptionSummaryIcon(input);
			app._triggerPreview();

			const rerenderFields = [
				".style",
				".thresholdColor",
				".showThresholdMarkers",
				".segmentedBar",
			];
			if (rerenderFields.some((field) => input.name.endsWith(field))) {
				app._captureInputData(app.element);
				app.render();
				return;
			}

			if (input.name.endsWith(".path")) {
				app._tryAutoLabel(input, input.value);
			}
		});
	});
};

export const bindAttributeLookups = (app) => {
	if (app._attrDropdownClickHandler) {
		document.removeEventListener("click", app._attrDropdownClickHandler);
	}
	document.querySelectorAll("body > .attr-dropdown-menu").forEach((m) => {
		m.remove();
	});

	const wrappers = app.element.querySelectorAll(".attr-dropdown-wrapper");

	wrappers.forEach((wrapper) => {
		const btn = wrapper.querySelector(".attr-dropdown-btn");
		const menu = wrapper.querySelector(".attr-dropdown-menu");
		const searchInput = wrapper.querySelector(".attr-dropdown-search");
		const items = wrapper.querySelectorAll(".attr-dropdown-item");
		const isMax = wrapper.classList.contains("attr-dropdown-max");
		const group = wrapper.closest(".path-input-group");
		const targetClass = wrapper.dataset.targetClass || (
			isMax ? "input-max-path" : "input-path"
		);
		const targetInput = group?.querySelector(`.${targetClass}`);
		const shouldAutoLabel = wrapper.dataset.autoLabel !== "false" && targetClass === "input-path";
		const isLinkedResourcePicker = wrapper.dataset.linkedResourcePicker === "true";
		if (!btn || !menu || !searchInput || !targetInput) return;

		document.body.appendChild(menu);
		menu.style.position = "fixed";

		const positionMenu = () => {
			const rect = btn.getBoundingClientRect();
			menu.style.top = `${rect.bottom + 2}px`;
			menu.style.left = `${rect.right - 350}px`;
		};

		btn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			const isOpen = menu.style.display === "flex";
			document
				.querySelectorAll(".attr-dropdown-menu")
				.forEach((m) => {
					m.style.display = "none";
				});
			if (!isOpen) {
				positionMenu();
				menu.style.display = "flex";
				searchInput.value = "";
				items.forEach((item) => {
					item.style.display = "block";
				});
				searchInput.focus();
			}
		});

		searchInput.addEventListener("input", () => {
			const term = searchInput.value.toLowerCase();
			items.forEach((item) => {
				const label = item.dataset.label.toLowerCase();
				const path = item.dataset.path.toLowerCase();
				item.style.display =
					label.includes(term) || path.includes(term) ? "block" : "none";
			});
		});

		items.forEach((item) => {
			item.addEventListener("click", () => {
				const path = item.dataset.path;
				const label = item.dataset.label;
				targetInput.value = path;
				menu.style.display = "none";
				if (shouldAutoLabel) {
					app._tryAutoLabel(targetInput, path, label);
				}
				if (isLinkedResourcePicker) {
					const details = targetInput.closest(".linked-bar-details");
					const linkedLabelInput = details?.querySelector('[name$=".linkedResourceLabel"]');
					const linkedMaxInput = details?.querySelector(".input-linked-resource-max-path");
					if (linkedLabelInput && !linkedLabelInput.value.trim()) {
						linkedLabelInput.value = label;
					}
					if (linkedMaxInput) {
						const explicitMaxPath = String(item.dataset.maxPath || "").trim();
						linkedMaxInput.value = explicitMaxPath;
					}
				}
				targetInput.dispatchEvent(new Event("change", { bubbles: true }));
			});

			item.addEventListener("mouseenter", () => {
				item.style.background = "#444";
			});
			item.addEventListener("mouseleave", () => {
				item.style.background = "transparent";
			});
		});
	});

	app._attrDropdownClickHandler = (e) => {
		if (!e.target.closest(".attr-dropdown-wrapper") && !e.target.closest(".attr-dropdown-menu")) {
			document
				.querySelectorAll(".attr-dropdown-menu")
				.forEach((m) => {
					m.style.display = "none";
				});
		}
	};
	document.addEventListener("click", app._attrDropdownClickHandler);
};

export const bindDragDrop = (app) => {
	const dropZones = app.element.querySelectorAll(".item-drop-zone");

	dropZones.forEach((zone) => {
		zone.addEventListener("dragover", (event) => {
			event.preventDefault();
			zone.classList.add("drag-hover");
		});

		zone.addEventListener("dragleave", () => {
			zone.classList.remove("drag-hover");
		});

		zone.addEventListener("drop", (event) => {
			event.preventDefault();
			event.stopPropagation();
			zone.classList.remove("drag-hover");
			app._onDrop(event, zone);
		});
	});
};

function _bindCategoryDragReorder(app) {
	const tree = app.element.querySelector(".ib-menu-tree");
	if (!tree) return;

	const categories = tree.querySelectorAll(":scope > .ib-menu-category");
	const dropRows = tree.querySelectorAll(
		":scope > .ib-menu-category, :scope > .ib-menu-adapter-category",
	);
	let dragSrcIdx = null;
	const clearDropIndicators = () => {
		dropRows.forEach((row) => {
			row.classList.remove("ib-drop-above", "ib-drop-below");
		});
	};

	categories.forEach((cat) => {
		const handle = cat.querySelector(".drag-handle");
		if (!handle) return;

		handle.style.cursor = "grab";
		cat.setAttribute("draggable", "false");

		handle.addEventListener("mousedown", () => {
			cat.setAttribute("draggable", "true");
		});

		handle.addEventListener("mouseup", () => {
			cat.setAttribute("draggable", "false");
		});

		cat.addEventListener("dragstart", (e) => {
			dragSrcIdx = Number(cat.dataset.index);
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("text/plain", String(dragSrcIdx));
			requestAnimationFrame(() => cat.classList.add("ib-dragging"));
		});

		cat.addEventListener("dragend", () => {
			cat.classList.remove("ib-dragging");
			cat.setAttribute("draggable", "false");
			dragSrcIdx = null;
			clearDropIndicators();
		});
	});

	dropRows.forEach((row) => {
		row.addEventListener("dragover", (e) => {
			if (dragSrcIdx === null) return;
			e.preventDefault();
			e.dataTransfer.dropEffect = "move";
			const rect = row.getBoundingClientRect();
			const mid = rect.top + rect.height / 2;
			row.classList.toggle("ib-drop-above", e.clientY < mid);
			row.classList.toggle("ib-drop-below", e.clientY >= mid);
		});

		row.addEventListener("dragleave", () => {
			row.classList.remove("ib-drop-above", "ib-drop-below");
		});

		row.addEventListener("drop", (e) => {
			e.preventDefault();
			e.stopPropagation();
			clearDropIndicators();

			const transferredValue = e.dataTransfer.getData("text/plain");
			const transferredIndex = Number(transferredValue);
			const fromIdx = transferredValue !== "" && Number.isInteger(transferredIndex)
				? transferredIndex
				: dragSrcIdx;
			if (!Number.isInteger(fromIdx)) return;

			app._captureInputData(app.element);

			const menu = app.tempData.customMenu;
			if (!Array.isArray(menu) || !menu[fromIdx]) return;

			const rows = Array.from(tree.children)
				.filter((element) => (
					element.classList.contains("ib-menu-category")
					|| element.classList.contains("ib-menu-adapter-category")
				))
				.map((element) => {
					const categoryIndex = element.classList.contains("ib-menu-category")
						? Number(element.dataset.index)
						: null;
					return {
						element,
						category: Number.isInteger(categoryIndex)
							? menu[categoryIndex]
							: null,
						adapterId: element.dataset.adapterId || null,
					};
				});
			const sourceIndex = rows.findIndex(
				(entry) => entry.category === menu[fromIdx],
			);
			const targetIndex = rows.findIndex((entry) => entry.element === row);
			if (sourceIndex < 0 || targetIndex < 0) return;
			const originalRows = [...rows];

			const rect = row.getBoundingClientRect();
			let insertIndex = targetIndex + (
				e.clientY >= rect.top + rect.height / 2 ? 1 : 0
			);
			const [movedRow] = rows.splice(sourceIndex, 1);
			if (sourceIndex < insertIndex) insertIndex -= 1;
			rows.splice(insertIndex, 0, movedRow);

			const orderedMenu = rows
				.filter((entry) => entry.category)
				.map((entry) => entry.category);
			if (orderedMenu.length !== menu.length) return;
			const layoutChanged = rows.some(
				(entry, index) => entry !== originalRows[index],
			);
			if (!layoutChanged) return;

			menu.splice(0, menu.length, ...orderedMenu);
			const hasAdapterRows = rows.some((entry) => entry.adapterId);
			if (hasAdapterRows) {
				rows.forEach((entry, index) => {
					if (!entry.category) return;
					delete entry.category.adapterInsertPosition;
					if (entry.category.systemId) {
						delete entry.category.adapterPlacement;
						return;
					}
					const placement = deriveAdapterPlacementFromRows(rows, index);
					if (placement) entry.category.adapterPlacement = placement;
					else delete entry.category.adapterPlacement;
				});
			}

			app.render();
		});
	});
}

const _isCategoryVisibleForPreview = (category, actor) => {
	const combatVisibility = category._tabVisibility || category.tabVisibility || "always";
	const inCombat = game.combat?.started ?? false;
	if (combatVisibility === "never") return false;
	if (combatVisibility === "combatOnly" && !inCombat) return false;
	if (combatVisibility === "hideInCombat" && inCombat) return false;

	const visibility = category._visibility || category.visibility;
	if (!visibility || !actor || !visibility.mode || visibility.mode === "all") return true;
	const matches = (visibility.actorTypes || []).includes(actor.type)
		|| (visibility.actorIds || []).includes(actor.id);
	return visibility.mode === "only" ? matches : !matches;
};

const _getMenuPreviewCategories = (app) => {
	const tree = app.element?.querySelector?.(".ib-menu-tree");
	if (!tree) return [];
	const actor = app.menuPreviewActorId
		? game.actors?.get(app.menuPreviewActorId)
		: globalThis.canvas?.tokens?.controlled?.[0]?.actor || null;

	return Array.from(tree.children)
		.map((row) => {
			const adapterId = row.dataset.adapterId;
			if (adapterId) {
				const editorRow = app._adapterCategoryEditorRows?.find(
					(entry) => entry.id === adapterId,
				);
				if (!editorRow) return null;
				const override = getAdapterCategoryOverride(
					app.tempData.adapterCategoryOverrides,
					adapterId,
				);
				const appearance = mergeAdapterCategoryAppearance(editorRow.base, override);
				return {
					...(editorRow.source || {}),
					...appearance,
					id: adapterId,
					_tabVisibility: appearance.tabVisibility,
					_visibility: appearance.visibility,
				};
			}

			const index = Number(row.dataset.index);
			const category = Number.isInteger(index)
				? app.tempData.customMenu?.[index]
				: null;
			if (!category) return null;
			return {
				...category,
				id: `custom-${index}`,
				type: "submenu",
				cssClass: `btn-custom-${index}`,
				_tabVisibility: category.tabVisibility || "always",
				_visibility: category.visibility,
			};
		})
		.filter((category) => category && _isCategoryVisibleForPreview(category, actor));
};

export const renderMenuLivePreview = (app, { capture = false } = {}) => {
	const preview = app.element?.querySelector?.(".ib-menu-live-buttons");
	if (!preview) return;
	if (capture) app._captureInputData(app.element);

	const config = app.tempData || {};
	const categories = _getMenuPreviewCategories(app);
	const theme = config.theme || "rift";
	const emphasizeClass = config.actionMenuEmphasizeFirstButton === false
		? "no-first-button-emphasis"
		: "";
	const fontClass = config.actionMenuFont ? "am-custom-font" : "";
	preview.className = `ib-menu-live-buttons theme-${theme} ${emphasizeClass} ${fontClass}`.trim();
	if (config.actionMenuFont) {
		preview.style.setProperty("--am-font-family", `'${config.actionMenuFont}'`);
	} else {
		preview.style.removeProperty("--am-font-family");
	}

	preview.innerHTML = categories.length
		? categories.map((category, index) => (
			buildCategoryButtonHtml(category, index, config, { interactive: false })
		)).join("")
		: `<div class="ib-menu-live-empty">${game.i18n.localize("IBHUD.Config.Menu.LivePreviewEmpty")}</div>`;
};

export const bindMenuListeners = (app) => {
	_bindCategoryDragReorder(app);

	app.element.querySelectorAll(".category-collapse-toggle").forEach((button) => {
		button.addEventListener("click", (event) => {
			event.preventDefault();
			const row = button.closest(".ib-menu-category");
			if (!row) return;
			const collapsed = row.classList.toggle("is-collapsed");
			button.setAttribute("aria-expanded", String(!collapsed));
			button.title = game.i18n.localize(
				collapsed
					? "IBHUD.Config.Menu.ExpandCategory"
					: "IBHUD.Config.Menu.CollapseCategory",
			);
			const icon = button.querySelector("i");
			icon?.classList.toggle("fa-chevron-right", collapsed);
			icon?.classList.toggle("fa-chevron-down", !collapsed);

			const adapterId = row.dataset.adapterId;
			if (adapterId) {
				if (collapsed) app._collapsedAdapterCategories.add(adapterId);
				else app._collapsedAdapterCategories.delete(adapterId);
				return;
			}
			const index = Number(row.dataset.index);
			const category = Number.isInteger(index) ? app.tempData.customMenu?.[index] : null;
			if (!category) return;
			if (collapsed) app._collapsedMenuCategories.add(category);
			else app._collapsedMenuCategories.delete(category);
		});
	});

	const previewActorSelect = app.element.querySelector(
		".adapter-menu-preview-actor",
	);
	previewActorSelect?.addEventListener("change", (event) => {
		app._captureInputData(app.element);
		app.menuPreviewActorId = event.currentTarget.value;
		app.render();
	});

	const sidebarChecks = app.element.querySelectorAll(
		'input[type="checkbox"][name$=".useSidebar"]',
	);

	sidebarChecks.forEach((chk) => {
		chk.addEventListener("change", () => {
			app._captureInputData(app.element);

			const match = chk.name.match(/menu\.(\d+)\.useSidebar/);
			if (match && app.tempData.customMenu[match[1]]) {
				app.tempData.customMenu[match[1]].useSidebar = chk.checked;
			}

			app.render();
		});
	});

	const visSelects = app.element.querySelectorAll(
		'select[name$=".visibility.mode"]',
	);
	visSelects.forEach((sel) => {
		sel.addEventListener("change", () => {
			app._captureInputData(app.element);
			app.render();
		});
	});

	const actorSelects = app.element.querySelectorAll(".vis-actor-select");
	actorSelects.forEach((sel) => {
		sel.addEventListener("change", () => {
			const cIdx = sel.dataset.cindex;
			const tIdx = sel.dataset.tindex;
			const adapterId = sel.dataset.adapterId;
			const actorId = sel.value;
			if (!actorId || (cIdx === undefined && !adapterId)) return;

			app._captureInputData(app.element);

			let target;
			if (adapterId) {
				target = _getAdapterVisibilityTarget(app, adapterId);
			} else if (sel.dataset.tabVis && tIdx !== undefined) {
				target = app.tempData.customMenu[cIdx]?.tabs?.[tIdx];
			} else {
				target = app.tempData.customMenu[cIdx];
			}
			if (!target) return;
			if (!target.visibility) target.visibility = { mode: "all", actorTypes: [], actorIds: [] };
			if (!target.visibility.actorIds) target.visibility.actorIds = [];
			if (!target.visibility.actorIds.includes(actorId)) {
				target.visibility.actorIds.push(actorId);
			}

			app.render();
		});
	});

	const actorRemoveBtns = app.element.querySelectorAll(".vis-actor-remove");
	actorRemoveBtns.forEach((btn) => {
		btn.addEventListener("click", (e) => {
			e.preventDefault();
			const cIdx = btn.dataset.cindex;
			const tIdx = btn.dataset.tindex;
			const adapterId = btn.dataset.adapterId;
			const actorId = btn.dataset.actorId;
			if ((cIdx === undefined && !adapterId) || !actorId) return;

			app._captureInputData(app.element);

			let target;
			if (adapterId) {
				target = _getAdapterVisibilityTarget(app, adapterId);
			} else if (btn.dataset.tabVis && tIdx !== undefined) {
				target = app.tempData.customMenu[cIdx]?.tabs?.[tIdx];
			} else {
				target = app.tempData.customMenu[cIdx];
			}
			if (!target?.visibility?.actorIds) return;
			target.visibility.actorIds = target.visibility.actorIds.filter(id => id !== actorId);

			app.render();
		});
	});
};

export const bindMenuPreviewListeners = (app) => {
	const menuTab = app.element.querySelector('.tab-content[data-tab="menu"]');
	if (!menuTab) return;

	const schedule = () => {
		cancelAnimationFrame(app._menuLivePreviewTimer);
		app._menuLivePreviewTimer = requestAnimationFrame(() => {
			renderMenuLivePreview(app, { capture: true });
		});
	};
	menuTab.addEventListener("input", (event) => {
		if (event.target.matches("input, select")) schedule();
	});
	menuTab.addEventListener("change", (event) => {
		if (event.target.matches("input, select")) schedule();
	});

	renderMenuLivePreview(app);
};

const _renderActorListPartial = (app) => {
	const data = app._prepareActorList();
	const isGM = game.user.isGM;

	const listContainer = app.element.querySelector(".actor-list-items");
	if (!listContainer) return;

	if (data.actors.length === 0) {
		listContainer.innerHTML = `<div style="text-align: center; color: #666; padding: 10px; font-size: 0.85em;">${game.i18n.localize("IBHUD.Config.ActorSearch.NoResults")}</div>`;
	} else {
		listContainer.innerHTML = data.actors.map((actor) => {
			const activeClass = actor.isActive ? "active" : "";
			const npcClass = actor.isNpc ? "is-npc" : "";
			const checkIcon = actor.checked ? "fas fa-check-square" : "far fa-square";
			const checkbox = isGM
				? `<div class="checkbox-wrapper" data-action="toggleActor" data-id="${actor.id}"><i class="${checkIcon}"></i></div>`
				: "";
			const npcBadge = actor.isNpc
				? `<i class="fas fa-ghost" style="margin-left: auto; color: #888; font-size: 0.7em;" title="NPC"></i>`
				: "";
			return `<div class="actor-row ${activeClass} ${npcClass}" data-id="${actor.id}" data-action="selectTarget">${checkbox}<img src="${actor.img}"><span>${actor.name}</span>${npcBadge}</div>`;
		}).join("");
	}

	const oldPag = app.element.querySelector(".actor-pagination");
	if (oldPag) oldPag.remove();

	if (data.pagination.totalPages > 1) {
		const pag = data.pagination;
		const prevDisabled = pag.hasPrev ? "" : "disabled";
		const prevColor = pag.hasPrev ? "#eee" : "#666";
		const prevCursor = pag.hasPrev ? "pointer" : "not-allowed";
		const nextDisabled = pag.hasNext ? "" : "disabled";
		const nextColor = pag.hasNext ? "#eee" : "#666";
		const nextCursor = pag.hasNext ? "pointer" : "not-allowed";

		const pagHtml = `<div class="actor-pagination" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #444;">
			<button type="button" class="actor-page-btn" data-page-action="prev" ${prevDisabled} style="padding: 3px 8px; background: #333; border: 1px solid #555; border-radius: 3px; color: ${prevColor}; cursor: ${prevCursor};"><i class="fas fa-chevron-left"></i></button>
			<span style="font-size: 0.8em; color: #aaa;">${pag.startIndex}-${pag.endIndex} / ${pag.totalCount}</span>
			<button type="button" class="actor-page-btn" data-page-action="next" ${nextDisabled} style="padding: 3px 8px; background: #333; border: 1px solid #555; border-radius: 3px; color: ${nextColor}; cursor: ${nextCursor};"><i class="fas fa-chevron-right"></i></button>
		</div>`;

		listContainer.insertAdjacentHTML("afterend", pagHtml);
		_bindPageButtons(app);
	}

	const tabBtns = app.element.querySelectorAll(".actor-tab-btn");
	tabBtns.forEach((btn) => {
		const tab = btn.dataset.actorTab;
		const isActive = tab === data.tabs.current;
		btn.classList.toggle("active", isActive);
		btn.style.background = isActive ? "#4ecdc4" : "#333";
		btn.style.color = isActive ? "#000" : "#aaa";

		const countKey = tab;
		const count = data.tabs.counts[countKey] ?? 0;
		if (tab === "all") {
			btn.textContent = `${game.i18n.localize("IBHUD.Config.ActorTabs.All")} (${count})`;
		} else if (tab === "pc") {
			btn.textContent = `PC (${count})`;
		} else if (tab === "npc") {
			btn.textContent = `NPC (${count})`;
		}
	});
};

const _bindPageButtons = (app) => {
	const pageBtns = app.element.querySelectorAll(".actor-page-btn");
	pageBtns.forEach((btn) => {
		btn.addEventListener("click", (event) => {
			event.preventDefault();
			if (btn.disabled) return;

			const action = btn.dataset.pageAction;
			if (action === "prev" && app.actorListPage > 0) {
				app.actorListPage--;
				_renderActorListPartial(app);
			} else if (action === "next") {
				app.actorListPage++;
				_renderActorListPartial(app);
			}
		});
	});
};

export const bindActorListListeners = (app) => {
	const tabBtns = app.element.querySelectorAll(".actor-tab-btn");
	tabBtns.forEach((btn) => {
		btn.addEventListener("click", (event) => {
			event.preventDefault();
			const tab = btn.dataset.actorTab;
			if (tab && tab !== app.actorListTab) {
				app.actorListTab = tab;
				app.actorListPage = 0;
				_renderActorListPartial(app);
			}
		});
	});

	const searchInput = app.element.querySelector(".actor-search-input");
	if (searchInput) {
		let debounceTimer = null;
		searchInput.addEventListener("input", (event) => {
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				app.actorSearchQuery = event.target.value;
				app.actorListPage = 0;
				_renderActorListPartial(app);
			}, 200);
		});
	}

	_bindPageButtons(app);
};

export const bindPresetListeners = (app) => {
	const selector = app.element.querySelector(".preset-selector");
	if (!selector) return;
};

export const bindOptColorListeners = (app) => {
	app.element.querySelectorAll("input.opt-color").forEach((input) => {
		input.addEventListener("input", () => {
			delete input.dataset.inactive;
			input.style.opacity = "1";
		});
		input.addEventListener("dblclick", (e) => {
			e.preventDefault();
			input.dataset.inactive = "true";
			input.style.opacity = "0.3";
			app._captureInputData(app.element);
			if (app.currentEditId === "global") {
				app._triggerPreviewGlobal();
			} else {
				app._triggerPreview();
			}
		});
		if (input.dataset.inactive) {
			input.style.opacity = "0.3";
		}
	});
};
