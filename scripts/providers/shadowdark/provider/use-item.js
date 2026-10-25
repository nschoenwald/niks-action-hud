/**
 * Executes an action: rolls, spells, potions, light sources, equipping and restoring lost spells.
 */

import { mayEdit } from "../../../core/permissions.js";
import { sd } from "../lib/text.js";
import { text } from "../../../core/text.js";
import { parseRef } from "../../../core/action-ref.js";
import { safeFromUuidSync, safeFromUuid } from "../../base.js";
import { rollOptionsFor } from "./rolls.js";

/** Run an owned item (or uuid / name reference) the Shadowdark way. */
export async function useDocument(actor, itemId, event = null) {
	const rollOptions = rollOptionsFor(event || window.event || {});
	let item = actor.items.get(itemId);
	const baseItemId = typeof itemId === "string" ? itemId.split("_")[0] : itemId;
	if (!item && typeof baseItemId === "string" && baseItemId.includes(".")) {
		const subId = baseItemId.split(".").pop();
		item = actor.items.get(subId);
	}
	if (!item && typeof baseItemId === "string" && (baseItemId.includes(".") || baseItemId.startsWith("Item.") || baseItemId.startsWith("Actor.") || baseItemId.startsWith("Compendium."))) {
		item = safeFromUuidSync(baseItemId) || (await safeFromUuid(baseItemId));
		if (item && actor?.items && (item.actor !== actor || item.actor?.id !== actor.id)) {
			item = actor.items.get(item.id) || actor.items.getName(item.name) || item;
		}
		if (item && (item.inCompendium || !item.actor || (item.actor !== actor && item.actor?.id !== actor.id))) {
			if (actor?.isOwner || game.user.isGM) {
				try {
					const created = await actor.createEmbeddedDocuments("Item", [item.toObject()]);
					if (created?.[0]) item = created[0];
				} catch (err) {
					console.warn("Nik's Action HUD | Failed to import staged item to actor:", err);
				}
			}
		}
	}
	if (!item && typeof itemId === "string") {
		item = actor.items.getName(itemId);
	}
	if (!item) {
		ui.notifications.warn(text("NAH.Messages.ItemNotFound", "Item not found: {id}", { id: itemId }));
		return;
	}

	// Attacks: NPCs roll by item id (attacks and carried weapons), characters by weapon uuid
	if (actor.type === "NPC" && (item.system.isWeapon || item.type === "NPC Attack" || item.type === "NPC Special Attack")) {
		return actor.system.rollAttack(item.id, rollOptions);
	}
	if (item.system.isWeapon) {
		return actor.system.rollAttack(item.uuid, rollOptions);
	}

	// Spells (Player or NPC)
	if (item.type === "Spell") {
		return actor.system.castSpell(item.uuid, rollOptions);
	}

	// Scrolls
	if (item.system?.isScroll) {
		return actor.system.castSpell(item.system.spellUuid, {
			itemUuid: item.uuid,
			...rollOptions,
		});
	}

	// Wands (generic item click)
	if (item.system?.isWand) {
		const spells = item.system.spells.filter((s) => !s.lost);
		if (spells.length === 0) {
			ui.notifications.warn(game.i18n?.localize?.("SHADOWDARK.error.wand.broken") || "Wand is broken or spells lost.");
			return;
		}
		const targetSpellUuid = spells[0].uuid;
		return actor.system.castSpell(targetSpellUuid, {
			itemUuid: item.uuid,
			...rollOptions,
		});
	}

	// Potions (only characters can drink them)
	if (item.type === "Potion" && actor.type === "Player") {
		return actor.system.usePotion(item.id);
	}

	// Light Source
	if (item.system?.light?.isSource) {
		return toggleLight(actor, item.id);
	}

	// Class Abilities
	if (item.type === "Class Ability" && actor.type === "Player") {
		return actor.system.useAbility(item.uuid, rollOptions);
	}

	// Everything else (NPC features, talents, boons, gear): open the item sheet
	return item.sheet?.render(true);
}

export async function handleLuck(actor) {
	const luck = actor.system?.luck;
	if (!luck) return;

	const isPulp = Boolean(game.settings.get("shadowdark", "usePulpMode"));
	const hasLuck = isPulp ? (Number(luck.remaining ?? 0) > 0) : Boolean(luck.available);
	if (!hasLuck) {
		ui.notifications.warn(game.i18n?.localize?.("NAH.Shadowdark.NoLuckLeft") || "No Luck remaining.");
		return;
	}

	const title = game.i18n?.localize?.("NAH.Shadowdark.SpendLuck") || "Spend Luck";
	const content = `<p>${game.i18n?.localize?.("NAH.Shadowdark.SpendLuckConfirm") || "Do you want to spend a Luck point to reroll your last check or test?"}</p>`;
	const spendCallback = () => actor.system.useLuckToken(true);

	foundry.applications.api.DialogV2.confirm({
		window: { title },
		content,
		yes: {
			icon: "fa-solid fa-clover",
			label: title,
			callback: spendCallback,
		},
		rejectClose: false,
	});
}

