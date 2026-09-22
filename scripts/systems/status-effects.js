function toStatusEffectEntries(source) {
	if (Array.isArray(source)) return source.map((effect) => [effect?.id ?? "", effect]);
	if (source instanceof Map) return Array.from(source.entries());
	if (source && typeof source.entries === "function") return Array.from(source.entries());
	if (source && typeof source.values === "function") {
		return Array.from(source.values(), (effect) => [effect?.id ?? "", effect]);
	}
	if (source && typeof source === "object") return Object.entries(source);
	return [];
}

function addStatusIds(target, statuses) {
	if (statuses instanceof Set || Array.isArray(statuses)) {
		for (const status of statuses) {
			if (status) target.add(String(status));
		}
	}
}

export function collectActorStatusData(actor) {
	const ids = new Set();
	const values = new Map();

	addStatusIds(ids, actor?.statuses);

	const effects = actor?.appliedEffects ?? actor?.effects ?? [];
	for (const effect of effects) {
		if (!effect || effect.active === false) continue;
		addStatusIds(ids, effect.statuses);

		const statusId = effect.flags?.core?.statusId;
		if (statusId) ids.add(String(statusId));
	}

	for (const condition of actor?.itemTypes?.condition ?? []) {
		if (!condition || condition.active === false) continue;
		const statusId = condition.slug ?? condition.system?.slug;
		if (!statusId) continue;

		ids.add(String(statusId));
		const value = condition.system?.value?.value;
		if (typeof value === "number" && value > 0) {
			values.set(String(statusId), value);
		}
	}

	return { ids, values };
}

export function buildStatusEffectChoices(source, actor, { localize = (value) => value } = {}) {
	const { ids: activeIds, values } = collectActorStatusData(actor);
	const seen = new Set();
	const choices = [];

	for (const [sourceId, effect] of toStatusEffectEntries(source)) {
		const id = String(effect?.id ?? effect?._id ?? sourceId ?? "").trim();
		if (!id || seen.has(id) || effect?.hud === false) continue;
		const actorTypes = effect?.hud?.actorTypes;
		if (Array.isArray(actorTypes) && actor?.type && !actorTypes.includes(actor.type)) continue;

		const src = effect.img ?? effect.icon ?? effect.src ?? "";
		if (!src) continue;

		let active = activeIds.has(id);
		if (!active && typeof actor?.hasCondition === "function") {
			try {
				active = Boolean(actor.hasCondition(id));
			} catch (_err) {
				active = false;
			}
		}

		const rawName = effect.name ?? effect.label ?? id;
		const localizedName = localize(rawName);

		choices.push({
			id,
			name: localizedName && localizedName !== rawName ? localizedName : String(rawName),
			src: String(src),
			active,
			value: values.get(id) ?? null,
		});
		seen.add(id);
	}

	return choices;
}

export async function setActorStatusEffect(actor, statusId, active, options = {}) {
	if (!actor || !statusId || typeof actor.toggleStatusEffect !== "function") return false;
	await actor.toggleStatusEffect(statusId, { ...options, active: Boolean(active) });
	return true;
}
