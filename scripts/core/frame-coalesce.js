/** Wrap `fn` so a burst of calls within one animation frame runs it once. */
export function coalesceToFrame(fn, schedule = (cb) => requestAnimationFrame(cb)) {
	let queued = false;
	return () => {
		if (queued) return;
		queued = true;
		schedule(() => {
			queued = false;
			fn();
		});
	};
}
