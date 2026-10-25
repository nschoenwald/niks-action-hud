/** The runtime the dock was mounted with (live binding; set once by mountDock). */

export let hud = null;

export function bindRuntime(runtime) {
	hud = runtime;
}
