export const MODULE_ID = "niks-action-hud";

/** Game systems the HUD supports; on any other system the module stays inactive. */
const SUPPORTED_SYSTEMS = Object.freeze(["dnd5e", "shadowdark"]);

export const isSupportedSystem = () => SUPPORTED_SYSTEMS.includes(game.system?.id);

export const DOM_IDS = Object.freeze({
	LAYER: "nah-hud-stack",
	DOCK: "nah-dock",
	MENU: "nah-dock-root",
	DRAWER_SLOT: "nah-drawer-slot",
	TOOLTIP: "nah-tooltip",
	CONFIG: "niks-action-config",
});

export const FLAGS = Object.freeze({
	FAVORITES: "pinnedIds",
});
