const defaultEntries = {
	attributes: new Map(),
	layout: new Map(),
	statusEffects: new Map(),
	trackableAttributes: new Map(),
};

let registrationOrder = 0;

const normalizeSystemId = (systemId) => String(systemId || "").trim();

const normalizeMode = (mode) => {
	const normalized = String(mode || "replace").toLowerCase();
	if (normalized === "append" || normalized === "prepend") return normalized;
	return "replace";
};

const registerDefault = (type, systemId, data, options = {}) => {
	const resolvedId = normalizeSystemId(systemId);
	if (!resolvedId)
		throw new Error("Stylish Action HUD | systemId is required.");
	if (!data)
		throw new Error("Stylish Action HUD | default data is required.");

	const entry = {
		systemId: resolvedId,
		data,
		priority: Number.isFinite(options.priority) ? options.priority : 0,
		order: registrationOrder++,
		isCompatible:
			typeof options.isCompatible === "function" ? options.isCompatible : null,
		mode: normalizeMode(options.mode),
		source: options.source || options.id || "unknown",
	};

	const entries = defaultEntries[type].get(resolvedId) || [];
	entries.push(entry);
	defaultEntries[type].set(resolvedId, entries);
	return entry;
};

const resolveEntry = (type, systemId, context = {}) => {
	const resolvedId = normalizeSystemId(systemId);
	if (!resolvedId) return null;

	const entries = defaultEntries[type].get(resolvedId) || [];
	if (!entries.length) return null;

	const compatibleEntries = entries.filter((entry) => {
		if (typeof entry.isCompatible !== "function") return true;
		try {
			return entry.isCompatible(context) !== false;
		} catch (error) {
			console.warn(
				"Stylish Action HUD | Default compatibility check failed:",
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

const resolveEntryData = (entry, context) => {
	if (!entry) return [];
	const data =
		typeof entry.data === "function" ? entry.data(context) : entry.data;
	return Array.isArray(data) ? data : [];
};

const getAdapterDefaults = (adapter, method, context) => {
	if (!adapter || typeof adapter[method] !== "function") return [];
	if (method === "getTrackableAttributes") {
		return adapter[method](context.actor);
	}
	return adapter[method]();
};

const resolveDefaults = (type, systemId, adapter, options = {}) => {
	const methodMap = {
		attributes: "getDefaultAttributes",
		layout: "getDefaultLayout",
		statusEffects: "getDefaultStatusEffects",
		trackableAttributes: "getTrackableAttributes",
	};

	const method = methodMap[type];
	const context = {
		systemId: normalizeSystemId(systemId),
		adapter,
		system: game.system,
		modules: game.modules,
		...options,
	};

	const entry = resolveEntry(type, systemId, context);
	const adapterDefaults = getAdapterDefaults(adapter, method, context);

	if (!entry) return adapterDefaults;

	const entryDefaults = resolveEntryData(entry, context);

	if (entry.mode === "append") {
		return [...adapterDefaults, ...entryDefaults];
	}

	if (entry.mode === "prepend") {
		return [...entryDefaults, ...adapterDefaults];
	}

	return entryDefaults;
};

const listDefaults = (type, systemId) => {
	if (!systemId) return Array.from(defaultEntries[type].entries());
	const resolvedId = normalizeSystemId(systemId);
	return defaultEntries[type].get(resolvedId) || [];
};

export const defaultRegistry = {
	registerDefaultAttributes: (systemId, data, options = {}) =>
		registerDefault("attributes", systemId, data, options),
	registerDefaultLayout: (systemId, data, options = {}) =>
		registerDefault("layout", systemId, data, options),
	registerDefaultStatusEffects: (systemId, data, options = {}) =>
		registerDefault("statusEffects", systemId, data, options),
	registerTrackableAttributes: (systemId, data, options = {}) =>
		registerDefault("trackableAttributes", systemId, data, options),
	getDefaultAttributes: (systemId, adapter, options = {}) =>
		resolveDefaults("attributes", systemId, adapter, options),
	getDefaultLayout: (systemId, adapter, options = {}) =>
		resolveDefaults("layout", systemId, adapter, options),
	getDefaultStatusEffects: (systemId, adapter, options = {}) =>
		resolveDefaults("statusEffects", systemId, adapter, options),
	getTrackableAttributes: (systemId, adapter, options = {}) =>
		resolveDefaults("trackableAttributes", systemId, adapter, options),
	listDefaultAttributes: (systemId) => listDefaults("attributes", systemId),
	listDefaultLayouts: (systemId) => listDefaults("layout", systemId),
	listDefaultStatusEffects: (systemId) =>
		listDefaults("statusEffects", systemId),
	listTrackableAttributes: (systemId) =>
		listDefaults("trackableAttributes", systemId),
};
