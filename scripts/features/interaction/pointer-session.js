/**
 * Pointer helpers shared by every press-and-drag gesture (moving the dock, resizing it,
 * long-press-to-drag).
 */

const END_EVENTS = ["pointerup", "pointercancel"];

/**
 * Track the pointer until it is released.
 * @param {{ onMove?: (e: PointerEvent) => void, onEnd?: (e: Event) => void, passive?: boolean }} handlers
 * @returns {() => void} stop (also runs automatically on release)
 */
export function followPointer({ onMove, onEnd, passive = false }) {
	const options = { capture: true, passive };
	const finish = (event) => {
		stop();
		onEnd?.(event);
	};
	function stop() {
		if (onMove) window.removeEventListener("pointermove", onMove, options);
		for (const type of END_EVENTS) window.removeEventListener(type, finish, options);
	}
	if (onMove) window.addEventListener("pointermove", onMove, options);
	for (const type of END_EVENTS) window.addEventListener(type, finish, options);
	return stop;
}

/**
 * Arm a gesture from a pointerdown: it fires `onTrigger` once the pointer has travelled
 * `threshold` px (mode "travel") or has stayed within `threshold` px for `holdMs` (mode "hold").
 * Releasing first, or moving in "hold" mode, disarms it.
 * @returns {() => void} disarm
 */
export function armGesture(downEvent, { mode, threshold = 6, holdMs = 300, onTrigger }) {
	const origin = { x: downEvent.clientX, y: downEvent.clientY };
	let timer = null;

	const trigger = () => {
		disarm();
		onTrigger(downEvent);
	};
	const onMove = (event) => {
		if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) <= threshold) return;
		if (mode === "travel") trigger();
		else disarm();
	};
	const stopFollowing = followPointer({ onMove, onEnd: () => disarm() });
	function disarm() {
		clearTimeout(timer);
		stopFollowing();
	}
	if (mode === "hold") timer = setTimeout(trigger, holdMs);
	return disarm;
}
