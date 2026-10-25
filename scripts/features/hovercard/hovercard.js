/**
 * Nik's Action HUD — Tooltip Engine
 * Manages rich item preview tooltips with Foundry V14 ProseMirror enrichment and viewport positioning.
 */

import { parseRef } from "../../core/action-ref.js";
import { readProfile } from "../../core/profile.js";
import { DOM_IDS } from "../../core/ids.js";
import { inwardSideFor } from "../dock/layout.js";

/** Delay before a card first appears, so casual pointer movement does not pop cards up. */
const OPEN_DELAY_MS = 200;
/** Delay when switching from a card on screen to the next row: short enough to feel instant, long enough to skip rows the pointer only crosses. */
const SWITCH_DELAY_MS = 70;

/** Markup supplied by a provider, passed through Foundry's HTML sanitizer. */
const safeHtml = (html) => foundry.utils.cleanHTML(String(html));

class HUDTooltipManager {
	constructor() {
		this.activeTimer = null;
		this.dismissTimer = null;
		this.isHoveringTooltip = false;
		this.anchorElement = null;
		// The row whose card is scheduled or being built, and the row whose card is on screen.
		this.pendingAnchor = null;
		this.shownAnchor = null;
		// The last row the provider had no card for; asked again only once the pointer reaches another row.
		this.emptyAnchor = null;
		this.suppressedUntil = 0;
		this.ticket = 0;
	}

	_getTooltipNode() {
		let el = document.getElementById(DOM_IDS.TOOLTIP);
		if (!el) {
			el = document.createElement("div");
			el.id = DOM_IDS.TOOLTIP;
			document.body.appendChild(el);
			el.addEventListener("pointerenter", () => {
				this.isHoveringTooltip = true;
				clearTimeout(this.dismissTimer);
			});
			el.addEventListener("pointerleave", () => {
				this.isHoveringTooltip = false;
				this.suppressedUntil = Date.now() + 200;
				this.hide(true);
			});
		}
		return el;
	}

	hide(immediate = false) {
		this.ticket += 1;
		clearTimeout(this.activeTimer);
		this.pendingAnchor = null;
		if (immediate) {
			clearTimeout(this.dismissTimer);
			const el = document.getElementById(DOM_IDS.TOOLTIP);
			if (el) el.classList.remove("active");
			this.anchorElement = null;
			this.shownAnchor = null;
			return;
		}

		clearTimeout(this.dismissTimer);
		this.dismissTimer = setTimeout(() => {
			if (this.isHoveringTooltip) return;
			const el = document.getElementById(DOM_IDS.TOOLTIP);
			if (el) el.classList.remove("active");
			this.anchorElement = null;
			this.shownAnchor = null;
		}, 150);
	}

	async show(shell, itemId, triggerEventOrEl) {
		clearTimeout(this.dismissTimer);
		if (Date.now() < this.suppressedUntil) return;

		let anchorNode = null;
		if (triggerEventOrEl instanceof HTMLElement) {
			anchorNode = triggerEventOrEl.closest("[data-favorite-id], .nah-action-card, [data-item-id]") || triggerEventOrEl;
		} else if (triggerEventOrEl?.target instanceof HTMLElement) {
			anchorNode = triggerEventOrEl.target.closest("[data-favorite-id], .nah-action-card, [data-item-id]");
		} else if (triggerEventOrEl?.currentTarget instanceof HTMLElement) {
			anchorNode = triggerEventOrEl.currentTarget.closest("[data-favorite-id], .nah-action-card, [data-item-id]");
		}
		if (!anchorNode) return;

		const resolvedItemId = itemId || anchorNode.dataset?.itemId || anchorNode.dataset?.favoriteId;
		if (!resolvedItemId) return;

		// Moving between a row's icon, name and buttons fires pointerover again for the same row:
		// keep the card that is on screen (or on its way) instead of building it again.
		const tooltipEl = document.getElementById(DOM_IDS.TOOLTIP);
		const isTooltipActive = Boolean(tooltipEl?.classList.contains("active"));
		const isShown = anchorNode === this.shownAnchor && isTooltipActive;
		if (anchorNode === this.pendingAnchor || anchorNode === this.emptyAnchor || isShown) return;
		this.emptyAnchor = null;

		// A card on screen (including its dismiss grace period) switches over quickly; a new one waits a little longer.
		const delay = isTooltipActive ? SWITCH_DELAY_MS : OPEN_DELAY_MS;

		clearTimeout(this.activeTimer);
		this.anchorElement = anchorNode;
		this.pendingAnchor = anchorNode;
		const ticket = ++this.ticket;

		this.activeTimer = setTimeout(async () => {
			try {
				await this._renderAndDisplay(shell, resolvedItemId, ticket, anchorNode);
			} catch (err) {
				console.error("Nik's Action HUD | Could not build the hover card:", err);
			} finally {
				// A failed (or abandoned) build must not leave the row marked as pending: hovering it again should retry.
				if (this.pendingAnchor === anchorNode && ticket === this.ticket) this.pendingAnchor = null;
			}
		}, delay);
	}

