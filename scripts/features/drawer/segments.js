/**
 * Segment renderer: draws a row's typed sub-line segments (see providers/shared/row-model.js).
 * All static layout lives in CSS classes; only data-driven values (damage icon url/colour) are set inline.
 */

import { escapeHtml } from "../../core/escape.js";
import { SEGMENT_KINDS, segmentsText } from "../../providers/shared/row-model.js";

// localize() returns the raw key for missing entries, so check has() before trusting it.
const loc = (key, fallback) => (game.i18n?.has?.(`NAH.${key}`) ? game.i18n.localize(`NAH.${key}`) : fallback);
/**
 * A CSS url() for an asset path. Relative paths are made absolute first: a relative url() inside a custom
 * property resolves against the stylesheet that uses the var() (modules/<id>/styles/), not the page.
 */
const cssUrl = (path) => {
	const raw = String(path);
	const absolute = /^([a-z][a-z0-9+.-]*:|\/)/i.test(raw) ? raw : foundry.utils.getRoute(raw);
	return `url('${absolute.replace(/['"()\s]/g, (ch) => encodeURIComponent(ch))}')`;
};

function activationMarkup(seg) {
	const title = escapeHtml(seg.title || seg.type);
	return `<span class="nah-act-badge nah-act-${escapeHtml(seg.type)}" title="${title}" aria-label="${title}">${escapeHtml(seg.value)}</span>`;
}

function damageIconMarkup(type) {
	const name = escapeHtml(type.label || type.key);
	return `<span class="nah-dmg-icon nah-dmg-${escapeHtml(type.key)}" style="--nah-dmg-color:${escapeHtml(type.color)}; --nah-dmg-mask:${escapeHtml(cssUrl(type.icon))}" title="${name}" aria-label="${name}"></span>`;
}

/** Formula plus one icon per damage type (a part can have several, e.g. "acid or fire"). */
function damageMarkup(seg) {
	const label = seg.types.map((entry) => entry.label).filter(Boolean).join(", ");
	const formula = escapeHtml(seg.formula);
	if (!seg.types.length || (!label && !seg.types.some((entry) => entry.key))) return formula;
	const withIcons = seg.types.filter((entry) => entry.icon);
	if (seg.display === "text" || !withIcons.length) return escapeHtml(label ? `${seg.formula} ${label}` : seg.formula);

	const icons = withIcons.map(damageIconMarkup).join("");
	return seg.display === "both" ? `${formula} ${icons} ${escapeHtml(label)}` : `${formula} ${icons}`;
}

function tagMarkup(seg) {
	const classes = ["nah-chip", seg.variant, seg.unprepared && "nah-chip-unprepared"].filter(Boolean).map(escapeHtml).join(" ");
	return `<span class="${classes}" title="${escapeHtml(seg.title)}">${escapeHtml(seg.label)}</span>`;
}

function durationMarkup(seg) {
	const title = seg.label ? ` title="${escapeHtml(seg.label)}"` : "";
	return `<span class="nah-spell-duration"${title}>${escapeHtml(seg.text)}</span>`;
}

