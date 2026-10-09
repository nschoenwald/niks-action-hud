import { MODULE_ID, DOM_IDS } from "../../constants.js";

let _hideTimeout = null;
let _showTimeout = null;
let _isTooltipHovered = false;
let _hoverEventsInitialized = false;
let _suppressShowUntil = 0;
let _currentAnchorElement = null;
let _lastMousePos = { x: 0, y: 0 };

const SHOW_DELAY = 350;

export function initTooltipHoverEvents() {
	if (_hoverEventsInitialized) return;
	const el = document.getElementById(DOM_IDS.TOOLTIP);
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

	document.addEventListener("mousemove", (e) => {
		_lastMousePos.x = e.clientX;
		_lastMousePos.y = e.clientY;
	});

	_hoverEventsInitialized = true;
}

export function findMenuItemData(ActionMenu, itemId) {
	if (ActionMenu?._searchItemsMap) {
		const foundInSearch =
			ActionMenu._searchItemsMap.get(itemId) ||
			ActionMenu._searchItemsMap.get(String(itemId).split("_")[0]);
		if (foundInSearch) return foundInSearch;
	}

	const data = ActionMenu._currentSubMenuData;
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
}

function extractUuidFromMacro(command) {
	if (!command) return null;
	const match = command.match(/fromUuid(?:Sync)?\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/);
	if (match) return match[1];

	const rollItemMatch = command.match(/rollItemMacro\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/);
	if (rollItemMatch) return rollItemMatch[1];

	const uuidPropMatch = command.match(/uuid\s*[:=]\s*["'`]([^"'`]+)["'`]/i);
	if (uuidPropMatch) return uuidPropMatch[1];
	return null;
}

export function resolveTooltipName(tooltipItem, item) {
	return tooltipItem?.tooltipName || tooltipItem?.name || item?.name || "";
}

export async function renderTooltip(ActionMenu, tooltipItem, item, desc = "", options = {}) {
	let enriched = "";
	if (desc && typeof desc === "string" && desc.trim()) {
		enriched = await TextEditor.enrichHTML(desc, {
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

	let typeLabel = tooltipType ? tooltipType.toUpperCase() : "";
	if (options?.isUnpreparedRitual || tooltipItem?.isUnpreparedRitual) {
		const ritualLabel = game.i18n.localize("NAH.Tooltips.RitualSpell") || "Ritual (Unprepared)";
		typeLabel = `${typeLabel || "SPELL"} · ${ritualLabel.toUpperCase()}`;
	}
	const sysClass = game.system?.id === "dnd5e" ? " dnd5e dnd5e2" : "";

	let footerHtml = "";
	if (options?.isFavorite) {
		const reorderHint = game.i18n.localize("NAH.Tooltips.ReorderFavorites") || "Drag to reorder";
		const removeHint = game.i18n.localize("NAH.Tooltips.RemoveFavorite") || "Right-click to remove";
		footerHtml = `
			<div class="nah-tooltip-footer">
				<i class="fas fa-arrows-alt" style="opacity:0.7;"></i> <span>${reorderHint}</span>
				<span style="opacity:0.4;">·</span>
				<i class="fas fa-times-circle" style="opacity:0.7;"></i> <span>${removeHint}</span>
			</div>
		`;
	}

	const tooltipHtml = `
		<div class="nah-tooltip-header">
			${tooltipImg ? `<img src="${tooltipImg}" width="32" height="32" style="border:1px solid #555; border-radius:4px; object-fit:cover;">` : ""}
			<div>
				<div class="nah-tooltip-title">${tooltipName}</div>
				${typeLabel ? `<div class="nah-tooltip-meta">${typeLabel}</div>` : ""}
			</div>
		</div>
		${enriched ? `<div class="editor-content${sysClass}">${enriched}</div>` : ""}
		${footerHtml}
	`;

	const tooltip = document.getElementById(DOM_IDS.TOOLTIP);
	if (!tooltip) return;

	tooltip.innerHTML = tooltipHtml;
	Hooks.callAll(`${MODULE_ID}.tooltipRendered`, tooltip);

	if (_currentAnchorElement) {
		_positionTooltip(tooltip, _currentAnchorElement);
	}
	tooltip.classList.add("active");
}

async function _resolveAndRender(ActionMenu, itemId, options = {}) {
	if (itemId.startsWith("macro-")) {
		const macroId = itemId.replace("macro-", "");
		const normalizedId = macroId.replace(/^macro-/, "");
		const macro =
			(await fromUuid(macroId)) ||
			(await fromUuid(normalizedId)) ||
			game.macros.get(macroId) ||
			game.macros.get(normalizedId);

		if (!macro) return;

		const overrides = ActionMenu.currentActor?.getFlag?.(MODULE_ID, "macro-overrides") || {};
		const overrideEntry = foundry.utils.getProperty(overrides, normalizedId) ?? foundry.utils.getProperty(overrides, macroId);
		const overrideFlavor = overrideEntry?.flavor;
		const menuItem = findMenuItemData(ActionMenu, itemId);
		const globalFlavor = menuItem?.globalFlavor || "";

		const extractedUuid = extractUuidFromMacro(macro.command);
		if (extractedUuid) {
			try {
				const item = await fromUuid(extractedUuid);
				if (item) {
					let desc =
						overrideFlavor ||
						globalFlavor ||
						item.system?.description?.value ||
						item.system?.description ||
						"";
					if (typeof desc !== "string") desc = "";
					return renderTooltip(ActionMenu, item, item, desc, options);
				}
			} catch (_e) {}
		}

		const fallback = { name: macro.name, img: macro.img, type: "Macro" };
		return renderTooltip(ActionMenu, fallback, null, overrideFlavor || globalFlavor || "", options);
	}

	const realItemId = itemId.split("_")[0];
	let item = ActionMenu.currentActor.items.get(realItemId) || ActionMenu.currentActor.items.get(itemId);

	if (!item && ActionMenu.adapter?.findSyntheticItem) {
		item = ActionMenu.adapter.findSyntheticItem(ActionMenu.currentActor, realItemId) ||
			ActionMenu.adapter.findSyntheticItem(ActionMenu.currentActor, itemId);
	}

	let desc = item?.system?.description?.value || item?.system?.description || "";
	if (typeof desc !== "string") desc = "";
	let tooltipItem = item;

	const menuItem = findMenuItemData(ActionMenu, itemId) || findMenuItemData(ActionMenu, realItemId);
	if (menuItem?.isUnpreparedRitual) {
		options = { ...options, isUnpreparedRitual: true };
	}

	if (!desc.trim() && menuItem?.description) {
		desc = menuItem.description;
		tooltipItem = menuItem;
	}

	if (!tooltipItem && ActionMenu.adapter?.resolveQuickSlotData) {
		const resolved =
			ActionMenu.adapter.resolveQuickSlotData(ActionMenu.currentActor, itemId) ||
			ActionMenu.adapter.resolveQuickSlotData(ActionMenu.currentActor, realItemId);
		if (resolved) {
			tooltipItem = { name: resolved.name, img: resolved.img, type: resolved.type || "Action" };
			if (resolved.description) desc = resolved.description;
		}
	}

	if (!tooltipItem && !item) return;
	return renderTooltip(ActionMenu, tooltipItem || item, item, desc, options);
}

export async function showTooltip(ActionMenu, itemId, event) {
	clearTimeout(_hideTimeout);
	clearTimeout(_showTimeout);
	_isTooltipHovered = false;

	if (Date.now() < _suppressShowUntil) return;
	if (!ActionMenu.currentActor) return;

	const anchorEl = event?.currentTarget || null;
	_currentAnchorElement = anchorEl;
	const isFavorite = Boolean(anchorEl?.classList?.contains("nah-quick-slot") || anchorEl?.dataset?.favoriteId);

	_showTimeout = setTimeout(async () => {
		if (_currentAnchorElement !== anchorEl) return;
		await _resolveAndRender(ActionMenu, itemId, { isFavorite });
	}, SHOW_DELAY);
}

export function hideTooltip(force = false) {
	clearTimeout(_hideTimeout);
	clearTimeout(_showTimeout);
	_currentAnchorElement = null;

	const tip = document.getElementById(DOM_IDS.TOOLTIP);
	if (!tip) return;

	if (force) {
		_isTooltipHovered = false;
		tip.classList.remove("active");
		return;
	}

	if (_isTooltipHovered) return;

	_hideTimeout = setTimeout(() => {
		if (!_isTooltipHovered) {
			tip.classList.remove("active");
		}
	}, 150);
}

function _positionTooltip(tooltip, anchorEl) {
	const mode = game.settings.get(MODULE_ID, "tooltipPosition") ?? "anchor";
	const useAnchor = mode === "anchor" && anchorEl;

	const winW = window.innerWidth;
	const winH = window.innerHeight;
	const tipRect = tooltip.getBoundingClientRect();
	const tipW = tipRect.width || 320;
	const tipH = tipRect.height || 200;

	let left = 0;
	let top = 0;

	if (useAnchor) {
		const isQuickSlot = Boolean(anchorEl.closest?.(".nah-quick-slot"));
		const refContainer = isQuickSlot
			? (anchorEl.closest(`#${DOM_IDS.MENU}`) || anchorEl)
			: anchorEl;
		const containerRect = refContainer.getBoundingClientRect();
		const anchorRect = anchorEl.getBoundingClientRect();

		const spaceRight = winW - containerRect.right;
		const spaceLeft = containerRect.left;

		if (spaceRight >= tipW + 10 || spaceRight >= spaceLeft) {
			left = containerRect.right + 10;
			if (left + tipW > winW - 5) left = containerRect.left - tipW - 10;
		} else {
			left = containerRect.left - tipW - 10;
			if (left < 5) left = containerRect.right + 10;
		}

		top = anchorRect.top;
		if (left < 5) left = 5;
		if (left + tipW > winW - 5) left = winW - tipW - 5;
		if (top + tipH > winH - 5) top = winH - tipH - 5;
		if (top < 5) top = 5;
	} else {
		left = _lastMousePos.x + 15;
		top = _lastMousePos.y + 15;
		if (left + tipW > winW) left = _lastMousePos.x - tipW - 15;
		if (top + tipH > winH) top = _lastMousePos.y - tipH - 15;
	}

	tooltip.style.left = `${left}px`;
	tooltip.style.top = `${top}px`;
}

export function moveTooltip() {}
