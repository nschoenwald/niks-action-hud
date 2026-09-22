
import { MODULE_ID } from "../../constants.js";

let _hideTimeout = null;
let _showTimeout = null;
let _isTooltipHovered = false;
let _hoverEventsInitialized = false;
let _suppressShowUntil = 0;
let _currentAnchorElement = null;
let _lastMousePos = { x: 0, y: 0 };

const SHOW_DELAY = 350;

export const initTooltipHoverEvents = () => {
	if (_hoverEventsInitialized) return;
	const el = document.getElementById("ib-rich-tooltip");
	if (!el) return;

	el.addEventListener("mouseenter", () => {
		_isTooltipHovered = true;
		clearTimeout(_hideTimeout);
	});

	el.addEventListener("mouseleave", () => {
		_isTooltipHovered = false;
		_suppressShowUntil = Date.now() + 300;
		hideTooltip();
	});

	$(document).off("mousemove.ibTooltip").on("mousemove.ibTooltip", (e) => {
		_lastMousePos.x = e.clientX;
		_lastMousePos.y = e.clientY;
	});

	_hoverEventsInitialized = true;
};

export const findMenuItemData = (ActionMenu, itemId) => {
	const container = $(`#${ActionMenu.SUB_ID}`);
	const data = container.data("menu-data");
	if (!data?.items) return null;

	let found = null;
	const visit = (node) => {
		if (found) return;
		if (Array.isArray(node)) {
			found = node.find((entry) => entry?.id === itemId) || null;
			return;
		}
		if (node && typeof node === "object") {
			for (const child of Object.values(node)) {
				visit(child);
				if (found) break;
			}
		}
	};

	visit(data.items);
	return found;
};

