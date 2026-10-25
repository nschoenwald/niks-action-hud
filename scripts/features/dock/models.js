/** View models and fitting for the dock: header, favorites rail, category ribbon. */

import { parseRef } from "../../core/action-ref.js";
import { MODULE_ID, DOM_IDS } from "../../core/ids.js";
import { resolveSafeTokenImage } from "./portrait.js";
import { portraitChoiceFor } from "../../core/portrait-choice.js";
import { shouldShowCategory } from "../registry/gating.js";
import { listCategories } from "../registry/registry.js";
import { localizeCategory } from "../../core/localization.js";
import { iconMarkup } from "../../core/icon-source.js";
import { combatantMatches, userOwnsCombatant } from "../../core/combat-ownership.js";
import { PORTRAIT_OVERHANG_PX, RAIL_COLUMNS, TOP_RAIL_MIN_COLUMNS, loc } from "./constants.js";
import { hud } from "./context.js";
import { currentZoom } from "./layout.js";
import { readSetting } from "../../core/setting-read.js";

// ── View models ─────────────────────────────────────────

/** Per-client choice (portrait menu) wins over the world setting. */
export function portraitFromTokenFor(actor, profile) {
	return (portraitChoiceFor(actor.id) ?? profile.portraitSource ?? "token") === "token";
}

export function buildHeaderModel(profile) {
	const actor = hud.currentActor;
	if (!actor) return null;

	const activeTokens = typeof actor.getActiveTokens === "function" ? actor.getActiveTokens() : [];
	const token = hud.currentToken
		|| canvas.tokens?.controlled?.[0]
		|| activeTokens[0]
		|| canvas.tokens?.placeables?.find((t) => t.actor?.id === actor.id || t.document?.actorId === actor.id);

	const tokenName = token?.name || token?.document?.name || actor.prototypeToken?.name || actor.name;
	const { img, actorImg, subjectScale, defaultIcon, hasSubject, ringColor } = resolveSafeTokenImage(actor, token, portraitFromTokenFor(actor, profile));

	const tokenId = actor.isToken ? actor.token?.id : (token?.id || "");
	const combat = (tokenId && canvas.tokens?.get(tokenId)?.combatant?.combat)
		|| hud.currentToken?.combatant?.combat
		|| game.combat
		|| null;
	const combatant = combat?.combatant;
	const isActiveTurn = Boolean(
		combat?.started
		&& combatantMatches(combatant, actor.id, tokenId)
		&& (userOwnsCombatant(game.user, combatant) || actor.isOwner)
	);

	return {
		actorId: actor.id,
		tokenId,
		displayName: tokenName,
		img,
		actorImg,
		defaultIcon,
		subjectScale,
		hasSubject,
		portraitStyle: [
			subjectScale !== 1 && `--token-subject-scale: ${subjectScale}`,
			ringColor && `--portrait-ring: ${ringColor}`,
		].filter(Boolean).join("; "),
		imgStyle: !hasSubject && subjectScale !== 1
			? `--token-subject-scale: ${subjectScale}; scale: ${subjectScale}; transform-origin: center center;`
			: "",
		isActiveTurn,
	};
}

/** Resolve one pinned id to a displayable slot, or null if its source vanished. */
function describePin(actor, id) {
	const { kind, args } = parseRef(id);
	if (kind === "macro") {
		const macro = fromUuidSync(args[0], { strict: false }) || game.macros?.get(args[0]);
		return macro ? { source: macro, name: macro.name, img: macro.img } : null;
	}
	if (kind === "activity") {
		const item = actor.items?.get(args[0]);
		const activity = item?.system?.activities?.get(args[1]);
		return item ? { source: item, name: activity?.name || item.name, img: activity?.img || item.img } : null;
	}
	const item = actor.items?.get(id);
	if (item) return { source: item, name: item.name, img: item.img };
	const virtual = hud.provider?.buildFavoriteEntry?.(actor, id);
	return virtual ? { source: { id, name: virtual.name }, name: virtual.name, img: virtual.img } : null;
}

