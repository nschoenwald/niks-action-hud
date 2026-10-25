/**
 * Attacks section: one row per equipped weapon (including natural weapons on NPCs).
 */

import { singlePane } from "../../shared/drawer-model.js";
import { createRow, segment } from "../../shared/row-model.js";
import { _describeActivation } from "../lib/activation.js";
import { _getPrimaryAttackActivity } from "../lib/activities.js";
import { _readAmmoState } from "../lib/ammo.js";
import { _getItemDamage } from "../lib/damage.js";
import { _describeReach, _shouldShowReach } from "../lib/range.js";

const isEquippedWeapon = (item) => item.type === "weapon" && item.system.equipped;

/** Sub-line pieces for a weapon: activation badge, damage parts, reach (when not plain melee), ammo. */
function weaponSegments(weapon, attackActivity, actor) {
	const segments = [];

	const activation = _describeActivation(attackActivity?.activation?.type || "action");
	if (activation) segments.push(segment.activation(activation.classType, activation.label, activation.title));

	const { damageParts, damageDisplay } = _getItemDamage(weapon, actor);
	for (const part of damageParts) segments.push(segment.damage(part.formula, part.types, damageDisplay));

	const reach = _describeReach(weapon);
	if (_shouldShowReach(weapon, reach)) segments.push(segment.range(reach));

	const ammo = _readAmmoState(weapon);
	if (ammo) segments.push(segment.ammo(ammo.weaponId, ammo.loaded));

	return segments;
}

function attackRow(weapon, actor) {
	const attackActivity = _getPrimaryAttackActivity(weapon);
	return createRow({
		id: weapon.id,
		name: weapon.name,
		icon: weapon.img,
		modifier: attackActivity?.labels?.toHit || weapon.labels?.toHit || "",
		segments: weaponSegments(weapon, attackActivity, actor),
		description: weapon.system.description?.value || "",
	});
}

/** Drawer payload for the attacks section. */
export function buildAttacks(actor) {
	const rows = actor?.items ? actor.items.filter(isEquippedWeapon).map((weapon) => attackRow(weapon, actor)) : [];
	return singlePane("ATTACKS", rows);
}
