import { BaseSystemAdapter } from "./base.js";

const adapterEntries = new Map();
let registrationOrder = 0;

const normalizeSystemId = (systemId) => String(systemId || "").trim();

const createAdapterInstance = (adapter) => {
	if (!adapter) return new BaseSystemAdapter();

	if (typeof adapter === "function") {
		const isClass = /^class\s/.test(Function.prototype.toString.call(adapter));
		if (isClass) return new adapter();
		try {
			return adapter();
		} catch (error) {
			return new adapter();
		}
	}

	if (typeof adapter === "object") return adapter;

	console.warn(
		"Nik's Action HUD | Invalid adapter registration. Falling back to BaseSystemAdapter.",
	);
	return new BaseSystemAdapter();
};

const resolveAdapterEntry = (systemId, context = {}) => {
	const resolvedId = normalizeSystemId(systemId);
	if (!resolvedId) return null;

	const entries = adapterEntries.get(resolvedId) || [];
	if (!entries.length) return null;

	const compatibleEntries = entries.filter((entry) => {
		if (typeof entry.isCompatible !== "function") return true;
		try {
			return entry.isCompatible(context) !== false;
		} catch (error) {
			console.warn(
				"Nik's Action HUD | Adapter compatibility check failed:",
				error,
			);
			return false;
		}
	});

	if (!compatibleEntries.length) return null;

	return compatibleEntries.sort((a, b) => {
		if (a.priority !== b.priority) return b.priority - a.priority;
		return a.order - b.order;
	})[0];
};

const registerSystemAdapter = (systemId, adapter, options = {}) => {
	const resolvedId = normalizeSystemId(systemId);
	if (!resolvedId)
		throw new Error("Nik's Action HUD | systemId is required.");
	if (!adapter)
		throw new Error("Nik's Action HUD | adapter is required.");

	const entry = {
		systemId: resolvedId,
		adapter,
		priority: Number.isFinite(options.priority) ? options.priority : 0,
		order: registrationOrder++,
		isCompatible:
			typeof options.isCompatible === "function"
				? options.isCompatible
				: null,
		source: options.source || options.id || "unknown",
	};

	const entries = adapterEntries.get(resolvedId) || [];
	entries.push(entry);
	adapterEntries.set(resolvedId, entries);
	return entry;
};

const getRegisteredAdapters = (systemId) => {
	const resolvedId = normalizeSystemId(systemId);
	return adapterEntries.get(resolvedId) || [];
};

const createSystemAdapter = (systemId, options = {}) => {
	const fallbackSystemId = options.fallbackSystemId || "generic";
	const context = options.context || { system: game.system, modules: game.modules };

	const entry =
		resolveAdapterEntry(systemId, context) ||
		resolveAdapterEntry(fallbackSystemId, context);

	return entry ? createAdapterInstance(entry.adapter) : new BaseSystemAdapter();
};

const listSystemAdapters = () => Array.from(adapterEntries.entries());

export const adapterRegistry = {
	registerSystemAdapter,
	createSystemAdapter,
	resolveAdapterEntry,
	getRegisteredAdapters,
	listSystemAdapters,
};
