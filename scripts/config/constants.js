import { MODULE_ID } from "../constants.js";

/**
 * Theme registry and visual metadata for Nik's Action HUD.
 * Exclusively designed for Foundry V14.
 */
export const THEMES = Object.freeze({
	carolingian: {
		id: "carolingian",
		label: "NAH.Themes.Carolingian",
		defaultLabel: "Carolingian UI",
		description: "Dynamic palette harmony, Work Sans typography, and clean frosted styling matching Carolingian UI",
		colors: {
			bg: "#121518",
			surface: "#1c1f24",
			border: "#4493ad",
			accent: "#7ab6c4",
			text: "#f7f4f8",
		},
		icon: "fas fa-feather-pointed",
		requiresModule: "crlngn-ui",
	},
	arcanum: {
		id: "arcanum",
		label: "NAH.Themes.Arcanum",
		defaultLabel: "Arcanum",
		badge: "Default",
		description: "Astral high magic with celestial velvet and gold-leaf filigree",
		colors: {
			bg: "#080914",
			surface: "#140f26",
			border: "#d4af37",
			accent: "#f59e0b",
			text: "#f8fafc",
		},
		icon: "fas fa-wand-sparkles",
	},
	obsidian: {
		id: "obsidian",
		label: "NAH.Themes.Obsidian",
		defaultLabel: "Obsidian",
		description: "Tactical solid deep onyx with specular borders and mint accents",
		colors: {
			bg: "#05070a",
			surface: "#0d1117",
			border: "#10b981",
			accent: "#34d399",
			text: "#ffffff",
		},
		icon: "fas fa-gem",
	},
	grimoire: {
		id: "grimoire",
		label: "NAH.Themes.Grimoire",
		defaultLabel: "Grimoire",
		description: "Aged dark parchment, hammered forged iron, and candlelit amber",
		colors: {
			bg: "#0e0a07",
			surface: "#1c1510",
			border: "#4d3522",
			accent: "#f59e0b",
			text: "#fef3c7",
		},
		icon: "fas fa-book-skull",
	},
	eldritch: {
		id: "eldritch",
		label: "NAH.Themes.Eldritch",
		defaultLabel: "Eldritch",
		description: "Abyssal cosmic horror with black chitin and bioluminescent cyan",
		colors: {
			bg: "#03060a",
			surface: "#080d14",
			border: "#06b6d4",
			accent: "#d946ef",
			text: "#e0f2fe",
		},
		icon: "fas fa-eye",
	},
	valiant: {
		id: "valiant",
		label: "NAH.Themes.Valiant",
		defaultLabel: "Valiant",
		description: "Chivalric polished plate steel with royal sapphire and tournament gold",
		colors: {
			bg: "#070c16",
			surface: "#0e1829",
			border: "#94a3b8",
			accent: "#3b82f6",
			text: "#f8fafc",
		},
		icon: "fas fa-shield",
	},
});

/**
 * Checks whether a theme is available in the current world.
 * Conditional themes (e.g. requiresModule: "crlngn-ui") are only available
 * when their required module is installed and active.
 *
 * @param {string|object} theme - Theme ID or theme metadata object
 * @returns {boolean}
 */
export function isThemeAvailable(theme) {
	if (!theme) return false;
	const meta = typeof theme === "object" ? theme : THEMES[theme];
	if (!meta) return false;
	if (meta.requiresModule) {
		return Boolean(game.modules?.get(meta.requiresModule)?.active);
	}
	return true;
}

/**
 * Returns a dictionary of all currently available themes.
 * @returns {Record<string, object>}
 */
export function getAvailableThemes() {
	return Object.fromEntries(
		Object.entries(THEMES).filter(([, meta]) => isThemeAvailable(meta))
	);
}

/**
 * Returns the default theme ID based on active modules.
 * Defaults to "carolingian" if Carolingian UI (crlngn-ui) is installed and active;
 * otherwise defaults to "arcanum".
 *
 * @returns {string}
 */
export function getDefaultTheme() {
	return isThemeAvailable("carolingian") ? "carolingian" : "arcanum";
}

export const getThemes = ({ all = false } = {}) => {
	if (all) return THEMES;
	return getAvailableThemes();
};

export const DEFAULT_ANCHOR_POSITIONS = Object.freeze({
	bottomRight: { anchorX: "right", anchorY: "bottom", label: "Bottom Right" },
	bottomLeft: { anchorX: "left", anchorY: "bottom", label: "Bottom Left" },
	topRight: { anchorX: "right", anchorY: "top", label: "Top Right" },
	topLeft: { anchorX: "left", anchorY: "top", label: "Top Left" },
});

export const DEFAULT_EXCLUDED_ACTOR_TYPES = "encounter,group,vehicle";

