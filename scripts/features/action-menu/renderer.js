import { MODULE_ID, DOM_IDS, CSS_CLASSES } from "../../constants.js";
import { attachCornerResize, attachDragObserver, attachHeaderDrag } from "./drag.js";
import { getEffectiveActorSettings } from "../../utils/client-overrides.js";
import { getActionCategories, getSubMenuData } from "./registry.js";
import { resolveSubMenuSide, getDefaultActionMenuPos } from "./position.js";
import { initTooltipHoverEvents } from "./tooltip.js";
import { getCustomMenuIndex, isActionMenuCategoryVisible, hasSubMenuEntries } from "./category-visibility.js";
import { prepareFavoriteItems } from "./favorites.js";
import { resolveSafeTokenImage, handleImageError, DEFAULT_FALLBACK_TOKEN_IMG } from "./image-fallback.js";
import { isThemeAvailable, getDefaultTheme } from "../../config/constants.js";

const escapeHtml = (value) => String(value ?? "")
	.replace(/&/g, "&amp;")
	.replace(/</g, "&lt;")
	.replace(/>/g, "&gt;")
	.replace(/"/g, "&quot;")
	.replace(/'/g, "&#39;");

const loc = (key, fallback = "") =>
	game.i18n?.localize?.(`NAH.${key}`) || fallback;

function _isTabVisibleForActor(menuCat, tabKey, actorId, actorType) {
	if (!menuCat?.tabs) return true;
	const ti = tabKey.startsWith("tab-") ? parseInt(tabKey.split("-")[1], 10) : parseInt(tabKey, 10);
	if (isNaN(ti)) return true;
	const td = menuCat.tabs[ti];
	if (!td?.visibility || td.visibility.mode === "all") return true;
	const { mode, actorTypes, actorIds } = td.visibility;
	const matches = (actorTypes || []).includes(actorType) || (actorIds || []).includes(actorId);
	return mode === "only" ? matches : !matches;
}

const _morphDom = (oldNode, newNode) => {
	if (!oldNode || !newNode) return;

	if (oldNode.nodeType !== newNode.nodeType || oldNode.nodeName !== newNode.nodeName) {
		oldNode.replaceWith(newNode.cloneNode(true));
		return;
	}

	if (oldNode.nodeType === Node.TEXT_NODE) {
		if (oldNode.textContent !== newNode.textContent) {
			oldNode.textContent = newNode.textContent;
		}
		return;
	}

	if (oldNode.nodeType === Node.ELEMENT_NODE) {
		if (oldNode.nodeName === "IMG" && oldNode.src === newNode.src) {
			const oldStyle = oldNode.getAttribute("style");
			const newStyle = newNode.getAttribute("style");
			if (oldStyle !== newStyle) oldNode.setAttribute("style", newStyle || "");

			const oldClass = oldNode.getAttribute("class");
			const newClass = newNode.getAttribute("class");
			if (oldClass !== newClass) oldNode.setAttribute("class", newClass || "");

			return;
		}

		const oldAttrs = oldNode.attributes;
		const newAttrs = newNode.attributes;

		const oldNames = Array.from(oldAttrs).map((a) => a.name);
		const newNames = Array.from(newAttrs).map((a) => a.name);

		for (const name of oldNames) {
			if (!newNames.includes(name)) oldNode.removeAttribute(name);
		}
		for (const attr of newAttrs) {
			if (oldNode.getAttribute(attr.name) !== attr.value) {
				oldNode.setAttribute(attr.name, attr.value);
			}
		}

		const oldChildren = Array.from(oldNode.childNodes);
		const newChildren = Array.from(newNode.childNodes);

		const max = Math.max(oldChildren.length, newChildren.length);
		for (let i = 0; i < max; i++) {
			if (!oldChildren[i] && newChildren[i]) {
				oldNode.appendChild(newChildren[i].cloneNode(true));
			} else if (oldChildren[i] && !newChildren[i]) {
				oldNode.removeChild(oldChildren[i]);
			} else if (oldChildren[i] && newChildren[i]) {
				_morphDom(oldChildren[i], newChildren[i]);
			}
		}
	}
};

export const updateHtmlMorph = (containerElement, newHtml) => {
	if (!containerElement) return;

	const temp = document.createElement(containerElement.tagName || "div");
	temp.innerHTML = newHtml;

	const attrs = temp.attributes;
	for (let i = 0; i < attrs.length; i++) {
		const attr = attrs[i];
		containerElement.setAttribute(attr.name, attr.value);
	}

	const oldChildren = Array.from(containerElement.childNodes);
	const newChildren = Array.from(temp.childNodes);

	const max = Math.max(oldChildren.length, newChildren.length);
	for (let i = 0; i < max; i++) {
		if (!oldChildren[i] && newChildren[i]) {
			containerElement.appendChild(newChildren[i].cloneNode(true));
		} else if (oldChildren[i] && !newChildren[i]) {
			containerElement.removeChild(oldChildren[i]);
		} else if (oldChildren[i] && newChildren[i]) {
			_morphDom(oldChildren[i], newChildren[i]);
		}
	}
};

export const getRenderConfig = (ActionMenu) => {
	const config = game.settings.get(MODULE_ID, "configuration") || {};
	const clientPos =
		game.settings.get(MODULE_ID, "clientPositions") || {};

	const baseScale = clientPos.actionMenuScale ?? config.actionMenuScale ?? 1.0;
	const defaultPos = getDefaultActionMenuPos();
	let rawPos = clientPos.actionMenuPos;
	if (!rawPos) {
		const cfgPos = config.actionMenuPos;
		const isOldDefault = cfgPos && cfgPos.anchorX === "right" && cfgPos.anchorY === "bottom" && cfgPos.offsetX === 40 && cfgPos.offsetY === 40;
		rawPos = (!cfgPos || isOldDefault) ? defaultPos : cfgPos;
	}
	const responsiveEnabled = config.responsiveEnabled ?? true;
	const baseWidth = config.responsiveBaseWidth ?? 1920;
	const baseHeight = config.responsiveBaseHeight ?? 1080;
	const scaleMin = config.responsiveScaleMin ?? 0.7;
	const scaleMax = config.responsiveScaleMax ?? 1.3;
	const widthScale = baseWidth ? window.innerWidth / baseWidth : 1.0;
	const heightScale = baseHeight ? window.innerHeight / baseHeight : 1.0;
	const rawAutoScale = Math.min(widthScale, heightScale);
	const autoScale = responsiveEnabled
		? Math.min(scaleMax, Math.max(scaleMin, rawAutoScale))
		: 1.0;
	const effectiveScale = (baseScale || 1.0) * autoScale;

	const isAnchorBased = rawPos.anchorX !== undefined;
	let anchor;
	if (isAnchorBased) {
		anchor = {
			anchorX: rawPos.anchorX,
			anchorY: rawPos.anchorY,
			offsetX: rawPos.offsetX,
			offsetY: rawPos.offsetY,
		};
	} else {
		anchor = {
			anchorX: "left",
			anchorY: "top",
			offsetX: rawPos.left ?? 1200,
			offsetY: rawPos.top ?? 800,
		};
	}

	const actionMenuFont = config.actionMenuFont || "";

	let theme = config.theme || getDefaultTheme();
	if (!isThemeAvailable(theme)) theme = getDefaultTheme();

	const fadeWhenIdle = (game.settings.settings?.has(`${MODULE_ID}.fadeWhenIdle`)
		? game.settings.get(MODULE_ID, "fadeWhenIdle")
		: config.fadeWhenIdle) ?? true;

	return {
		theme,
		anchor,
		scale: effectiveScale,
		baseScale: baseScale || 1.0,
		autoScale,
		actionMenuFont,
		actionMenuEmphasizeFirstButton: config.actionMenuEmphasizeFirstButton ?? true,
		fadeWhenIdle,
	};
};

export const setupTooltip = (theme, actionMenuFont) => {
	let tooltip = document.getElementById(DOM_IDS.TOOLTIP);
	if (!tooltip) {
		tooltip = document.createElement("div");
		tooltip.id = DOM_IDS.TOOLTIP;
		tooltip.className = "nah-tooltip";
		(document.getElementById("interface") || document.body).appendChild(tooltip);
	}

	const currentClasses = Array.from(tooltip.classList);
	for (const cls of currentClasses) {
		if (cls.startsWith("theme-")) tooltip.classList.remove(cls);
	}
	tooltip.classList.add(`theme-${theme}`);

	if (actionMenuFont) {
		tooltip.classList.add("am-custom-font");
		tooltip.style.setProperty("--am-font-family", `'${actionMenuFont}'`);
	} else {
		tooltip.classList.remove("am-custom-font");
		tooltip.style.removeProperty("--am-font-family");
	}

	if (game.system?.id === "dnd5e") {
		tooltip.classList.add("dnd5e", "dnd5e2");
	} else if (game.system?.id) {
		tooltip.classList.add(game.system.id);
	}

	initTooltipHoverEvents();
};

export const buildHeaderHtml = (ActionMenu) => {
	const config = game.settings.get(MODULE_ID, "configuration") || {};
	const useTokenImg = config.actionMenuUseTokenImg ?? false;
	const actor = ActionMenu?.currentActor;
	if (!actor) return "";
	const activeTokens = typeof actor.getActiveTokens === "function" ? actor.getActiveTokens() : [];
	const token = ActionMenu.currentToken
		|| canvas.tokens?.controlled?.[0]
		|| activeTokens[0]
		|| canvas.tokens?.placeables?.find((t) => t.actor?.id === actor.id || t.document?.actorId === actor.id);

	const tokenName = token?.name || token?.document?.name || actor.prototypeToken?.name || actor.name;

	const displayName =
		getEffectiveActorSettings(config, actor.id).displayName?.trim() ||
		tokenName;

	const { img, actorImg, subjectScale, defaultIcon } = resolveSafeTokenImage(actor, token, useTokenImg);

	const selectedText = loc("UI.SelectedActor", "Active Actor");
	const actorId = actor.id;
	const isMyTurn = game.combat?.started && game.combat.combatant?.actorId === actorId;
	const endTurnTitle = loc("UI.EndTurn", "End Turn");
	const endTurnBtn = isMyTurn
		? `<div class="nah-end-turn-btn" onclick="event.stopPropagation(); window.ActionHUD?.endTurn?.('${actorId}')" title="${escapeHtml(endTurnTitle)}"><i class="fas fa-hourglass-end"></i></div>`
		: "";

	const imgStyle = subjectScale !== 1
		? `style="--token-subject-scale: ${subjectScale}; scale: ${subjectScale}; transform-origin: center center;"`
		: "";

	return `
		<div class="nah-identity-header">
			<div class="nah-identity-text">
				<div style="position: relative; display: inline-block;">
					<div class="nah-collapse-btn" onclick="ActionHUD.actionMenu.toggleCollapse()" style="position: absolute; right: 100%; top: 0.6em; transform: translateY(-50%); margin-right: 8px;">
						<i class="fas ${ActionMenu.isCollapsed ? "fa-caret-right" : "fa-caret-down"}"></i>
					</div>
					<span class="nah-identity-name">${escapeHtml(displayName)}</span>
					${endTurnBtn}
				</div>
				<span class="nah-identity-sub">${selectedText}</span>
			</div>
			<div class="nah-identity-img-box" onclick="ActionHUD.actionMenu.openSheet()" style="--token-subject-scale: ${subjectScale};">
				<img src="${escapeHtml(img)}" ${imgStyle} alt="${escapeHtml(displayName)}"
					 data-fallback-step="0"
					 onerror="(window.ActionHUD?.handleImageError || window.ActionHUD?.actionMenu?.handleImageError)?.(this, '${escapeHtml(actorImg)}', '${escapeHtml(defaultIcon)}')">
			</div>
		</div>
	`;
};

export const buildQuickSlotsHtml = (ActionMenu) => {
	const actor = ActionMenu?.currentActor;
	if (!actor) return "";
	const favorites = ActionMenu.getFavorites();
	if (!Array.isArray(favorites) || favorites.length === 0) return "";

	let slots = "";
	favorites.forEach((itemId) => {
		let item = null;
		let img = "";
		let name = "";

		if (itemId.startsWith("macro-")) {
			const realId = itemId.replace("macro-", "");
			const macro =
				(typeof fromUuidSync === "function" ? fromUuidSync(realId) : null) ||
				game.macros.get(realId);
			if (macro) {
				item = macro;
				img = macro.img || "icons/svg/dice-target.svg";
				name = macro.name;
			} else {
				item = { id: realId, name: "Macro" };
				img = "icons/svg/dice-target.svg";
				name = "Macro";
			}
		} else {
			item = actor.items?.get(itemId);
			if (item) {
				img = item.img;
				name = item.name;
			} else if (ActionMenu.adapter?.resolveQuickSlotData) {
				const resolved = ActionMenu.adapter.resolveQuickSlotData(actor, itemId);
				if (resolved) {
					item = { id: itemId, name: resolved.name };
					img = resolved.img;
					name = resolved.name;
				}
			}
		}

		if (item) {
			slots += `
				<div class="nah-quick-slot" draggable="true"
					 data-favorite-id="${escapeHtml(itemId)}"
					 aria-label="${escapeHtml(name)}"
					 onmouseenter="ActionHUD.actionMenu.showTooltip('${escapeHtml(itemId)}', event)"
					 onmouseleave="ActionHUD.actionMenu.hideTooltip()">
					<img src="${escapeHtml(img || 'icons/svg/item-bag.svg')}" alt="${escapeHtml(name)}" draggable="false"
						 onerror="this.onerror=null; this.src='icons/svg/item-bag.svg';">
				</div>
			`;
		}
	});

	if (!slots) return "";
	return `<div class="nah-quick-slot-container">${slots}</div>`;
};

const _safeNumber = (value, fallback) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
};

const _safeCategoryFont = (value) => String(value || "")
	.replace(/[^\p{L}\p{N}\s._-]/gu, "")
	.trim();

const _safeCategoryColor = (value) => {
	const color = String(value || "").trim();
	return /^#[0-9a-f]{3,8}$/i.test(color) ? color : "";
};

export const buildCategoryButtonHtml = (
	cat,
	actionIndex,
	btnConfig = {},
	{ interactive = true } = {},
) => {
	let onClick = "";
	if (interactive) {
		const categoryId = JSON.stringify(String(cat.id || ""));
		if (cat.type === "submenu") onClick = `ActionHUD.actionMenu.toggleSubMenu(${categoryId})`;
		else if (cat.type === "sheet") {
			onClick = `ActionHUD.actionMenu.openSheet(${JSON.stringify(String(cat.sheetTab || ""))})`;
		} else if (cat.type === "system") {
			onClick = `ActionHUD.actionMenu.runSystemAction(${categoryId})`;
		}
	}

	let iconHtml = "";
	if (String(cat.img || "").trim()) {
		iconHtml = `<img src="${escapeHtml(cat.img)}" class="nah-cat-btn-img" alt="">`;
	} else {
		const rawIcon = String(cat.icon || "");
		const iconClass = rawIcon.startsWith("ra-") && !rawIcon.includes("ra ")
			? `ra ${rawIcon}`
			: rawIcon;
		iconHtml = `<i class="${escapeHtml(iconClass)}"></i>`;
	}

	let bgHtml = "";
	let customClass = "";
	if (String(cat.buttonImg || "").trim()) {
		customClass = "is-custom-btn";
		const styleVars = [
			`--img-scale: ${_safeNumber(cat.buttonScale, 1)}`,
			`--img-x: ${_safeNumber(cat.buttonX, 0)}px`,
			`--img-y: ${_safeNumber(cat.buttonY, 0)}px`,
		].join("; ");
		bgHtml = `<img src="${escapeHtml(cat.buttonImg)}" class="nah-custom-bg" style="${escapeHtml(styleVars)}" alt="">`;
	}

	const actionButtonStyle = `--nah-action-stagger: ${_safeNumber(actionIndex, 0) * 12}px`;
	const labelStyle = [];
	const fontFamily = _safeCategoryFont(cat.fontFamily);
	const textColor = _safeCategoryColor(cat.textColor);
	if (fontFamily) labelStyle.push(`font-family: "${fontFamily}" !important`);
	if (textColor) labelStyle.push(`color: ${textColor} !important`);

	const attributes = [
		'type="button"',
		`class="nah-action-btn ${escapeHtml(cat.cssClass || "")} ${customClass}"`,
		`style="${escapeHtml(actionButtonStyle)}"`,
	];
	if (onClick) attributes.push(`onclick="${escapeHtml(onClick)}"`);
	if (!interactive) attributes.push('aria-disabled="true"', 'tabindex="-1"');

	const label = game.i18n?.localize?.(cat.label) || cat.label;

	return `
		<button ${attributes.join(" ")}>
			${bgHtml}
			<div class="nah-btn-content">
				<span ${labelStyle.length ? `style="${escapeHtml(labelStyle.join("; "))}"` : ""}>${escapeHtml(label)}</span>
				${iconHtml}
			</div>
		</button>
	`;
};

export const buildCategoryButtonsHtml = (ActionMenu) => {
	const actor = ActionMenu?.currentActor;
	if (!actor) return "";
	const categories = getActionCategories(ActionMenu, actor);
	const btnConfig = game.settings.get(MODULE_ID, "configuration") || {};
	const inCombat = game.combat?.started ?? false;
	const customMenu = btnConfig.customMenu || [];

	return categories
		.filter((cat) => isActionMenuCategoryVisible(cat, customMenu, inCombat, {
			ActionMenu,
			actor,
		}))
		.map((cat, actionIndex) => buildCategoryButtonHtml(cat, actionIndex, btnConfig))
		.join("");
};

export const buildListItems = (ActionMenu, items) => {
	const favs = ActionMenu.getFavorites();
	const favoriteViewOptions = ActionMenu.getFavoriteViewOptions?.() || {};
	const preparedItems = prepareFavoriteItems(items, favs, favoriteViewOptions);

	if (preparedItems.length === 0) {
		const emptyText = favoriteViewOptions.only
			? loc("UI.NoFavoritesInView", "No favorites in current view.")
			: loc("UI.Empty", "Empty");
		return `<div class="nah-list-item"><div class="nah-item-content" style="justify-content:center; color:#666; font-style:italic;">${escapeHtml(emptyText)}</div></div>`;
	}

	return preparedItems
		.map((item) => {
			if (item.isHeader) {
				const iconHtml = item.icon
					? `<i class="${escapeHtml(item.icon)}" style="margin-right: 6px; font-size: 0.9em; opacity: 0.85;"></i>`
					: (item.img ? `<img src="${escapeHtml(item.img)}" style="width: 16px; height: 16px; margin-right: 6px; object-fit: contain; vertical-align: middle;">` : "");
				return `
					<div class="nah-list-header">
						${iconHtml}<span>${escapeHtml(item.name)}</span>
					</div>
				`;
			}

			let tooltipAttr = "";
			if (item.description) {
				const safeDesc = item.description.replace(/"/g, "&quot;");
				tooltipAttr = `data-tooltip="${safeDesc}" data-tooltip-direction="LEFT"`;
			}

			const isUtilityCategory =
				ActionMenu?.activeCategory === "utility" ||
				ActionMenu?.activeCategory === "abilities" ||
				ActionMenu?.activeCategory === "ability";
			const showFavorite =
				item.favoritable !== false &&
				!isUtilityCategory &&
				item.category !== "utility" &&
				item.category !== "abilities";
			const isFav = showFavorite && favs.includes(item.id);
			const starClass = isFav ? "fas fa-star" : "far fa-star";
			const activeClass = isFav ? "active" : "";
			const favTooltip = isFav
				? loc("Tooltips.RemoveFavorite", "Remove from favorites")
				: loc("Tooltips.AddFavorite", "Add to favorites");
			const favBtnHtml = showFavorite
				? `<div class="nah-fav-btn ${activeClass}" onclick="event.stopPropagation(); ActionHUD.actionMenu.toggleFavorite('${item.id}')" oncontextmenu="${isFav ? `event.preventDefault(); event.stopPropagation(); ActionHUD.actionMenu.openFavoriteDialog('${item.id}');` : ""}" data-tooltip="${escapeHtml(favTooltip)}" data-tooltip-direction="UP" aria-label="${escapeHtml(favTooltip)}"><i class="${starClass}"></i></div>`
				: "";

			let rowStyle = "";
			let nameStyle = "";

			if (item.isExhausted) {
				rowStyle = "opacity: 0.5; filter: grayscale(100%); cursor: not-allowed;";
				nameStyle = "text-decoration: line-through; color: #888;";
			} else if (item.isVirtual) {
				rowStyle = "opacity: 0.7; border-left: 2px solid #9966ff; padding-left: 6px;";
			} else if (item.isUnpreparedRitual) {
				rowStyle = "border-left: 3px dashed #5d9cec;";
				nameStyle = "font-style: italic; opacity: 0.9;";
			}

			let rightClickAttr = "";

			if (item.id.startsWith("macro-") && item.isPersonal) {
				const realId = item.id.replace("macro-", "");
				rightClickAttr = `oncontextmenu="event.preventDefault(); event.stopPropagation(); ActionHUD.actionMenu.editCustomMacro('${realId}', ${item.customCatIndex}, ${item.customTabIndex}, ${item.customItemIndex})"`;
			} else if (item.isPersonal) {
				rightClickAttr = `oncontextmenu="event.preventDefault(); event.stopPropagation(); ActionHUD.actionMenu.removePersonalItem(${item.customCatIndex}, ${item.customTabIndex}, ${item.customItemIndex})"`;
			} else if (item.id.startsWith("macro-") && item.customCatIndex !== undefined) {
				const realId = item.id.replace("macro-", "");
				rightClickAttr = `oncontextmenu="event.preventDefault(); event.stopPropagation(); ActionHUD.actionMenu.editGlobalMacro('${realId}', ${item.customCatIndex}, ${item.customTabIndex}, ${item.customItemIndex})"`;
			} else {
				rightClickAttr = `oncontextmenu="event.preventDefault(); event.stopPropagation(); ActionHUD.actionMenu.openItem('${item.id}')"`;
			}

			let itemUses = item.uses || "";
			let itemName = item.name || "";
			if (!itemUses && typeof itemName === "string" && itemName.includes("nah-name-uses")) {
				const match = itemName.match(/<span class="nah-name-uses"[^>]*>([\s\S]*?)<\/span>/);
				if (match) {
					itemUses = match[1];
					itemName = itemName.replace(/<span class="nah-name-uses"[^>]*>[\s\S]*?<\/span>/, "").trim();
				}
			}

			if (item.oneLineLayout || item.isAbilityRoll) {
				const profHtml = item.profIndicatorHtml || "";
				const modHtml = item.rollModifierStr
					? `<span class="nah-roll-mod font-bold">${item.rollModifierStr}</span>`
					: (item.cost ? `<span class="nah-roll-mod font-bold">${item.cost}</span>` : "");
				const advHtml = item.advBadgeHtml || "";

				return `
					<div class="nah-list-item nah-one-line-item ${item.isUnpreparedRitual ? "nah-unprepared-ritual" : ""}" 
						 style="${rowStyle}" 
						 onclick="${item.isExhausted ? "" : `ActionHUD.actionMenu.useItem('${item.id}', event)`}"
						 ${rightClickAttr}
						 onmouseenter="ActionHUD.actionMenu.showTooltip('${item.id}', event)"
						 onmouseleave="ActionHUD.actionMenu.hideTooltip()">
						<div class="nah-item-content nah-one-line-content">
							<div class="flex items-center gap-2" style="display:flex; align-items:center; gap:8px; min-width:0; flex:1; overflow:hidden;">
								${item.img ? `<img src="${item.img}" width="22" height="22" style="border:1px solid #333; border-radius: 2px; flex-shrink:0;">` : ""}
								<span class="nah-font-hero text-xl" style="font-size: 1.1em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; ${nameStyle}">
									${itemName}
								</span>
							</div>
							<div class="nah-one-line-meta" style="display:flex; align-items:center; gap:8px; margin-left:auto; flex-shrink:0; white-space:nowrap;">
								${profHtml}
								${modHtml}
								${advHtml}
							</div>
						</div>
					</div>
				`;
			}

			const costHtml = item.cost
				? item.hasInlineControls
					? `<div class="nah-item-inline-controls" style="display:flex; align-items:flex-start; min-width:0;">${item.cost}</div>`
					: `<span class="text-sm font-bold" style="color: #666; font-size: 0.8em; display:inline-flex; align-items:center; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%;">${item.cost}</span>`
				: "";

			const usesHtml = itemUses
				? `<span class="nah-item-uses" style="font-size:0.82em; font-weight:normal; white-space:nowrap; margin-right:4px; flex-shrink:0;">${itemUses}</span>`
				: "";

			const subLineAlign = item.hasInlineControls
				? "display:flex; align-items:flex-start; justify-content:space-between; width:100%; min-width:0; gap:8px;"
				: "display:flex; align-items:center; justify-content:space-between; width:100%; min-width:0; gap:8px;";

			const ritualBadge = item.isUnpreparedRitual
				? `<span class="nah-unprepared-ritual-badge" data-tooltip="${escapeHtml(loc("Tooltips.RitualSpell", "Ritual Only (Unprepared)"))}" data-tooltip-direction="UP"><i class="fas fa-book-open"></i></span>`
				: "";

			return `
				<div class="nah-list-item ${item.isUnpreparedRitual ? "nah-unprepared-ritual" : ""}" 
					 style="${rowStyle}" 
					 onclick="${item.isExhausted ? "" : `ActionHUD.actionMenu.useItem('${item.id}', event)`}"
					 ${rightClickAttr}
					 onmouseenter="ActionHUD.actionMenu.showTooltip('${item.id}', event)"
					 onmouseleave="ActionHUD.actionMenu.hideTooltip()">
					<div class="nah-item-content">
						<div class="nah-item-name-row" style="display:flex; align-items:center; gap:10px; min-width:0; width:100%; overflow:hidden;">
							${item.img ? `<img src="${item.img}" width="24" height="24" style="border:1px solid #333; border-radius: 2px; flex-shrink:0;">` : ""}
							<span class="nah-font-hero text-xl" style="font-size: 1.1em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; ${nameStyle}">
								${item.isSignature ? '<i class="fas fa-star" style="color: #f1c40f; font-size: 0.7em; margin-right: 3px;" title="Signature Spell"></i>' : ""}${ritualBadge}${itemName}
							</span>
						</div>
						
						<div class="nah-item-sub-line" style="${subLineAlign}">
							${costHtml ? `<div class="nah-item-cost-container" style="min-width:0; flex:1 1 auto; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${costHtml}</div>` : ""}
							<div class="nah-item-right-meta" style="display:flex; align-items:center; gap:6px; margin-left:auto; flex-shrink:0;">
								${usesHtml}
								${favBtnHtml}
							</div>
						</div>
					</div>
				</div>
			`;
		})
		.join("");
};

const adjustSubMenuPosition = (ActionMenu) => {
	const root = document.getElementById(ActionMenu.ROOT_ID);
	const subContainer = document.getElementById(ActionMenu.SUB_ID);

	if (!root || !subContainer) return;

	subContainer.classList.remove("align-up", "align-right");

	const rootRect = root.getBoundingClientRect();
	const subRect = subContainer.getBoundingClientRect();
	const winHeight = window.innerHeight;
	const winWidth = window.innerWidth;
	const spaceLeft = rootRect.left;
	const spaceRight = winWidth - rootRect.right;
	const minPadding = 20;
	const preference = game.settings.get(MODULE_ID, "actionMenuSubmenuSide") ?? "auto";
	const side = resolveSubMenuSide({
		preference,
		spaceLeft,
		spaceRight,
		submenuWidth: subRect.width,
		minPadding,
	});

	if (side === "right") {
		subContainer.classList.add("align-right");
	}

	const estimatedBottom = rootRect.top + subRect.height;
	if (estimatedBottom > winHeight - 20) {
		subContainer.classList.add("align-up");
	}
};

export const renderPlaceholder = (ActionMenu) => {
	try {
		if (game.settings.get(MODULE_ID, "disableHUD")) return;
	} catch (_e) {}
	const oldRoot = document.getElementById(ActionMenu.ROOT_ID);
	oldRoot?.remove();

	const cfg = getRenderConfig(ActionMenu);

	const zoom = cfg.scale || 1;
	let posStyle = "";
	if (cfg.anchor.anchorX === "right") {
		posStyle += `right: ${cfg.anchor.offsetX / zoom}px; left: auto;`;
	} else {
		posStyle += `left: ${cfg.anchor.offsetX / zoom}px; right: auto;`;
	}
	if (cfg.anchor.anchorY === "bottom") {
		posStyle += `bottom: ${cfg.anchor.offsetY / zoom}px; top: auto;`;
	} else {
		posStyle += `top: ${cfg.anchor.offsetY / zoom}px; bottom: auto;`;
	}

	const fontClassPh = cfg.actionMenuFont ? "am-custom-font" : "";
	const fontStylePh = cfg.actionMenuFont ? `--am-font-family: '${cfg.actionMenuFont}';` : "";
	const fadeClassPh = cfg.fadeWhenIdle !== false ? "faded-ui" : "";

	const html = `
		<div id="${ActionMenu.ROOT_ID}" class="theme-${cfg.theme} is-placeholder ${fontClassPh} ${fadeClassPh}" 
			 style="${posStyle} zoom: ${cfg.scale}; --am-scale: ${cfg.scale}; --am-base-scale: ${cfg.baseScale}; --am-auto-scale: ${cfg.autoScale}; ${fontStylePh}"
			 data-anchor-x="${cfg.anchor.anchorX}" data-anchor-y="${cfg.anchor.anchorY}">
			<div id="${ActionMenu.SUB_ID}" class="theme-${cfg.theme}"></div>
			<div id="${ActionMenu.ID}" class="theme-${cfg.theme}">
				<div class="nah-top-stack">
					<div class="nah-identity-header">
						<div class="nah-identity-text">
							<span class="nah-identity-name" style="color: #888;">Action Menu</span>
							<span class="nah-identity-sub" style="color: #666;">Drag to reposition</span>
						</div>
						<div class="nah-identity-img-box">
							<i class="fas fa-arrows-alt" style="font-size: 24px; color: #666;"></i>
						</div>
					</div>
				</div>
				<button class="nah-action-btn" style="pointer-events: none; opacity: 0.5;">
					<div class="nah-btn-content">
						<span>Sample</span>
						<i class="fas fa-circle"></i>
					</div>
				</button>
			</div>
		</div>
	`;
	const host = document.getElementById("interface") || document.body;
	const temp = document.createElement("div");
	temp.innerHTML = html.trim();
	if (temp.firstElementChild) host.appendChild(temp.firstElementChild);

	const phRoot = document.getElementById(ActionMenu.ROOT_ID);
	if (phRoot) {
		attachCornerResize(ActionMenu);
		attachHeaderDrag(ActionMenu, phRoot);
	}
	ActionMenu._bindRootEvents();
	ActionMenu._checkEditMode();
};

export const renderMain = (ActionMenu) => {
	try {
		if (game.settings.get(MODULE_ID, "disableHUD")) {
			const oldRoot = document.getElementById(ActionMenu.ROOT_ID);
			oldRoot?.remove();
			return;
		}
	} catch (_e) {}
	if (!ActionMenu?.currentActor) return;
	try {
		const cfg = getRenderConfig(ActionMenu);
		const config = game.settings.get(MODULE_ID, "configuration") || {};
		setupTooltip(cfg.theme, cfg.actionMenuFont);

		const headerHtml = buildHeaderHtml(ActionMenu);
		const quickSlotsHtml = buildQuickSlotsHtml(ActionMenu);
		const buttonsHtml = buildCategoryButtonsHtml(ActionMenu);

		const zoom = cfg.scale || 1;
		let posStyle = "";
		if (cfg.anchor.anchorX === "right") {
			posStyle += `right: ${cfg.anchor.offsetX / zoom}px; left: auto;`;
		} else {
			posStyle += `left: ${cfg.anchor.offsetX / zoom}px; right: auto;`;
		}
		if (cfg.anchor.anchorY === "bottom") {
			posStyle += `bottom: ${cfg.anchor.offsetY / zoom}px; top: auto;`;
		} else {
			posStyle += `top: ${cfg.anchor.offsetY / zoom}px; bottom: auto;`;
		}

		const fontClass = cfg.actionMenuFont ? "am-custom-font" : "";
		const fontStyle = cfg.actionMenuFont ? `--am-font-family: '${cfg.actionMenuFont}';` : "";

		let root = document.getElementById(ActionMenu.ROOT_ID);
		const isNewRoot = !root;

		if (isNewRoot) {
			root = document.createElement("div");
			root.id = ActionMenu.ROOT_ID;
			const subEl = document.createElement("div");
			subEl.id = ActionMenu.SUB_ID;
			const menuEl = document.createElement("div");
			menuEl.id = ActionMenu.ID;
			root.appendChild(subEl);
			root.appendChild(menuEl);
			(document.getElementById("interface") || document.body).appendChild(root);
		}

		const sub = root.querySelector(`#${ActionMenu.SUB_ID}`);
		const menu = root.querySelector(`#${ActionMenu.ID}`);

		const fadeClass = cfg.fadeWhenIdle !== false ? "faded-ui" : "";
		const hasActiveSub = sub?.classList.contains("active") ? "has-active-submenu" : "";
		root.className = `theme-${cfg.theme} ${fontClass} ${fadeClass} ${hasActiveSub} niks-hide-selected-text niks-wrap-favorites`.trim();
		root.setAttribute("style", `${posStyle} zoom: ${cfg.scale}; --am-scale: ${cfg.scale}; --am-base-scale: ${cfg.baseScale}; --am-auto-scale: ${cfg.autoScale}; ${fontStyle}`);
		root.dataset.anchorX = cfg.anchor.anchorX;
		root.dataset.anchorY = cfg.anchor.anchorY;

		attachDragObserver(ActionMenu);
		attachCornerResize(ActionMenu);
		attachHeaderDrag(ActionMenu, root);

		if (sub) {
			sub.className = `theme-${cfg.theme}`;
		}

		const firstButtonEmphasisClass = (cfg.actionMenuEmphasizeFirstButton ?? config.actionMenuEmphasizeFirstButton) === false
			? "no-first-button-emphasis"
			: "";
		if (menu) {
			menu.className = `theme-${cfg.theme} ${ActionMenu.isCollapsed ? "is-collapsed" : ""} ${firstButtonEmphasisClass}`.trim();
		}

		const newMenuHtml = `
			<div class="nah-top-stack">
				${headerHtml}
				${quickSlotsHtml}
			</div>
			${buttonsHtml}`;

		if (menu) {
			if (menu.dataset.lastHtml !== newMenuHtml) {
				if (isNewRoot) {
					menu.innerHTML = newMenuHtml;
				} else {
					updateHtmlMorph(menu, newMenuHtml);
				}
				menu.dataset.lastHtml = newMenuHtml;
			}
		}

		if (isNewRoot) {
			ActionMenu._bindSubMenuEvents();
			ActionMenu._bindRootEvents();
		}

		ActionMenu._checkEditMode();
	} catch (err) {
		console.error("Nik's Action HUD | Action Menu Render Error:", err);
	}
};

export const renderSubMenu = async (ActionMenu, categoryId, renderGeneration = null) => {
	const root = document.getElementById(ActionMenu.ROOT_ID);
	const container = document.getElementById(ActionMenu.SUB_ID);
	if (!container) return false;

	const categories = getActionCategories(ActionMenu, ActionMenu.currentActor) || [];
	const category = categories.find((c) => String(c.id) === String(categoryId)) || null;
	const data = await getSubMenuData(ActionMenu, ActionMenu.currentActor, categoryId, category);
	if (
		renderGeneration !== null &&
		renderGeneration !== ActionMenu.subMenuRenderGeneration
	) return false;
	if (!data) {
		ActionMenu._currentSubMenuData = null;
		console.warn("Nik's Action HUD | No submenu data available for:", categoryId);
		container.classList.remove("active");
		root?.classList.remove("has-active-submenu");
		delete container.dataset.activeCat;
		return false;
	}

	ActionMenu._currentSubMenuData = data;

	let hideEmpty = true;
	try {
		hideEmpty = Boolean(game.settings.get(MODULE_ID, "hideEmptySubmenus"));
	} catch (_e) {
		hideEmpty = true;
	}

	if (hideEmpty && !window.ActionHUD?.isEditMode && !hasSubMenuEntries(data)) {
		container.classList.remove("active");
		root?.classList.remove("has-active-submenu");
		delete container.dataset.activeCat;
		return false;
	}

	container.classList.add("active");
	root?.classList.add("has-active-submenu");

	container.dataset.activeCat = String(categoryId);

	let wrapper = container.querySelector(`.nah-sub-menu-wrapper[data-category="${categoryId}"]`);
	const isNewWrapper = !wrapper;

	if (isNewWrapper) {
		wrapper = document.createElement("div");
		wrapper.className = "nah-sub-menu-wrapper";
		wrapper.dataset.category = String(categoryId);
		container.appendChild(wrapper);
	}

	const allWrappers = container.querySelectorAll(".nah-sub-menu-wrapper");
	allWrappers.forEach((el) => {
		if (el.dataset.category === String(categoryId)) {
			el.style.display = "";
		} else {
			el.style.display = "none";
		}
	});

	const subConfig = game.settings.get(MODULE_ID, "configuration") || {};
	const searchPlaceholder = loc("UI.SearchPlaceholder", "Search...");
	const favoriteViewOptions = ActionMenu.getFavoriteViewOptions?.() || {};
	const sortFavoritesTitle = loc("UI.SortFavoritesFirst", "Sort favorites first");
	const favoritesOnlyTitle = loc("UI.ShowFavoritesOnly", "Show favorites only");
	const sortFavoritesActive = favoriteViewOptions.sortFirst ? "active" : "";
	const favoritesOnlyActive = favoriteViewOptions.only ? "active" : "";

	const searchHtml = `
		<div class="nah-search-container">
			<i class="fas fa-search"></i>
			<input type="text" class="nah-search-input" 
				   placeholder="${escapeHtml(searchPlaceholder)}" 
				   oninput="ActionHUD.actionMenu.filterList(this.value)"
				   onkeydown="if (event.key === 'Escape') { event.stopPropagation(); this.value = ''; ActionHUD.actionMenu.filterList(''); this.blur(); }"
				   onclick="event.stopPropagation()">
			<div class="nah-favorite-view-controls">
				<button type="button"
					class="nah-favorite-view-btn ${sortFavoritesActive}"
					aria-pressed="${favoriteViewOptions.sortFirst === true}"
					aria-label="${escapeHtml(sortFavoritesTitle)}"
					data-tooltip="${escapeHtml(sortFavoritesTitle)}"
					data-tooltip-direction="UP"
					onclick="event.stopPropagation(); ActionHUD.actionMenu.toggleFavoriteView('sortFirst')">
					<i class="fas fa-sort-amount-up"></i>
				</button>
				<button type="button"
					class="nah-favorite-view-btn ${favoritesOnlyActive}"
					aria-pressed="${favoriteViewOptions.only === true}"
					aria-label="${escapeHtml(favoritesOnlyTitle)}"
					data-tooltip="${escapeHtml(favoritesOnlyTitle)}"
					data-tooltip-direction="UP"
					onclick="event.stopPropagation(); ActionHUD.actionMenu.toggleFavoriteView('only')">
					<i class="fas fa-star"></i>
				</button>
			</div>
		</div>
	`;

	const actorId = ActionMenu.currentActor?.id;
	const actorType = ActionMenu.currentActor?.type;
	const catMenuIdx = getCustomMenuIndex(categoryId);
	const menuCat = catMenuIdx >= 0
		? (subConfig.customMenu || [])[catMenuIdx]
		: (subConfig.customMenu || []).find((c) => c.systemId && String(categoryId).endsWith(c.systemId)) || null;

	if (data.hasSubTabs) {
		const allPrimaryKeys = Object.keys(data.items);
		const primaryKeys = allPrimaryKeys.filter((key) => _isTabVisibleForActor(menuCat, key, actorId, actorType));
		if (!ActionMenu.activeTab || !primaryKeys.includes(String(ActionMenu.activeTab))) {
			ActionMenu.activeTab = primaryKeys.length > 0 ? primaryKeys[0] : null;
		}

		let sidebarHtml = "";
		primaryKeys.forEach((key) => {
			const label = data.tabLabels[key] || key;
			const rawTooltipText =
				data.tabTooltips && data.tabTooltips[key]
					? data.tabTooltips[key]
					: label;
			const tooltipText = String(rawTooltipText || "").replace(/<[^>]*>/g, "").trim();
			const activeClass =
				String(ActionMenu.activeTab) === String(key) ? "active" : "";

			sidebarHtml += `
				<div class="nah-side-tab ${activeClass}" 
					 onclick="ActionHUD.actionMenu.switchTab('${categoryId}', '${key}')"
					 oncontextmenu="event.preventDefault(); ActionHUD.actionMenu.editSpellSlots('${categoryId}', '${key}')"
					 data-tooltip="${escapeHtml(tooltipText)}" data-tooltip-direction="RIGHT">
					<span>${label}</span>
				</div>`;
		});

		let levelTabsHtml = "";
		let currentItems = [];

		if (ActionMenu.activeTab) {
			const subData = data.items[ActionMenu.activeTab];
			if (subData) {
				const subKeys = Object.keys(subData).sort(
					(a, b) => parseInt(a, 10) - parseInt(b, 10),
				);
				if (!ActionMenu.activeSubTab || !subKeys.includes(String(ActionMenu.activeSubTab))) {
					ActionMenu.activeSubTab = subKeys.length > 0 ? subKeys[0] : null;
				}

				currentItems =
					ActionMenu.activeSubTab !== null
						? subData[ActionMenu.activeSubTab]
						: [];

				if (subKeys.length >= 1) {
					subKeys.forEach((subKey) => {
						let label = subKey;
						if (
							data.subTabLabels &&
							data.subTabLabels[ActionMenu.activeTab] &&
							data.subTabLabels[ActionMenu.activeTab][subKey]
						) {
							label = data.subTabLabels[ActionMenu.activeTab][subKey];
						}
						const activeClass =
							String(ActionMenu.activeSubTab) === String(subKey)
								? "active"
								: "";
						levelTabsHtml += `<div class="nah-tab-btn sub-tab ${activeClass}" onclick="ActionHUD.actionMenu.switchSubTab('${categoryId}', '${subKey}')"><span>${label}</span></div>`;
					});
				}
			}
		}

		const listHtml = buildListItems(ActionMenu, currentItems);
		const tabsContainer = levelTabsHtml
			? `<div class="nah-magic-tabs custom-scrollbar secondary">${levelTabsHtml}</div>`
			: "";

		const headerTitleText = game.i18n?.localize?.(data.title) || data.title;
		const headerStatsHtml = data.headerStatsHtml || "";
		const newMenuHeaderHtml = `<div class="nah-menu-header-group"><span class="nah-font-hero text-xl">${escapeHtml(headerTitleText)}</span>${headerStatsHtml}</div>`;

		if (!isNewWrapper) {
			const shell = wrapper.querySelector(".nah-sub-menu.layout-sidebar");
			if (shell) {
				if (shell.dataset.lastSidebarHtml !== sidebarHtml) {
					const sidebarPanel = shell.querySelector(".nah-sidebar-panel");
					if (sidebarPanel) sidebarPanel.innerHTML = sidebarHtml;
					shell.dataset.lastSidebarHtml = sidebarHtml;
				}

				if (shell.dataset.lastHeaderHtml !== newMenuHeaderHtml) {
					const menuHeader = shell.querySelector(".nah-menu-header");
					if (menuHeader) menuHeader.innerHTML = newMenuHeaderHtml;
					shell.dataset.lastHeaderHtml = newMenuHeaderHtml;
				}

				if (shell.dataset.lastSearchHtml !== searchHtml) {
					const searchContainer = shell.querySelector(".nah-search-container");
					if (searchContainer) {
						const tempS = document.createElement("div");
						tempS.innerHTML = searchHtml.trim();
						if (tempS.firstElementChild) searchContainer.replaceWith(tempS.firstElementChild);
					}
					shell.dataset.lastSearchHtml = searchHtml;
				}

				if (shell.dataset.lastTabsHtml !== tabsContainer) {
					const tabsEl = shell.querySelector("#nah-tabs-container");
					if (tabsEl) tabsEl.innerHTML = tabsContainer;
					shell.dataset.lastTabsHtml = tabsContainer;
				}

				if (shell.dataset.lastListHtml !== listHtml) {
					const scrollArea = shell.querySelector(".nah-scroll-area");
					if (scrollArea) updateHtmlMorph(scrollArea, listHtml);
					shell.dataset.lastListHtml = listHtml;
				}
				shell.dataset.defaultListHtml = listHtml;

				adjustSubMenuPosition(ActionMenu);
				return true;
			}
		}

		const html = `
			<div class="nah-sub-menu theme-${data.theme || subConfig?.theme || getDefaultTheme()} layout-sidebar">
				<div class="nah-sidebar-panel custom-scrollbar">
					${sidebarHtml}
				</div>
				<div class="nah-main-panel">
					<div class="nah-menu-header">
						${newMenuHeaderHtml}
					</div>
					${searchHtml}
					<div id="nah-tabs-container" class="nah-tabs-container">${tabsContainer}</div>
					<div class="nah-scroll-area custom-scrollbar">
						${listHtml}
					</div>
				</div>
			</div>`;

		wrapper.innerHTML = html;

		const newShell = wrapper.querySelector(".nah-sub-menu");
		if (newShell) {
			newShell.dataset.lastSidebarHtml = sidebarHtml;
			newShell.dataset.lastHeaderHtml = newMenuHeaderHtml;
			newShell.dataset.lastSearchHtml = searchHtml;
			newShell.dataset.lastTabsHtml = tabsContainer;
			newShell.dataset.lastListHtml = listHtml;
			newShell.dataset.defaultListHtml = listHtml;
		}

	} else {
		let headerHtml = "";
		let listHtml = "";

		if (data.hasTabs) {
			const keys = Object.keys(data.items).filter((key) => _isTabVisibleForActor(menuCat, key, actorId, actorType));
			if (!ActionMenu.activeTab || !keys.includes(String(ActionMenu.activeTab))) {
				ActionMenu.activeTab = keys[0] || null;
			}

			let tabsHtml = "";
			keys.forEach((key) => {
				const label = data.tabLabels[key] || key;
				const activeClass =
					String(ActionMenu.activeTab) === String(key) ? "active" : "";
				tabsHtml += `<div class="nah-tab-btn ${activeClass}" onclick="ActionHUD.actionMenu.switchTab('${categoryId}', '${key}')"><span>${label}</span></div>`;
			});
			headerHtml += `<div class="nah-magic-tabs custom-scrollbar">${tabsHtml}</div>`;
			listHtml = buildListItems(
				ActionMenu,
				ActionMenu.activeTab ? data.items[ActionMenu.activeTab] : [],
			);
		} else {
			listHtml = buildListItems(ActionMenu, data.items);
		}

		const headerTitleText = game.i18n?.localize?.(data.title) || data.title;
		const headerStatsHtml = data.headerStatsHtml || "";
		const newMenuHeaderHtml = `<div class="nah-menu-header-group"><span class="nah-font-hero text-xl">${escapeHtml(headerTitleText)}</span>${headerStatsHtml}</div>`;

		if (!isNewWrapper) {
			const shell = wrapper.querySelector(".nah-sub-menu:not(.layout-sidebar)");
			if (shell) {
				if (shell.dataset.lastHeaderHtml !== newMenuHeaderHtml) {
					const menuHeader = shell.querySelector(".nah-menu-header");
					if (menuHeader) menuHeader.innerHTML = newMenuHeaderHtml;
					shell.dataset.lastHeaderHtml = newMenuHeaderHtml;
				}

				if (shell.dataset.lastSearchHtml !== searchHtml) {
					const searchContainer = shell.querySelector(".nah-search-container");
					if (searchContainer) {
						const tempS = document.createElement("div");
						tempS.innerHTML = searchHtml.trim();
						if (tempS.firstElementChild) searchContainer.replaceWith(tempS.firstElementChild);
					}
					shell.dataset.lastSearchHtml = searchHtml;
				}

				if (shell.dataset.lastTabsHtml !== headerHtml) {
					const tabsEl = shell.querySelector("#nah-tabs-container");
					if (tabsEl) tabsEl.innerHTML = headerHtml;
					shell.dataset.lastTabsHtml = headerHtml;
				}

				if (shell.dataset.lastListHtml !== listHtml) {
					const scrollArea = shell.querySelector(".nah-scroll-area");
					if (scrollArea) updateHtmlMorph(scrollArea, listHtml);
					shell.dataset.lastListHtml = listHtml;
				}
				shell.dataset.defaultListHtml = listHtml;

				adjustSubMenuPosition(ActionMenu);
				return true;
			}
		}

		const html = `
			<div class="nah-sub-menu theme-${data.theme || subConfig?.theme || getDefaultTheme()}">
				<div class="nah-menu-header">
					${newMenuHeaderHtml}
				</div>
				${searchHtml}
				<div id="nah-tabs-container" class="nah-tabs-container">${headerHtml}</div>
				<div class="nah-scroll-area custom-scrollbar" style="max-height: 300px;">
					${listHtml}
				</div>
			</div>
		`;
		wrapper.innerHTML = html;

		const newShell = wrapper.querySelector(".nah-sub-menu");
		if (newShell) {
			newShell.dataset.lastHeaderHtml = newMenuHeaderHtml;
			newShell.dataset.lastSearchHtml = searchHtml;
			newShell.dataset.lastTabsHtml = headerHtml;
			newShell.dataset.lastListHtml = listHtml;
			newShell.dataset.defaultListHtml = listHtml;
		}
	}

	adjustSubMenuPosition(ActionMenu);
	return true;
};
