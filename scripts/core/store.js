/**
 * Minimal observable state container.
 * - patch() merges a partial update and queues one notification per microtask.
 * - watch(keys, fn) runs fn when any listed key changed (null = every change).
 * - patch(..., { silent: true }) updates state without notifying watchers.
 */
function createStore(initial = {}) {
	let state = { ...initial };
	const watchers = [];
	const pendingKeys = new Set();
	let flushQueued = false;

	const flush = () => {
		flushQueued = false;
		const changed = [...pendingKeys];
		pendingKeys.clear();
		for (const watcher of [...watchers]) {
			if (watcher.keys && !watcher.keys.some((k) => changed.includes(k))) continue;
			try {
				const result = watcher.fn(state, changed);
				if (result?.catch) result.catch((err) => console.error("Nik's Action HUD | store watcher failed", err));
			} catch (err) {
				console.error("Nik's Action HUD | store watcher failed", err);
			}
		}
	};

	return {
		get: () => state,
		patch(change, { silent = false } = {}) {
			const changedKeys = Object.keys(change).filter((key) => !Object.is(state[key], change[key]));
			if (!changedKeys.length) return;
			state = { ...state, ...change };
			if (silent) return;
			for (const key of changedKeys) pendingKeys.add(key);
			if (!flushQueued) {
				flushQueued = true;
				queueMicrotask(flush);
			}
		},
		watch(keys, fn) {
			const watcher = { keys: keys ? [...keys] : null, fn };
			watchers.push(watcher);
			return () => {
				const idx = watchers.indexOf(watcher);
				if (idx >= 0) watchers.splice(idx, 1);
			};
		},
	};
}

/** The HUD's single source of truth for UI state. */
export const hudStore = createStore({
	actor: null,
	token: null,
	drawer: null, // { categoryId, pane, query } while a drawer is open
	revision: 0, // bumped whenever data behind the views may have changed
});
