import { getSnapTargets, applySnap, showSnapGuide, removeSnapGuide } from "../../utils/snap.js";
import { MODULE_ID } from "../../constants.js";

export const toggleEditMode = (ActionMenu, enable) => {
	const root = document.getElementById(ActionMenu.ROOT_ID);
	if (!root) return;

	if (enable) {
		root.classList.add("edit-mode");
		enableDrag(ActionMenu, root);
	} else {
		root.classList.remove("edit-mode");
		root.onmousedown = null;
		root.style.cursor = "";
	}
};

export const enableDrag = (ActionMenu, element) => {
	let isDragging = false;
	let startX, startY;
	let startLeftPx, startTopPx;
	let elementWidth, elementHeight;
	let snapTargets;

	element.onmousedown = (e) => {
		if (e.button !== 0) return;
		e.preventDefault();
		e.stopPropagation();

		isDragging = true;
		startX = e.clientX;
		startY = e.clientY;

		const rect = element.getBoundingClientRect();
		startLeftPx = rect.left;
		startTopPx = rect.top;
		elementWidth = rect.width;
		elementHeight = rect.height;

		snapTargets = null;
		element.style.cursor = "grabbing";

		const onMouseMove = (moveEvent) => {
			if (!isDragging) return;
			const dx = moveEvent.clientX - startX;
			const dy = moveEvent.clientY - startY;

			const rawLeft = startLeftPx + dx;
			const rawTop = startTopPx + dy;

			const virtualRect = {
				left: rawLeft,
				top: rawTop,
				right: rawLeft + elementWidth,
				bottom: rawTop + elementHeight,
				width: elementWidth,
				height: elementHeight,
			};

			const snapEnabled = window.ActionHUD?.snapEnabled !== false;
			let snapped = {
				left: rawLeft,
				top: rawTop,
				snappedX: null,
				snappedY: null,
			};

			if (snapEnabled) {
				snapTargets = snapTargets ?? getSnapTargets();
				snapped = applySnap(virtualRect, snapTargets);
			} else {
				snapTargets = null;
				removeSnapGuide();
			}

			const zoom = parseFloat(element.style.zoom) || 1;
			element.style.left = `${snapped.left / zoom}px`;
			element.style.top = `${snapped.top / zoom}px`;
			element.style.right = "auto";
			element.style.bottom = "auto";

			if (snapEnabled) {
				showSnapGuide(snapped.snappedX, snapped.snappedY);
			}
		};

		const onMouseUp = () => {
			if (!isDragging) return;
			isDragging = false;
			element.style.cursor = "grab";

			removeSnapGuide();

			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		};

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	};
};