const extractUuidFromMacro = (command) => {
	if (!command) return null;
	
	// fromUuid("...") or fromUuidSync("...")
	const uuidMatch = command.match(/fromUuid(?:Sync)?\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/);
	if (uuidMatch) return uuidMatch[1];
	
	// rollItemMacro("...") - ProjectFu, etc.
	const rollItemMatch = command.match(/rollItemMacro\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/);
	if (rollItemMatch) return rollItemMatch[1];
	
	// uuid: "..." or uuid = "..."
	const uuidPropMatch = command.match(/uuid\s*[:=]\s*["'`]([^"'`]+)["'`]/i);
	if (uuidPropMatch) return uuidPropMatch[1];
	
	return null;
};

export const resolveTooltipName = (tooltipItem, item) =>
	tooltipItem?.tooltipName || tooltipItem?.name || item?.name || "";

export const renderTooltip = async (ActionMenu, tooltipItem, item, desc) => {
	let enriched = "";
	if (desc.trim()) {
		enriched = await foundry.applications.ux.TextEditor.implementation.enrichHTML(desc, {
			async: true,
			relativeTo: item || ActionMenu.currentActor,
			rollData: item?.getRollData
				? item.getRollData()
				: ActionMenu.currentActor?.getRollData
					? ActionMenu.currentActor.getRollData()
					: {},
		});
	}

	const tooltipName = resolveTooltipName(tooltipItem, item);
	const tooltipType = tooltipItem?.type || item?.type || "";
	const tooltipImg = tooltipItem?.img || item?.img || "";

	const typeLabel = tooltipType ? tooltipType.toUpperCase() : "";
	const tooltipHtml = `
            <div class="ib-tooltip-header">
                ${tooltipImg ? `<img src="${tooltipImg}" width="32" height="32" style="border:1px solid #555;">` : ""}
                <div>
                    <div class="ib-tooltip-title">${tooltipName}</div>
                    ${typeLabel ? `<div class="ib-tooltip-meta">${typeLabel}</div>` : ""}
                </div>
            </div>
            ${enriched ? `<div class="editor-content">${enriched}</div>` : ""}
        `;

	const tooltip = $("#ib-rich-tooltip");
	tooltip.html(tooltipHtml);
	Hooks.callAll(`${MODULE_ID}.tooltipRendered`, tooltip[0]);

	if (_currentAnchorElement) {
		_positionTooltip(tooltip, _currentAnchorElement);
	}

	tooltip.addClass("active");
};

const _resolveAndRender = async (ActionMenu, itemId) => {
	if (itemId.startsWith("macro-")) {
		const macroId = itemId.replace("macro-", "");
		const normalizedId = macroId.startsWith("macro-")
			? macroId.replace(/^macro-/, "")
			: macroId;
		const macro =
			(await fromUuid(macroId)) ||
			(await fromUuid(normalizedId)) ||
			game.macros.get(macroId) ||
			game.macros.get(normalizedId);
		
		if (!macro) return;

		const overrides = ActionMenu.currentActor?.getFlag?.(MODULE_ID, "macro-overrides") || {};
		const overrideEntry =
			foundry.utils.getProperty(overrides, normalizedId) ??
			foundry.utils.getProperty(overrides, macroId);
		const overrideFlavor = overrideEntry?.flavor;
		const menuItem = findMenuItemData(ActionMenu, itemId);
		const globalFlavor = menuItem?.globalFlavor || "";
		
		const extractedUuid = extractUuidFromMacro(macro.command);
		
		if (extractedUuid) {
			try {
				const item = await fromUuid(extractedUuid);
				if (item) {
					let desc = overrideFlavor
						|| globalFlavor
						|| item.system?.description?.value 
						|| item.system?.description 
						|| item.system?.details?.description?.value
						|| item.system?.details?.description
						|| "";
					if (typeof desc !== "string") desc = "";
					if (desc.trim()) {
						return renderTooltip(ActionMenu, item, item, desc);
					}
				}
			} catch (e) { }
		}
		
		const fallbackMacro = { name: macro.name, img: macro.img, type: "Macro" };
		return renderTooltip(ActionMenu, fallbackMacro, null, overrideFlavor || globalFlavor || "");
	}

	const realItemId = itemId.split("_")[0];

	let item = ActionMenu.currentActor.items.get(realItemId);

	if (!item && ActionMenu.adapter.findSyntheticItem) {
		item = ActionMenu.adapter.findSyntheticItem(
			ActionMenu.currentActor,
			realItemId,
		);
	}

	let desc = item?.system?.description?.value || "";
	let tooltipItem = item;

	if (!desc.trim()) {
		const menuItem =
			findMenuItemData(ActionMenu, itemId) ||
			findMenuItemData(ActionMenu, realItemId);
		if (menuItem?.description) {
			desc = menuItem.description;
			tooltipItem = menuItem;
		}
	}

	if (!desc.trim()) return;

	return renderTooltip(ActionMenu, tooltipItem, item, desc);
};

export const showTooltip = async (ActionMenu, itemId, event) => {
	clearTimeout(_hideTimeout);
	clearTimeout(_showTimeout);
	_isTooltipHovered = false;

	if (Date.now() < _suppressShowUntil) return;
	if (!ActionMenu.currentActor) return;

	const anchorEl = event?.currentTarget || null;
	_currentAnchorElement = anchorEl;

	_showTimeout = setTimeout(async () => {
		if (_currentAnchorElement !== anchorEl) return;
		await _resolveAndRender(ActionMenu, itemId);
	}, SHOW_DELAY);
};

export const hideTooltip = (force = false) => {
	clearTimeout(_hideTimeout);
	clearTimeout(_showTimeout);
	_currentAnchorElement = null;

	if (force) {
		_isTooltipHovered = false;
		$("#ib-rich-tooltip").removeClass("active");
		return;
	}

	if (_isTooltipHovered) return;

	_hideTimeout = setTimeout(() => {
		if (!_isTooltipHovered) {
			$("#ib-rich-tooltip").removeClass("active");
		}
	}, 150);
};

const _positionTooltip = (tooltip, anchorEl) => {
	const mode = game.settings.get(MODULE_ID, "tooltipPosition") ?? "anchor";
	const useAnchor = mode === "anchor" && anchorEl;

	const winW = window.innerWidth;
	const winH = window.innerHeight;
	const tipW = tooltip.outerWidth();
	const tipH = tooltip.outerHeight();

	let left, top;

	if (useAnchor) {
		const rect = anchorEl.getBoundingClientRect();
		left = rect.right + 10;
		top = rect.top;
		if (left + tipW > winW - 5) left = rect.left - tipW - 10;
		if (left < 5) left = 5;
		if (top + tipH > winH - 5) top = winH - tipH - 5;
		if (top < 5) top = 5;
	} else {
		left = _lastMousePos.x + 15;
		top = _lastMousePos.y + 15;
		if (left + tipW > winW) left = _lastMousePos.x - tipW - 15;
		if (top + tipH > winH) top = _lastMousePos.y - tipH - 15;
	}

	tooltip.css({ top, left });
};

export const moveTooltip = () => {};
