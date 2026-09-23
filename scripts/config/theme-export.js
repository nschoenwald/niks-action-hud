/**
 * Theme Export/Import — packs global custom-theme config + referenced
 * local images into a .zip.  On import images are uploaded to Foundry
 * user-data and all paths in the JSON are rewritten.
 * Excludes portrait gallery variants and per-actor overrides.
 */

import { ELEMENT_IMAGE_GROUPS, AM_ELEMENTS, coerceNullableNumber, normalizeConditionsLayout } from "./schema.js";
import { MODULE_ID } from "../constants.js";

// ── JSZip lazy loader ────────────────────────────────

let _JSZip = null;

async function loadJSZip() {
	if (_JSZip) return _JSZip;
	if (window.JSZip) { _JSZip = window.JSZip; return _JSZip; }
	return new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = `modules/${MODULE_ID}/scripts/lib/jszip.min.js`;
		script.onload = () => { _JSZip = window.JSZip; resolve(_JSZip); };
		script.onerror = () => reject(new Error("Failed to load JSZip"));
		document.head.appendChild(script);
	});
}

// ── Image path helpers ───────────────────────────────

function _isLocalPath(p) {
	if (!p || typeof p !== "string") return false;
	if (p.startsWith("http://") || p.startsWith("https://")) return false;
	if (p.startsWith("icons/svg/")) return false; // Foundry built-in icons
	return true;
}

/**
 * Walk the config and collect every local image path.
 */
function collectImagePaths(config) {
	const paths = new Set();
	const add = (p) => { if (_isLocalPath(p)) paths.add(p); };

	// 1 — Global portrait layers
	for (const l of (config.portraitLayers || [])) add(l.src);

	// 2 — Global card-background layers
	for (const l of (config.cardBgLayers || [])) add(l.src);

	// 3 — Menu / sub-menu panel layers
	for (const l of (config.amMenuLayers || [])) add(l.src);
	for (const l of (config.amSubMenuLayers || [])) add(l.src);

	// 4 — AM element layers (schema-driven)
	for (const el of AM_ELEMENTS) {
		for (const l of (config[`${el.id}Layers`] || [])) add(l.src);
	}

	// 5 — Global element-image defaults
	for (const group of ELEMENT_IMAGE_GROUPS) {
		add(config[`${group.global}Img`]);
	}

	// 6 — Global attributes (per-attribute images + badge conditions)
	for (const attr of (config.globalAttributes || [])) {
		add(attr.iconImg);
		for (const group of ELEMENT_IMAGE_GROUPS) {
			add(attr[`${group.local}Img`]);
		}
		for (const cond of (attr.badgeConditions || [])) {
			add(cond.img);
		}
	}

	// 7 — Image rules (keyed by actorId)
	if (config.imageRules && typeof config.imageRules === "object") {
		for (const rules of Object.values(config.imageRules)) {
			if (Array.isArray(rules)) {
				for (const r of rules) {
					add(r.img);
					add(r.speakingImg);
				}
			}
		}
	}

	// 8 — Status-effect overlays
	for (const fx of (config.statusEffects || [])) add(fx.overlayPath);

	// 9 — Custom-menu icons
	for (const cat of (config.customMenu || [])) {
		add(cat.img);
		add(cat.buttonImg);
		for (const layer of (cat.buttonFrameLayers || [])) add(layer.src);
	}
	for (const override of Object.values(config.adapterCategoryOverrides || {})) {
		add(override?.img);
		add(override?.buttonImg);
		for (const layer of (override?.buttonFrameLayers || [])) add(layer.src);
	}


	return paths;
}

