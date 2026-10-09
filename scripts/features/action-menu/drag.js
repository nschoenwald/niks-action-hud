import { MODULE_ID, DOM_IDS } from "../../constants.js";
import { resolveSafeTokenImage } from "./image-fallback.js";
import { getDefaultActionMenuPos } from "./position.js";

let saveScaleTimeout = null;
let scaleIndicatorTimeout = null;

export function toggleEditMode(ActionMenu, enable) {
	const root = document.getElementById(ActionMenu.ROOT_ID);
	if (!root) return;

	if (enable) {
		root.classList.add("edit-mode");
		enableDrag(ActionMenu, root);
	} else {
		root.classList.remove("edit-mode");
		root.onpointerdown = null;
		root.style.cursor = "";
	}
}

export function enableDrag(ActionMenu, element) {
	let isDragging = false;
	let startX = 0;
	let startY = 0;
	let startLeftPx = 0;
	let startTopPx = 0;

	element.onpointerdown = (e) => {
		if (e.button !== 0) return;
		if (e.target.closest(".nah-resize-handle, #nah-resize-handle, #niks-resize-handle")) return;
		e.preventDefault();
		e.stopPropagation();

		isDragging = true;
		startX = e.clientX;
		startY = e.clientY;

		const rect = element.getBoundingClientRect();
		startLeftPx = rect.left;
		startTopPx = rect.top;
		element.style.cursor = "grabbing";
		document.body.style.cursor = "grabbing";

		const onPointerMove = (moveEv) => {
			if (!isDragging) return;
			const dx = moveEv.clientX - startX;
			const dy = moveEv.clientY - startY;
			const zoom = parseFloat(element.style.zoom) || parseFloat(getComputedStyle(element).zoom) || 1;

			element.style.left = `${(startLeftPx + dx) / zoom}px`;
			element.style.top = `${(startTopPx + dy) / zoom}px`;
			element.style.right = "auto";
			element.style.bottom = "auto";
		};

		const onPointerUp = () => {
			if (!isDragging) return;
			isDragging = false;
			element.style.cursor = "";
			document.body.style.cursor = "";
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
			saveDragPosition(ActionMenu, element);
		};

		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);
	};
}

export function attachHeaderDrag(ActionMenu, root) {
	if (!root || root._headerDragAttached) return;
	root._headerDragAttached = true;

	root.addEventListener("pointerdown", (e) => {
		if (e.button !== 0) return;
		const header = e.target.closest(".nah-identity-header, .nah-top-stack");
		if (!header) return;
		if (e.target.closest(".nah-identity-img-box") && !root.classList.contains("is-placeholder")) return;
		if (e.target.closest(".nah-collapse-btn, .nah-end-turn-btn, .nah-quick-slot, button")) return;

		e.preventDefault();
		e.stopPropagation();

		const sub = document.getElementById(ActionMenu.SUB_ID);
		if (sub?.classList.contains("active")) {
			sub.classList.remove("active");
			root.classList.remove("has-active-submenu");
			ActionMenu.hideTooltip?.(true);
		}

		let isDragging = true;
		const startX = e.clientX;
		const startY = e.clientY;

		const rect = root.getBoundingClientRect();
		const startLeftPx = rect.left;
		const startTopPx = rect.top;
		header.style.cursor = "grabbing";
		document.body.style.cursor = "grabbing";

		const onPointerMove = (moveEv) => {
			if (!isDragging) return;
			const dx = moveEv.clientX - startX;
			const dy = moveEv.clientY - startY;
			const zoom = parseFloat(root.style.zoom) || parseFloat(getComputedStyle(root).zoom) || 1;

			root.style.left = `${(startLeftPx + dx) / zoom}px`;
			root.style.top = `${(startTopPx + dy) / zoom}px`;
			root.style.right = "auto";
			root.style.bottom = "auto";
		};

		const onPointerUp = () => {
			if (!isDragging) return;
			isDragging = false;
			header.style.cursor = "";
			document.body.style.cursor = "";
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
			window.removeEventListener("pointercancel", onPointerUp);
			saveDragPosition(ActionMenu, root);
		};

		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);
		window.addEventListener("pointercancel", onPointerUp);
	});
}