export const enableLongPressDrag = (ActionMenu, element) => {
	const LONG_PRESS_MS = 400;
	let pressTimer = null;
	let startX, startY;
	const MOVE_THRESHOLD = 5;

	const onPointerDown = (e) => {
		if (e.button !== 0) return;
		if (window.ActionHUD?.isEditMode) return;
		if (e.target?.closest?.(".ib-quick-slot")) return;

		startX = e.clientX;
		startY = e.clientY;

		pressTimer = setTimeout(() => {
			pressTimer = null;
			beginDrag(e);
		}, LONG_PRESS_MS);

		const onEarlyMove = (moveEvt) => {
			const dx = Math.abs(moveEvt.clientX - startX);
			const dy = Math.abs(moveEvt.clientY - startY);
			if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
				clearTimeout(pressTimer);
				pressTimer = null;
				document.removeEventListener("pointermove", onEarlyMove);
				document.removeEventListener("pointerup", onEarlyUp);
			}
		};
		const onEarlyUp = () => {
			clearTimeout(pressTimer);
			pressTimer = null;
			document.removeEventListener("pointermove", onEarlyMove);
			document.removeEventListener("pointerup", onEarlyUp);
		};

		document.addEventListener("pointermove", onEarlyMove);
		document.addEventListener("pointerup", onEarlyUp);
	};

	const beginDrag = (initEvent) => {
		let isDragging = true;
		const rect = element.getBoundingClientRect();
		let currentLeft = rect.left;
		let currentTop = rect.top;
		const elementWidth = rect.width;
		const elementHeight = rect.height;
		const dragStartX = initEvent.clientX;
		const dragStartY = initEvent.clientY;

		let snapTargets;

		element.classList.add("long-press-dragging");
		element.style.cursor = "grabbing";

		const onDragMove = (moveEvt) => {
			if (!isDragging) return;
			moveEvt.preventDefault();
			moveEvt.stopPropagation();

			const dx = moveEvt.clientX - dragStartX;
			const dy = moveEvt.clientY - dragStartY;
			const rawLeft = currentLeft + dx;
			const rawTop = currentTop + dy;

			const virtualRect = {
				left: rawLeft,
				top: rawTop,
				right: rawLeft + elementWidth,
				bottom: rawTop + elementHeight,
				width: elementWidth,
				height: elementHeight,
			};
			const snapEnabled = window.ActionHUD?.snapEnabled !== false;
			let snapped = {
				left: rawLeft,
				top: rawTop,
				snappedX: null,
				snappedY: null,
			};

			if (snapEnabled) {
				snapTargets = snapTargets ?? getSnapTargets();
				snapped = applySnap(virtualRect, snapTargets);
			} else {
				snapTargets = null;
				removeSnapGuide();
			}

			const zoom = parseFloat(element.style.zoom) || 1;
			element.style.left = `${snapped.left / zoom}px`;
			element.style.top = `${snapped.top / zoom}px`;
			element.style.right = "auto";
			element.style.bottom = "auto";

			if (snapEnabled) {
				showSnapGuide(snapped.snappedX, snapped.snappedY);
			}
		};

		const onDragEnd = () => {
			if (!isDragging) return;
			isDragging = false;

			element.classList.remove("long-press-dragging");
			element.style.cursor = "";
			removeSnapGuide();

			document.removeEventListener("pointermove", onDragMove);
			document.removeEventListener("pointerup", onDragEnd);

			saveDragPosition(ActionMenu, element);
		};

		document.addEventListener("pointermove", onDragMove);
		document.addEventListener("pointerup", onDragEnd);
	};

	element.addEventListener("pointerdown", onPointerDown);
};

const saveDragPosition = async (ActionMenu, element) => {
	const rect = element.getBoundingClientRect();
	const winW = window.innerWidth;
	const winH = window.innerHeight;

	const distL = rect.left;
	const distR = winW - rect.right;
	const distT = rect.top;
	const distB = winH - rect.bottom;

	const newPos = {
		anchorX: distL <= distR ? "left" : "right",
		anchorY: distT <= distB ? "top" : "bottom",
		offsetX: Math.round(distL <= distR ? distL : distR),
		offsetY: Math.round(distT <= distB ? distT : distB),
	};

	if (game.user.isGM) {
		const config = foundry.utils.deepClone(
			game.settings.get(MODULE_ID, "configuration") || {}
		);
		config.actionMenuPos = newPos;
		await game.settings.set(MODULE_ID, "configuration", config);
	}

	const clientPos = foundry.utils.deepClone(
		game.settings.get(MODULE_ID, "clientPositions") || {}
	);
	clientPos.actionMenuPos = newPos;
	await game.settings.set(MODULE_ID, "clientPositions", clientPos);
};

let saveScaleTimeout = null;
let scaleIndicatorTimeout = null;

export function showScaleIndicator(ActionMenu, scale, isReset = false) {
	const root = document.getElementById(ActionMenu.ROOT_ID);
	if (!root) return;

	let indicator = document.getElementById("niks-scale-indicator");
	if (!indicator) {
		indicator = document.createElement("div");
		indicator.id = "niks-scale-indicator";
		root.appendChild(indicator);
	}

	const pct = Math.round(scale * 100);
	indicator.textContent = isReset ? `Scale: ${pct}% (Reset)` : `Scale: ${pct}%`;
	indicator.classList.add("visible");

	clearTimeout(scaleIndicatorTimeout);
	scaleIndicatorTimeout = setTimeout(() => {
		indicator.classList.remove("visible");
	}, 1200);
}

