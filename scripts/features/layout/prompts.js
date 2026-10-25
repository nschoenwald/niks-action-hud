/**
 * Dialogs for HUD entries: the favorite options dialog.
 * Bodies come from templates/dialogs/*.hbs; the dialogs are Foundry V14 DialogV2.
 */

import { parseRef, documentIdOf } from "../../core/action-ref.js";
import { MODULE_ID } from "../../core/ids.js";

const TEMPLATES = `modules/${MODULE_ID}/templates/dialogs`;
const text = (key, fallback) => game.i18n.localize(key) || fallback;
const render = (name, data) => foundry.applications.handlebars.renderTemplate(`${TEMPLATES}/${name}.hbs`, data);

/** Ask a question with a few buttons; resolves with the pressed button's action, or null when dismissed. */
async function choose({ title, icon, content, buttons }) {
	return foundry.applications.api.DialogV2.wait({
		window: { title, icon },
		position: { width: 340 },
		content,
		buttons: buttons.map((button) => ({ ...button, callback: () => button.action })),
		rejectClose: false,
	});
}

const openSheetButton = () => ({ action: "open", label: text("NAH.Favorites.OpenSheet", "Open Item Sheet"), icon: "fas fa-file-lines" });

const removeButton = (action, label, extra = {}) => ({ action, label, icon: "fas fa-trash", class: "destructive", ...extra });

// ── Favorites ───────────────────────────────────────────

/** What a pinned id points at, for display: { doc, label, icon, isMacro }. */
function describePinTarget(hud, actor, pinId) {
	const { kind, args } = parseRef(pinId);
	if (kind === "macro") {
		const macro = fromUuidSync(args[0]) || game.macros?.get(args[0]);
		return { doc: macro ?? null, label: macro?.name ?? "Custom Action", icon: macro?.img || "icons/svg/dice-target.svg", isMacro: true };
	}
	const doc = actor.items?.get(documentIdOf(pinId) ?? "") || fromUuidSync(pinId);
	if (doc) return { doc, label: doc.name, icon: doc.img || "icons/svg/item-bag.svg", isMacro: false };

	const virtual = hud.provider?.buildFavoriteEntry?.(actor, pinId);
	return { doc: null, label: virtual?.name ?? "", icon: virtual ? virtual.img || "icons/svg/item-bag.svg" : "", isMacro: false };
}

export async function openFavoriteDialog(hud, favoriteId) {
	const actor = hud?.currentActor;
	if (!actor || !favoriteId) return;

	const target = describePinTarget(hud, actor, favoriteId);
	const label = target.label || text("NAH.Tooltips.FavoriteOptions", "Favorite Action");
	const answer = await choose({
		title: label,
		icon: "fas fa-star",
		content: await render("identity", { icon: target.icon, title: label, subtitle: text("NAH.Favorites.DialogSubtitle", "Favorite Action") }),
		buttons: [
			{ ...openSheetButton(), default: true },
			removeButton("delete", text("NAH.Favorites.DeleteFavorite", "Remove Favorite")),
		],
	});

	if (answer === "open") {
		if (target.isMacro && target.doc?.sheet) target.doc.sheet.render(true);
		else hud.openItem?.(favoriteId);
	} else if (answer === "delete") {
		hud.removeFavorite?.(favoriteId);
	}
}
