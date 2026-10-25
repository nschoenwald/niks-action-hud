/**
 * HUD runtime: resolves which actor the HUD shows, keeps the central store in sync with Foundry
 * documents, and exposes the facade (`hud`) that feature modules and providers call into.
 *
 * The dock and drawer components render from the store; this module never touches their DOM.
 */

import { ref } from "./action-ref.js";
import { coalesceToFrame } from "./frame-coalesce.js";
import { readProfile } from "./profile.js";
import { MODULE_ID, DOM_IDS } from "./ids.js";
import { hudStore } from "./store.js";
import { DEFAULT_HIDDEN_ACTOR_TYPES } from "../features/settings-panel/ui-constants.js";
import * as Registry from "../features/registry/registry.js";
import * as LayoutOps from "../features/layout/layout-ops.js";
import * as Pins from "../features/pins/pins.js";
import * as Prompts from "../features/layout/prompts.js";
import * as HoverCard from "../features/hovercard/hovercard.js";
import { categoryHasEntries } from "../features/registry/gating.js";
import { mountDock, pushPreview, repaintDock } from "../features/dock/dock.js";
import { mountDrawer, paintDrawer, refitDrawer } from "../features/drawer/drawer.js";
import { readSetting } from "./setting-read.js";

// ── Subject resolution ──────────────────────────────────

const parseTypeList = (csv) => (csv || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);

/** Stand-in token for an owned actor that has no token on the current scene. */
function virtualTokenFor(actor) {
	const name = actor.prototypeToken?.name || actor.name;
	return {
		actor,
		name,
		document: {
			name,
			texture: {
				src: actor.prototypeToken?.texture?.src || actor.img || CONST.DEFAULT_TOKEN || "icons/svg/mystery-man.svg",
			},
		},
	};
}

/** Decide which token/actor the HUD should display for this user, or null for none. */
function resolveSubject(profile) {
	if (game.settings.get(MODULE_ID, "disableHUD")) return null;
	if (profile.hudEnabled === false || (profile.hideForGm && game.user.isGM)) return null;

	const excluded = parseTypeList(profile.hiddenActorTypes !== undefined ? profile.hiddenActorTypes : DEFAULT_HIDDEN_ACTOR_TYPES);
	const isEligible = (actor) => actor && !excluded.includes(actor.type?.toLowerCase());

	const controlled = (canvas.tokens?.controlled || []).find((t) => isEligible(t.actor));
	if (controlled) return controlled;
	if (game.user.isGM) return null;

	const owned = game.user.character
		|| game.actors?.find((a) => a.isOwner && a.type === "character")
		|| game.actors?.find((a) => a.isOwner);
	if (!isEligible(owned)) return null;

	const onScene = (typeof owned.getActiveTokens === "function" ? owned.getActiveTokens()[0] : null)
		|| canvas.tokens?.placeables?.find((t) => t.actor?.id === owned.id || t.document?.actorId === owned.id);
	return onScene || virtualTokenFor(owned);
}

// ── Refresh scheduling ──────────────────────────────────

/**
 * Document and combat hooks often arrive in bursts (a roll updates the actor, an item and a message;
 * a turn change updates the combat and its combatants); repaint once per frame.
 */
const requestRefresh = coalesceToFrame(() => hud.refresh());

/** The combatant whose turn it is in the viewed combat ("" outside combat). */
const activeTurnKey = () => {
	const combat = game.combat;
	return combat?.started ? `${combat.id}.${combat.combatant?.id ?? ""}` : "";
};

/** The turn the HUD was last refreshed for. */
let refreshedTurn = "";

// ── Facade ──────────────────────────────────────────────

