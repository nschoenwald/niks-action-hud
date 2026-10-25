import { BaseProvider } from "./base.js";

/**
 * Provider registry: maps a game system id to the provider that adapts it to the HUD.
 * Only supported systems (see core/ids.js) are registered; the module does not start elsewhere.
 */
class ProviderRegistry {
	#providers = new Map();

	/** @param {Function|object} provider A BaseProvider subclass, or a provider definition. */
	registerProvider(gameSystemId, provider) {
		const key = String(gameSystemId ?? "").trim();
		if (!key) throw new Error("ProviderRegistry: gameSystemId is required.");
		if (!provider) throw new Error("ProviderRegistry: provider is required.");
		this.#providers.set(key, provider);
	}

	instantiateProvider(gameSystemId) {
		const entry = this.#providers.get(String(gameSystemId ?? "").trim());
		if (!entry) return null;
		return typeof entry === "function" ? new entry() : new BaseProvider(entry);
	}
}

export const providerRegistry = new ProviderRegistry();
