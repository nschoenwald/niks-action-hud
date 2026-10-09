import { BaseSystemAdapter } from "./base.js";

/**
 * System Adapter Registry for Nik's Action HUD.
 * Manages modular system integrations and prioritizes matching adapters.
 */
class SystemAdapterRegistry {
	constructor() {
		this._adapters = new Map();
		this._order = 0;
	}

	registerSystemAdapter(systemId, adapter, options = {}) {
		const id = String(systemId || "").trim();
		if (!id) throw new Error("SystemAdapterRegistry: systemId is required.");
		if (!adapter) throw new Error("SystemAdapterRegistry: adapter is required.");

		const entries = this._adapters.get(id) || [];
		entries.push({
			systemId: id,
			adapter,
			priority: Number.isFinite(options.priority) ? options.priority : 0,
			order: this._order++,
			isCompatible: typeof options.isCompatible === "function" ? options.isCompatible : null,
			source: options.source || "unknown",
		});
		this._adapters.set(id, entries);
	}

	createSystemAdapter(systemId, options = {}) {
		const id = String(systemId || "").trim();
		const fallbackId = options.fallbackSystemId || "generic";
		const context = options.context || { system: game.system, modules: game.modules };

		const entry = this._resolveEntry(id, context) || this._resolveEntry(fallbackId, context);
		if (!entry) return new BaseSystemAdapter();

		const AdapterClass = entry.adapter;
		if (typeof AdapterClass === "function") {
			try {
				return new AdapterClass();
			} catch (_e) {
				return AdapterClass();
			}
		}
		return typeof AdapterClass === "object" ? AdapterClass : new BaseSystemAdapter();
	}

	_resolveEntry(systemId, context) {
		const entries = this._adapters.get(systemId) || [];
		const compatible = entries.filter((e) => !e.isCompatible || e.isCompatible(context));
		return compatible.sort((a, b) => b.priority - a.priority || a.order - b.order)[0] || null;
	}

	resolveAdapterEntry(systemId, optionsOrContext = {}) {
		const id = String(systemId || "").trim();
		const context = optionsOrContext?.context || optionsOrContext || { system: game.system, modules: game.modules };
		return this._resolveEntry(id, context);
	}

	getRegisteredAdapters(systemId) {
		return this._adapters.get(String(systemId || "").trim()) || [];
	}

	listSystemAdapters() {
		return Array.from(this._adapters.entries());
	}
}

export const adapterRegistry = new SystemAdapterRegistry();
