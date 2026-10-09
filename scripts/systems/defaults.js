/**
 * System layout registry for Nik's Action HUD.
 * Manages default category configurations across supported systems.
 */
class DefaultLayoutRegistry {
	constructor() {
		this._layouts = new Map();
		this._order = 0;
	}

	registerDefaultLayout(systemId, data, options = {}) {
		const id = String(systemId || "").trim();
		if (!id) throw new Error("DefaultLayoutRegistry: systemId is required.");
		if (!data) throw new Error("DefaultLayoutRegistry: layout data is required.");

		const entries = this._layouts.get(id) || [];
		entries.push({
			systemId: id,
			data,
			priority: Number.isFinite(options.priority) ? options.priority : 0,
			order: this._order++,
			isCompatible: typeof options.isCompatible === "function" ? options.isCompatible : null,
			mode: options.mode === "append" || options.mode === "prepend" ? options.mode : "replace",
		});
		this._layouts.set(id, entries);
	}

	getDefaultLayout(systemId, adapter, options = {}) {
		const id = String(systemId || "").trim();
		const entries = this._layouts.get(id) || [];
		const context = { systemId: id, adapter, system: game.system, ...options };

		const valid = entries.filter((e) => !e.isCompatible || e.isCompatible(context));
		const active = valid.sort((a, b) => b.priority - a.priority || a.order - b.order)[0];

		const adapterDefault = adapter?.getDefaultLayout ? adapter.getDefaultLayout() : [];
		if (!active) return adapterDefault;

		const layoutData = typeof active.data === "function" ? active.data(context) : active.data;
		const result = Array.isArray(layoutData) ? layoutData : [];

		if (active.mode === "append") return [...adapterDefault, ...result];
		if (active.mode === "prepend") return [...result, ...adapterDefault];
		return result;
	}

	listDefaultLayouts(systemId) {
		return systemId ? this._layouts.get(systemId) || [] : Array.from(this._layouts.entries());
	}

	// Legacy no-op stubs to prevent third-party crashes
	registerDefaultAttributes() {}
	registerDefaultStatusEffects() {}
	registerTrackableAttributes() {}
	getDefaultAttributes() { return []; }
	getDefaultStatusEffects() { return []; }
	getTrackableAttributes() { return []; }
}

export const defaultRegistry = new DefaultLayoutRegistry();
