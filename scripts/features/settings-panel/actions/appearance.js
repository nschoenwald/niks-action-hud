/**
 * Appearance tab actions: choosing a theme.
 */

import { isThemeAvailable } from "../ui-constants.js";
import { refreshPreview } from "../live-preview.js";

export function onSelectTheme(app, event, target) {
	const themeId = target.dataset.themeId || target.closest("[data-theme-id]")?.dataset?.themeId;
	if (!themeId || !isThemeAvailable(themeId)) return;

	app.draft.data.theme = themeId;

	// Keep the hidden input in sync so the next form read doesn't restore the old value.
	const hiddenInput = app.element.querySelector('input[name="theme"]');
	if (hiddenInput) hiddenInput.value = themeId;

	for (const card of app.element.querySelectorAll(".hud-theme-card")) {
		const active = card.dataset.themeId === themeId;
		card.classList.toggle("active", active);
		const radio = card.querySelector(".hud-theme-radio i");
		if (radio) radio.className = active ? "fas fa-check-circle" : "fas fa-circle";
	}

	refreshPreview(app);
}
