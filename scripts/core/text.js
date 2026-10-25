/** Localized text for `key`, or `fallback` when the language has no entry. `data` fills {placeholders}. */
export function text(key, fallback, data) {
	if (!game.i18n?.has?.(key)) return data ? String(fallback).replace(/\{(\w+)\}/g, (m, n) => data[n] ?? m) : fallback;
	return data ? game.i18n.format(key, data) : game.i18n.localize(key);
}

const collators = new Map();

/** A collator per locale, made once (sorting with `localeCompare` and a locale sets one up per comparison). */
export function collatorFor(locale) {
	const key = locale || "";
	if (!collators.has(key)) collators.set(key, new Intl.Collator(locale || undefined));
	return collators.get(key);
}
