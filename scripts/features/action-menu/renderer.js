
import { MODULE_ID } from "../../constants.js";
import { attachCornerResize, attachWheelResize, attachDragObserver } from "./drag.js";
import { getEffectiveActorSettings } from "../../utils/client-overrides.js";
import { getActionCategories, getSubMenuData } from "./registry.js";
import { resolveSubMenuSide } from "./position.js";
import { initTooltipHoverEvents } from "./tooltip.js";
import { getCustomMenuIndex, isActionMenuCategoryVisible, hasSubMenuEntries } from "./category-visibility.js";
import { prepareFavoriteItems } from "./favorites.js";

const escapeHtml = (value) => String(value ?? "")
	.replace(/&/g, "&amp;")
	.replace(/</g, "&lt;")
	.replace(/>/g, "&gt;")
	.replace(/"/g, "&quot;")
	.replace(/'/g, "&#39;");

function _isTabVisibleForActor(menuCat, tabKey, actorId, actorType) {
	if (!menuCat?.tabs) return true;
	const ti = tabKey.startsWith("tab-") ? parseInt(tabKey.split("-")[1]) : parseInt(tabKey);
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

		const oldNames = Array.from(oldAttrs).map(a => a.name);
		const newNames = Array.from(newAttrs).map(a => a.name);

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

const _layerSizeStyle = (layer) => {
	const w = Number(layer.width) || 0;
	const h = Number(layer.height) || 0;
	if (w && h) return `width:${w}px; height:${h}px;`;
	if (w) return `width:${w}px; height:auto;`;
	if (h) return `width:auto; height:${h}px;`;
	return "";
};

const buildAMLayersHtml = (layers) => {
	if (!layers || layers.length === 0) return "";
	const imgs = layers.map((layer) => {
		if (!layer.src) return "";
		const transform = `translate(-50%, -50%) scale(${layer.scale || 1}) translate(${layer.x || 0}px, ${layer.y || 0}px) rotate(${layer.rotation || 0}deg)`;
		const size = _layerSizeStyle(layer);
		return `<img src="${layer.src}" style="position:absolute; top:50%; left:50%; z-index:${layer.zIndex || 10}; ${size} transform:${transform}; opacity:${layer.opacity ?? 1}; mix-blend-mode:${layer.blend || "normal"}; pointer-events:none;">`;
	}).join("");
	return `<div class="ib-am-layers" style="position:absolute; inset:0; pointer-events:none;">${imgs}</div>`;
};

const getAMElementStyle = (config, elementId) => {
	const parts = [];
	const color = config[`${elementId}Color`];
	let width = config[`${elementId}Width`];
	let height = config[`${elementId}Height`];
	const layers = config[`${elementId}Layers`];
	if (layers && layers.length > 0) {
		const ref = layers[0];
		if (!width && ref.width) width = ref.width;
		if (!height && ref.height) height = ref.height;
	}
	if (color) parts.push(`color: ${color}`);
	if (width) parts.push(`width: ${width}px`);
	if (height) parts.push(`height: ${height}px`);
	return parts.join("; ");
};

const getAMTextStyle = (config, elementId) => {
	const tx = Number(config[`${elementId}TextX`]) || 0;
	const ty = Number(config[`${elementId}TextY`]) || 0;
	const ts = Number(config[`${elementId}TextScale`]) || 1;
	const tr = Number(config[`${elementId}TextRotation`]) || 0;
	if (!tx && !ty && ts === 1 && !tr) return "";
	return `transform: translate(${tx}px, ${ty}px) scale(${ts}) rotate(${tr}deg)`;
};

const buildAMElementLayersHtml = (config, elementId) => {
	const layers = config[`${elementId}Layers`];
	if (!layers || layers.length === 0) return "";
	const imgs = layers.map((layer, index) => {
		if (!layer.src) return "";
		const lx = layer.x || 0;
		const ly = layer.y || 0;
		const transform = `translate(-50%, -50%) scale(${layer.scale || 1}) translate(${lx}px, ${ly}px) rotate(${layer.rotation || 0}deg)`;
		const size = _layerSizeStyle(layer);
		return `<img src="${layer.src}" style="position:absolute; top:50%; left:50%; z-index:${layer.zIndex || 10}; ${size} transform:${transform}; opacity:${layer.opacity ?? 1}; mix-blend-mode:${layer.blend || "normal"}; pointer-events:none;">`;
	}).join("");
	return `<div class="ib-am-layers" style="position:absolute; inset:0; pointer-events:none;">${imgs}</div>`;
};

export const getRenderConfig = (ActionMenu) => {
	const config = game.settings.get(MODULE_ID, "configuration");
	const clientPos =
		game.settings.get(MODULE_ID, "clientPositions") || {};

	const baseScale = clientPos.actionMenuScale ?? config.actionMenuScale ?? 1.0;
	const rawPos =
		clientPos.actionMenuPos || config.actionMenuPos || { anchorX: "right", anchorY: "bottom", offsetX: 40, offsetY: 40 };
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

	return {
		theme: config.theme || "rift",
		anchor,
		scale: effectiveScale,
		baseScale: baseScale || 1.0,
		autoScale,
		actionMenuFont,
	};
};

export const setupTooltip = (theme, actionMenuFont) => {
	let tooltip = $("#ib-rich-tooltip");
	if (tooltip.length === 0) {
		tooltip = $('<div id="ib-rich-tooltip"></div>').appendTo(document.getElementById("interface") || document.body);
	}
	tooltip.removeClass((index, className) =>
		(className.match(/(^|\s)theme-\S+/g) || []).join(" "),
	);
	tooltip.addClass(`theme-${theme}`);

	if (actionMenuFont) {
		tooltip.addClass("am-custom-font");
		tooltip.css("--am-font-family", `'${actionMenuFont}'`);
	} else {
		tooltip.removeClass("am-custom-font");
		tooltip.css("--am-font-family", "");
	}

	initTooltipHoverEvents();
};

export const buildHeaderHtml = (ActionMenu) => {
	const config = game.settings.get(MODULE_ID, "configuration") || {};
	const isImageTheme = (config.theme || "rift") === "image";
	const useTokenImg = config.actionMenuUseTokenImg ?? false;
	const actor = ActionMenu.currentActor;
	const token = canvas.tokens?.controlled?.[0]
		|| actor.getActiveTokens?.(true, true)?.[0]
		|| canvas.tokens?.placeables?.find((t) => t.actor?.id === actor.id);

	const tokenName = token?.name || token?.document?.name || actor.prototypeToken?.name || actor.name;

	const displayName =
		getEffectiveActorSettings(config, actor.id).displayName?.trim() ||
		tokenName;

	let img = ActionMenu.currentActor.img;
	if (useTokenImg) {
		const token = canvas.tokens.controlled[0];
		if (token?.document?.texture?.src) {
			img = token.document.texture.src;
		} else if (ActionMenu.currentActor.prototypeToken?.texture?.src) {
			img = ActionMenu.currentActor.prototypeToken.texture.src;
		}
	}

	const identityBgHtml = isImageTheme ? buildAMElementLayersHtml(config, "amIdentity") : "";
	const identityStyle = isImageTheme ? getAMElementStyle(config, "amIdentity") : "";
	const identityTextStyle = isImageTheme ? getAMTextStyle(config, "amIdentity") : "";
	const portraitLayersHtml = isImageTheme ? buildAMElementLayersHtml(config, "amPortrait") : "";

	const selectedText = game.i18n.localize("IBHUD.UI.SelectedActor");
	const actorId = ActionMenu.currentActor.id;
	const isMyTurn = game.combat?.started && game.combat.combatant?.actorId === actorId;
	const endTurnBtn = isMyTurn
		? `<div class="ib-am-end-turn-btn" onclick="event.stopPropagation(); (window.ActionHUD?.endTurn || window.ActionHUD?.endTurn)('${actorId}')" title="${game.i18n.localize("IBHUD.UI.EndTurn")}"><i class="fas fa-hourglass-end"></i></div>`
		: "";
	return `
            <div class="ib-identity-header" ${identityStyle ? `style="${identityStyle}"` : ""}>
                ${identityBgHtml}
                <div class="ib-identity-text" ${identityTextStyle ? `style="${identityTextStyle}"` : ""}>
                    <div style="position: relative; display: inline-block;">
                        <div class="ib-collapse-btn" onclick="ActionHUD.actionMenu.toggleCollapse()" style="position: absolute; right: 100%; top: 0.6em; transform: translateY(-50%); margin-right: 8px;">
                            <i class="fas ${ActionMenu.isCollapsed ? 'fa-caret-right' : 'fa-caret-down'}"></i>
                        </div>
						<span class="ib-identity-name">${displayName}</span>
                        ${endTurnBtn}
                    </div>
                    <span class="ib-identity-sub">${selectedText}</span>
                </div>
                <div class="ib-identity-img-box" onclick="ActionHUD.actionMenu.openSheet()">
                    ${portraitLayersHtml}
                    <img src="${img}">
                </div>
            </div>
        `;
};

export const buildQuickSlotsHtml = (ActionMenu) => {
	const favorites = ActionMenu.getFavorites();
	if (favorites.length === 0) return "";

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
			item = ActionMenu.currentActor.items.get(itemId);
			if (item) {
				img = item.img;
				name = item.name;
			} else if (ActionMenu.adapter?.resolveQuickSlotData) {
				const resolved = ActionMenu.adapter.resolveQuickSlotData(ActionMenu.currentActor, itemId);
				if (resolved) {
					item = { id: itemId, name: resolved.name };
					img = resolved.img;
					name = resolved.name;
				}
			}
		}

		if (item) {
			const reorderHint = game.i18n.localize("IBHUD.UI.DragFavoriteToReorder");
			const removeHint = game.i18n.localize("IBHUD.UI.RightClickRemoveFavorite");
			const slotTitle = `${name} · ${reorderHint} · ${removeHint}`;
			slots += `
                <div class="ib-quick-slot" draggable="true"
					 data-favorite-id="${escapeHtml(itemId)}"
					 title="${escapeHtml(slotTitle)}"
					 aria-label="${escapeHtml(slotTitle)}">
                    <img src="${escapeHtml(img)}" alt="${escapeHtml(name)}" draggable="false">
                </div>
            `;
		}
	});

	if (!slots) return "";
	const qsConfig = game.settings.get(MODULE_ID, "configuration") || {};
	const isImageTheme = (qsConfig.theme || "rift") === "image";
	const quickSlotFrameHtml = isImageTheme ? buildAMElementLayersHtml(qsConfig, "amQuickSlot") : "";
	const qsStyle = isImageTheme ? getAMElementStyle(qsConfig, "amQuickSlot") : "";
	return `<div class="ib-quick-slot-container" ${qsStyle ? `style="${qsStyle}"` : ""}>${quickSlotFrameHtml}${slots}</div>`;
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
	const isImageTheme = (btnConfig.theme || "rift") === "image";
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
		iconHtml = `<img src="${escapeHtml(cat.img)}" class="ib-cat-btn-img" alt="">`;
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
		bgHtml = `<img src="${escapeHtml(cat.buttonImg)}" class="ib-custom-bg" style="${escapeHtml(styleVars)}" alt="">`;
	}

	let frameHtml = "";
	let btnElStyle = "";
	let btnTextStyle = "";
	if (isImageTheme) {
		if (Array.isArray(cat.buttonFrameLayers) && cat.buttonFrameLayers.length > 0) {
			const perBtnConfig = {
				amButtonLayers: cat.buttonFrameLayers,
				amButtonColor: cat.buttonFrameColor || "",
			};
			frameHtml = buildAMElementLayersHtml(perBtnConfig, "amButton");
			btnElStyle = getAMElementStyle(perBtnConfig, "amButton");
		} else {
			frameHtml = buildAMElementLayersHtml(btnConfig, "amButton");
			btnElStyle = getAMElementStyle(btnConfig, "amButton");
		}
		btnTextStyle = getAMTextStyle(btnConfig, "amButton");
	}

	const actionButtonStyle = [
		btnElStyle,
		`--ib-action-stagger: ${_safeNumber(actionIndex, 0) * 12}px`,
	].filter(Boolean).join("; ");
	const labelStyle = [];
	const fontFamily = _safeCategoryFont(cat.fontFamily);
	const textColor = _safeCategoryColor(cat.textColor);
	if (fontFamily) labelStyle.push(`font-family: "${fontFamily}" !important`);
	if (textColor) labelStyle.push(`color: ${textColor} !important`);

	const attributes = [
		'type="button"',
		`class="ib-action-btn ${escapeHtml(cat.cssClass || "")} ${customClass}"`,
		`style="${escapeHtml(actionButtonStyle)}"`,
	];
	if (onClick) attributes.push(`onclick="${escapeHtml(onClick)}"`);
	if (!interactive) attributes.push('aria-disabled="true"', 'tabindex="-1"');

	return `
		<button ${attributes.join(" ")}>
			${bgHtml}
			${frameHtml}
			<div class="ib-btn-content" ${btnTextStyle ? `style="${escapeHtml(btnTextStyle)}"` : ""}>
				<span ${labelStyle.length ? `style="${escapeHtml(labelStyle.join("; "))}"` : ""}>${escapeHtml(game.i18n?.localize?.(cat.label) || cat.label)}</span>
				${iconHtml}
			</div>
		</button>
	`;
};