	/** Build and place the card; abandons the work if the card was dismissed or re-targeted meanwhile (`ticket`). */
	async _renderAndDisplay(shell, itemId, ticket, anchor = this.anchorElement) {
		const tooltipNode = this._getTooltipNode();
		if (!tooltipNode || !anchor) return;
		const stale = () => ticket !== this.ticket;

		const actor = shell?.currentActor;
		let tooltipPayload = null;

		if (shell?.provider?.buildTooltipData) {
			tooltipPayload = await shell.provider.buildTooltipData(actor, itemId);
		}
		if (stale()) return;

		if (!tooltipPayload) {
			this.hide(true);
			this.emptyAnchor = anchor;
			return;
		}

		let itemDoc = tooltipPayload.item || null;
		if (!itemDoc && typeof itemId === "string") {
			const target = parseRef(itemId);
			if (target.kind === "activity") {
				itemDoc = actor?.items?.get(target.args[0]) || null;
			} else {
				const cleanId = itemId.split("_")[0];
				itemDoc = actor?.items?.get(cleanId) || actor?.items?.getName(cleanId) || null;
			}
		}

		const docContext = (itemDoc instanceof foundry.abstract.Document) ? itemDoc : actor;
		const rollData = docContext?.getRollData
			? docContext.getRollData()
			: (actor?.getRollData ? actor.getRollData() : {});

		let enrichedHtml = "";
		if (tooltipPayload.description) {
			// Must be called on the class: enrichHTML relies on `this` for its enricher steps
			enrichedHtml = await foundry.applications.ux.TextEditor.implementation.enrichHTML(tooltipPayload.description, {
				relativeTo: docContext,
				rollData,
				secrets: false,
			});
			if (stale()) return;
			if (enrichedHtml) {
				const tempDiv = document.createElement("div");
				tempDiv.innerHTML = enrichedHtml;
				for (const secretEl of tempDiv.querySelectorAll("section.secret, div.secret, secret-block, .secret, button.reveal, button.unsecret")) {
					secretEl.remove();
				}
				enrichedHtml = tempDiv.innerHTML.trim();
			}
		}

		const config = readProfile();
		const theme = config.theme || "arcanum";
		tooltipNode.className = `theme-${theme} active`;

		this._populateMarkup(tooltipNode, tooltipPayload, enrichedHtml);
		this._placeHoverCard(tooltipNode, anchor);
		this.pendingAnchor = null;
		this.shownAnchor = anchor;
	}