/** All pinned favorites that can still be resolved; fitFavoritesRail() decides how many fit. */
export function buildFavoriteModels() {
	const actor = hud.currentActor;
	const pinned = actor ? hud.listFavorites() : [];
	if (!Array.isArray(pinned)) return [];

	const slots = [];
	for (const id of pinned) {
		const pin = describePin(actor, id);
		if (!pin) continue;
		const uses = hud.provider?.getFavoriteUses?.(actor, id, pin.source) ?? null;
		slots.push({
			id,
			name: pin.name || "Action",
			img: pin.img || "icons/svg/dice-target.svg",
			uses: uses?.label || null,
			isDepleted: Boolean(uses?.isDepleted),
		});
	}
	return slots;
}

/**
 * Fit the rail to the dock: at most RAIL_COLUMNS columns no taller than the ribbon; whatever does
 * not fit (leaving room for the "+" slot and the "+N" chip) moves into the overflow popover.
 */
export function fitFavoritesRail(root) {
	const rail = root.querySelector(".nah-favorites-rail");
	const bar = root.querySelector(`#${DOM_IDS.MENU}`);
	if (!rail || !bar) return;

	const overflowBox = rail.querySelector(".nah-fav-overflow");
	const popover = rail.querySelector(".nah-fav-popover");
	const chip = rail.querySelector(".nah-fav-more");
	const style = getComputedStyle(rail);
	const size = parseFloat(style.getPropertyValue("--nah-fav-size")) || 40;
	const gap = parseFloat(style.rowGap) || 6;

	const slots = [...rail.querySelectorAll(":scope > .nah-favorite")];
	if (rail.dataset.layout === "top") {
		// A short strip starts where the name does; once it outgrows the ribbon it widens to start above the portrait.
		// The room is measured from the name to the header's right edge, so a wider ribbon or a name that
		// starts further in (a larger portrait) cannot push the strip past the ribbon.
		const zoom = currentZoom(root) || 1;
		const nameLeft = root.querySelector(".nah-actor-name")?.getBoundingClientRect().left;
		const headerRight = root.querySelector(".nah-identity-row")?.getBoundingClientRect().right;
		const nameRoom = nameLeft !== undefined && headerRight !== undefined ? (headerRight - nameLeft) / zoom : bar.offsetWidth;
		const innerCols = Math.max(1, Math.floor((nameRoom + gap) / (size + gap)));
		const wide = slots.length + 1 > innerCols;
		rail.dataset.anchor = wide ? "portrait" : "name";
		const perRow = wide
			? Math.max(TOP_RAIL_MIN_COLUMNS, Math.floor((bar.offsetWidth + PORTRAIT_OVERHANG_PX + gap) / (size + gap)))
			: innerCols;
		rail.style.setProperty("--nah-rail-cols", String(perRow));
		const rowCapacity = perRow * RAIL_COLUMNS;
		const visible = slots.length + 1 <= rowCapacity ? slots.length : Math.max(0, rowCapacity - 2);
		const spill = slots.slice(visible);
		for (const slot of spill) popover.appendChild(slot);
		overflowBox.hidden = spill.length === 0;
		chip.textContent = `+${spill.length}`;
		const label = game.i18n?.format?.("NAH.Favorites.MoreTitle", { count: spill.length }) ?? "";
		chip.title = label;
		chip.setAttribute("aria-label", label);
		popover.setAttribute("aria-label", label);

		// Line the strip's left edge up with the portrait (long strip) or the start of the name (short strip),
		// measured from the real elements since the dock's own box is not aligned with either.
		const target = (wide ? root.querySelector(".nah-portrait-frame") : root.querySelector(".nah-actor-name"));
		rail.style.marginLeft = "0px";
		if (target) {
			const shift = (target.getBoundingClientRect().left - rail.getBoundingClientRect().left) / currentZoom(root);
			rail.style.marginLeft = `${Math.round(shift)}px`;
		}
		return;
	}
	const perColumn = Math.max(1, Math.floor((bar.offsetHeight + gap) / (size + gap)));
	const capacity = perColumn * RAIL_COLUMNS;
	// A grid (not a wrapping flex column) so the rail's box really includes every column.
	rail.style.setProperty("--nah-rail-rows", String(perColumn));

	// Reserve one cell for the "+" slot, and one more for the chip when anything overflows.
	const shown = slots.length + 1 <= capacity ? slots.length : Math.max(0, capacity - 2);
	const extra = slots.slice(shown);
	for (const slot of extra) popover.appendChild(slot);

	overflowBox.hidden = extra.length === 0;
	chip.textContent = `+${extra.length}`;
	const title = game.i18n?.format?.("NAH.Favorites.MoreTitle", { count: extra.length }) ?? "";
	chip.title = title;
	chip.setAttribute("aria-label", title);
	popover.setAttribute("aria-label", title);

	const columns = Math.ceil((shown + (extra.length ? 1 : 0) + 1) / perColumn);
	root.style.setProperty("--nah-rail-room", `${columns * (size + gap) + 16}px`);
}