export function enableLongPressDrag(ActionMenu, element) {
	if (!element || element._longPressDragAttached) return;
	element._longPressDragAttached = true;

	const LONG_PRESS_MS = 300;
	let pressTimer = null;
	let startX = 0;
	let startY = 0;
	const MOVE_THRESHOLD = 6;

	const onPointerDown = (e) => {
		if (e.button !== 0) return;
		if (e.target.closest(".nah-quick-slot, .nah-resize-handle, #nah-resize-handle, #niks-resize-handle, .nah-collapse-btn, .nah-end-turn-btn")) return;
		if (e.target.closest(".nah-identity-img-box") && !element.classList.contains("is-placeholder")) return;

		// Immediate drag if Alt or Shift is held
		if (e.altKey || e.shiftKey) {
			e.preventDefault();
			e.stopPropagation();
			beginDrag(e);
			return;
		}

		// Immediate drag if clicking directly on menu background outside buttons
		if (e.target.id === ActionMenu.ID || e.target.classList.contains("nah-top-stack")) {
			e.preventDefault();
			e.stopPropagation();
			beginDrag(e);
			return;
		}

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
		const sub = document.getElementById(ActionMenu.SUB_ID);
		if (sub?.classList.contains("active")) {
			sub.classList.remove("active");
			element.classList.remove("has-active-submenu");
			ActionMenu.hideTooltip?.(true);
		}

		let isDragging = true;
		const rect = element.getBoundingClientRect();
		const startLeftPx = rect.left;
		const startTopPx = rect.top;
		const dragStartX = initEvent.clientX;
		const dragStartY = initEvent.clientY;

		element.classList.add("long-press-dragging");
		element.style.cursor = "grabbing";
		document.body.style.cursor = "grabbing";

		const onDragMove = (moveEvt) => {
			if (!isDragging) return;
			moveEvt.preventDefault();
			moveEvt.stopPropagation();

			const dx = moveEvt.clientX - dragStartX;
			const dy = moveEvt.clientY - dragStartY;
			const zoom = parseFloat(element.style.zoom) || parseFloat(getComputedStyle(element).zoom) || 1;

			element.style.left = `${(startLeftPx + dx) / zoom}px`;
			element.style.top = `${(startTopPx + dy) / zoom}px`;
			element.style.right = "auto";
			element.style.bottom = "auto";
		};

		const onDragEnd = () => {
			if (!isDragging) return;
			isDragging = false;

			element.classList.remove("long-press-dragging");
			element.style.cursor = "";
			document.body.style.cursor = "";

			document.removeEventListener("pointermove", onDragMove);
			document.removeEventListener("pointerup", onDragEnd);

			saveDragPosition(ActionMenu, element);
		};

		document.addEventListener("pointermove", onDragMove);
		document.addEventListener("pointerup", onDragEnd);
	};

	element.addEventListener("pointerdown", onPointerDown);
}

export async function saveDragPosition(ActionMenu, element) {
	if (!element) return;
	const rect = element.getBoundingClientRect();
	const winW = window.innerWidth;
	const winH = window.innerHeight;

	const distL = rect.left;
	const distR = winW - rect.right;
	const distT = rect.top;
	const distB = winH - rect.bottom;

	const anchorX = distL <= distR ? "left" : "right";
	const anchorY = distT <= distB ? "top" : "bottom";
	const offsetX = Math.round(anchorX === "left" ? distL : distR);
	const offsetY = Math.round(anchorY === "top" ? distT : distB);

	const newPos = {
		anchorX,
		anchorY,
		offsetX,
		offsetY,
	};

	element.dataset.anchorX = anchorX;
	element.dataset.anchorY = anchorY;

	const zoom = parseFloat(element.style.zoom) || 1;
	if (anchorX === "right") {
		element.style.right = `${offsetX / zoom}px`;
		element.style.left = "auto";
	} else {
		element.style.left = `${offsetX / zoom}px`;
		element.style.right = "auto";
	}
	if (anchorY === "bottom") {
		element.style.bottom = `${offsetY / zoom}px`;
		element.style.top = "auto";
	} else {
		element.style.top = `${offsetY / zoom}px`;
		element.style.bottom = "auto";
	}

	const clientPos = foundry.utils.deepClone(
		game.settings.get(MODULE_ID, "clientPositions") || {}
	);
	clientPos.actionMenuPos = newPos;
	await game.settings.set(MODULE_ID, "clientPositions", clientPos);

	if (game.user.isGM) {
		const config = foundry.utils.deepClone(
			game.settings.get(MODULE_ID, "configuration") || {}
		);
		config.actionMenuPos = newPos;
		await game.settings.set(MODULE_ID, "configuration", config);
	}
}