	_populateMarkup(node, data, enrichedDescription) {
		const title = Handlebars.escapeExpression(data.title || data.name || "Action");
		const subtitle = data.subtitle ? Handlebars.escapeExpression(data.subtitle) : "";
		const iconSrc = data.icon || data.img ? Handlebars.escapeExpression(data.icon || data.img) : "";
		const leadSrc = data.iconLead ? Handlebars.escapeExpression(data.iconLead) : "";
		const sysClass = game.system?.id === "dnd5e" ? " dnd5e dnd5e2" : (game.system?.id === "shadowdark" ? " shadowdark" : "");

		const badges = (data.badges || []).map((b) => {
			const cls = Handlebars.escapeExpression(b.className || b.class || "");
			const label = Handlebars.escapeExpression(b.label || b);
			const titleAttr = b.title ? ` title="${Handlebars.escapeExpression(b.title)}"` : "";
			const icon = b.icon ? `<i class="${Handlebars.escapeExpression(b.icon)}"></i> ` : "";
			return `<span class="nah-tt-badge ${cls}"${titleAttr}>${icon}${label}</span>`;
		}).join("");

		let specsHtml = "";
		if (Array.isArray(data.specs) && data.specs.length > 0) {
			specsHtml = `
				<div class="nah-tt-specs">
					${data.specs.map((s) => {
						const hasLabel = Boolean(s.label && String(s.label).trim());
						const label = hasLabel ? `<span class="nah-tt-spec-label">${Handlebars.escapeExpression(s.label)}</span>` : "";
						const val = Handlebars.escapeExpression(s.value || "");
						const detail = s.detail ? ` <span class="nah-tt-spec-detail">${Handlebars.escapeExpression(s.detail)}</span>` : "";
						return `
							<div class="nah-tt-spec ${!hasLabel ? 'nah-tt-spec-no-label' : ''}">
								${s.img ? `<img src="${Handlebars.escapeExpression(s.img)}" class="nah-tt-spec-img" alt="">` : `<i class="${s.icon || 'fas fa-info-circle'} nah-tt-spec-icon"></i>`}
								<div class="nah-tt-spec-content">
									${label}
									<span class="nah-tt-spec-value">${val}${detail}</span>
								</div>
							</div>
						`;
					}).join("")}
				</div>
			`;
		}

		let tacticalHtml = "";
		if (Array.isArray(data.tactical) && data.tactical.length > 0) {
			tacticalHtml = `
				<div class="nah-tt-tactical">
					${data.tactical.map((t) => {
						const valContent = t.valueHtml ? safeHtml(t.valueHtml) : Handlebars.escapeExpression(t.value || "");
						const detail = t.detail ? ` <span class="nah-tt-tac-detail">${Handlebars.escapeExpression(t.detail)}</span>` : "";
						return `
							<div class="nah-tt-tac-item ${t.class || ''}">
								<span class="nah-tt-tac-label"><i class="${t.icon || 'fas fa-dice-d20'}"></i> ${Handlebars.escapeExpression(t.label || '')}</span>
								<span class="nah-tt-tac-val">${valContent}${detail}</span>
							</div>
						`;
					}).join("")}
				</div>
			`;
		}

		let propertiesHtml = "";
		if (Array.isArray(data.properties) && data.properties.length > 0) {
			propertiesHtml = `
				<div class="nah-tt-pills">
					${data.properties.map((p) => {
						const label = typeof p === "string" ? p : (p.label || "");
						const cls = typeof p === "object" && p.class ? p.class : "";
						const titleAttr = typeof p === "object" && p.title ? ` title="${Handlebars.escapeExpression(p.title)}"` : "";
						return `<span class="nah-tt-pill ${cls}"${titleAttr}>${Handlebars.escapeExpression(label)}</span>`;
					}).join("")}
				</div>
			`;
		}

		// Footer text is escaped, except <kbd> key hints ("<kbd>Shift</kbd>: Advantage"), which render as keys.
		const footerText = data.footer ? String(data.footer) : "";
		const hasKeys = /<kbd>/i.test(footerText);
		const footerMarkup = Handlebars.escapeExpression(footerText).replace(/&lt;(\/?)kbd&gt;/gi, "<$1kbd>");
		const footerIcon = hasKeys ? "fas fa-keyboard" : "fas fa-mouse-pointer";
		const footer = (data.footerHtml ? safeHtml(data.footerHtml) : "") || (footerText ? `<div class="nah-tooltip-footer"><i class="${footerIcon}" style="opacity:0.7;"></i> <span>${footerMarkup}</span></div>` : "");

		node.innerHTML = `
			<div class="nah-tooltip-content nah-hovercard-pop">
				<div class="nah-card-heading">
					${iconSrc ? `<span class="nah-tt-icon-stack">${leadSrc ? `<img src="${leadSrc}" class="nah-tt-icon" alt="">` : ""}<img src="${iconSrc}" class="nah-tt-icon" alt=""></span>` : ""}
					<div class="nah-tt-titles">
						<div class="nah-card-title">${title}</div>
						${subtitle ? `<div class="nah-tt-subtitle">${subtitle}</div>` : ""}
					</div>
					${badges ? `<div class="nah-tt-badges">${badges}</div>` : ""}
				</div>
				${specsHtml}
				${tacticalHtml}
				${propertiesHtml}
				${enrichedDescription ? `<div class="editor-content${sysClass} nah-tt-body">${enrichedDescription}</div>` : ""}
				${footer}
			</div>
		`;
	}

