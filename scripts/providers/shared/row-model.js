/**
 * Drawer row model shared by every provider.
 *
 * A row is plain data: { id, name, icon, modifier, uses, segments[] } plus optional extras
 * (description, flags such as isDepleted). `segments` describe the sub-line as typed pieces
 * (activation badge, range, damage, ammo, ...) instead of pre-rendered HTML; the drawer's
 * segment renderer (features/drawer/segments.js) turns them into markup, and search/picker read
 * them through `segmentsText`.
 */

/** Segment kinds understood by the segment renderer. */
export const SEGMENT_KINDS = Object.freeze({
	ACTIVATION: "activation",
	RANGE: "range",
	DAMAGE: "damage",
	AMMO: "ammo",
	TEXT: "text",
	TAG: "tag",
	COMPONENTS: "components",
	DURATION: "duration",
	QUANTITY: "quantity",
	EQUIP: "equip",
	LABEL: "label",
	STAT: "stat",
	BADGE: "badge",
	COMMAND: "command",
});

/** Constructors for the typed segments. */
export const segment = Object.freeze({
	/** Action-economy badge. `type` picks the colour class ("action"), `value` is the short label ("A"), `title` the full name. */
	activation: (type, value, title = "") => ({ kind: SEGMENT_KINDS.ACTIVATION, type, value, title }),

	range: (text) => ({ kind: SEGMENT_KINDS.RANGE, text }),

	/**
	 * One damage part. `types` lists `{ key, label, icon?, color? }`; `display` is how the type is
	 * drawn ("icons" | "both" | "text").
	 */
	damage: (formula, types = [], display = "icons") => ({ kind: SEGMENT_KINDS.DAMAGE, formula, types, display }),

	/** Ammunition control for a weapon; `loaded` is `{ name, img, quantity, level }` or null when nothing is loaded. */
	ammo: (weaponId, loaded = null) => ({ kind: SEGMENT_KINDS.AMMO, weaponId, loaded }),

	text: (text) => ({ kind: SEGMENT_KINDS.TEXT, text }),

	/** Small badge such as concentration or ritual. `variant` picks the style; `unprepared` dims a ritual-only spell. */
	tag: (variant, label, title, { unprepared = false } = {}) => ({ kind: SEGMENT_KINDS.TAG, variant, label, title, ...(unprepared && { unprepared }) }),

	/** Spell components, e.g. "V, S, M". */
	components: (text) => ({ kind: SEGMENT_KINDS.COMPONENTS, text }),

	/** Stack size ("x3"). */
	quantity: (value) => ({ kind: SEGMENT_KINDS.QUANTITY, value }),

	/** Equip / unequip toggle for an item. */
	equip: (itemId, equipped) => ({ kind: SEGMENT_KINDS.EQUIP, itemId, equipped }),

	/** Plain text in the sub-line (e.g. "Tier 2", "DC 12"). */
	label: (text) => ({ kind: SEGMENT_KINDS.LABEL, text }),

	/** Small bold value; `tone` is "torch" | "muted" | "quiet" (not bold). */
	stat: (text, tone = "torch") => ({ kind: SEGMENT_KINDS.STAT, text, tone }),

	/** Status badge such as the "LOST" marker; `variant` picks the style. */
	badge: (variant, text) => ({ kind: SEGMENT_KINDS.BADGE, variant, text }),

	/**
	 * Inline button that runs an item command through `hud.useItem(command)`.
	 * `variant`: "equip" | "light" | "drink" | "restore"; `state` styles toggles ("equipped", "burning", ...).
	 */
	command: (command, label, { variant, state = "", title = label } = {}) => ({ kind: SEGMENT_KINDS.COMMAND, command, label, variant, state, title }),

	/** Short duration text with an optional longer label for the tooltip. */
	duration: (text, label = "") => ({ kind: SEGMENT_KINDS.DURATION, text, label }),
});

/**
 * Build a drawer row. Empty optional fields are omitted so snapshots show only real data.
 * @param {{ id: string, name: string, icon?: string, modifier?: string, uses?: string, segments?: object[] }} fields
 */
export function createRow({ id, name, icon, modifier, uses, segments, ...extra }) {
	const row = { id, name, icon };
	if (modifier) row.modifier = modifier;
	if (uses) row.uses = uses;
	if (segments?.length) row.segments = segments;
	return Object.assign(row, extra);
}

/**
 * Uses / recharge badge shown at the right of a row. `tone` is "muted" | "accent" | "ready" | "recharge";
 * `icon` is a Font Awesome class; `title` an optional tooltip.
 */
export const usesBadge = (text, tone = "muted", extra = {}) => ({ text, tone, ...extra });

const damageText = (seg) => {
	const label = seg.types.map((type) => type.label).filter(Boolean).join(", ");
	return label ? `${seg.formula} ${label}` : seg.formula;
};

/** Plain-text reading of a row's segments, for search and picker matching. */
export function segmentsText(segments = []) {
	return segments.map((seg) => {
		switch (seg.kind) {
			case SEGMENT_KINDS.ACTIVATION: return seg.type;
			case SEGMENT_KINDS.DAMAGE: return damageText(seg);
			case SEGMENT_KINDS.AMMO: return seg.loaded?.name ?? "";
			case SEGMENT_KINDS.LABEL:
			case SEGMENT_KINDS.STAT:
			case SEGMENT_KINDS.BADGE: return seg.text;
			case SEGMENT_KINDS.COMMAND: return seg.label;
			case SEGMENT_KINDS.QUANTITY: return `x${seg.value}`;
			case SEGMENT_KINDS.TAG: return seg.title || seg.label;
			case SEGMENT_KINDS.DURATION: return seg.label || seg.text;
			default: return seg.text ?? "";
		}
	}).filter(Boolean).join(" ");
}
