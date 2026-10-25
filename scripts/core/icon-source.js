import { escapeHtml } from "./escape.js";

const IMAGE_EXTENSION = /\.(?:png|jpe?g|webp|gif|avif|svg)(?:\?.*)?$/i;

const ICON_TOKEN = /^fa(?:[a-z]{1,2})?$|^fa-[a-z0-9]+(?:-[a-z0-9]+)*$|^ra$|^ra-[a-z0-9]+(?:-[a-z0-9]+)*$/i;

const EMPTY_SOURCE = Object.freeze({ kind: "empty", iconClass: "", imagePath: "", glyph: "" });


export const normalizeIconClass = (value) => {
	const trimmed = String(value ?? "").trim();
	return trimmed.startsWith("ra-") && !trimmed.split(/\s+/).includes("ra") ? `ra ${trimmed}` : trimmed;
};

const isImagePath = (value) => {
	const trimmed = String(value ?? "").trim();
	if (!trimmed) return false;
	return trimmed.includes("/") || IMAGE_EXTENSION.test(trimmed);
};

const isIconClass = (value) => {
	const tokens = String(value ?? "").trim().split(/\s+/).filter(Boolean);
	return tokens.length > 0 && tokens.every((token) => ICON_TOKEN.test(token));
};

export const resolveIconSource = (value) => {
	const raw = typeof value === "string" ? value.trim() : "";
	if (!raw) return EMPTY_SOURCE;
	if (isImagePath(raw)) return { kind: "image", iconClass: "", imagePath: raw, glyph: "" };
	if (isIconClass(raw)) return { kind: "icon", iconClass: normalizeIconClass(raw), imagePath: "", glyph: "" };
	return { kind: "glyph", iconClass: "", imagePath: "", glyph: raw };
};

export const categoryIconValue = (category) => {
	const img = String(category?.img ?? "").trim();
	return img || String(category?.icon ?? "").trim();
};

export const iconMarkup = (value, { imageClass = "", imageStyle = "", iconStyle = "", fallbackClass = "" } = {}) => {
	const source = resolveIconSource(value);
	const iconStyleAttr = iconStyle ? ` style="${escapeHtml(iconStyle)}"` : "";

	if (source.kind === "image") {
		const classAttr = imageClass ? ` class="${escapeHtml(imageClass)}"` : "";
		const styleAttr = imageStyle ? ` style="${escapeHtml(imageStyle)}"` : "";
		return `<img src="${escapeHtml(source.imagePath)}"${classAttr}${styleAttr} alt="">`;
	}
	if (source.kind === "icon") return `<i class="${escapeHtml(source.iconClass)}"${iconStyleAttr}></i>`;
	if (source.kind === "glyph") return `<i class="nah-icon-glyph"${iconStyleAttr}>${escapeHtml(source.glyph)}</i>`;
	return fallbackClass ? `<i class="${escapeHtml(fallbackClass)}"${iconStyleAttr}></i>` : "";
};
