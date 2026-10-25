/**
 * Change a client-side object setting: `change` receives a copy, the result is saved.
 * `options` reach the setting's onChange (e.g. `{ skipRefresh: true }`).
 */
import { MODULE_ID } from "./ids.js";

export async function updateClientStore(key, change, options = {}) {
	const draft = structuredClone(game.settings.get(MODULE_ID, key) ?? {});
	change(draft);
	return game.settings.set(MODULE_ID, key, draft, options);
}