export function applyLiveHudScale(ActionMenu, newBaseScale) {
	const root = document.getElementById(ActionMenu.ROOT_ID);
	if (!root) return;

	const config = game.settings.get(MODULE_ID, "configuration") || {};
	const clientPos = game.settings.get(MODULE_ID, "clientPositions") || {};
	const rawPos = clientPos.actionMenuPos || config.actionMenuPos || { anchorX: "right", anchorY: "bottom", offsetX: 40, offsetY: 40 };

	const responsiveEnabled = config.responsiveEnabled ?? true;
	const baseWidth = config.responsiveBaseWidth ?? 1920;
	const baseHeight = config.responsiveBaseHeight ?? 1080;
	const scaleMin = config.responsiveScaleMin ?? 0.7;
	const scaleMax = config.responsiveScaleMax ?? 1.3;
	const widthScale = baseWidth ? window.innerWidth / baseWidth : 1.0;
	const heightScale = baseHeight ? window.innerHeight / baseHeight : 1.0;
	const rawAutoScale = Math.min(widthScale, heightScale);
	const autoScale = responsiveEnabled ? Math.min(scaleMax, Math.max(scaleMin, rawAutoScale)) : 1.0;
	const effectiveScale = newBaseScale * autoScale;

	const isAnchorBased = rawPos.anchorX !== undefined;
	const anchor = isAnchorBased
		? { anchorX: rawPos.anchorX, anchorY: rawPos.anchorY, offsetX: rawPos.offsetX, offsetY: rawPos.offsetY }
		: {
			anchorX: "left",
			anchorY: "top",
			offsetX: Math.min(rawPos.left ?? 1200, Math.max(20, window.innerWidth - 260)),
			offsetY: Math.min(rawPos.top ?? 800, Math.max(20, window.innerHeight - 300)),
		};

	let posStyle = "";
	if (anchor.anchorX === "right") {
		posStyle += `right: ${anchor.offsetX / effectiveScale}px; left: auto; `;
	} else {
		posStyle += `left: ${anchor.offsetX / effectiveScale}px; right: auto; `;
	}
	if (anchor.anchorY === "bottom") {
		posStyle += `bottom: ${anchor.offsetY / effectiveScale}px; top: auto; `;
	} else {
		posStyle += `top: ${anchor.offsetY / effectiveScale}px; bottom: auto; `;
	}

	const fontStyle = config.actionMenuFont ? `--am-font-family: '${config.actionMenuFont}'; ` : "";

	root.setAttribute(
		"style",
		`${posStyle}zoom: ${effectiveScale}; --am-base-scale: ${newBaseScale}; --am-auto-scale: ${autoScale}; ${fontStyle}`
	);
}

export function setHudScale(ActionMenu, newBaseScale, isReset = false) {
	const clampedScale = Math.max(0.5, Math.min(2.5, newBaseScale));

	applyLiveHudScale(ActionMenu, clampedScale);
	showScaleIndicator(ActionMenu, clampedScale, isReset);

	clearTimeout(saveScaleTimeout);
	saveScaleTimeout = setTimeout(async () => {
		const persistentClientPos = foundry.utils.deepClone(
			game.settings.get(MODULE_ID, "clientPositions") || {}
		);
		persistentClientPos.actionMenuScale = Math.round(clampedScale * 20) / 20;
		await game.settings.set(MODULE_ID, "clientPositions", persistentClientPos);
	}, 300);
}

