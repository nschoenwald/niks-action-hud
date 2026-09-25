/**
 * Theme Export/Import — packs theme config + referenced
 * local images into a .zip. On import, images are uploaded to Foundry
 * user-data and paths in the JSON are updated.
 * Exclusively designed for Foundry V14.
 */

import { MODULE_ID } from "../constants.js";

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

function _isLocalPath(p) {
	if (!p || typeof p !== "string") return false;
	if (p.startsWith("http://") || p.startsWith("https://")) return false;
	if (p.startsWith("icons/svg/")) return false;
	return true;
}

function collectImagePaths(config) {
	const paths = new Set();
	const add = (p) => { if (_isLocalPath(p)) paths.add(p); };

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
	c.theme = full.theme || "rift";
	c.actionMenuFont = full.actionMenuFont || "";
	c.actionMenuEmphasizeFirstButton = full.actionMenuEmphasizeFirstButton ?? true;

	c.customMenu = full.customMenu || [];
	c.adapterCategoryOverrides = full.adapterCategoryOverrides || {};

	return c;
}

async function fetchBlob(path) {
	const res = await fetch(path);
	if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${path}`);
	return res.blob();
}

function fileNameFromPath(p) {
	return p.split("/").pop().split("?")[0];
}

export async function exportThemeZip(fullConfig, themeName = "custom-theme") {
	const JSZip = await loadJSZip();
	const zip = new JSZip();

	const imagePaths = collectImagePaths(fullConfig);
	const pathToLocalName = new Map();
	const usedNames = new Set();

	let imgIdx = 0;
	for (const origPath of imagePaths) {
		let baseName = fileNameFromPath(origPath) || `img_${imgIdx}`;
		if (usedNames.has(baseName)) {
			baseName = `${imgIdx}_${baseName}`;
		}
		usedNames.add(baseName);
		pathToLocalName.set(origPath, baseName);
		imgIdx++;
	}

	const imgFolder = zip.folder("images");
	let failedCount = 0;

	for (const [origPath, zipName] of pathToLocalName.entries()) {
		try {
			const blob = await fetchBlob(origPath);
			imgFolder.file(zipName, blob);
		} catch (err) {
			console.warn(`[Nik's Action HUD] Theme export: failed to fetch ${origPath}:`, err);
			failedCount++;
		}
	}

	const exportCfg = buildExportConfig(fullConfig);
	const rewritePath = (p) => pathToLocalName.has(p) ? `images/${pathToLocalName.get(p)}` : p;

	for (const cat of (exportCfg.customMenu || [])) {
		if (cat.img) cat.img = rewritePath(cat.img);
		if (cat.buttonImg) cat.buttonImg = rewritePath(cat.buttonImg);
		for (const l of (cat.buttonFrameLayers || [])) l.src = rewritePath(l.src);
	}
	for (const override of Object.values(exportCfg.adapterCategoryOverrides || {})) {
		if (override?.img) override.img = rewritePath(override.img);
		if (override?.buttonImg) override.buttonImg = rewritePath(override.buttonImg);
		for (const l of (override?.buttonFrameLayers || [])) l.src = rewritePath(l.src);
	}

	zip.file("theme.json", JSON.stringify(exportCfg, null, 2));

	const zipBlob = await zip.generateAsync({ type: "blob" });
	saveDataToFile(zipBlob, "application/zip", `${themeName}.zip`);

	if (failedCount > 0) {
		ui.notifications.warn(
			game.i18n.format("IBHUD.ThemeExport.PartialWarning", { count: failedCount })
		);
	} else {
		ui.notifications.info(game.i18n.localize("IBHUD.ThemeExport.Success"));
	}
}

export async function importThemeZip(file) {
	const JSZip = await loadJSZip();
	const zip = await JSZip.loadAsync(file);

	const jsonFile = zip.file("theme.json");
	if (!jsonFile) {
		throw new Error(game.i18n.localize("IBHUD.ThemeImport.NoJsonError"));
	}

	const config = JSON.parse(await jsonFile.async("string"));
	const targetFolder = "uploaded-themes";

	try {
		await FilePicker.createDirectory("data", targetFolder);
	} catch {
		// Directory already exists
	}

	const imgMap = new Map();
	const imageEntries = Object.keys(zip.files).filter(
		(name) => name.startsWith("images/") && !zip.files[name].dir
	);

	for (const name of imageEntries) {
		const baseName = name.replace("images/", "");
		const blob = await zip.files[name].async("blob");
		const imgFile = new File([blob], baseName, { type: blob.type });

		try {
			const result = await FilePicker.upload("data", targetFolder, imgFile, {});
			imgMap.set(name, result.path);
		} catch (uploadErr) {
			console.warn(`[Nik's Action HUD] Failed to upload ${name}:`, uploadErr);
		}
	}

	const resolve = (p) => imgMap.has(p) ? imgMap.get(p) : p;

	for (const cat of (config.customMenu || [])) {
		if (cat.img) cat.img = resolve(cat.img);
		if (cat.buttonImg) cat.buttonImg = resolve(cat.buttonImg);
		for (const l of (cat.buttonFrameLayers || [])) l.src = resolve(l.src);
	}
	for (const override of Object.values(config.adapterCategoryOverrides || {})) {
		if (override?.img) override.img = resolve(override.img);
		if (override?.buttonImg) override.buttonImg = resolve(override.buttonImg);
		for (const l of (override?.buttonFrameLayers || [])) l.src = resolve(l.src);
	}

	return config;
}
