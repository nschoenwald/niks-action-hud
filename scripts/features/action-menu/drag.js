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

	const zoom = parseFloat(data.scale ?? root.style.zoom) || 1;
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
	if (data.scale !== undefined) {
		root.style.zoom = data.scale;
		root.style.setProperty("--am-scale", data.scale);
	}
	if (data.theme) {
		const themeClass = `theme-${data.theme}`;
		root.className = (root.className.replace(/\btheme-\S+/g, "").trim() + ` ${themeClass}`).trim();
		const sub = document.getElementById(ActionMenu.SUB_ID);
		if (sub) sub.className = (sub.className.replace(/\btheme-\S+/g, "").trim() + ` ${themeClass}`).trim();
		const tip = document.getElementById("ib-rich-tooltip");
		if (tip) tip.className = (tip.className.replace(/\btheme-\S+/g, "").trim() + ` ${themeClass}`).trim();
	}
	if (data.font !== undefined) {
		const sub = document.getElementById(ActionMenu.SUB_ID);
		const tip = document.getElementById("ib-rich-tooltip");
		if (data.font) {
			root.classList.add("am-custom-font");
			root.style.setProperty("--am-font-family", `'${data.font}'`);
			if (sub) {
				sub.classList.add("am-custom-font");
				sub.style.setProperty("--am-font-family", `'${data.font}'`);
			}
			if (tip) {
				tip.classList.add("am-custom-font");
				tip.style.setProperty("--am-font-family", `'${data.font}'`);
			}
		} else {
			root.classList.remove("am-custom-font");
			root.style.removeProperty("--am-font-family");
			if (sub) {
				sub.classList.remove("am-custom-font");
				sub.style.removeProperty("--am-font-family");
			}
			if (tip) {
				tip.classList.remove("am-custom-font");
				tip.style.removeProperty("--am-font-family");
			}
		}
	}
	if (data.emphasizeFirst !== undefined) {
		const menu = document.getElementById(ActionMenu.ID);
		if (menu) menu.classList.toggle("no-first-button-emphasis", !data.emphasizeFirst);
	}
	if (data.useTokenImg !== undefined) {
		const imgBox = root.querySelector(".ib-identity-img-box");
		if (imgBox) {
			const actor = ActionMenu.currentActor;
			const activeTokens = actor?.getActiveTokens ? actor.getActiveTokens() : [];
			const token = ActionMenu.currentToken
				|| canvas.tokens?.controlled?.[0]
				|| activeTokens[0]
				|| canvas.tokens?.placeables?.find((t) => t.actor?.id === actor?.id || t.document?.actorId === actor?.id);
			let img = actor?.img || "";
			let subjectScale = 1;
			if (data.useTokenImg && actor) {
				const tokenDoc = token?.document || (token?.schema ? token : null);
				const subjectTexture =
					tokenDoc?.ring?.subject?.texture ||
					token?.ring?.subject?.texture ||
					actor?.prototypeToken?.ring?.subject?.texture;
				const tokenTexture =
					tokenDoc?.texture?.src ||
					token?.texture?.src ||
					actor?.prototypeToken?.texture?.src;

				if (subjectTexture && typeof subjectTexture === "string" && subjectTexture.trim()) {
					img = subjectTexture.trim();
				} else if (tokenTexture && typeof tokenTexture === "string" && tokenTexture.trim()) {
					img = tokenTexture.trim();
				}

				const rawScale =
					tokenDoc?.ring?.subject?.scale ??
					token?.ring?.subject?.scale ??
					token?.ring?.scaleCorrection ??
					actor?.prototypeToken?.ring?.subject?.scale ??
					tokenDoc?.flags?.dnd5e?.tokenRing?.scaleCorrection ??
					token?.flags?.dnd5e?.tokenRing?.scaleCorrection ??
					actor?.prototypeToken?.flags?.dnd5e?.tokenRing?.scaleCorrection;

				const num = Number(rawScale);
				if (Number.isFinite(num) && num > 0) {
					subjectScale = num;
				}
			}
			imgBox.style.setProperty("--token-subject-scale", subjectScale);
			const imgEl = imgBox.querySelector("img");
			if (imgEl) {
				imgEl.src = img;
				imgEl.style.scale = subjectScale !== 1 ? subjectScale : "";
			}
		}
	}
};