export function attachWheelResize(ActionMenu) {
	const root = document.getElementById(ActionMenu.ROOT_ID);
	if (!root || root._wheelResizeAttached) return;
	root._wheelResizeAttached = true;

	root.addEventListener(
		"wheel",
		(event) => {
			const wheelResizeEnabled = game.settings.get(MODULE_ID, "wheelResize");
			if (!wheelResizeEnabled) return;

			if (event.ctrlKey || event.altKey || event.metaKey) {
				event.preventDefault();
				event.stopPropagation();

				const config = game.settings.get(MODULE_ID, "configuration") || {};
				const clientPos = game.settings.get(MODULE_ID, "clientPositions") || {};
				const currentScale = clientPos.actionMenuScale ?? config.actionMenuScale ?? 1.0;

				const delta = event.deltaY < 0 ? 0.05 : -0.05;
				const newScale = Math.max(0.5, Math.min(2.5, Math.round((currentScale + delta) * 20) / 20));
				setHudScale(ActionMenu, newScale, false);
			}
		},
		{ passive: false }
	);

	root.addEventListener("dblclick", (event) => {
		const wheelResizeEnabled = game.settings.get(MODULE_ID, "wheelResize");
		if (!wheelResizeEnabled) return;

		const target = event.target;
		const isHeaderOrTopStack = target.closest(".ib-top-stack, .ib-identity-header, .ib-identity-name, .ib-identity-img-box");

		if (isHeaderOrTopStack && (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey)) {
			event.preventDefault();
			event.stopPropagation();
			setHudScale(ActionMenu, 1.0, true);
		}
	});
}

export function attachCornerResize(ActionMenu) {
	const root = document.getElementById(ActionMenu.ROOT_ID);
	if (!root || root._cornerResizeAttached) return;
	root._cornerResizeAttached = true;

	let handle = document.getElementById("niks-resize-handle");
	if (!handle) {
		handle = document.createElement("div");
		handle.id = "niks-resize-handle";
		handle.title = "Drag to resize HUD";
		handle.innerHTML = `
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M12 2L2 12M12 6.5L6.5 12M12 11L11 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
			</svg>
		`;
		root.appendChild(handle);
	}

	handle.addEventListener("pointerdown", (e) => {
		const wheelResizeEnabled = game.settings.get(MODULE_ID, "wheelResize");
		if (!wheelResizeEnabled) return;

		e.preventDefault();
		e.stopPropagation();

		const config = game.settings.get(MODULE_ID, "configuration") || {};
		const clientPos = game.settings.get(MODULE_ID, "clientPositions") || {};
		const startScale = clientPos.actionMenuScale ?? config.actionMenuScale ?? 1.0;

		const rect = root.getBoundingClientRect();
		const anchorX = root.dataset.anchorX || "left";
		const anchorY = root.dataset.anchorY || "top";

		const originX = anchorX === "right" ? rect.right : rect.left;
		const originY = anchorY === "bottom" ? rect.bottom : rect.top;

		const initialDist = Math.hypot(e.clientX - originX, e.clientY - originY) || 1;

		handle.classList.add("is-resizing");
		root.classList.add("is-resizing");
		const resizeCursor = anchorX === "right" ? "nesw-resize" : "nwse-resize";
		document.body.style.cursor = resizeCursor;

		let currentNewScale = startScale;

		const onPointerMove = (moveEvent) => {
			moveEvent.preventDefault();
			const currentDist = Math.hypot(moveEvent.clientX - originX, moveEvent.clientY - originY);
			const scaleRatio = currentDist / initialDist;
			currentNewScale = Math.max(0.5, Math.min(2.5, startScale * scaleRatio));

			applyLiveHudScale(ActionMenu, currentNewScale);
			showScaleIndicator(ActionMenu, currentNewScale, false);
		};

		const onPointerUp = (upEvent) => {
			upEvent.preventDefault();
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
			window.removeEventListener("pointercancel", onPointerUp);

			handle.classList.remove("is-resizing");
			root.classList.remove("is-resizing");
			document.body.style.cursor = "";

			const finalScale = Math.round(currentNewScale * 20) / 20;
			setHudScale(ActionMenu, finalScale, false);
		};

		window.addEventListener("pointermove", onPointerMove, { passive: false });
		window.addEventListener("pointerup", onPointerUp);
		window.addEventListener("pointercancel", onPointerUp);
	});
}

