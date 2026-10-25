/**
 * Remembers the drawer's scroll offset across repaints. State lives in the container's dataset
 * (plain strings), so it survives the container's contents being replaced.
 *
 * - `begin` reads the offset before anything hides the drawer (a hidden element reports 0) and
 *   keeps an earlier unfinished request's offset when repaints overlap.
 * - `enter` says whether the repaint shows the same view (category and pane) as the last one.
 * - `settle` ends the request; `forget` clears everything (drawer closed).
 */

export const scrollMemory = {
	begin(dataset, liveOffset) {
		const offset = dataset.pendingScroll ? Number(dataset.pendingScroll) : (liveOffset ?? 0);
		dataset.pendingScroll = String(offset);
		return offset;
	},

	enter(dataset, viewKey) {
		const same = dataset.paintedView === viewKey;
		dataset.paintedView = viewKey;
		return same;
	},

	settle(dataset) {
		delete dataset.pendingScroll;
	},

	forget(dataset) {
		delete dataset.pendingScroll;
		delete dataset.paintedView;
	},
};