export async function toggleLight(actor, itemId) {
	if (!mayEdit(actor)) {
		ui.notifications.warn(game.i18n?.localize?.("NAH.UI.PermissionDenied") || "No permission.");
		return;
	}

	const item = actor.items.get(itemId);
	if (!item?.system?.light?.isSource) return;

	// Character sheets toggle the light themselves; other sheets (NPCs) have no _toggleLightSource
	if (typeof actor.sheet?._toggleLightSource === "function") {
		return await actor.sheet._toggleLightSource(item);
	}

	// Otherwise do what the character sheet does
	const active = !item.system.light.active;
	if (active) {
		const activeLightSources = await actor.getActiveLightSources();
		for (const ls of activeLightSources) {
			if (ls.id !== item.id) {
				await ls.update({ "system.light.active": false });
			}
		}
	}

	const dataUpdate = { "system.light.active": active };
	if (!item.system.light.hasBeenUsed) {
		dataUpdate["system.light.hasBeenUsed"] = true;
	}
	await item.update(dataUpdate);

	await actor.toggleLight(active, item.id);
	game.shadowdark.lightSourceTracker.toggleLightSource(actor, item);
}

export async function flipEquipped(actor, itemId) {
	if (!mayEdit(actor)) {
		ui.notifications.warn(game.i18n?.localize?.("NAH.UI.PermissionDenied") || "No permission.");
		return;
	}

	const item = actor.items.get(itemId);
	if (!item) return;

	const wasEquipped = Boolean(item.system?.equipped);
	const willEquip = !wasEquipped;
	try {
		await item.update({
			"system.equipped": willEquip,
			"system.stashed": false,
		});

		if (willEquip && item.system?.isAShield) {
			const updates = [];
			const physical = actor.system?.getPhysicalItems ? actor.system.getPhysicalItems() : actor.items;
			for (const pi of physical) {
				if (pi.id !== item.id && pi.system?.isWeapon && pi.system?.equipped && pi.system?.handedness === "2h") {
					if (pi.system.isVersatile) {
						updates.push({ _id: pi.id, "system.handedness": "1h" });
					} else {
						updates.push({ _id: pi.id, "system.equipped": false });
					}
				}
			}
			if (updates.length > 0) {
				await actor.updateEmbeddedDocuments("Item", updates);
			}
		}
	} catch (error) {
		console.warn("Nik's Action HUD | Shadowdark equip toggle failed:", error);
		ui.notifications.warn(game.i18n?.localize?.("NAH.Notifications.ActorUpdateError") || "Failed to update item.");
	}
}

export async function recoverItem(actor, itemId) {
	if (!mayEdit(actor)) {
		ui.notifications.warn(game.i18n?.localize?.("NAH.UI.PermissionDenied") || "No permission.");
		return false;
	}

	const target = parseRef(itemId);
	if (target.kind === "wand-spell") {
		const wand = actor.items.get(target.args[0]);
		if (wand?.system?.isWand) {
			await wand.system.setSpellLost(target.args[1], false);
			ui.notifications.info(sd("RestoredWandSpell", "Restored spell on wand: {name}", { name: wand.name }));
			return true;
		}
	}

	const item = actor.items.get(itemId);
	if (!item) return false;

	if (item.type === "Spell" && item.system.lost) {
		await item.update({ "system.lost": false });
		ui.notifications.info(sd("RegainedSpell", "Regained spell: {name}", { name: item.name }));
		return true;
	}

	if (item.system?.isWand) {
		const spells = item.system.spells.map((s) => foundry.utils.mergeObject(s, { lost: false }));
		await item.update({ "system.spells": spells, "system.broken": false });
		ui.notifications.info(sd("RestoredWand", "Restored wand: {name}", { name: item.name }));
		return true;
	}

	if (item.type === "Class Ability" && item.system.uses.max) {
		await item.update({ "system.uses.available": item.system.uses.max });
		ui.notifications.info(sd("RestoredUses", "Restored uses for: {name}", { name: item.name }));
		return true;
	}

	return false;
}
