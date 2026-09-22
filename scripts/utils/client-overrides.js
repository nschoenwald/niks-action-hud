import { MODULE_ID } from "../constants.js";

export function resolveDisplayName(config, actor, actorId) {
	const override = getEffectiveActorSettings(config, actorId).displayName?.trim();
	if (override) return override;
	if (config?.useTokenName) {
		const tokenName = actor?.getActiveTokens?.()?.[0]?.name || actor?.prototypeToken?.name;
		if (tokenName) return tokenName;
	}
	return actor.name;
}

export function getEffectiveActorSettings(config, actorId) {
	const worldSettings = config?.actorSettings?.[actorId] || {};
	if (game.user.isGM) return worldSettings;
	const clientData = game.settings.get(MODULE_ID, "clientActorOverrides")?.[actorId];
	return clientData?.actorSettings
		? { ...worldSettings, ...clientData.actorSettings }
		: worldSettings;
}

export function getEffectiveActorAttributes(config, actorId) {
	const worldAttrs = config?.actorAttributes?.[actorId] || [];
	if (game.user.isGM) return worldAttrs;
	const clientData = game.settings.get(MODULE_ID, "clientActorOverrides")?.[actorId];
	return clientData?.actorAttributes ?? worldAttrs;
}

export function getEffectiveImageRules(config, actorId) {
	const worldRules = config?.imageRules?.[actorId] || [];
	if (game.user.isGM) return worldRules;
	const clientData = game.settings.get(MODULE_ID, "clientActorOverrides")?.[actorId];
	return clientData?.imageRules ?? worldRules;
}