export function showScaleIndicator(ActionMenu, scale, isReset = false) {
	const root = document.getElementById(ActionMenu.ROOT_ID);
	if (!root) return;

	let indicator = document.getElementById("nah-scale-indicator") || document.getElementById("niks-scale-indicator");
	if (!indicator) {
		indicator = document.createElement("div");
		indicator.id = "nah-scale-indicator";
		indicator.className = "nah-scale-indicator";
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
	const rawAutoScale = Math.min(window.innerWidth / (baseWidth || 1920), window.innerHeight / (baseHeight || 1080));
	const autoScale = responsiveEnabled ? Math.min(scaleMax, Math.max(scaleMin, rawAutoScale)) : 1.0;
	const effectiveScale = newBaseScale * autoScale;

	const anchor = {
		anchorX: rawPos.anchorX || "left",
		anchorY: rawPos.anchorY || "bottom",
		offsetX: rawPos.offsetX ?? 240,
		offsetY: rawPos.offsetY ?? 20,
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

	const fontStyle = config.actionMenuFont ? `--nah-font-family: '${config.actionMenuFont}'; --am-font-family: '${config.actionMenuFont}'; ` : "";

	root.setAttribute(
		"style",
		`${posStyle}zoom: ${effectiveScale}; --am-scale: ${effectiveScale}; --nah-scale: ${effectiveScale}; --am-base-scale: ${newBaseScale}; --nah-base-scale: ${newBaseScale}; --am-auto-scale: ${autoScale}; ${fontStyle}`
	);
	root.dataset.anchorX = anchor.anchorX;
	root.dataset.anchorY = anchor.anchorY;
}

export function setHudScale(ActionMenu, newBaseScale, isReset = false) {
	const clamped = Math.max(0.5, Math.min(2.5, newBaseScale));
	applyLiveHudScale(ActionMenu, clamped);
	showScaleIndicator(ActionMenu, clamped, isReset);

	clearTimeout(saveScaleTimeout);
	saveScaleTimeout = setTimeout(async () => {
		const persistent = foundry.utils.deepClone(game.settings.get(MODULE_ID, "clientPositions") || {});
		persistent.actionMenuScale = Math.round(clamped * 20) / 20;
		await game.settings.set(MODULE_ID, "clientPositions", persistent);
	}, 200);
}

export function attachCornerResize(ActionMenu) {
	const root = document.getElementById(ActionMenu.ROOT_ID);
	if (!root) return;

	let handle = document.getElementById("nah-resize-handle") || document.getElementById("niks-resize-handle");
	if (!handle) {
		handle = document.createElement("div");
		handle.id = "nah-resize-handle";
		handle.className = "nah-resize-handle";
		handle.title = "Drag to resize Action HUD";
		handle.innerHTML = `
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M12 2L2 12M12 6.5L6.5 12M12 11L11 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
			</svg>
		`;
		root.appendChild(handle);
	}

	if (handle._listenerAttached) return;
	handle._listenerAttached = true;

	handle.addEventListener("dblclick", (e) => {
		e.preventDefault();
		e.stopPropagation();
		setHudScale(ActionMenu, 1.0, true);
	});

	handle.addEventListener("pointerdown", (e) => {
		if (e.button !== 0) return;
		e.preventDefault();
		e.stopPropagation();

		const config = game.settings.get(MODULE_ID, "configuration") || {};
		const clientPos = game.settings.get(MODULE_ID, "clientPositions") || {};
		const startScale = clientPos.actionMenuScale ?? config.actionMenuScale ?? 1.0;

		const rect = root.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		const initialDist = Math.hypot(e.clientX - centerX, e.clientY - centerY) || 1;

		handle.classList.add("is-resizing");
		root.classList.add("is-resizing");
		const anchorX = root.dataset.anchorX || "left";
		document.body.style.cursor = anchorX === "right" ? "nesw-resize" : "nwse-resize";

		let currentScale = startScale;

		const onMove = (moveEv) => {
			moveEv.preventDefault();
			const dist = Math.hypot(moveEv.clientX - centerX, moveEv.clientY - centerY);
			currentScale = Math.max(0.5, Math.min(2.5, startScale * (dist / initialDist)));
			applyLiveHudScale(ActionMenu, currentScale);
			showScaleIndicator(ActionMenu, currentScale, false);
		};

		const onUp = (upEv) => {
			upEv.preventDefault();
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
			window.removeEventListener("pointercancel", onUp);

			handle.classList.remove("is-resizing");
			root.classList.remove("is-resizing");
			document.body.style.cursor = "";

			const finalScale = Math.round(currentScale * 20) / 20;
			setHudScale(ActionMenu, finalScale, false);
		};

		window.addEventListener("pointermove", onMove, { passive: false });
		window.addEventListener("pointerup", onUp);
		window.addEventListener("pointercancel", onUp);
	});
}

export function attachDragObserver(ActionMenu) {
	const root = document.getElementById(ActionMenu.ROOT_ID);
	if (!root || root._dragObserverAttached) return;
	root._dragObserverAttached = true;

	const observer = new MutationObserver((mutations) => {
		for (const m of mutations) {
			if (m.attributeName === "class" && m.target.classList.contains("long-press-dragging")) {
				const sub = document.getElementById(ActionMenu.SUB_ID);
				if (sub?.classList.contains("active")) {
					sub.classList.remove("active");
					ActionMenu.hideTooltip(true);
				}
				break;
			}
		}
	});
	observer.observe(root, { attributes: true, attributeFilter: ["class"] });
}

export function previewUpdate(ActionMenu, data) {
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
		root.style.setProperty("--nah-scale", data.scale);
		root.style.setProperty("--am-scale", data.scale);
	}
	if (data.theme) {
		const themeClass = `theme-${data.theme}`;
		root.className = (root.className.replace(/\btheme-\S+/g, "").trim() + ` ${themeClass}`).trim();
		const sub = document.getElementById(ActionMenu.SUB_ID);
		if (sub) sub.className = (sub.className.replace(/\btheme-\S+/g, "").trim() + ` ${themeClass}`).trim();
		const tip = document.getElementById("nah-tooltip");
		if (tip) tip.className = (tip.className.replace(/\btheme-\S+/g, "").trim() + ` ${themeClass}`).trim();
	}
	if (data.font !== undefined) {
		const sub = document.getElementById(ActionMenu.SUB_ID);
		const tip = document.getElementById("nah-tooltip");
		if (data.font) {
			root.classList.add("nah-custom-font", "am-custom-font");
			root.style.setProperty("--nah-font-family", `'${data.font}'`);
			root.style.setProperty("--am-font-family", `'${data.font}'`);
			if (sub) {
				sub.classList.add("nah-custom-font", "am-custom-font");
				sub.style.setProperty("--nah-font-family", `'${data.font}'`);
			}
			if (tip) {
				tip.classList.add("nah-custom-font", "am-custom-font");
				tip.style.setProperty("--nah-font-family", `'${data.font}'`);
			}
		} else {
			root.classList.remove("nah-custom-font", "am-custom-font");
			root.style.removeProperty("--nah-font-family");
			root.style.removeProperty("--am-font-family");
			if (sub) {
				sub.classList.remove("nah-custom-font", "am-custom-font");
				sub.style.removeProperty("--nah-font-family");
			}
			if (tip) {
				tip.classList.remove("nah-custom-font", "am-custom-font");
				tip.style.removeProperty("--nah-font-family");
			}
		}
	}
	if (data.emphasizeFirst !== undefined) {
		const menu = document.getElementById(ActionMenu.ID);
		if (menu) menu.classList.toggle("no-first-button-emphasis", !data.emphasizeFirst);
	}
	if (data.useTokenImg !== undefined) {
		const imgBox = root.querySelector(".nah-identity-img-box");
		if (imgBox) {
			const actor = ActionMenu?.currentActor;
			if (!actor) return;
			const activeTokens = typeof actor.getActiveTokens === "function" ? actor.getActiveTokens() : [];
			const token = ActionMenu.currentToken || canvas.tokens?.controlled?.[0] || activeTokens[0];
			const { img, actorImg, subjectScale, defaultIcon } = resolveSafeTokenImage(actor, token, Boolean(data.useTokenImg));
			imgBox.style.setProperty("--token-subject-scale", subjectScale);
			const imgEl = imgBox.querySelector("img");
			if (imgEl) {
				imgEl.dataset.fallbackStep = "0";
				imgEl.src = img;
				imgEl.style.scale = subjectScale !== 1 ? subjectScale : "";
			}
		}
	}
}
