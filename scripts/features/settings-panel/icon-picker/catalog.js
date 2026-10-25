import { MODULE_ID } from "../../../core/ids.js";
import { collatorFor } from "../../../core/text.js";

const RULE = /([^{}]+)\{([^{}]*)\}/g;

const CONTENT_DECLARATION = /(?:^|;)\s*content\s*:/;

const RPG_AWESOME_CSS = `modules/${MODULE_ID}/styles/vendor/rpg-awesome.min.css`;

const IMPORT_URL = /@import\s+(?:url\(\s*)?["']?([^"')\s;]+)["']?\s*\)?/g;

const FA_ICON_SELECTOR = /^\.fa-([a-z0-9-]+)(?:::?before)?$/;

const RA_ICON_SELECTOR = /^\.ra-([a-z0-9-]+)::?before$/;

const BRANDS_SELECTOR = /\.(fa-brands|fab)\b/;

const GLYPH_DECLARATION = /(?:^|;)\s*(?:--fa|content)\s*:/;

const FAMILY_DECLARATION = /(?:^|;)\s*(?:--fa-family|font-family)\s*:/;

const UTILITY_NAMES = new Set([
	"duotone", "swap-opacity", "spin", "spin-pulse", "spin-reverse", "pulse", "beat", "beat-fade", "fade",
	"bounce", "shake", "flip", "flip-horizontal", "flip-vertical", "flip-both", "rotate-90", "rotate-180",
	"rotate-270", "rotate-by", "border", "fw", "li", "ul", "stack", "stack-1x", "stack-2x", "inverse",
	"pull-left", "pull-right", "sr-only", "sr-only-focusable", "2xs", "xs", "sm", "lg", "xl", "2xl",
	"1x", "2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "10x",
]);

const MAX_STYLESHEETS = 48;

const MAX_IMPORT_DEPTH = 3;

const ENOUGH_NAMES = 100;

const LIKELY_ICON_CSS = /font-?awesome|\bfa\b/i;

const EMPTY_FA_CATALOG = Object.freeze({ all: [], brands: [], classic: [] });

let fontAwesomeCatalog;

let fontAwesomePending;

let rpgAwesomeNames;

let rpgAwesomePending;

const isBrandsSelector = (selectorText) => {
	const parts = selectorText.split(",").map((part) => part.trim()).filter(Boolean);
	return parts.length > 0 && parts.every((part) => BRANDS_SELECTOR.test(part));
};

const namesInSelector = (selectorText, pattern) => {
	const out = [];
	for (const part of selectorText.split(",")) {
		const name = pattern.exec(part.trim())?.[1];
		if (name && !UTILITY_NAMES.has(name)) out.push(name);
	}
	return out;
};

const glyphOf = (rule) => rule.style.getPropertyValue("--fa") || rule.style.getPropertyValue("content");

const declaresFamily = (rule) => rule.style.getPropertyValue("--fa-family").length > 0 || rule.style.fontFamily.length > 0;

const forEachStyleRule = (rules, visit) => {
	for (const rule of Array.from(rules)) {
		if (rule instanceof CSSImportRule) {
			try {
				if (rule.styleSheet) forEachStyleRule(rule.styleSheet.cssRules, visit);
			} catch {
				continue;
			}
			continue;
		}
		if (rule instanceof CSSGroupingRule) {
			forEachStyleRule(rule.cssRules, visit);
			continue;
		}
		if (rule instanceof CSSStyleRule) visit(rule);
	}
};

const forEachDocumentRule = (visit) => {
	for (const sheet of Array.from(document.styleSheets)) {
		try {
			forEachStyleRule(sheet.cssRules, visit);
		} catch {
			continue;
		}
	}
};

const fontAwesomeFromCssom = () => {
	const all = new Set();
	const brands = new Set();
	let inBrands = false;

	forEachDocumentRule((rule) => {
		if (!rule.selectorText.includes(".fa")) return;
		if (declaresFamily(rule)) {
			inBrands = isBrandsSelector(rule.selectorText);
			return;
		}
		if (!glyphOf(rule).trim()) return;
		for (const name of namesInSelector(rule.selectorText, FA_ICON_SELECTOR)) {
			all.add(name);
			if (inBrands) brands.add(name);
		}
	});

	return { all: [...all], brands: [...brands] };
};

const parseFontAwesomeCss = (text) => {
	const all = new Set();
	const brands = new Set();
	let inBrands = false;

	for (const match of text.matchAll(RULE)) {
		const selector = match[1].slice(match[1].lastIndexOf("}") + 1).trim();
		const body = match[2];
		if (!selector.includes(".fa")) continue;
		if (FAMILY_DECLARATION.test(body)) {
			inBrands = isBrandsSelector(selector);
			continue;
		}
		if (!GLYPH_DECLARATION.test(body)) continue;
		for (const name of namesInSelector(selector, FA_ICON_SELECTOR)) {
			all.add(name);
			if (inBrands) brands.add(name);
		}
	}

	return { all: [...all], brands: [...brands] };
};

