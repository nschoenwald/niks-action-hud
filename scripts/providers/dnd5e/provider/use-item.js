/**
 * Uses an owned item (or a uuid / name reference) the dnd5e way: through `item.use` with the
 * held-key roll configuration.
 */

import { text } from "../../../core/text.js";
import { safeFromUuidSync, safeFromUuid } from "../../base.js";
import { resolveRollOptions } from "./rolls.js";

/** Find the actor's item for a document id, uuid or name; foreign documents are copied onto the actor when allowed. */
async function resolveDocument(actor, itemId) {
	const baseId = itemId.split("_")[0];
	let item = actor.items.get(itemId) ?? actor.items.get(baseId.split(".").pop());

	if (!item && baseId.includes(".")) {
		item = safeFromUuidSync(baseId) || (await safeFromUuid(baseId));
		const foreign = item && item.actor?.id !== actor.id;
		if (foreign) item = actor.items.get(item.id) || actor.items.getName(item.name) || item;
		if (item && (item.inCompendium || !item.actor || item.actor.id !== actor.id) && (actor.isOwner || game.user.isGM)) {
			try {
				const [created] = await actor.createEmbeddedDocuments("Item", [item.toObject()]);
				if (created) item = created;
			} catch (err) {
				console.warn("Nik's Action HUD | Could not copy the referenced item onto the actor:", err);
			}
		}
	}
	return item ?? actor.items.getName(itemId) ?? null;
}

export async function useDocument(actor, itemId, event = null) {
	const { config, dialogOptions } = resolveRollOptions(event);
	const item = await resolveDocument(actor, itemId);
	if (!item) {
		ui.notifications.warn(text("NAH.Messages.ItemNotFound", "Item not found: {id}", { id: itemId }));
		return undefined;
	}
	return item.use(config, dialogOptions);
}
