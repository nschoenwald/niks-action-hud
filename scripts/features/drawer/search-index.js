/**
 * Searchable index over every drawer row an actor can reach. Built once per HUD revision and
 * queried per keystroke.
 */

import { parseRef } from "../../core/action-ref.js";
import { segmentsText } from "../../providers/shared/row-model.js";
import { actionRows } from "../../providers/shared/drawer-model.js";

/** Lower-case, tag-free, single-spaced text. */
export function fold(value) {
	return String(value ?? "")
		.replace(/<[^>]*>/g, " ")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();
}

/** One action shown under several categories must collapse to a single hit. */
function identityOf(row) {
	const id = String(row.id || row.uuid || "");
	if (!id) return `name:${row.name || ""}:${row.type || ""}`;
	const embedded = parseRef(id).kind === "activity" ? null : /(?:^|\.)Item\.([^.]+)$/.exec(id);
	return `id:${embedded ? embedded[1] : id}`;
}

/**
 * @param {Array<{ category: object, data: object }>} drawers  Categories in priority order.
 * @returns {Array<{ category: object, row: object, name: string, detail: string, key: string }>}
 */
export function buildIndex(drawers) {
	const seen = new Set();
	const entries = [];
	for (const { category, data } of drawers) {
		for (const row of actionRows(data)) {
			const name = fold(row.name || row.label || row.title);
			if (!name) continue;
			const key = identityOf(row);
			if (seen.has(key)) continue;
			seen.add(key);
			entries.push({ category, row, name, detail: fold(segmentsText(row.segments)), key });
		}
	}
	return entries;
}

/**
 * Rows whose name contains every word of the query, best matches first:
 * names starting with the query, then word-prefix hits, then the rest; ties keep index order.
 */
export function search(entries, query) {
	const words = fold(query).split(" ").filter(Boolean);
	if (!words.length) return [];
	const phrase = words.join(" ");

	const scored = [];
	entries.forEach((entry, order) => {
		if (!words.every((word) => entry.name.includes(word))) return;
		const rank = entry.name.startsWith(phrase) ? 0 : words.every((word) => entry.name.split(" ").some((part) => part.startsWith(word))) ? 1 : 2;
		scored.push({ entry, rank, order });
	});
	return scored.sort((a, b) => a.rank - b.rank || a.order - b.order).map((hit) => hit.entry);
}
