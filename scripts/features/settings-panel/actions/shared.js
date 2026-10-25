/**
 * Helpers shared by the settings-panel action modules.
 */

import { readFormValues } from "../form-reader.js";

/** Pull the current form into the draft (actions call this before they read or change it). */
export const pullForm = (app) => readFormValues(app, app.element);

/** True when the user may change settings; otherwise shows the standard warning. */
export function requireSettingsPermission() {
	if (game.user.can("SETTINGS_MODIFY")) return true;
	ui.notifications.warn(game.i18n.localize("NAH.UI.PermissionDenied"));
	return false;
}

/** Index stored in `data-cat-index` of the card containing `target`, or null. */
export function categoryIndexOf(target) {
	const card = target.closest("[data-cat-index]");
	const index = card ? Number(card.dataset.catIndex) : NaN;
	return Number.isNaN(index) ? null : index;
}
