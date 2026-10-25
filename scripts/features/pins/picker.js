/**
 * Favorites picker: the quick popup behind the rail's "+" slot.
 * Lists every action of the current actor that can still be pinned, grouped by category.
 */

import { escapeHtml } from "../../core/escape.js";
import { actionRows } from "../../providers/shared/drawer-model.js";
import { localizeCategory } from "../../core/localization.js";
import { iconMarkup } from "../../core/icon-source.js";
import { segmentsText } from "../../providers/shared/row-model.js";

const t = (key, fallback) => {
	const value = game.i18n?.localize?.(`NAH.${key}`);
	return value && value !== `NAH.${key}` ? value : fallback;
};

const normalize = (text) => String(text ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Pinnable rows grouped as [{ label, rows }], excluding ones already pinned. */
async function collectCandidates(hud) {
	const actor = hud.currentActor;
	if (!actor) return [];
	const pinned = new Set(hud.listFavorites());
	const seen = new Set();
	const groups = [];

	for (const category of hud.listCategories(actor)) {
		let data = null;
		try {
			data = await hud.loadDrawer(actor, category.id, category);
		} catch (_e) { /* skip categories that fail to load */ }
		const rows = [];
		for (const row of actionRows(data)) {
			if (!row?.id || row.pinnable === false || pinned.has(row.id) || seen.has(row.id)) continue;
			seen.add(row.id);
			rows.push(row);
		}
		if (rows.length) groups.push({ label: localizeCategory(category.label, category.sectionId) || data?.title || "", rows });
	}
	return groups;
}

function closePicker() {
	document.querySelector(".nah-fav-picker")?.remove();
}

/**
 * Open the picker next to `anchor`.
 * @param {object} hud
 * @param {HTMLElement} anchor
 */
export async function openFavoritePicker(hud, anchor) {
	closePicker();
	const groups = await collectCandidates(hud);

	const panel = document.createElement("div");
	panel.className = "nah-fav-picker";
	panel.setAttribute("role", "dialog");
	panel.setAttribute("aria-label", t("Favorites.AddTitle", "Add favorite"));
	panel.innerHTML = `
		<div class="nah-fav-picker-search">
			<i class="fas fa-search" aria-hidden="true"></i>
			<input type="text" placeholder="${escapeHtml(t("Favorites.PickerSearch", "Search actions…"))}" aria-label="${escapeHtml(t("Favorites.PickerSearch", "Search actions…"))}">
		</div>
		<div class="nah-fav-picker-list"></div>`;

	const list = panel.querySelector(".nah-fav-picker-list");
	const render = (query = "") => {
		const words = normalize(query).split(/\s+/).filter(Boolean);
		const parts = [];
		for (const { label, rows } of groups) {
			const matches = rows.filter((row) => {
				const haystack = normalize(`${row.name} ${segmentsText(row.segments)} ${label}`);
				return words.every((w) => haystack.includes(w));
			});
			if (!matches.length) continue;
			parts.push(`<div class="nah-fav-picker-group">${escapeHtml(label)}</div>`);
			for (const row of matches) {
				parts.push(`
					<button type="button" class="nah-fav-pick" data-pick-id="${escapeHtml(row.id)}">
						<span class="nah-fav-pick-icon">${iconMarkup(row.icon || "icons/svg/item-bag.svg", { imageClass: "nah-fav-pick-img", iconClass: "nah-fav-pick-fa" })}</span>
						<span class="nah-fav-pick-name">${escapeHtml(row.name)}</span>
					</button>`);
			}
		}
		list.innerHTML = parts.join("") || `<div class="nah-fav-picker-empty">${escapeHtml(t("Favorites.PickerEmpty", "Nothing left to add"))}</div>`;
	};
	render();

	const choose = async (id) => {
		closePicker();
		await hud.addFavorite(id);
	};
	list.addEventListener("click", (event) => {
		const pick = event.target.closest("[data-pick-id]");
		if (pick) void choose(pick.dataset.pickId);
	});

	const input = panel.querySelector("input");
	input.addEventListener("input", () => render(input.value));
	input.addEventListener("keydown", (event) => {
		if (event.key !== "Enter") return;
		const first = list.querySelector("[data-pick-id]");
		if (first) void choose(first.dataset.pickId);
	});

	// The dock is scaled with CSS zoom; the picker lives on <body>, so match the dock's scale and
	// express its position in the zoomed coordinate space.
	const root = anchor.closest("#nah-dock");
	const zoom = parseFloat(root?.style.zoom) || 1;
	panel.style.zoom = String(zoom);
	document.body.append(panel);

	const rect = anchor.getBoundingClientRect();
	const { width, height } = panel.getBoundingClientRect();
	const onLeft = anchor.closest(".nah-favorites-rail")?.dataset.side === "left";
	let x = onLeft ? rect.left - width - 8 : rect.right + 8;
	x = Math.min(Math.max(x, 8), window.innerWidth - width - 8);
	const y = Math.min(Math.max(rect.top, 8), window.innerHeight - height - 8);
	panel.style.left = `${x / zoom}px`;
	panel.style.top = `${y / zoom}px`;
	input.focus();

	const dismiss = (event) => {
		const outside = event.type === "pointerdown" && !panel.contains(event.target) && !anchor.contains(event.target);
		if (outside || (event.type === "keydown" && event.key === "Escape")) {
			closePicker();
			document.removeEventListener("pointerdown", dismiss, true);
			document.removeEventListener("keydown", dismiss, true);
		}
	};
	setTimeout(() => {
		document.addEventListener("pointerdown", dismiss, true);
		document.addEventListener("keydown", dismiss, true);
	}, 0);
}
