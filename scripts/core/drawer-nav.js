/**
 * Where a drawer with several panes shows its pane navigation: "top" (a row of tabs above the list)
 * or "side" (a column beside it). Each ribbon category may store its own choice as `nav`; without
 * one, the game system's default for that section applies, and "top" for anything else.
 */

import { findLayoutEntry } from "./category-id.js";

export const isDrawerNav = (value) => value === "top" || value === "side";

/** The system default for a layout entry, taken from the provider's starter layout. */
export function defaultDrawerNav(entry, starterLayout = []) {
	const section = entry?.sectionId ? starterLayout.find((candidate) => candidate.sectionId === entry.sectionId) : null;
	return isDrawerNav(section?.nav) ? section.nav : "top";
}

/** The navigation a category uses: its own choice, else the system default. */
export function drawerNavOf(entry, starterLayout = []) {
	return isDrawerNav(entry?.nav) ? entry.nav : defaultDrawerNav(entry, starterLayout);
}

/** Same, looked up by category id in the saved layout (falling back to the starter layout). */
export function drawerNavFor(categoryId, savedLayout = [], starterLayout = []) {
	const entry = findLayoutEntry(savedLayout, categoryId) ?? findLayoutEntry(starterLayout, categoryId);
	return drawerNavOf(entry, starterLayout);
}