/** "rail" (vertical, beside the HUD) or "top" (horizontal, above the HUD). */
export function favoritesLayoutFor(profile) {
	const value = game.settings.settings.has(`${MODULE_ID}.favoritesLayout`)
		? readSetting("favoritesLayout")
		: profile.favoritesLayout;
	return value === "top" ? "top" : "rail";
}

export function buildCategoryModels() {
	const actor = hud.currentActor;
	if (!actor) return [];

	const visible = listCategories(hud, actor)
		.filter((cat) => shouldShowCategory(cat, { hud, actor }));

	return visible.map((cat, index) => {
		const label = localizeCategory(cat.label, cat.sectionId);
		const labelLen = (label || "").trim().length;
		const labelCss = [];
		if (labelLen > 10) {
			const ratio = Math.round((10.5 / labelLen) * 100) / 100;
			labelCss.push(`--nah-label-scale: ${Math.max(0.62, Math.min(1.0, ratio))}`);
		}

		return {
			id: cat.id,
			label,
			labelLength: labelLen,
			labelCss: labelCss.join("; "),
			style: `--nah-row-cascade: ${index * 12}px;`,
			cssClass: cat.sectionId ? `nah-cat-${cat.sectionId}` : "nah-cat-custom",
			iconHtml: iconMarkup(String(cat.img || "").trim() || cat.icon, { imageClass: "nah-category-art" }),
		};
	});
}

/** Shrink long ribbon labels until they fit their button. Measures every button first, then writes. */
export function fitRibbonLabels(container) {
	const fits = [];
	for (const btn of container.querySelectorAll(".nah-hud-btn:not(.nah-identity-row)")) {
		const textSpan = btn.querySelector(".nah-btn-inner span");
		if (!textSpan) continue;
		const room = btn.clientWidth - 34;
		if (room <= 0) continue;
		const needed = textSpan.scrollWidth;
		if (needed > room) fits.push([textSpan, Math.max(0.58, room / needed).toFixed(2)]);
	}
	for (const [textSpan, scale] of fits) textSpan.style.setProperty("--nah-label-scale", scale);
}

/** Scale the name down to fit the row (one line), leaving ellipsis truncation as the last resort. */
export function fitIdentityName(container) {
	const name = container.querySelector(".nah-actor-name");
	const content = name?.parentElement;
	if (!name || !content) return;
	name.style.removeProperty("--nah-label-scale");
	const gap = parseFloat(getComputedStyle(content).columnGap) || 0;
	const zoom = parseFloat(getComputedStyle(container).zoom) || 1;
	const others = [...content.children].filter((c) => c !== name);
	const reserved = others.reduce((sum, c) => sum + c.getBoundingClientRect().width / zoom + gap, 0);
	const room = content.clientWidth - reserved;
	const needed = name.scrollWidth;
	if (room > 0 && needed > room) name.style.setProperty("--nah-label-scale", Math.max(0.58, room / needed).toFixed(2));
}

export function placeholderMarkup() {
	return `
		<div class="nah-actor-banner nah-placeholder-header">
			<div class="nah-hud-btn nah-identity-row">
				<div class="nah-btn-inner">
					<span class="nah-actor-name">${loc("UI.NoSelectionTitle", "No Token Selected")}</span>
				</div>
			</div>
			<div class="nah-portrait-frame nah-placeholder-img" style="display:flex;align-items:center;justify-content:center;color:#fff;">
				<i class="fas fa-crosshairs"></i>
			</div>
		</div>`;
}