function buildExportConfig(full) {
	const c = {};

	c.theme = full.theme;
	c.fontFamily = full.fontFamily;
	c.fontFamilySub = full.fontFamilySub;
	c.actionMenuFont = full.actionMenuFont;
	c.actionMenuEmphasizeFirstButton = full.actionMenuEmphasizeFirstButton ?? true;

	c.portraitLayers = full.portraitLayers || [];
	c.cardBgLayers = full.cardBgLayers || [];
	c.amMenuLayers = full.amMenuLayers || [];
	c.amSubMenuLayers = full.amSubMenuLayers || [];

	for (const el of AM_ELEMENTS) {
		c[`${el.id}Layers`] = full[`${el.id}Layers`] || [];
		c[`${el.id}Color`] = full[`${el.id}Color`] || "";
	}

	for (const group of ELEMENT_IMAGE_GROUPS) {
		for (const prop of group.props) {
			const key = `${group.global}${prop.suffix}`;
			if (full[key] !== undefined) c[key] = full[key];
		}
	}

	c.globalAttributes = full.globalAttributes || [];
	c.imageRules = full.imageRules || {};
	c.statusEffects = full.statusEffects || [];
	c.customMenu = full.customMenu || [];
	c.adapterCategoryOverrides = full.adapterCategoryOverrides || {};

	c.globalCardWidth = full.globalCardWidth;
	c.globalCardHeight = full.globalCardHeight;
	c.globalPortraitWidth = full.globalPortraitWidth;
	c.globalPortraitHeight = full.globalPortraitHeight;
	c.globalBarScale = full.globalBarScale;
	c.globalCollapseSize = full.globalCollapseSize;
	c.globalCollapseWidth = full.globalCollapseWidth;
	c.globalCollapseHeight = full.globalCollapseHeight;
	c.globalCollapseBorderRadius = full.globalCollapseBorderRadius;
	c.globalCollapseBorderColor = full.globalCollapseBorderColor;
	c.globalCollapseBgColor = full.globalCollapseBgColor;
	c.globalCollapsePortraitX = full.globalCollapsePortraitX;
	c.globalCollapsePortraitY = full.globalCollapsePortraitY;
	c.globalCollapsePortraitScale = full.globalCollapsePortraitScale;

	c.globalNameX = full.globalNameX;
	c.globalNameY = full.globalNameY;
	c.globalNameZ = full.globalNameZ;
	c.globalNameScale = full.globalNameScale;
	c.globalNameRotation = full.globalNameRotation;
	c.globalNameColor = full.globalNameColor;

	c.globalBarsX = full.globalBarsX;
	c.globalBarsY = full.globalBarsY;
	c.globalBarsZ = full.globalBarsZ;
	c.globalDotsX = full.globalDotsX;
	c.globalDotsY = full.globalDotsY;
	c.globalDotsZ = full.globalDotsZ;
	c.globalNumbersX = full.globalNumbersX;
	c.globalNumbersY = full.globalNumbersY;
	c.globalNumbersZ = full.globalNumbersZ;
	c.globalBadgesX = full.globalBadgesX;
	c.globalBadgesY = full.globalBadgesY;
	c.globalBadgesZ = full.globalBadgesZ;
	c.globalConditionsZ = full.globalConditionsZ;

	c.globalPortraitX = full.globalPortraitX;
	c.globalPortraitY = full.globalPortraitY;
	c.globalPortraitScale = full.globalPortraitScale;
	c.globalFormat = full.globalFormat;

	c.conditionsX = full.conditionsX;
	c.conditionsY = full.conditionsY;
	c.conditionsLayout = normalizeConditionsLayout(full.conditionsLayout);
	c.endTurnX = full.endTurnX;
	c.endTurnY = full.endTurnY;
	c.globalScale = full.globalScale;
	c.globalGap = full.globalGap;

	return c;
}

const GLOBAL_COLLAPSE_NUMBER_FIELDS = [
	"globalCollapseSize",
	"globalCollapseWidth",
	"globalCollapseHeight",
	"globalCollapseBorderRadius",
	"globalCollapsePortraitX",
	"globalCollapsePortraitY",
	"globalCollapsePortraitScale",
];

const ACTOR_COLLAPSE_NUMBER_FIELDS = [
	"collapseSize",
	"collapseWidth",
	"collapseHeight",
	"collapseBorderRadius",
	"collapsePortraitX",
	"collapsePortraitY",
	"collapsePortraitScale",
];

function normalizeConditionLayouts(config) {
	if (!config || typeof config !== "object") return;
	if ("conditionsLayout" in config) {
		config.conditionsLayout = normalizeConditionsLayout(config.conditionsLayout);
	}
	if (!config.actorSettings || typeof config.actorSettings !== "object") return;
	for (const settings of Object.values(config.actorSettings)) {
		if (!settings || typeof settings !== "object" || !("conditionsLayout" in settings)) continue;
		settings.conditionsLayout = settings.conditionsLayout ? normalizeConditionsLayout(settings.conditionsLayout) : null;
	}
}

function normalizeCollapseShapeNumbers(config) {
	if (!config || typeof config !== "object") return;

	for (const key of GLOBAL_COLLAPSE_NUMBER_FIELDS) {
		if (key in config) config[key] = coerceNullableNumber(config[key]);
	}

	if (!config.actorSettings || typeof config.actorSettings !== "object") return;
	for (const settings of Object.values(config.actorSettings)) {
		if (!settings || typeof settings !== "object") continue;
		for (const key of ACTOR_COLLAPSE_NUMBER_FIELDS) {
			if (key in settings) settings[key] = coerceNullableNumber(settings[key]);
		}
	}
}

// ── Export ────────────────────────────────────────────

