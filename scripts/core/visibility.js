/** The show/hide keybinding: hide the HUD while a character is shown, otherwise bring it back. */
export function toggleHudVisibility(hud, disabled) {
	if (disabled) return;
	if (hud.currentActor) hud.hideHud();
	else hud.refresh();
}
