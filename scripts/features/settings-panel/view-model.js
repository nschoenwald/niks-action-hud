import { getProfile } from "../../core/profile.js";
import { defaultDrawerNav, drawerNavOf } from "../../core/drawer-nav.js";
import { buildBackupSections, buildSettingSections } from "./panel-rows.js";
import { LOCKABLE_KEYS } from "../../core/setting-schema.js";
import { THEMES, isThemeAvailable, getDefaultTheme, DEFAULT_HIDDEN_ACTOR_TYPES, BUTTON_SHAPES } from "./ui-constants.js";
import { getLockState } from "./settings-locks.js";
import { localizeCategory } from "../../core/localization.js";

/** Short names for the system tab (the systems' own titles are too long for the sidebar). */
const SYSTEM_TAB_LABELS = Object.freeze({ dnd5e: "D&D 5e", shadowdark: "Shadowdark" });
const SYSTEM_TAB_ICONS = Object.freeze({ dnd5e: "fas fa-dragon", shadowdark: "ra ra-torch" });

/**
 * Fonts offered for the HUD: the Latin-subset faces bundled with the module (they cover the six UI
 * languages) plus two of Foundry's own, in 400/600/700 where available. Fixed on purpose: a list built from
 * whatever fonts other modules declare can include symbol or non-Latin fonts that break every label.
 */
const HUD_FONTS = Object.freeze([
	"Teko", "Oswald", "Rajdhani", "Barlow Semi Condensed", "Montserrat", "Inter", "Outfit", "Work Sans",
	"Signika", "Modesto Condensed",
	"Cinzel", "Cormorant Garamond", "Crimson Pro", "Alegreya", "Marcellus", "Roboto Slab",
]);
/** Display faces that suit headings better than small labels. */
const DECORATIVE_FONTS = Object.freeze(["MedievalSharp", "UnifrakturMaguntia", "Almendra"]);

const collectFontFamilies = (currentFont = "") => {
	const defaultLabel = game.i18n.localize("NAH.Config.FontInherit") || "Default Font";
	const decorativeNote = game.i18n.localize("NAH.Config.FontDecorative") || "decorative";
	const list = [
		{ value: "", label: defaultLabel },
		...HUD_FONTS.map((value) => ({ value, label: value })),
		...DECORATIVE_FONTS.map((value) => ({ value, label: `${value} (${decorativeNote})` })),
	];
	// A font saved earlier that is no longer offered stays selectable, so opening the panel never changes it.
	if (currentFont && !list.some((entry) => entry.value === currentFont)) list.push({ value: currentFont, label: currentFont });
	return list;
};

const prepareButtonShapeList = () => {
	const defaultLabel = game.i18n?.localize?.("NAH.Config.ShapeDefault") || "Default (from Theme)";
	return [
		{ value: "", label: defaultLabel },
		...Object.entries(BUTTON_SHAPES).map(([value, meta]) => ({ value, label: meta.label })),
	];
};

// ── Context sections ────────────────────────────────────

const parseTypeList = (csv) => (csv || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);

function listActorTypes() {
	const declared = game.system.documentTypes?.Actor;
	if (Array.isArray(declared)) return declared;
	return declared && typeof declared === "object" ? Object.keys(declared) : [];
}

function describeLayoutCategories(app) {
	const starter = window.NikHUD?.provider?.getStarterLayout?.() ?? [];
	return (app.draft.data.layoutCategories || []).map((cat) => {
		const nav = drawerNavOf(cat, starter);
		const systemDefault = defaultDrawerNav(cat, starter);
		return {
			...cat,
			displayLabel: localizeCategory(cat.label, cat.sectionId),
			isFolded: app._foldedCategories.has(cat),
			navOptions: ["top", "side"].map((value) => ({
				value,
				checked: nav === value,
				isDefault: systemDefault === value,
			})),
		};
	});
}

/** The Carolingian card follows crlngn-ui's live palette when that module is active. */
function carolingianColors(base) {
	const colors = { ...base };
	try {
		const style = getComputedStyle(document.body);
		const read = (name) => style.getPropertyValue(name)?.trim();
		const highlight = read("--color-highlights");
		const dark = read("--color-dark-bg");
		const darkSoft = read("--color-dark-bg-90") || read("--color-dark-bg-85");
		const warm = read("--color-warm-1");
		if (highlight) colors.border = highlight;
		if (warm || highlight) colors.accent = warm || highlight;
		if (dark) colors.bg = dark;
		if (darkSoft || dark) colors.surface = darkSoft || dark;
	} catch (_) {
		// keep the predefined palette
	}
	return colors;
}