export function attachDragObserver(ActionMenu) {
	const root = document.getElementById(ActionMenu.ROOT_ID);
	if (!root || root._dragObserverAttached) return;

	root._dragObserverAttached = true;
	const observer = new MutationObserver((mutations) => {
		for (const m of mutations) {
			if (m.attributeName === "class" && m.target.classList.contains("long-press-dragging")) {
				const subContainer = document.getElementById(ActionMenu.SUB_ID);
				if (subContainer && subContainer.classList.contains("active")) {
					subContainer.classList.remove("active");
					ActionMenu.hideTooltip(true);
				}
				break;
			}
		}
	});
	observer.observe(root, { attributes: true, attributeFilter: ["class"] });
}

export const previewUpdate = (ActionMenu, data) => {
	const root = document.getElementById(ActionMenu.ROOT_ID);
	if (!root) return;

	const zoom = parseFloat(root.style.zoom) || 1;
	if (data.anchorX !== undefined && data.offsetX !== undefined) {
		if (data.anchorX === "right") {
			root.style.right = `${data.offsetX / zoom}px`;
			root.style.left = "auto";
		} else {
			root.style.left = `${data.offsetX / zoom}px`;
			root.style.right = "auto";
		}
		root.dataset.anchorX = data.anchorX;
	}
	if (data.anchorY !== undefined && data.offsetY !== undefined) {
		if (data.anchorY === "bottom") {
			root.style.bottom = `${data.offsetY / zoom}px`;
			root.style.top = "auto";
		} else {
			root.style.top = `${data.offsetY / zoom}px`;
			root.style.bottom = "auto";
		}
		root.dataset.anchorY = data.anchorY;
	}
	if (data.scale !== undefined) root.style.zoom = data.scale;
};

const AM_ELEMENT_MAP = [
	{ key: "amButton",     selector: ".ib-action-btn", multi: true },
	{ key: "amMenuHeader", selector: ".ib-menu-header", multi: false },
	{ key: "amSidebar",    selector: ".ib-sidebar-panel", multi: false },
	{ key: "amTab",        selector: ".ib-tab-btn", multi: true },
	{ key: "amQuickSlot",  selector: ".ib-quick-slot-container", multi: false },
	{ key: "amIdentity",   selector: ".ib-identity-header", multi: false },
	{ key: "amPortrait",   selector: ".ib-identity-img-box", multi: false },
	{ key: "amSideTab",    selector: ".ib-side-tab", multi: true },
	{ key: "amListItem",   selector: ".ib-list-item", multi: true },
];

const AM_TEXT_CHILD_MAP = {
	amButton: ".ib-btn-content",
	amMenuHeader: "span.ib-font-hero",
	amTab: "span",
	amSideTab: "span",
	amListItem: ".ib-item-content",
	amIdentity: ".ib-identity-text",
};

const _buildLayerTransform = (layer) =>
	`translate(-50%, -50%) scale(${layer.scale || 1}) translate(${layer.x || 0}px, ${layer.y || 0}px) rotate(${layer.rotation || 0}deg)`;

const _updateLayerContainer = (parent, layers) => {
	if (!parent) return;
	let container = parent.querySelector(":scope > .ib-am-layers");

	if (!layers || layers.length === 0) {
		if (container) container.innerHTML = "";
		return;
	}

	if (!container) {
		container = document.createElement("div");
		container.className = "ib-am-layers";
		container.style.cssText = "position:absolute; inset:0; pointer-events:none;";
		parent.insertBefore(container, parent.firstChild);
	}

	const html = layers.map((layer) => {
		if (!layer.src) return "";
		const t = _buildLayerTransform(layer);
		const w = Number(layer.width) || 0;
		const h = Number(layer.height) || 0;
		const size = (w && h) ? `width:${w}px; height:${h}px;` : w ? `width:${w}px; height:auto;` : h ? `width:auto; height:${h}px;` : "";
		return `<img src="${layer.src}" style="position:absolute; top:50%; left:50%; z-index:${layer.zIndex || 10}; ${size} transform:${t}; opacity:${layer.opacity ?? 1}; mix-blend-mode:${layer.blend || "normal"}; pointer-events:none;">`;
	}).join("");
	container.innerHTML = html;
};

