/**
 * Safe image resolution and error fallback handler for Nik's Action HUD.
 * Exclusively designed for Foundry V14.
 */

export const DEFAULT_FALLBACK_TOKEN_IMG = typeof CONST !== "undefined" && CONST.DEFAULT_TOKEN
	? CONST.DEFAULT_TOKEN
	: "icons/svg/mystery-man.svg";

export const INLINE_FALLBACK_SVG =
	"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231f2937'/><circle cx='50' cy='38' r='18' fill='%236b7280'/><path d='M22 88 C25 62 75 62 78 88 Z' fill='%236b7280'/></svg>";

export const FAILED_IMAGE_URLS = new Set();

/**
 * Escapes characters for safe inclusion in HTML attributes.
 * @param {*} value
 * @returns {string}
 */
export const escapeHtmlAttr = (value) => String(value ?? "")
	.replace(/&/g, "&amp;")
	.replace(/</g, "&lt;")
	.replace(/>/g, "&gt;")
	.replace(/"/g, "&quot;")
	.replace(/'/g, "&#39;");

/**
 * Resolves a safe image path and subject scale for the active actor and token.
 * Prevents using known 404 or broken image URLs.
 *
 * @param {Actor} actor
 * @param {Token|TokenDocument|object} token
 * @param {boolean} useTokenImg
 * @returns {{ img: string, actorImg: string, subjectScale: number, defaultIcon: string }}
 */
export const resolveSafeTokenImage = (actor, token, useTokenImg = false) => {
	const defaultIcon = DEFAULT_FALLBACK_TOKEN_IMG;
	const actorImg = (typeof actor?.img === "string" && actor.img.trim())
		? actor.img.trim()
		: defaultIcon;

	let chosenImg = actorImg;
	let subjectScale = 1;

	if (useTokenImg && actor) {
		const tokenDoc = token?.document || (token?.schema ? token : null);
		const subjectTexture =
			tokenDoc?.ring?.subject?.texture ||
			token?.ring?.subject?.texture ||
			actor?.prototypeToken?.ring?.subject?.texture;
		const rawTokenTexture =
			(typeof tokenDoc?.texture === "string" ? tokenDoc.texture : tokenDoc?.texture?.src) ||
			(typeof token?.texture === "string" ? token.texture : token?.texture?.src) ||
			(typeof actor?.prototypeToken?.texture === "string" ? actor.prototypeToken.texture : actor?.prototypeToken?.texture?.src);

		let candidate = "";
		if (typeof subjectTexture === "string" && subjectTexture.trim()) {
			candidate = subjectTexture.trim();
		} else if (typeof rawTokenTexture === "string" && rawTokenTexture.trim()) {
			candidate = rawTokenTexture.trim();
		}

		if (candidate && !FAILED_IMAGE_URLS.has(candidate)) {
			chosenImg = candidate;
		} else if (candidate && FAILED_IMAGE_URLS.has(candidate)) {
			// Token image previously failed with 404, fall back to actor portrait
			chosenImg = !FAILED_IMAGE_URLS.has(actorImg) ? actorImg : defaultIcon;
		}

		const rawScale =
			tokenDoc?.ring?.subject?.scale ??
			token?.ring?.subject?.scale ??
			token?.ring?.scaleCorrection ??
			actor?.prototypeToken?.ring?.subject?.scale ??
			tokenDoc?.flags?.dnd5e?.tokenRing?.scaleCorrection ??
			token?.flags?.dnd5e?.tokenRing?.scaleCorrection ??
			actor?.prototypeToken?.flags?.dnd5e?.tokenRing?.scaleCorrection;

		const num = Number(rawScale);
		if (Number.isFinite(num) && num > 0) {
			subjectScale = num;
		}
	}

	if (FAILED_IMAGE_URLS.has(chosenImg)) {
		chosenImg = !FAILED_IMAGE_URLS.has(actorImg) ? actorImg : defaultIcon;
		if (FAILED_IMAGE_URLS.has(chosenImg)) {
			chosenImg = INLINE_FALLBACK_SVG;
		}
	}

	return {
		img: chosenImg || defaultIcon,
		actorImg,
		subjectScale,
		defaultIcon,
	};
};

/**
 * Handles image load errors (404 / broken paths) by stepping through graceful fallbacks.
 *
 * @param {HTMLImageElement} imgEl
 * @param {string} [primaryFallback]
 * @param {string} [secondaryFallback]
 */
export const handleImageError = (imgEl, primaryFallback, secondaryFallback) => {
	if (!imgEl) return;
	const failedSrc = imgEl.getAttribute("src") || imgEl.src;
	if (failedSrc && !failedSrc.startsWith("data:")) {
		FAILED_IMAGE_URLS.add(failedSrc);
	}

	const step = Number(imgEl.dataset.fallbackStep || 0);
	const targetPrimary = primaryFallback && !FAILED_IMAGE_URLS.has(primaryFallback) ? primaryFallback : "";
	const targetSecondary = secondaryFallback && !FAILED_IMAGE_URLS.has(secondaryFallback)
		? secondaryFallback
		: DEFAULT_FALLBACK_TOKEN_IMG;

	if (step === 0 && targetPrimary && targetPrimary !== failedSrc) {
		imgEl.dataset.fallbackStep = "1";
		imgEl.src = targetPrimary;
		return;
	}

	if (step <= 1 && targetSecondary && targetSecondary !== failedSrc) {
		imgEl.dataset.fallbackStep = "2";
		imgEl.src = targetSecondary;
		return;
	}

	imgEl.onerror = null;
	imgEl.dataset.fallbackStep = "3";
	imgEl.src = INLINE_FALLBACK_SVG;
};

// Expose globally for inline HTML onerror event handler invocation
if (typeof window !== "undefined") {
	if (!window.ActionHUD) window.ActionHUD = {};
	window.ActionHUD.handleImageError = handleImageError;
}
