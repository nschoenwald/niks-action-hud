/**
 * Drawer model shared by every provider and by the drawer itself.
 *
 * A drawer is `{ title, panes: [{ id, label, rows, slots? }], toggles?, custom? }`: panes in display order, each holding
 * rows (see row-model.js) and headings. `toggles` are header switches (see core/drawer-toggles.js). A heading is `{ heading: label, icon?, slots? }`; it groups the rows
 * below it and is never used, pinned or searched. A drawer without separate panes has exactly one.
 * `slots` (`{ value, max, title }`, e.g. spell slots) is drawn as filled / empty pips next to the pane's tab and the heading.
 */

/** A heading row. `icon` may be a Font Awesome class or an image path. */
export const heading = (label, icon = "", slots = null) => ({
	heading: String(label ?? ""),
	...(icon ? { icon } : {}),
	...(slots ? { slots } : {}),
});

export const isHeading = (row) => typeof row?.heading === "string";

export const pane = (id, label, rows = [], slots = null) => ({ id: String(id), label: String(label ?? ""), rows, ...(slots ? { slots } : {}) });

/** A drawer with a single, unlabelled list of rows. */
export const singlePane = (title, rows = []) => ({ title, panes: [pane("main", title, rows)] });

/** A drawer with nothing in it. */
export const emptyDrawer = (title = "") => ({ title, panes: [] });

/** Every action row of a drawer, headings left out. */
export function actionRows(drawer) {
	const panes = Array.isArray(drawer?.panes) ? drawer.panes : [];
	return panes.flatMap((p) => (Array.isArray(p.rows) ? p.rows : [])).filter((row) => row && !isHeading(row));
}

export const hasActionRows = (drawer) => actionRows(drawer).length > 0;

/**
 * Panes with rows, preceded by an overview pane that repeats them all, each group under its own heading.
 * @param {Array<{ id: string, label: string, rows: object[], heading?: string, slots?: object }>} groups  In display order.
 * @param {string} overviewLabel
 */
export function withOverview(groups, overviewLabel) {
	const filled = groups.filter((group) => group.rows.length);
	if (!filled.length) return [];
	const overview = filled.flatMap((group) => [heading(group.heading ?? group.label, "", group.slots), ...group.rows.map((row) => ({ ...row }))]);
	return [pane("overview", overviewLabel, overview), ...filled.map((group) => pane(group.id, group.label, group.rows, group.slots))];
}