export const buildCategoryButtonsHtml = (ActionMenu) => {
	const categories = getActionCategories(ActionMenu, ActionMenu.currentActor);
	const btnConfig = game.settings.get(MODULE_ID, "configuration") || {};
	const inCombat = game.combat?.started ?? false;
	const customMenu = btnConfig.customMenu || [];

	return categories
		.filter((cat) => isActionMenuCategoryVisible(cat, customMenu, inCombat, {
			ActionMenu,
			actor: ActionMenu.currentActor,
		}))
		.map((cat, actionIndex) => buildCategoryButtonHtml(cat, actionIndex, btnConfig))
		.join("");
};

export const buildListItems = (ActionMenu, items) => {
	const favs = ActionMenu.getFavorites();
	const favoriteViewOptions = ActionMenu.getFavoriteViewOptions?.() || {};
	const preparedItems = prepareFavoriteItems(items, favs, favoriteViewOptions);

	if (preparedItems.length === 0) {
		const emptyKey = favoriteViewOptions.only
			? "IBHUD.UI.NoFavoritesInView"
			: "IBHUD.UI.Empty";
		const emptyText = game.i18n.localize(emptyKey);
		return `<div class="ib-list-item"><div class="ib-item-content" style="justify-content:center; color:#666; font-style:italic;">${emptyText}</div></div>`;
	}

	const liConfig = game.settings.get(MODULE_ID, "configuration") || {};
	const isImageTheme = (liConfig.theme || "rift") === "image";
	const listItemLayersHtml = isImageTheme ? buildAMElementLayersHtml(liConfig, "amListItem") : "";
	const liElStyle = isImageTheme ? getAMElementStyle(liConfig, "amListItem") : "";
	const liTextStyle = isImageTheme ? getAMTextStyle(liConfig, "amListItem") : "";

	return preparedItems
		.map((item) => {
			if (item.isHeader) {
			return `
                    <div class="ib-list-header" style="
                        background: rgba(255, 255, 255, 0.1); 
                        color: #4ecdc4; 
                        font-size: 1.1em; 
                        padding: 4px 10px; 
                        margin-top: 5px; 
                        border-left: 3px solid #4ecdc4;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        pointer-events: none;
                    ">
                        ${item.name}
                    </div>
                `;
			}

			let tooltipAttr = "";
			if (item.description) {
				const safeDesc = item.description.replace(/"/g, "&quot;");
				tooltipAttr = `data-tooltip="${safeDesc}" data-tooltip-direction="LEFT"`;
			}

			const showFavorite = item.favoritable !== false;
			const isFav = showFavorite && favs.includes(item.id);
			const starClass = isFav ? "fas fa-star" : "far fa-star";
			const activeClass = isFav ? "active" : "";
			const favBtnHtml = showFavorite
				? `<div class="ib-fav-btn ${activeClass}" onclick="event.stopPropagation(); ActionHUD.actionMenu.toggleFavorite('${item.id}')"><i class="${starClass}"></i></div>`
				: "";

			let rowStyle = "";
			let nameStyle = "";

		if (item.isExhausted) {
				rowStyle = `opacity: 0.5; filter: grayscale(100%); cursor: not-allowed;`;
				nameStyle = `text-decoration: line-through; color: #888;`;
			} else if (item.isVirtual) {
				rowStyle = `opacity: 0.7; border-left: 2px solid #9966ff; padding-left: 6px;`;
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

			const costHtml = item.cost
				? item.hasInlineControls
					? `<div class="ib-item-inline-controls" style="display:flex; align-items:flex-start;">${item.cost}</div>`
					: `<span class="text-sm font-bold" style="color: #666; font-size: 0.8em;">${item.cost}</span>`
				: "";

			const rightMetaAlign = item.hasInlineControls
				? "display:flex; align-items:flex-start; gap:10px;"
				: "display:flex; align-items:center; gap:10px;";

			return `
            <div class="ib-list-item" 
                 style="${rowStyle}${liElStyle ? ` ${liElStyle}` : ""}" 
                 onclick="${item.isExhausted ? "" : `ActionHUD.actionMenu.useItem('${item.id}', event)`}"
                 ${rightClickAttr}
                 onmouseenter="ActionHUD.actionMenu.showTooltip('${item.id}', event)"
                 onmouseleave="ActionHUD.actionMenu.hideTooltip()">
                ${listItemLayersHtml}
                <div class="ib-item-content" ${liTextStyle ? `style="${liTextStyle}"` : ""}>
                    <div class="flex items-center gap-2" style="display:flex; align-items:center; gap:10px; min-width:0; overflow:hidden;">
                        ${item.img ? `<img src="${item.img}" width="24" height="24" style="border:1px solid #333; border-radius: 2px; flex-shrink:0;">` : ""}
                        <span class="ib-font-hero text-xl" style="font-size: 1.1em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; ${nameStyle}">
                            ${item.isSignature ? `<i class="fas fa-star" style="color: #f1c40f; font-size: 0.7em; margin-right: 3px;" title="Signature Spell"></i>` : ""}${item.name}
                        </span>
                    </div>
                    
					<div style="${rightMetaAlign} flex-shrink:0;">
						${costHtml}
						
						${favBtnHtml}
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
	$(`#${ActionMenu.ROOT_ID}`).remove();

	const cfg = getRenderConfig(ActionMenu);

	let posStyle = "";
	if (cfg.anchor.anchorX === "right") {
		posStyle += `right: ${cfg.anchor.offsetX}px; left: auto;`;
	} else {
		posStyle += `left: ${cfg.anchor.offsetX}px; right: auto;`;
	}
	if (cfg.anchor.anchorY === "bottom") {
		posStyle += `bottom: ${cfg.anchor.offsetY}px; top: auto;`;
	} else {
		posStyle += `top: ${cfg.anchor.offsetY}px; bottom: auto;`;
	}

	const fontClassPh = cfg.actionMenuFont ? "am-custom-font" : "";
	const fontStylePh = cfg.actionMenuFont ? `--am-font-family: '${cfg.actionMenuFont}';` : "";

	const html = `
		<div id="${ActionMenu.ROOT_ID}" class="theme-${cfg.theme} is-placeholder ${fontClassPh}" 
			 style="${posStyle} --am-scale: ${cfg.scale}; --am-base-scale: ${cfg.baseScale}; --am-auto-scale: ${cfg.autoScale}; ${fontStylePh}"
			 data-anchor-x="${cfg.anchor.anchorX}" data-anchor-y="${cfg.anchor.anchorY}">
			<div id="${ActionMenu.SUB_ID}" class="theme-${cfg.theme}"></div>
			<div id="${ActionMenu.ID}" class="theme-${cfg.theme}">
				<div class="ib-top-stack">
					<div class="ib-identity-header">
						<div class="ib-identity-text">
							<span class="ib-identity-name" style="color: #888;">Action Menu</span>
							<span class="ib-identity-sub" style="color: #666;">Drag to reposition</span>
						</div>
						<div class="ib-identity-img-box">
							<i class="fas fa-arrows-alt" style="font-size: 24px; color: #666;"></i>
						</div>
					</div>
				</div>
				<button class="ib-action-btn" style="pointer-events: none; opacity: 0.5;">
					<div class="ib-btn-content">
						<span>Sample</span>
						<i class="fas fa-circle"></i>
					</div>
				</button>
			</div>
		</div>
	`;
	$(document.getElementById("interface") || document.body).append(html);

	ActionMenu._bindRootEvents();
	ActionMenu._checkEditMode();
};

export const renderMain = (ActionMenu) => {
	const cfg = getRenderConfig(ActionMenu);
	setupTooltip(cfg.theme, cfg.actionMenuFont);

	const config = game.settings.get(MODULE_ID, "configuration") || {};
	const isImageTheme = cfg.theme === "image";

	const headerHtml = buildHeaderHtml(ActionMenu);
	const quickSlotsHtml = buildQuickSlotsHtml(ActionMenu);
	const buttonsHtml = buildCategoryButtonsHtml(ActionMenu);

	const menuLayersHtml = isImageTheme ? buildAMLayersHtml(config.amMenuLayers) : "";

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

	let root = $(`#${ActionMenu.ROOT_ID}`);
	if (root.length > 1) root.not(":first").remove();
	const isNewRoot = !root.length;

	if (isNewRoot) {
		root = $(`<div id="${ActionMenu.ROOT_ID}"></div>`);
		root.append(`<div id="${ActionMenu.SUB_ID}"></div>`);
		root.append(`<div id="${ActionMenu.ID}"></div>`);
		$(document.getElementById("interface") || document.body).append(root);
	}

	root.attr("class", `theme-${cfg.theme} ${fontClass}`.trim());
	root.attr("style", `${posStyle} zoom: ${cfg.scale}; --am-scale: ${cfg.scale}; --am-base-scale: ${cfg.baseScale}; --am-auto-scale: ${cfg.autoScale}; ${fontStyle}`);
	root.attr("data-anchor-x", cfg.anchor.anchorX);
	root.attr("data-anchor-y", cfg.anchor.anchorY);

	if (root[0]) {
		root[0].classList.add("niks-hide-selected-text", "niks-wrap-favorites");
	}

	attachDragObserver(ActionMenu);
	attachWheelResize(ActionMenu);
	attachCornerResize(ActionMenu);

	const sub = root.find(`#${ActionMenu.SUB_ID}`);
	sub.attr("class", `theme-${cfg.theme}`);

	const menu = root.find(`#${ActionMenu.ID}`);
	const firstButtonEmphasisClass = config.actionMenuEmphasizeFirstButton === false
		? "no-first-button-emphasis"
		: "";
	menu.attr(
		"class",
		`theme-${cfg.theme} ${ActionMenu.isCollapsed ? "is-collapsed" : ""} ${firstButtonEmphasisClass}`.trim(),
	);
	const newMenuHtml = `${menuLayersHtml}
                    <div class="ib-top-stack">
                        ${headerHtml}
                        ${quickSlotsHtml}
                    </div>
                    ${buttonsHtml}`;

	if (menu.data("last-html") !== newMenuHtml) {
		if (isNewRoot) {
			menu.html(newMenuHtml);
		} else {
			updateHtmlMorph(menu[0], newMenuHtml);
		}
		menu.data("last-html", newMenuHtml);
	}

	if (isNewRoot) {
		ActionMenu._bindSubMenuEvents();
		ActionMenu._bindRootEvents();
	}

	ActionMenu._checkEditMode();
};

export const renderSubMenu = async (ActionMenu, categoryId, renderGeneration = null) => {
	const container = $(`#${ActionMenu.SUB_ID}`);

	const data = await getSubMenuData(ActionMenu, ActionMenu.currentActor, categoryId);
	if (
		renderGeneration !== null &&
		renderGeneration !== ActionMenu.subMenuRenderGeneration
	) return false;
	if (!data) {
		console.warn("StylishHUD | No submenu data available for:", categoryId);
		container.removeClass("active");
		container.removeData("active-cat");
		return false;
	}

	let hideEmpty = true;
	try {
		hideEmpty = Boolean(game.settings.get(MODULE_ID, "hideEmptySubmenus"));
	} catch (_e) {
		hideEmpty = true;
	}

	if (hideEmpty && !window.ActionHUD?.isEditMode && !hasSubMenuEntries(data)) {
		container.removeClass("active");
		container.removeData("active-cat");
		return false;
	}

	container.removeClass("active").addClass("active");

	container.data("menu-data", data);
	container.data("active-cat", categoryId);

	let wrapper = container.children(`.ib-sub-menu-wrapper[data-category="${categoryId}"]`);
	const isNewWrapper = wrapper.length === 0;

	if (isNewWrapper) {
		wrapper = $(`<div class="ib-sub-menu-wrapper" data-category="${categoryId}"></div>`);
		container.append(wrapper);
	}

	container.children(".ib-sub-menu-wrapper").each((_, el) => {
		if ($(el).attr("data-category") === categoryId) {
			$(el).show();
		} else {
			$(el).hide();
		}
	});

	const subConfig = game.settings.get(MODULE_ID, "configuration") || {};
	const isImageTheme = (subConfig.theme || "rift") === "image";
	const subMenuLayersHtml = isImageTheme ? buildAMLayersHtml(subConfig.amSubMenuLayers) : "";
	const menuHeaderBgHtml = isImageTheme ? buildAMElementLayersHtml(subConfig, "amMenuHeader") : "";
	const sidebarBgHtml = isImageTheme ? buildAMElementLayersHtml(subConfig, "amSidebar") : "";
	const tabBgHtml = isImageTheme ? buildAMElementLayersHtml(subConfig, "amTab") : "";
	const menuHeaderStyle = isImageTheme ? getAMElementStyle(subConfig, "amMenuHeader") : "";
	const menuHeaderTextStyle = isImageTheme ? getAMTextStyle(subConfig, "amMenuHeader") : "";
	const sidebarStyle = isImageTheme ? getAMElementStyle(subConfig, "amSidebar") : "";
	const tabStyle = isImageTheme ? getAMElementStyle(subConfig, "amTab") : "";
	const tabTextStyle = isImageTheme ? getAMTextStyle(subConfig, "amTab") : "";
	const sideTabStyle = isImageTheme ? getAMElementStyle(subConfig, "amSideTab") : "";
	const sideTabTextStyle = isImageTheme ? getAMTextStyle(subConfig, "amSideTab") : "";

	container.data("menu-data", data);
	container.data("active-cat", categoryId);

	const searchPlaceholder = game.i18n.localize("IBHUD.UI.SearchPlaceholder");
	const favoriteViewOptions = ActionMenu.getFavoriteViewOptions?.() || {};
	const sortFavoritesTitle = game.i18n.localize("IBHUD.UI.SortFavoritesFirst");
	const favoritesOnlyTitle = game.i18n.localize("IBHUD.UI.ShowFavoritesOnly");
	const sortFavoritesActive = favoriteViewOptions.sortFirst ? "active" : "";
	const favoritesOnlyActive = favoriteViewOptions.only ? "active" : "";

	const searchHtml = `
            <div class="ib-search-container">
                <i class="fas fa-search"></i>
                <input type="text" class="ib-search-input" 
                       placeholder="${searchPlaceholder}" 
                       oninput="ActionHUD.actionMenu.filterList(this.value)"
                       onclick="event.stopPropagation()">
				<div class="ib-favorite-view-controls">
					<button type="button"
						class="ib-favorite-view-btn ${sortFavoritesActive}"
						aria-pressed="${favoriteViewOptions.sortFirst === true}"
						aria-label="${sortFavoritesTitle}"
						title="${sortFavoritesTitle}"
						onclick="event.stopPropagation(); ActionHUD.actionMenu.toggleFavoriteView('sortFirst')">
						<i class="fas fa-sort-amount-up"></i>
					</button>
					<button type="button"
						class="ib-favorite-view-btn ${favoritesOnlyActive}"
						aria-pressed="${favoriteViewOptions.only === true}"
						aria-label="${favoritesOnlyTitle}"
						title="${favoritesOnlyTitle}"
						onclick="event.stopPropagation(); ActionHUD.actionMenu.toggleFavoriteView('only')">
						<i class="fas fa-star"></i>
					</button>
				</div>
            </div>
        `;

	const actorId = ActionMenu.currentActor?.id;
	const actorType = ActionMenu.currentActor?.type;
	const catMenuIdx = getCustomMenuIndex(categoryId);
	const menuCat = catMenuIdx >= 0 ? (subConfig.customMenu || [])[catMenuIdx] : null;

	if (data.hasSubTabs) {
		const config = subConfig;
		const allPrimaryKeys = Object.keys(data.items);
		const primaryKeys = allPrimaryKeys.filter((key) => _isTabVisibleForActor(menuCat, key, actorId, actorType));
		if (!ActionMenu.activeTab || !primaryKeys.includes(String(ActionMenu.activeTab))) {
			ActionMenu.activeTab = primaryKeys.length > 0 ? primaryKeys[0] : null;
		}

		let sidebarHtml = "";
		const sideTabLayersHtml = isImageTheme ? buildAMElementLayersHtml(subConfig, "amSideTab") : "";
		primaryKeys.forEach((key) => {
			const label = data.tabLabels[key] || key;
			const tooltipText =
				data.tabTooltips && data.tabTooltips[key]
					? data.tabTooltips[key]
					: label;
			const activeClass =
				String(ActionMenu.activeTab) === String(key) ? "active" : "";

			sidebarHtml += `
                    <div class="ib-side-tab ${activeClass}" 
                         onclick="ActionHUD.actionMenu.switchTab('${categoryId}', '${key}')"
                         oncontextmenu="event.preventDefault(); ActionHUD.actionMenu.editSpellSlots('${categoryId}', '${key}')"
                         data-tooltip="${tooltipText}" data-tooltip-direction="RIGHT"
                         ${sideTabStyle ? `style="${sideTabStyle}"` : ""}>
                        ${sideTabLayersHtml}
                        <span ${sideTabTextStyle ? `style="${sideTabTextStyle}"` : ""}>${label}</span>
                    </div>`;
		});

		let levelTabsHtml = "";
		let currentItems = [];

		if (ActionMenu.activeTab) {
			const subData = data.items[ActionMenu.activeTab];
			if (subData) {
				const subKeys = Object.keys(subData).sort(
					(a, b) => parseInt(a) - parseInt(b),
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
						levelTabsHtml += `<div class="ib-tab-btn sub-tab ${activeClass}" onclick="ActionHUD.actionMenu.switchSubTab('${categoryId}', '${subKey}')" ${tabStyle ? `style="${tabStyle}"` : ""}>${tabBgHtml}<span ${tabTextStyle ? `style="${tabTextStyle}"` : ""}>${label}</span></div>`;
					});
				}
			}
		}

		const listHtml = buildListItems(ActionMenu, currentItems);
		const tabsContainer = levelTabsHtml
			? `<div class="ib-magic-tabs custom-scrollbar secondary">${levelTabsHtml}</div>`
			: "";

		if (!isNewWrapper) {
			const shell = wrapper.children(".ib-sub-menu.layout-sidebar").first();
			if (shell.length) {
				const newSidebarHtml = `${sidebarBgHtml}${sidebarHtml}`;
				if (shell.data("last-sidebar-html") !== newSidebarHtml) {
					shell.find(".ib-sidebar-panel").first().html(newSidebarHtml);
					shell.data("last-sidebar-html", newSidebarHtml);
				}

				const newMenuHeaderHtml = `${menuHeaderBgHtml}<span class="ib-font-hero text-xl" ${menuHeaderTextStyle ? `style="${menuHeaderTextStyle}"` : ""}>${game.i18n?.localize?.(data.title) || data.title}</span>`;
				if (shell.data("last-header-html") !== newMenuHeaderHtml) {
					shell.find(".ib-menu-header").first().html(newMenuHeaderHtml);
					shell.data("last-header-html", newMenuHeaderHtml);
				}

				if (shell.data("last-search-html") !== searchHtml) {
					shell.find(".ib-search-container").first().replaceWith(searchHtml);
					shell.data("last-search-html", searchHtml);
				}

				if (shell.data("last-tabs-html") !== tabsContainer) {
					shell.find("#ib-tabs-container").first().html(tabsContainer);
					shell.data("last-tabs-html", tabsContainer);
				}

				if (shell.data("last-list-html") !== listHtml) {
					const scrollArea = shell.find(".ib-scroll-area").first()[0];
					if (scrollArea) updateHtmlMorph(scrollArea, listHtml);
					shell.data("last-list-html", listHtml);
				}

				adjustSubMenuPosition(ActionMenu);
				return;
			}
		}

		const html = `
                <div class="ib-sub-menu theme-${data.theme || subConfig?.theme || "rift"} layout-sidebar">
                    ${subMenuLayersHtml}
                    <div class="ib-sidebar-panel custom-scrollbar" ${sidebarStyle ? `style="${sidebarStyle}"` : ""}>
                        ${sidebarBgHtml}
                        ${sidebarHtml}
                    </div>
                    <div class="ib-main-panel">
                        <div class="ib-menu-header" ${menuHeaderStyle ? `style="${menuHeaderStyle}"` : ""}>
                            ${menuHeaderBgHtml}
                            <span class="ib-font-hero text-xl" ${menuHeaderTextStyle ? `style="${menuHeaderTextStyle}"` : ""}>${game.i18n?.localize?.(data.title) || data.title}</span>
                        </div>
                        ${searchHtml}
                        <div id="ib-tabs-container">${tabsContainer}</div>
                        <div class="ib-scroll-area custom-scrollbar">
                            ${listHtml}
                        </div>
                    </div>
                </div>`;

		wrapper.html(html);

		const newShell = wrapper.children(".ib-sub-menu").first();
		newShell.data("last-sidebar-html", `${sidebarBgHtml}${sidebarHtml}`);
		newShell.data("last-header-html", `${menuHeaderBgHtml}<span class="ib-font-hero text-xl" ${menuHeaderTextStyle ? `style="${menuHeaderTextStyle}"` : ""}>${game.i18n?.localize?.(data.title) || data.title}</span>`);
		newShell.data("last-search-html", searchHtml);
		newShell.data("last-tabs-html", tabsContainer);
		newShell.data("last-list-html", listHtml);

	} else {
		let headerHtml = "";
		let listHtml = "";

		if (data.hasTabs) {
			const keys = Object.keys(data.items).filter((key) => _isTabVisibleForActor(menuCat, key, actorId, actorType));
			if (!ActionMenu.activeTab || !keys.includes(String(ActionMenu.activeTab)))
				ActionMenu.activeTab = keys[0] || null;

			let tabsHtml = "";
			keys.forEach((key) => {
				const label = data.tabLabels[key] || key;
				const activeClass =
					String(ActionMenu.activeTab) === String(key) ? "active" : "";
				tabsHtml += `<div class="ib-tab-btn ${activeClass}" onclick="ActionHUD.actionMenu.switchTab('${categoryId}', '${key}')" ${tabStyle ? `style="${tabStyle}"` : ""}>${tabBgHtml}<span ${tabTextStyle ? `style="${tabTextStyle}"` : ""}>${label}</span></div>`;
			});
			headerHtml += `<div class="ib-magic-tabs custom-scrollbar">${tabsHtml}</div>`;
			listHtml = buildListItems(
				ActionMenu,
				ActionMenu.activeTab ? data.items[ActionMenu.activeTab] : [],
			);
		} else {
			listHtml = buildListItems(ActionMenu, data.items);
		}

		if (!isNewWrapper) {
			const shell = wrapper.children(".ib-sub-menu").not(".layout-sidebar").first();
			if (shell.length) {
				const newMenuHeaderHtml = `${menuHeaderBgHtml}<span class="ib-font-hero text-xl" ${menuHeaderTextStyle ? `style="${menuHeaderTextStyle}"` : ""}>${game.i18n?.localize?.(data.title) || data.title}</span>`;
				if (shell.data("last-header-html") !== newMenuHeaderHtml) {
					shell.find(".ib-menu-header").first().html(newMenuHeaderHtml);
					shell.data("last-header-html", newMenuHeaderHtml);
				}

				if (shell.data("last-search-html") !== searchHtml) {
					shell.find(".ib-search-container").first().replaceWith(searchHtml);
					shell.data("last-search-html", searchHtml);
				}

				if (shell.data("last-tabs-html") !== headerHtml) {
					shell.find("#ib-tabs-container").first().html(headerHtml);
					shell.data("last-tabs-html", headerHtml);
				}

				if (shell.data("last-list-html") !== listHtml) {
					const scrollArea = shell.find(".ib-scroll-area").first()[0];
					if (scrollArea) updateHtmlMorph(scrollArea, listHtml);
					shell.data("last-list-html", listHtml);
				}

				adjustSubMenuPosition(ActionMenu);
				return;
			}
		}

		const html = `
                <div class="ib-sub-menu theme-${data.theme || subConfig?.theme || "rift"}">
                    ${subMenuLayersHtml}
                    <div class="ib-menu-header" ${menuHeaderStyle ? `style="${menuHeaderStyle}"` : ""}>
                        ${menuHeaderBgHtml}
                        <span class="ib-font-hero text-xl" ${menuHeaderTextStyle ? `style="${menuHeaderTextStyle}"` : ""}>${game.i18n?.localize?.(data.title) || data.title}</span>
                    </div>
                    ${searchHtml}
                    <div id="ib-tabs-container">${headerHtml}</div>
                    <div class="ib-scroll-area custom-scrollbar" style="max-height: 300px;">
                        ${listHtml}
                    </div>
                </div>
            `;
		wrapper.html(html);

		const newShell = wrapper.children(".ib-sub-menu").first();
		newShell.data("last-header-html", `${menuHeaderBgHtml}<span class="ib-font-hero text-xl" ${menuHeaderTextStyle ? `style="${menuHeaderTextStyle}"` : ""}>${game.i18n?.localize?.(data.title) || data.title}</span>`);
		newShell.data("last-search-html", searchHtml);
		newShell.data("last-tabs-html", headerHtml);
		newShell.data("last-list-html", listHtml);
	}

	adjustSubMenuPosition(ActionMenu);
};
