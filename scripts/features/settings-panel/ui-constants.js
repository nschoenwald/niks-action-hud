
/**
 * Theme registry and visual metadata for Nik's Action HUD.
 * Exclusively designed for Foundry V14.
 */
export const THEMES = Object.freeze({
	carolingian: {
		id: "carolingian",
		label: "NAH.Themes.Carolingian",
		defaultLabel: "Carolingian UI",
		description: "Frosted glass, clean type",
		colors: {
			bg: "#15181c",
			surface: "#1b1f24",
			border: "#4493ad",
			accent: "#7ab6c4",
			text: "#f4f2f6",
		},
		icon: "fas fa-feather-pointed",
		requiresModule: "crlngn-ui",
	},
	arcanum: {
		id: "arcanum",
		label: "NAH.Themes.Arcanum",
		defaultLabel: "Arcanum",
		badge: "Default",
		description: "Astral velvet and gold filigree",
		colors: {
			bg: "#0a0b1c",
			surface: "#14152e",
			border: "#e0b84e",
			accent: "#ffd97a",
			text: "#f3f1ff",
		},
		icon: "fas fa-wand-sparkles",
	},
	obsidian: {
		id: "obsidian",
		label: "NAH.Themes.Obsidian",
		defaultLabel: "Obsidian",
		description: "Dark onyx with mint accents",
		colors: {
			bg: "#06090b",
			surface: "#0f1518",
			border: "#2fd6a1",
			accent: "#7bf0cb",
			text: "#f4fffb",
		},
		icon: "fas fa-gem",
	},
	grimoire: {
		id: "grimoire",
		label: "NAH.Themes.Grimoire",
		defaultLabel: "Grimoire",
		description: "Aged parchment and forged iron",
		colors: {
			bg: "#120d09",
			surface: "#20170f",
			border: "#d98a1c",
			accent: "#f2b350",
			text: "#f6ead2",
		},
		icon: "fas fa-book-skull",
	},
	eldritch: {
		id: "eldritch",
		label: "NAH.Themes.Eldritch",
		defaultLabel: "Eldritch",
		description: "Cosmic horror, bioluminescent cyan",
		colors: {
			bg: "#070812",
			surface: "#101226",
			border: "#19c6d8",
			accent: "#8af3ff",
			text: "#eafcff",
		},
		icon: "fas fa-eye",
	},
	valiant: {
		id: "valiant",
		label: "NAH.Themes.Valiant",
		defaultLabel: "Valiant",
		description: "Plate steel, sapphire and gold",
		colors: {
			bg: "#090d16",
			surface: "#121a2b",
			border: "#4f8cff",
			accent: "#9dc0ff",
			text: "#eef3ff",
		},
		icon: "fas fa-shield",
	},
	sylvan: {
		id: "sylvan",
		label: "NAH.Themes.Sylvan",
		defaultLabel: "Sylvan",
		description: "Druidic ironwood and living green",
		colors: {
			bg: "#08110b",
			surface: "#112016",
			border: "#52d27f",
			accent: "#b8f0a2",
			text: "#effbf1",
		},
		icon: "fas fa-leaf",
	},
	infernal: {
		id: "infernal",
		label: "NAH.Themes.Infernal",
		defaultLabel: "Infernal",
		description: "Brimstone, basalt and hellfire",
		colors: {
			bg: "#12070a",
			surface: "#231012",
			border: "#ff6a3d",
			accent: "#ffb066",
			text: "#fff1e8",
		},
		icon: "fas fa-fire-flame-curved",
	},
	frostborn: {
		id: "frostborn",
		label: "NAH.Themes.Frostborn",
		defaultLabel: "Frostborn",
		description: "Glacial ice and aurora sheen",
		colors: {
			bg: "#07101a",
			surface: "#0f1c2c",
			border: "#62c8f5",
			accent: "#bdeaff",
			text: "#f0f9ff",
		},
		icon: "fas fa-snowflake",
	},
	clockwork: {
		id: "clockwork",
		label: "NAH.Themes.Clockwork",
		defaultLabel: "Clockwork",
		description: "Brass, copper and filament amber",
		colors: {
			bg: "#0d0b08",
			surface: "#1a1610",
			border: "#f0a020",
			accent: "#ffd27a",
			text: "#f8efdc",
		},
		icon: "fas fa-gear",
	},
	radiant: {
		id: "radiant",
		label: "NAH.Themes.Radiant",
		defaultLabel: "Radiant",
		description: "Alabaster marble and sun gold",
		colors: {
			bg: "#130f06",
			surface: "#241b0a",
			border: "#ffd23f",
			accent: "#fff0a1",
			text: "#fff9e3",
		},
		icon: "fas fa-sun",
	},
	ossuary: {
		id: "ossuary",
		label: "NAH.Themes.Ossuary",
		defaultLabel: "Ossuary",
		description: "Tombstone slate and soulflame",
		colors: {
			bg: "#0a100f",
			surface: "#151f1d",
			border: "#66d9c4",
			accent: "#bff3e6",
			text: "#f3f1e6",
		},
		icon: "fas fa-skull",
	},
	shadowdark: {
		id: "shadowdark",
		label: "NAH.Themes.Shadowdark",
		defaultLabel: "Shadowdark",
		description: "Grim OSR inks, purple and torchlight",
		colors: {
			bg: "#07070a",
			surface: "#101016",
			border: "#b45fd1",
			accent: "#f4b03a",
			text: "#f2efe6",
		},
		icon: "fas fa-dungeon",
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
 * Returns the default theme ID based on active modules.
 * Defaults to "carolingian" if Carolingian UI (crlngn-ui) is installed and active;
 * otherwise defaults to "arcanum".
 *
 * @returns {string}
 */
export function getDefaultTheme() {
	if (game.system?.id === "shadowdark") return "shadowdark";
	return isThemeAvailable("carolingian") ? "carolingian" : "arcanum";
}

export const DEFAULT_HIDDEN_ACTOR_TYPES = "encounter,group,vehicle";

export const BUTTON_SHAPES = Object.freeze({
	arcanum: {
		id: "arcanum",
		label: "Arcanum (Slanted Parallelogram)",
	},
	carolingian: {
		id: "carolingian",
		label: "Carolingian (Rounded)",
	},
	clockwork: {
		id: "clockwork",
		label: "Clockwork (Chamfered Octagon)",
	},
	eldritch: {
		id: "eldritch",
		label: "Eldritch (Asymmetric Notch)",
	},
	frostborn: {
		id: "frostborn",
		label: "Frostborn (Pointed Hexagon)",
	},
	grimoire: {
		id: "grimoire",
		label: "Grimoire (Slightly Rounded)",
	},
	infernal: {
		id: "infernal",
		label: "Infernal (Asymmetric Slant)",
	},
	obsidian: {
		id: "obsidian",
		label: "Obsidian (Rounded Rectangle)",
	},
	ossuary: {
		id: "ossuary",
		label: "Ossuary (Angled Tombstone)",
	},
	radiant: {
		id: "radiant",
		label: "Radiant (Pointed Octagon)",
	},
	sylvan: {
		id: "sylvan",
		label: "Sylvan (Trapezoid Slant)",
	},
	valiant: {
		id: "valiant",
		label: "Valiant (Chevron Banner)",
	},
	shadowdark: {
		id: "shadowdark",
		label: "Shadowdark (Chiselled Chamfer)",
	},
});