const findCssImports = (text) => {
	const out = [];
	for (const match of text.matchAll(IMPORT_URL)) {
		const href = match[1]?.trim();
		if (href) out.push(href);
	}
	return out;
};

const sameOrigin = (href, base) => {
	try {
		const url = new URL(href, base);
		return url.origin === window.location.origin ? url.href : undefined;
	} catch {
		return undefined;
	}
};

const fetchCss = async (url) => {
	const response = await fetch(url, { cache: "force-cache" });
	return response.ok ? response.text() : "";
};

const fontAwesomeFromCssText = async () => {
	const all = new Set();
	const brands = new Set();
	const seen = new Set();
	const queue = [];

	const absorb = (text, base, depth) => {
		const names = parseFontAwesomeCss(text);
		for (const name of names.all) all.add(name);
		for (const name of names.brands) brands.add(name);
		if (depth >= MAX_IMPORT_DEPTH) return;
		for (const href of findCssImports(text)) {
			const url = sameOrigin(href, base);
			if (url && !seen.has(url)) queue.push({ url, depth: depth + 1 });
		}
	};

	for (const sheet of Array.from(document.styleSheets)) {
		const node = sheet.ownerNode;
		if (!sheet.href && node?.tagName === "STYLE" && node.textContent) absorb(node.textContent, document.baseURI, 0);
		const url = sheet.href ? sameOrigin(sheet.href, document.baseURI) : undefined;
		if (url && !seen.has(url)) queue.push({ url, depth: 0 });
	}

	while (queue.length > 0 && seen.size < MAX_STYLESHEETS) {
		queue.sort((a, b) => Number(LIKELY_ICON_CSS.test(b.url)) - Number(LIKELY_ICON_CSS.test(a.url)));
		const next = queue.shift();
		if (!next || seen.has(next.url)) continue;
		seen.add(next.url);
		try {
			absorb(await fetchCss(next.url), next.url, next.depth);
		} catch {
			continue;
		}
		if (all.size > ENOUGH_NAMES && brands.size > 0) break;
	}

	return { all: [...all], brands: [...brands] };
};

const toFontAwesomeCatalog = (names) => {
	if (names.all.length === 0) return EMPTY_FA_CATALOG;
	const brands = new Set(names.brands);
	const sorted = [...names.all].sort(collatorFor().compare);
	return {
		all: sorted,
		brands: sorted.filter((name) => brands.has(name)),
		classic: sorted.filter((name) => !brands.has(name)),
	};
};

const readFontAwesomeCatalog = async () => {
	const scanned = toFontAwesomeCatalog(fontAwesomeFromCssom());
	if (scanned.all.length > 0) return scanned;
	const fetched = toFontAwesomeCatalog(await fontAwesomeFromCssText());
	if (fetched.all.length === 0) console.warn("Nik's Action HUD | No Font Awesome icon names were found in the loaded stylesheets.");
	return fetched;
};

export const ensureFontAwesomeCatalog = async () => {
	if (fontAwesomeCatalog) return fontAwesomeCatalog;
	fontAwesomePending = fontAwesomePending ?? readFontAwesomeCatalog().then((result) => {
		fontAwesomeCatalog = result;
		fontAwesomePending = undefined;
		return result;
	});
	return fontAwesomePending;
};

export const fontAwesomeIconNames = (family) => {
	const known = fontAwesomeCatalog ?? EMPTY_FA_CATALOG;
	const wanted = family === "fa-brands" ? known.brands : known.classic;
	return wanted.length > 0 ? wanted : known.all;
};

const rpgAwesomeFromCssom = () => {
	const names = new Set();
	forEachDocumentRule((rule) => {
		if (!rule.selectorText.includes(".ra-")) return;
		if (!rule.style.getPropertyValue("content").trim()) return;
		for (const name of namesInSelector(rule.selectorText, RA_ICON_SELECTOR)) names.add(name);
	});
	return [...names];
};

const parseRpgAwesomeCss = (text) => {
	const names = new Set();
	for (const match of text.matchAll(RULE)) {
		const selector = match[1].slice(match[1].lastIndexOf("}") + 1).trim();
		if (!selector.includes(".ra-") || !CONTENT_DECLARATION.test(match[2])) continue;
		for (const name of namesInSelector(selector, RA_ICON_SELECTOR)) names.add(name);
	}
	return [...names];
};

const readRpgAwesomeNames = async () => {
	let names = rpgAwesomeFromCssom();
	if (names.length === 0) {
		try {
			names = parseRpgAwesomeCss(await fetchCss(RPG_AWESOME_CSS));
		} catch (error) {
			console.warn("Nik's Action HUD | Could not read the RPG Awesome stylesheet:", error);
		}
	}
	return names.sort(collatorFor().compare);
};

export const ensureRpgAwesomeCatalog = async () => {
	if (rpgAwesomeNames?.length) return rpgAwesomeNames;
	rpgAwesomePending = rpgAwesomePending ?? readRpgAwesomeNames().then((result) => {
		rpgAwesomeNames = result;
		rpgAwesomePending = undefined;
		return result;
	});
	return rpgAwesomePending;
};

export const rpgAwesomeIconNames = () => rpgAwesomeNames ?? [];
