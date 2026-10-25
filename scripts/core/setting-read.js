/**
 * Reads of this module's settings, remembered for the rest of the current task.
 *
 * In V14 every `game.settings.get` of a client-scope setting builds a new Setting document from
 * localStorage, and the HUD reads some of them once per row while it builds a drawer. Within one
 * synchronous pass a value cannot change, so each key is read once; the memo is dropped at the next
 * microtask, and right away when a client setting changes (client writes apply synchronously).
 * Object values are shared: callers must not modify them.
 */

import { MODULE_ID } from "./ids.js";

let memo = null;
const forget = () => { memo = null; };

Hooks.on("clientSettingChanged", forget);

/** `game.settings.get(MODULE_ID, key)`, read at most once per task. Throws like the original when unregistered. */
export function readSetting(key) {
	if (!memo) {
		memo = new Map();
		queueMicrotask(forget);
	}
	if (memo.has(key)) return memo.get(key);
	const value = game.settings.get(MODULE_ID, key);
	memo.set(key, value);
	return value;
}
