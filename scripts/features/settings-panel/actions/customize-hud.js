/**
 * Customize HUD tab actions: collapse and re-icon the system categories (found by card position).
 */

import { categoryIconValue, normalizeIconClass, resolveIconSource } from "../../../core/icon-source.js";
import { IconPicker } from "../icon-picker/icon-picker.js";
import { pullForm, categoryIndexOf } from "./shared.js";

const layoutOf = (app) => app.draft.data.layoutCategories;

export function onToggleCollapseCategory(app, event, target) {
	const card = target.closest(".hud-category-card");
	if (!card) return;
	const index = Number(card.dataset.catIndex);
	const category = Number.isNaN(index) ? null : layoutOf(app)?.[index];
	if (!category) return;

	const collapsed = app._foldedCategories.has(category);
	if (collapsed) app._foldedCategories.delete(category);
	else app._foldedCategories.add(category);
	card.classList.toggle("collapsed", !collapsed);
}

export async function onPickCategoryIcon(app, event, target) {
	const index = categoryIndexOf(target);
	if (index === null) return;

	pullForm(app);
	const current = layoutOf(app)?.[index];
	if (!current) return;

	const chosen = await IconPicker.pick(categoryIconValue(current));
	if (chosen === null) return;

	pullForm(app);
	const category = layoutOf(app)?.[index];
	if (!category) return;

	const source = resolveIconSource(chosen);
	category.img = source.kind === "image" ? source.imagePath : "";
	category.icon = source.kind === "icon" ? normalizeIconClass(source.iconClass) : source.glyph;
	await app.render();
}