export const hud = {
	DOCK_ID: DOM_IDS.DOCK,
	DRAWER_ID: DOM_IDS.DRAWER_SLOT,

	// State accessors (backed by the store)
	get currentActor() { return hudStore.get().actor; },
	get currentToken() { return hudStore.get().token; },
	get provider() { return window.NikHUD?.provider; },

	// ── Lifecycle ──
	initialize() {
		mountDock(hud);
		mountDrawer(hud);
		registerDocumentHooks();
	},

	/** Recompute the subject and ask every view to repaint. */
	refresh() {
		HoverCard.dismissHoverCard(true);
		refreshedTurn = activeTurnKey();
		const subject = resolveSubject(readProfile());
		hudStore.patch({
			actor: subject?.actor ?? null,
			token: subject ?? null,
			revision: hudStore.get().revision + 1,
		});
	},

	/** Refresh at the next frame; any further requests until then are folded into it. */
	requestRefresh,

	/** Remove the HUD entirely (disabled / hidden) until the next refresh. */
	hideHud() {
		HoverCard.dismissHoverCard(true);
		hudStore.patch({ actor: null, token: null, drawer: null, revision: hudStore.get().revision + 1 });
	},

	// ── UI state commands ──
	closeDrawer() {
		HoverCard.dismissHoverCard(true);
		hudStore.patch({ drawer: null });
	},

	async toggleDrawer(categoryId) {
		const open = hudStore.get().drawer;
		if (open && String(open.categoryId) === String(categoryId)) {
			hud.closeDrawer();
			return;
		}

		let hideEmpty = true;
		try {
			const value = readSetting("hideEmptyDrawers");
			if (typeof value === "boolean") hideEmpty = value;
		} catch (_e) { /* setting not registered yet: keep default */ }

		if (hideEmpty && hud.currentActor && !hud.categoryHasEntries(categoryId)) {
			hud.closeDrawer();
			return;
		}
		hudStore.patch({ drawer: { categoryId: String(categoryId), pane: null, query: "" } });
	},

	showPane(categoryId, paneId) {
		const drawer = hudStore.get().drawer;
		hudStore.patch({ drawer: { ...(drawer ?? {}), categoryId: String(categoryId), pane: paneId } });
	},

	// ── Rendering entry points (used by search and the settings panel) ──
	paintDrawer,
	pushPreview,
	repaintDock,
	refitDrawer,

	// ── Registry ──
	listCategories: (actor = hud.currentActor) => Registry.listCategories(hud, actor),
	loadDrawer: (actor, categoryId, category = null) => Registry.loadDrawer(hud, actor ?? hud.currentActor, categoryId, category),
	categoryHasEntries(categoryId) {
		const actor = hud.currentActor;
		if (!actor) return false;
		const category = Registry.listCategories(hud, actor)?.find((c) => String(c.id) === String(categoryId))
			|| { id: categoryId };
		return categoryHasEntries(hud, actor, category);
	},

	// ── Pins ──
	listFavorites: () => Pins.listFavorites(hud),
	addFavorite: (itemId) => Pins.addFavorite(hud, itemId),
	toggleFavorite: (itemId) => Pins.toggleFavorite(hud, itemId),
	removeFavorite: (itemId, actor = null) => Pins.removeFavorite(hud, itemId, actor),
	movePin: (pinId, anchorId, after = false, actor = null) => Pins.movePin(hud, pinId, anchorId, after, actor),

	// ── Actions ──
	useItem: (itemId, event) => LayoutOps.useItem(hud, itemId, event),
	openSheet: () => LayoutOps.openSheet(hud),
	openItem: (itemId) => LayoutOps.openItem(hud, itemId),
	openFavoriteDialog: (favoriteId) => Prompts.openFavoriteDialog(hud, favoriteId),

	// ── Hover card ──
	revealHoverCard: (itemId, event) => HoverCard.revealHoverCard(hud, itemId, event),
	dismissHoverCard: (immediate = false) => HoverCard.dismissHoverCard(immediate),
};

// ── Foundry document hooks ──────────────────────────────

/** Token fields whose changes never alter what the HUD shows (movement, vision, lighting, canvas display). */
const IRRELEVANT_TOKEN_CHANGES = new Set([
	"_id", "x", "y", "elevation", "rotation", "sort", "width", "height", "depth", "shape", "level",
	"locked", "lockRotation", "alpha", "hidden", "light", "sight", "detectionModes", "occludable",
	"displayBars", "displayName", "turnMarker", "movementAction", "_movementHistory", "_regions",
]);

function registerDocumentHooks() {
	const refresh = requestRefresh;
	const isCurrent = (actor) => Boolean(hud.currentActor && actor && actor.id === hud.currentActor.id);
	const isShownToken = (id) => Boolean(id) && [hud.currentToken?.id, hud.currentToken?.document?.id].includes(id);

	Hooks.on("controlToken", refresh);

	// A combatant matters when it is the shown actor's, or when the change moved the turn to someone
	// else (initiative re-sorts and removals can do that without an updateCombat).
	const onCombatantChange = (combatant) => {
		const concernsShown = hud.currentActor && (combatant.actorId === hud.currentActor.id || isShownToken(combatant.tokenId));
		if (concernsShown || activeTurnKey() !== refreshedTurn) refresh();
	};
	for (const name of ["createCombatant", "updateCombatant", "deleteCombatant"]) Hooks.on(name, onCombatantChange);

	Hooks.on("updateToken", (tokenDoc, changed) => {
		if (Object.keys(changed ?? {}).every((key) => IRRELEVANT_TOKEN_CHANGES.has(key))) return;
		const concernsShown = hud.currentActor && [hud.currentActor.id, hud.currentToken?.id, hud.currentToken?.document?.id].some((id) => id && (id === tokenDoc.actorId || id === tokenDoc.id));
		if (concernsShown) refresh();
	});
	Hooks.on("updateActor", (actor) => { if (isCurrent(actor)) refresh(); });

	const onItemChange = (item) => { if (isCurrent(item.parent || item.actor)) refresh(); };
	Hooks.on("createItem", onItemChange);
	Hooks.on("updateItem", onItemChange);
	// Cleanup runs once, on the client of the user who deleted the document.
	Hooks.on("deleteItem", (item, _options, userId) => {
		const owner = item.parent || item.actor;
		if (owner && userId === game.user.id) void Pins.removeFavorite(hud, item.id, owner);
	});

	const onEffectChange = (effect) => {
		const parent = effect.parent;
		const actor = parent?.documentName === "Actor" ? parent : (parent?.documentName === "Item" ? parent.actor : null);
		if (isCurrent(actor)) refresh();
	};
	for (const name of ["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"]) Hooks.on(name, onEffectChange);

	Hooks.on("deleteMacro", (macro, _options, userId) => {
		if (userId !== game.user.id) return;
		const ids = [macro?.id && ref.macro(macro.id), macro?.uuid && ref.macro(macro.uuid)].filter(Boolean);
		for (const actor of game.actors ?? []) {
			for (const id of ids) void Pins.removeFavorite(hud, id, actor);
		}
	});
}
