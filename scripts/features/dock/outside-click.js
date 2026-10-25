/** Things the HUD opens outside the dock; interacting with them must not close the drawer. */
const OWN_POPUPS = ".nah-ammo-popover, #context-menu, .context-menu, .nah-fav-picker, #nah-tooltip";

/**
 * Foundry windows (framed ApplicationV2 roots, V1 `.window-app`, native `<dialog>`). Using an action often
 * opens one (dnd5e activity usage / roll configuration are `<dialog class="application dnd5e2 ...">` without
 * a `dialog` class), and working in it must not close the drawer behind it. Frameless UI (sidebar, hotbar,
 * scene controls) has no `application` class, so pressing it still closes the drawer.
 */
const APP_WINDOWS = ".application, .window-app, dialog";

/** Should a press on `target` close the open drawer? */
export function pressClosesDrawer(target, { dock, drawer }) {
	if (target?.closest?.(`${OWN_POPUPS}, ${APP_WINDOWS}`)) return false;
	return !dock?.contains(target) && !drawer?.contains(target);
}