function describeThemes(activeId) {
	return Object.values(THEMES)
		.filter((meta) => isThemeAvailable(meta))
		.map((meta) => ({
			...meta,
			colors: meta.id === "carolingian" && game.modules?.get("crlngn-ui")?.active ? carolingianColors(meta.colors) : { ...meta.colors },
			label: game.i18n.localize(meta.label) || meta.defaultLabel,
			isActive: meta.id === activeId,
		}));
}

const SAMPLE_RIBBON = [
	["Attacks", "attacks", "fas fa-swords"],
	["Spells", "spells", "fas fa-hand-sparkles"],
	["Features", "features", "fas fa-star"],
	["Abilities", "abilities", "fas fa-dice-d20"],
	["Items", "items", "fas fa-backpack"],
];

function describeSampleButtons() {
	return SAMPLE_RIBBON.map(([name, sectionId, icon]) => {
		const label = localizeCategory(name, sectionId);
		const length = (label || "").trim().length;
		const fit = length > 10 ? Math.max(0.62, Math.min(1.0, Math.round((10.5 / length) * 100) / 100)) : 1.0;
		return { label, icon, labelScale: fit < 1.0 ? fit : null };
	});
}

/**
 * For a user without SETTINGS_MODIFY, world rows are shown greyed out: a save only writes their client
 * settings, so editing a world row would be silently discarded. Disabled inputs are skipped by the form reader.
 */
function greyOutWorldRows(sections) {
	const reason = game.i18n.localize("NAH.Panel.GmOnly");
	const markRows = (list) => list.map((section) => ({
		...section,
		rows: section.rows.map((row) => (row.scope.id === "world" ? { ...row, blockedReason: reason, disabled: true } : row)),
	}));
	return Object.fromEntries(Object.entries(sections).map(([tab, list]) => [tab, markRows(list)]));
}

/** GM-only tabs (Customize HUD, Backup) and a missing System tab fall back to "all". */
function resolveActiveTab(requested, { canConfigure, hasSystemTab }) {
	const tab = requested || "all";
	const unavailable = (tab === "system" && !hasSystemTab) || (!canConfigure && (tab === "customize" || tab === "presets"));
	return unavailable ? "all" : tab;
}

export const buildContext = async (app) => {
	const fontList = collectFontFamilies(app.draft.data.fontFamily);
	const buttonShapeList = prepareButtonShapeList();
	const settingLocks = Object.fromEntries(LOCKABLE_KEYS.map((key) => [key, getLockState(key)]));
	const profile = getProfile();
	if (!app.draft.isSeeded) app.draft.seed(profile);

	const isGM = game.user.isGM;
	const canConfigure = game.user.can("SETTINGS_MODIFY");
	const actorTypes = listActorTypes();

	const hiddenTypeList = parseTypeList(app.draft.data.hiddenActorTypes ?? DEFAULT_HIDDEN_ACTOR_TYPES);
	const actorTypeChips = actorTypes.map((type) => ({
		value: type,
		label: type[0].toUpperCase() + type.slice(1),
		checked: hiddenTypeList.includes(type.toLowerCase()),
	}));

	let currentTheme = app.draft.data.theme || getDefaultTheme();
	if (!isThemeAvailable(currentTheme)) {
		currentTheme = getDefaultTheme();
		app.draft.data.theme = currentTheme;
	}

	const allSections = buildSettingSections(app.draft.data, settingLocks, { fonts: fontList, buttonShapes: buttonShapeList });
	const settingSections = canConfigure ? allSections : greyOutWorldRows(allSections);
	const hasSystemTab = settingSections.system.length > 0;
	const activeTab = resolveActiveTab(app.activeTab, { canConfigure, hasSystemTab });

	return {
		isGM,
		canConfigure,
		activeTab,
		hasSystemTab,
		gmOnlyTitle: game.i18n.localize("NAH.Panel.GmOnly"),
		systemTabLabel: SYSTEM_TAB_LABELS[game.system.id] ?? game.system.title,
		systemTabIcon: SYSTEM_TAB_ICONS[game.system.id] ?? "fas fa-dragon",
		isAllTab: activeTab === "all",
		isBehaviorTab: activeTab === "behavior",
		isSystemTab: activeTab === "system",
		isAppearanceTab: activeTab === "appearance",
		isCustomizeTab: activeTab === "customize",
		isPresetsTab: activeTab === "presets",

		...app.draft.data,

		theme: currentTheme,
		themeCards: describeThemes(currentTheme),
		actorTypeChips,
		sampleButtons: describeSampleButtons(),
		layoutCategories: describeLayoutCategories(app),
		backupSections: buildBackupSections(),
		settingSections,
	};
};
