/**
 * Determine if an actor has available spell slots suitable to cast a spell of the specified minimum level.
 * Checks both leveled spell slots (spell1-spell9) and Pact Magic slots.
 * In D&D 5e, a spell of level N can be cast using any spell slot of level >= N.
 * Cantrips (level 0) do not consume spell slots and return false.
 * @param {Actor} actor
 * @param {number} [minLevel=1]
 * @returns {boolean}
 */
export function actorHasAvailableSpellSlots(actor, minLevel = 1) {
	const spells = actor?.system?.spells;
	if (!spells) return false;

	const targetLevel = Number(minLevel);
	if (!Number.isFinite(targetLevel) || targetLevel < 1) {
		return false;
	}

	for (const [key, slot] of Object.entries(spells)) {
		if (!slot || typeof slot !== "object") continue;
		const max = Number(slot.max) || 0;
		const value = Number(slot.value) || 0;
		if (max <= 0 || value <= 0) continue;

		let slotLevel = Number(slot.level);
		if (!Number.isFinite(slotLevel) || slotLevel <= 0) {
			if (key.startsWith("spell")) {
				slotLevel = parseInt(key.replace("spell", ""), 10);
			} else if (key === "pact") {
				slotLevel = Number(spells.pact?.level) || 1;
			}
		}

		if (Number.isFinite(slotLevel) && slotLevel > 0) {
			if (slotLevel >= targetLevel) return true;
		} else if (value > 0) {
			return true;
		}
	}
	return false;
}