export const previewAMImages = (ActionMenu, data) => {
	const savedConfig = game.settings?.get?.(MODULE_ID, "configuration") || {};
	const theme = data.theme ?? savedConfig.theme ?? "rift";
	const isImageTheme = theme === "image";

	const menu = document.getElementById(ActionMenu.ID);
	const sub = document.getElementById(ActionMenu.SUB_ID);
	const emphasizeFirstButton = data.actionMenuEmphasizeFirstButton
		?? savedConfig.actionMenuEmphasizeFirstButton
		?? true;
	menu?.classList.toggle("no-first-button-emphasis", !emphasizeFirstButton);

	if (!isImageTheme) {
		if (menu) {
			const lc = menu.querySelector(":scope > .ib-am-layers");
			if (lc) lc.innerHTML = "";
		}
		if (sub) {
			const subMenu = sub.querySelector(".ib-sub-menu");
			if (subMenu) {
				const lc = subMenu.querySelector(":scope > .ib-am-layers");
				if (lc) lc.innerHTML = "";
			}
		}
		AM_ELEMENT_MAP.forEach(({ selector }) => {
			document.querySelectorAll(`#${ActionMenu.ROOT_ID} ${selector} > .ib-am-layers`).forEach((el) => { el.innerHTML = ""; });
		});
		return;
	}

	if (data.amMenuLayers !== undefined) {
		_updateLayerContainer(menu, data.amMenuLayers);
	}
	if (data.amSubMenuLayers !== undefined) {
		const subMenu = sub?.querySelector(".ib-sub-menu");
		_updateLayerContainer(subMenu, data.amSubMenuLayers);
	}

	const root = document.getElementById(ActionMenu.ROOT_ID);
	if (!root) return;

	AM_ELEMENT_MAP.forEach(({ key, selector, multi }) => {
		const layerKey = `${key}Layers`;
		const colorKey = `${key}Color`;
		const widthKey = `${key}Width`;
		const heightKey = `${key}Height`;

		const textChildSel = AM_TEXT_CHILD_MAP[key];
		const tx = Number(data[`${key}TextX`]) || 0;
		const ty = Number(data[`${key}TextY`]) || 0;
		const ts = Number(data[`${key}TextScale`]) || 1;
		const tr = Number(data[`${key}TextRotation`]) || 0;
		const hasTextTransform = textChildSel && (tx || ty || ts !== 1 || tr);
		const textTransformValue = hasTextTransform
			? `translate(${tx}px, ${ty}px) scale(${ts}) rotate(${tr}deg)`
			: "";

		const applyProps = (el) => {
			if (!el) return;
			const layers = data[layerKey];
			if (layers !== undefined) _updateLayerContainer(el, layers);
			if (data[colorKey] !== undefined) el.style.color = data[colorKey] || "";

			let w = data[widthKey];
			let h = data[heightKey];
			if (layers && layers.length > 0) {
				const ref = layers[0];
				if (!w && ref.width) w = ref.width;
				if (!h && ref.height) h = ref.height;
			}
			el.style.width = w ? `${w}px` : "";
			el.style.height = h ? `${h}px` : "";
			el.style.transform = "";

			if (textChildSel) {
				const textEls = el.querySelectorAll(textChildSel);
				textEls.forEach((te) => { te.style.transform = textTransformValue; });
			}
		};

		if (multi) {
			root.querySelectorAll(selector).forEach(applyProps);
		} else {
			applyProps(root.querySelector(selector));
		}
	});

	if (Array.isArray(data.perButtonFrames)) {
		data.perButtonFrames.forEach((frame, cIdx) => {
			if (!frame.buttonFrameLayers || frame.buttonFrameLayers.length === 0) return;
			const btn = root.querySelector(`.btn-custom-${cIdx}`);
			if (!btn) return;
			_updateLayerContainer(btn, frame.buttonFrameLayers);
			if (frame.buttonFrameColor) btn.style.color = frame.buttonFrameColor;
			const ref = frame.buttonFrameLayers[0];
			const w = Number(ref.width) || 0;
			const h = Number(ref.height) || 0;
			btn.style.width = w ? `${w}px` : "";
			btn.style.height = h ? `${h}px` : "";
			btn.style.transform = "";
		});
	}
};
