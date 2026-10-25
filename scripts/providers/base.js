import { parseRef } from "../core/action-ref.js";
import { readProfile } from "../core/profile.js";
import { categoryIdOf, findLayoutEntry } from "../core/category-id.js";
import { emptyDrawer } from "./shared/drawer-model.js";

/**
 * BaseProvider: what every game-system provider inherits. It turns the saved layout (or the
 * system's starter layout) into ribbon categories and defines the hooks a system provider
 * overrides (system drawers, tooltips, actions, uses). Designed for Foundry V14.
 */

// ── Ribbon categories ───────────────────────────────────

const LEGENDARY = "legendary";
const FEATURE_IDS = new Set(["features"]);

const toRibbonButton = (category) => ({
	id: categoryIdOf(category),
	sectionId: category.sectionId || null,
	label: category.label || (category.sectionId === LEGENDARY ? "Legendary" : "Category"),
	icon: category.icon || "fas fa-folder",
	img: category.img || "",
});

/** The legendary button an actor with legendary actions gets when its layout has none. */
const legendaryButton = () => toRibbonButton({
	sectionId: LEGENDARY,
	label: game.i18n.localize("NAH.Categories.Legendary") || "Legendary",
	icon: "fas fa-crown",
});

// ── Provider ────────────────────────────────────────────

/**
 * A provider adapts one game system to the HUD. It is configured with a plain definition
 * (every key optional):
 *
 *   id            game system id
 *   sections      { resolve(actor, sectionId, menuData), starterLayout() }  drawer content
 *   legendary     (actor) => boolean
 *   handlers      { [actionKind]: { run, describe, tooltip } }  system actions (see core/action-ref.js)
 *   rollContext   (event) => context handed to handlers as `roll()`
 *   useDocument   (actor, id, event) => run an owned item / uuid (required to use documents)
 *   describe      (actor, id) => favorite look for document ids
 *   tooltip       (actor, itemOrId, options) => hover card for documents
 *   uses          (actor, id, item) => { value, max, label, isDepleted } | null
 *   autoPin       { isNpc(actor), candidates(actor) => ordered items, isAttack(item) }  NPC auto-favorites
 *
 * A class that extends `BaseProvider` and overrides the methods below keeps working.
 */
export class BaseProvider {
	/** @param {object} definition Provider definition (see above). */
	constructor(definition = {}) {
		this.def = definition;
		this.gameSystemId = definition.id ?? "";
	}

	actorHasLegendary(actor) {
		return Boolean(this.def.legendary?.(actor));
	}

	/** The ribbon categories a system starts with. */
	getStarterLayout() {
		return this.def.sections?.starterLayout?.() ?? [];
	}

	/** Ribbon buttons for `actor`: the saved layout (or the starter layout), legendary only when it applies. */
	listCategories(actor) {
		const saved = (readProfile().layoutCategories ?? []).filter((entry) => entry?.sectionId);
		const layout = saved.length ? saved : this.getStarterLayout();
		const legendary = this.actorHasLegendary(actor);

		const buttons = layout.map(toRibbonButton).filter((button) => legendary || button.sectionId !== LEGENDARY);
		if (legendary && !buttons.some((button) => button.sectionId === LEGENDARY)) {
			const featuresAt = buttons.findIndex((button) => FEATURE_IDS.has(button.sectionId));
			buttons.splice(featuresAt < 0 ? buttons.length : featuresAt + 1, 0, legendaryButton());
		}
		return buttons;
	}

	/** The layout (or starter) entry behind a category id. */
	_categorySource(categoryId) {
		const id = String(categoryId ?? "");
		return findLayoutEntry(readProfile().layoutCategories, id)
			?? findLayoutEntry(this.getStarterLayout(), id)
			?? (id === categoryIdOf({ sectionId: LEGENDARY }) ? { sectionId: LEGENDARY, label: "Legendary" } : null);
	}

	/** Drawer payload for a category's system section. */
	loadDrawerSync(actor, categoryId, category = null) {
		const source = category ?? this._categorySource(categoryId);
		return source?.sectionId ? this._systemDrawer(actor, source.sectionId, source) : null;
	}

	async loadDrawer(actor, categoryId, category = null) {
		return this.loadDrawerSync(actor, categoryId, category);
	}

	/** Drawer for one of the system's own sections. */
	_systemDrawer(actor, sectionId, menuData) {
		return this.def.sections?.resolve(actor, sectionId, menuData) ?? emptyDrawer(menuData?.label ?? "");
	}

	// ── actions ──

	/** Run an action id: a system action through its handler, anything else as a document. */
	async useItem(actor, actionId, event = null) {
		if (!actor || !actionId) return undefined;
		const { kind, args } = parseRef(actionId);
		const handler = this.def.handlers?.[kind];
		if (handler?.run) {
			let context = null;
			const roll = () => (context ??= this.def.rollContext?.(event) ?? {});
			return handler.run({ actor, args, roll, event });
		}
		return this.def.useDocument?.(actor, actionId, event);
	}

	// ── presentation of single actions ──

	buildFavoriteEntry(actor, itemId) {
		const { kind, args } = parseRef(itemId);
		return this.def.handlers?.[kind]?.describe?.({ actor, args }) ?? this.def.describe?.(actor, itemId) ?? null;
	}

	getFavoriteUses(actor, itemId, item = null) {
		return this.def.uses?.(actor, itemId, item) ?? null;
	}

	/** NPC auto-favorite rules (features/pins/auto-pin.js), or null when the system has none. */
	autoPinRules() {
		return this.def.autoPin ?? null;
	}

	async buildTooltipData(actor, itemOrId, options = {}) {
		if (typeof itemOrId === "string") {
			const handler = this.def.handlers?.[parseRef(itemOrId).kind];
			if (handler?.tooltip) return (await handler.tooltip({ actor, args: parseRef(itemOrId).args })) ?? null;
		}
		return this.def.tooltip?.(actor, itemOrId, options) ?? null;
	}
}

/** fromUuidSync that never throws. */
export function safeFromUuidSync(uuid) {
	if (!uuid) return null;
	try {
		return fromUuidSync(uuid, { strict: false }) ?? null;
	} catch (_err) {
		return null;
	}
}

/** fromUuid that never throws. */
export async function safeFromUuid(uuid) {
	if (!uuid || typeof fromUuid !== "function") return null;
	try {
		return (await fromUuid(uuid)) ?? null;
	} catch (_err) {
		return null;
	}
}