function equipMarkup(seg) {
	const label = seg.equipped ? loc("Dnd5e.UnequipItem", "Unequip") : loc("Dnd5e.EquipItem", "Equip");
	const state = seg.equipped ? "is-equipped" : "is-unequipped";
	return `<button type="button" class="nah-inventory-equip-toggle ${state}" data-action="equip-item" data-item-id="${escapeHtml(seg.itemId)}" title="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
}

const BADGE_CLASSES = Object.freeze({
	lost: "nah-sd-lost-badge",
});

const COMMAND_CLASSES = Object.freeze({
	equip: "nah-sd-equip-btn",
	light: "nah-sd-light-btn",
	drink: "nah-sd-drink-btn",
	restore: "nah-sd-restore-btn",
});

function commandMarkup(seg) {
	const classes = [COMMAND_CLASSES[seg.variant] ?? "nah-item-command", seg.state].filter(Boolean).map(escapeHtml).join(" ");
	return `<button type="button" class="${classes}" data-action="item-command" data-command="${escapeHtml(seg.command)}" title="${escapeHtml(seg.title)}">${escapeHtml(seg.label)}</button>`;
}

function ammoMarkup({ weaponId, loaded }) {
	const id = escapeHtml(weaponId);
	const button = (command, cls, title, glyph) =>
		`<button type="button" class="nah-ammo-btn ${cls}" data-action="ammo-action" data-weapon-id="${id}" data-command="${command}" title="${escapeHtml(title)}">${glyph}</button>`;
	const pick = loc("Dnd5e.SelectAmmo", "Choose ammunition");

	if (!loaded) {
		return `
			<div class="nah-ammo-bar">
				<span class="nah-ammo-badge is-empty">${escapeHtml(loc("Dnd5e.NoAmmo", "⚠ No ammo"))}</span>
				${button("dropdown", "", pick, "▼")}
			</div>`;
	}

	const icon = loaded.img ? `<img src="${escapeHtml(loaded.img)}" class="nah-ammo-icon" alt="${escapeHtml(loaded.name)}" />` : "";
	return `
		<div class="nah-ammo-bar">
			<span class="nah-ammo-badge is-${escapeHtml(loaded.level)}">
				${icon}
				<span class="nah-ammo-name">${escapeHtml(loaded.name)}</span>
				<span class="nah-ammo-count">x${escapeHtml(loaded.quantity)}</span>
			</span>
			${button("dropdown", "is-dropdown", pick, "▼")}
			${button("minus", "is-minus", loc("Dnd5e.DecreaseAmmo", "Remove one"), "−")}
			${button("plus", "is-plus", loc("Dnd5e.IncreaseAmmo", "Add one"), "+")}
		</div>`;
}

const INFO_KINDS = new Set([SEGMENT_KINDS.DAMAGE, SEGMENT_KINDS.RANGE, SEGMENT_KINDS.TEXT, SEGMENT_KINDS.DURATION]);
const LEAD_KINDS = {
	[SEGMENT_KINDS.ACTIVATION]: activationMarkup,
	[SEGMENT_KINDS.TAG]: tagMarkup,
	[SEGMENT_KINDS.QUANTITY]: (seg) => `<span class="nah-item-quantity">x${escapeHtml(seg.value)}</span>`,
	[SEGMENT_KINDS.EQUIP]: equipMarkup,
	[SEGMENT_KINDS.LABEL]: (seg) => escapeHtml(seg.text),
	[SEGMENT_KINDS.STAT]: (seg) => `<span class="nah-sd-stat is-${escapeHtml(seg.tone)}">${escapeHtml(seg.text)}</span>`,
	[SEGMENT_KINDS.BADGE]: (seg) => `<span class="${BADGE_CLASSES[seg.variant] ?? "nah-item-badge"}">${escapeHtml(seg.text)}</span>`,
	[SEGMENT_KINDS.COMMAND]: commandMarkup,
	[SEGMENT_KINDS.COMPONENTS]: (seg) => `<span class="nah-spell-components">${escapeHtml(seg.text)}</span>`,
};

const infoPieceMarkup = (seg) => {
	if (seg.kind === SEGMENT_KINDS.DAMAGE) return damageMarkup(seg);
	if (seg.kind === SEGMENT_KINDS.DURATION) return durationMarkup(seg);
	return escapeHtml(seg.text);
};

/** Info run: damage parts joined by ", ", other pieces joined by " · " (the tooltip carries the plain-text form). */
function infoMarkup(segments, muted) {
	const pieces = [];
	for (const seg of segments) {
		const html = infoPieceMarkup(seg);
		const text = segmentsText([seg]);
		const prev = pieces.at(-1);
		if (prev && prev.kind === SEGMENT_KINDS.DAMAGE && seg.kind === SEGMENT_KINDS.DAMAGE) {
			prev.html += `, ${html}`;
			prev.text += `, ${text}`;
		} else {
			pieces.push({ kind: seg.kind, html, text });
		}
	}
	const title = pieces.map((piece) => piece.text).join(" · ");
	return `<span class="nah-meta-line${muted ? " is-muted" : ""}" title="${escapeHtml(title)}">${pieces.map((piece) => piece.html).join(" · ")}</span>`;
}

/**
 * @param {object[]} segments
 * @param {{ muted?: boolean }} [options]  `muted` greys the info run (rows with `subtleInfo`).
 * @returns {string} Sub-line markup: badges and info on one line, the ammo control beneath.
 */
export function renderSegments(segments = [], { muted = false } = {}) {
	const lead = segments.filter((seg) => LEAD_KINDS[seg.kind]).map((seg) => LEAD_KINDS[seg.kind](seg));
	const info = segments.filter((seg) => INFO_KINDS.has(seg.kind));
	const ammo = segments.find((seg) => seg.kind === SEGMENT_KINDS.AMMO);

	const line = [...lead, info.length ? infoMarkup(info, muted) : ""].filter(Boolean).join("");
	return `${line ? `<div class="nah-seg-line">${line}</div>` : ""}${ammo ? ammoMarkup(ammo) : ""}`;
}

/**
 * Uses / recharge badge (see `usesBadge` in providers/shared/row-model.js).
 * @param {object} uses
 */
export function renderUses(uses) {
	if (!uses) return "";
	const icon = uses.icon ? `<i class="fas ${escapeHtml(uses.icon)}"></i> ` : "";
	const title = uses.title ? ` title="${escapeHtml(uses.title)}"` : "";
	return `<span class="nah-uses-badge is-${escapeHtml(uses.tone)}"${title}>${icon}${escapeHtml(uses.text)}</span>`;
}