	/**
	 * The side the HUD unfolds towards at this anchor: the drawer's opening side, the rail's side, or the dock's
	 * inward side. The card follows it so it never doubles back over the dock.
	 */
	_expansionSide(anchorNode) {
		const drawer = anchorNode.closest?.(`#${DOM_IDS.DRAWER_SLOT}`);
		if (drawer) return drawer.dataset.openX === "right" ? "right" : "left";
		const railSide = anchorNode.closest?.(".nah-favorites-rail")?.dataset.side;
		if (railSide === "left" || railSide === "right") return railSide;
		const dock = anchorNode.closest?.(`#${DOM_IDS.DOCK}`);
		return dock ? inwardSideFor(dock) : null;
	}

	_placeHoverCard(tooltipNode, anchorNode) {
		// Favorites sit in a rail beside the dock (or in its overflow popover). The card must clear the rail,
		// the popover and the dock itself, and prefers the side away from the dock.
		const favoriteBox = anchorNode.closest?.(".nah-fav-popover") || anchorNode.closest?.(".nah-favorites-rail");
		const dockRoot = anchorNode.closest?.("#nah-dock");
		const isFavoriteTarget = Boolean(favoriteBox || anchorNode.dataset?.favoriteId);
		const refContainer = favoriteBox
			? (dockRoot || favoriteBox)
			: (isFavoriteTarget
				? (anchorNode.closest("#nah-dock-root") || dockRoot || anchorNode)
				: (anchorNode.closest?.(".nah-drawer-pane") || anchorNode));
		const preferredSide = this._expansionSide(anchorNode);

		const margin = 10;
		const minBesideWidth = 220;
		const viewportW = window.innerWidth;
		const viewportH = window.innerHeight;

		// The HUD is scaled with CSS zoom, which makes bounding rects unreliable across browsers.
		// Geometry below is only a first guess; the real position is verified by hit-testing.
		const box = (() => {
			const rects = [refContainer, favoriteBox].filter(Boolean).map((el) => el.getBoundingClientRect());
			return {
				left: Math.min(...rects.map((r) => r.left)),
				right: Math.max(...rects.map((r) => r.right)),
				top: Math.min(...rects.map((r) => r.top)),
				bottom: Math.max(...rects.map((r) => r.bottom)),
			};
		})();
		const anchorRect = anchorNode.getBoundingClientRect();

		tooltipNode.style.maxWidth = "";
		let tip = tooltipNode.getBoundingClientRect();
		const cardWidth = tip.width || 320;

		const room = { right: viewportW - box.right - margin, left: box.left - margin };
		const fits = (name) => room[name] >= Math.min(cardWidth, minBesideWidth);
		const otherSide = preferredSide === "left" ? "right" : "left";
		let side;
		if (preferredSide && fits(preferredSide)) side = preferredSide;
		else if (preferredSide && fits(otherSide)) side = otherSide;
		else side = room.right >= cardWidth || room.right >= room.left ? "right" : "left";
		let left = side === "right" ? box.right + margin : box.left - margin - cardWidth;
		let top = anchorRect.top;

		const clampTop = () => {
			const h = tooltipNode.getBoundingClientRect().height || 200;
			top = Math.min(Math.max(top, margin), Math.max(margin, viewportH - h - margin));
		};

		/**
		 * True if the card, placed at `x`, would cover any part of the container it describes. Only hit-tests
		 * the page (the card itself is ignored), so the card does not need to be moved to probe a position.
		 */
		let cardHeight = 200;
		const coversContainer = (x, width) => {
			const h = cardHeight;
			const probeX = side === "right" ? x + 1 : x + width - 1;
			if (probeX < 0 || probeX >= viewportW) return false;
			for (let i = 0; i <= 4; i++) {
				const y = Math.min(viewportH - 1, Math.max(0, top + (h * i) / 4 - (i === 4 ? 1 : 0)));
				const hit = (document.elementsFromPoint?.(probeX, y) ?? []).some((el) => !tooltipNode.contains(el) && refContainer.contains(el));
				if (hit) return true;
			}
			return false;
		};

		clampTop();
		tooltipNode.style.left = `${Math.round(Math.max(left, margin))}px`;
		tooltipNode.style.top = `${Math.round(top)}px`;

		const placed = tooltipNode.getBoundingClientRect();
		let width = placed.width || cardWidth;
		cardHeight = placed.height || 200;

		// Smallest shift away from the container that clears it: double the step until clear, then
		// narrow the gap down to 8px. About a dozen hit-tests instead of one per 8px.
		const away = side === "right" ? 1 : -1;
		const MAX_SHIFT = 1200;
		if (coversContainer(left, width)) {
			let blocked = 0;
			let clear = 8;
			while (clear < MAX_SHIFT && coversContainer(left + away * clear, width)) {
				blocked = clear;
				clear = Math.min(MAX_SHIFT, clear * 2);
			}
			while (clear - blocked > 8) {
				const mid = (blocked + clear) / 2;
				if (coversContainer(left + away * mid, width)) blocked = mid;
				else clear = mid;
			}
			left += away * clear;
			tooltipNode.style.left = `${Math.round(left)}px`;
		}

		// Shrink to the space that is left beside the container; if it is too little, go above/below.
		const space = side === "right" ? viewportW - margin - left : left + width - margin;
		if (side === "right" && left + width > viewportW - margin) {
			if (space >= minBesideWidth) {
				tooltipNode.style.maxWidth = `${Math.floor(space)}px`;
				width = tooltipNode.getBoundingClientRect().width;
			} else {
				left = NaN;
			}
		} else if (side === "left" && left < margin) {
			if (space >= minBesideWidth) {
				tooltipNode.style.maxWidth = `${Math.floor(space)}px`;
				width = tooltipNode.getBoundingClientRect().width;
				left = margin;
			} else {
				left = NaN;
			}
		}

		if (Number.isNaN(left)) {
			tooltipNode.style.maxWidth = "";
			const h = tooltipNode.getBoundingClientRect().height || 200;
			width = tooltipNode.getBoundingClientRect().width || cardWidth;
			left = Math.min(Math.max(box.left, margin), viewportW - width - margin);
			top = box.bottom + margin + h <= viewportH - margin ? box.bottom + margin : box.top - margin - h;
		}

		clampTop();
		tooltipNode.style.left = `${Math.round(Math.max(left, margin))}px`;
		tooltipNode.style.top = `${Math.round(top)}px`;
	}
}

const tooltipInstance = new HUDTooltipManager();

export function revealHoverCard(shell, itemId, eventOrEl) {
	tooltipInstance.show(shell, itemId, eventOrEl);
}

export function dismissHoverCard(immediate = false) {
	tooltipInstance.hide(immediate);
}