export async function exportTheme() {
	const JSZip = await loadJSZip();
	const zip = new JSZip();

	const fullConfig = game.settings.get(MODULE_ID, "configuration");
	const exportConfig = buildExportConfig(fullConfig);
	const imagePaths = collectImagePaths(exportConfig);

	const pathMap = {};
	let idx = 0;
	const imgFolder = zip.folder("images");
	const warnings = [];

	for (const path of imagePaths) {
		try {
			const resp = await fetch(path);
			if (!resp.ok) { warnings.push(`HTTP ${resp.status}: ${path}`); continue; }
			const blob = await resp.blob();
			const safeName = `${String(idx).padStart(3, "0")}_${path.split("/").pop()}`;
			imgFolder.file(safeName, blob);
			pathMap[path] = `images/${safeName}`;
			idx++;
		} catch (err) {
			warnings.push(`${path}: ${err.message}`);
		}
	}

	let json = JSON.stringify(exportConfig);
	for (const [original, zipPath] of Object.entries(pathMap)) {
		json = json.replaceAll(JSON.stringify(original), JSON.stringify(zipPath));
	}

	zip.file("theme.json", json);
	zip.file("manifest.json", JSON.stringify({
		version: 1,
		module: MODULE_ID,
		moduleVersion: game.modules.get(MODULE_ID)?.version || "unknown",
		gameSystem: game.system.id,
		exportDate: new Date().toISOString(),
		imageCount: idx,
	}));

	const blob = await zip.generateAsync({ type: "blob" });
	const a = document.createElement("a");
	a.href = window.URL.createObjectURL(blob);
	a.download = `action-hud-theme-${Date.now()}.zip`;
	a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
	setTimeout(() => window.URL.revokeObjectURL(a.href), 100);

	return { success: true, imageCount: idx, warnings };
}

// ── Import ───────────────────────────────────────────

export async function importTheme() {
	const JSZip = await loadJSZip();

	const file = await new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".zip";
		input.addEventListener("change", () => resolve(input.files[0] || null));
		input.click();
	});
	if (!file) return { success: false, error: "Cancelled" };

	const zip = await JSZip.loadAsync(file);

	const themeFile = zip.file("theme.json");
	if (!themeFile) return { success: false, error: "Invalid theme package: missing theme.json" };

	let manifest = {};
	const manifestFile = zip.file("manifest.json");
	if (manifestFile) manifest = JSON.parse(await manifestFile.async("string"));

	let themeConfig = JSON.parse(await themeFile.async("string"));

	const timestamp = Date.now();
	const uploadDir = `action-hud-themes/${timestamp}`;

	try {
		await FilePicker.createDirectory("data", "action-hud-themes").catch(() => {});
		await FilePicker.createDirectory("data", uploadDir).catch(() => {});
	} catch (err) {
		console.warn("Nik's Action HUD Import | Directory creation note:", err.message);
	}

	const pathRewrites = {};
	const warnings = [];

	for (const [relPath, entry] of Object.entries(zip.files)) {
		if (!relPath.startsWith("images/") || entry.dir) continue;
		try {
			const blob = await entry.async("blob");
			const fileName = relPath.replace("images/", "");
			const result = await FilePicker.upload("data", uploadDir, new File([blob], fileName), {});
			if (result?.path) {
				pathRewrites[relPath] = result.path;
			} else {
				warnings.push(`Upload returned no path: ${fileName}`);
			}
		} catch (err) {
			warnings.push(`${relPath}: ${err.message}`);
		}
	}

	let json = JSON.stringify(themeConfig);
	for (const [zipPath, realPath] of Object.entries(pathRewrites)) {
		json = json.replaceAll(JSON.stringify(zipPath), JSON.stringify(realPath));
	}
	themeConfig = JSON.parse(json);

	if (manifest.gameSystem && manifest.gameSystem !== game.system.id) {
		delete themeConfig.customMenu;
		delete themeConfig.adapterCategoryOverrides;
	}

	// Empty customMenu means the exporter never customized it (system defaults were used at runtime).
	// Preserve the importer's existing menu instead of overwriting with an empty array.
	if (Array.isArray(themeConfig.customMenu) && themeConfig.customMenu.length === 0) {
		delete themeConfig.customMenu;
	}
	normalizeConditionLayouts(themeConfig);
	normalizeCollapseShapeNumbers(themeConfig);

	const existing = foundry.utils.deepClone(
		game.settings.get(MODULE_ID, "configuration"),
	);

	const merged = foundry.utils.mergeObject(existing, themeConfig, {
		overwrite: true,
		insertKeys: true,
		insertValues: true,
	});

	await game.settings.set(MODULE_ID, "configuration", merged);

	return {
		success: true,
		imageCount: Object.keys(pathRewrites).length,
		warnings,
		manifest,
	};
}
