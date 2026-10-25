/**
 * Draft state of the settings panel: the profile-shaped object the form edits, the snapshot it is
 * compared against to count unsaved changes, and the operations that change it (seed, load, reset).
 * The form reader, the panel actions and the view-model all go through one DraftStore per panel.
 */

import { APPEARANCE_FIELDS, BEHAVIOR_FIELDS, loadHudConfig, exportHudConfig, normalizeDockPosition } from "./option-schema.js";
import { readMirroredSettings } from "./settings-sync.js";

/** A fresh copy of the active system's starter layout. */
const starterLayout = () => foundry.utils.deepClone(window.NikHUD?.provider?.getStarterLayout?.() ?? []);

const snapshotOf = (data) => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, JSON.stringify(value)]));

export class DraftStore {
	#data = {};
	#baseline = null;
	#seeded = false;
	#listeners = new Set();

	/** The draft object itself; edit it, then call `notify()` (the form reader does). */
	get data() { return this.#data; }

	get isSeeded() { return this.#seeded; }

	/** Fill the draft from the saved profile, with the live value of any mirrored client setting. */
	seed(profile) {
		this.#replaceWith({});
		loadHudConfig(this.#data, profile);
		if (!this.#data.layoutCategories.length) this.#data.layoutCategories = starterLayout();
		Object.assign(this.#data, readMirroredSettings());
		this.#seeded = true;
		this.#baseline = null;
	}

	/** Replace the draft with a stored or imported config (accepts older key names). */
	load(config) {
		loadHudConfig(this.#data, config);
		// An empty saved layout means "the system's starter layout" (see BaseProvider#listCategories).
		if (!this.#data.layoutCategories.length) this.#data.layoutCategories = starterLayout();
		this.notify();
	}

	/** Put every field back to its default (appearance, behavior, dock position and the starter menu layout). */
	resetToDefaults() {
		for (const { key, fallback } of [...APPEARANCE_FIELDS, ...BEHAVIOR_FIELDS]) this.#data[key] = fallback;
		this.#data.dockPosition = normalizeDockPosition(null);
		this.#data.layoutCategories = starterLayout();
		this.notify();
	}

	/** The clean profile-shaped object that gets saved. */
	toProfile() { return exportHudConfig(this.#data); }

	// ── Unsaved-change tracking ──

	get hasBaseline() { return this.#baseline !== null; }

	/** Treat the draft as it is now as "saved" (taken after the first form read, and after resets). */
	rebase() {
		this.#baseline = snapshotOf(this.#data);
		this.notify();
	}

	/** Forget the baseline; the next render takes a new one. */
	clearBaseline() { this.#baseline = null; }

	changedKeys() {
		if (!this.#baseline) return [];
		const current = snapshotOf(this.#data);
		const keys = new Set([...Object.keys(this.#baseline), ...Object.keys(current)]);
		return [...keys].filter((key) => this.#baseline[key] !== current[key]);
	}

	get changeCount() { return this.changedKeys().length; }

	// ── Subscriptions ──

	subscribe(listener) {
		this.#listeners.add(listener);
		return () => this.#listeners.delete(listener);
	}

	notify() {
		for (const listener of this.#listeners) listener(this);
	}

	#replaceWith(next) {
		for (const key of Object.keys(this.#data)) delete this.#data[key];
		Object.assign(this.#data, next);
	}
}
