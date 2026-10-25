import { _actorHasLegendary } from "./lib/legendary.js";
import { dnd5eSections } from "./sections.js";
import { ACTION_HANDLERS } from "./provider/actions.js";
import { getFavoriteUses } from "./provider/favorites.js";
import { resolveRollOptions } from "./provider/rolls.js";
import { buildTooltipData } from "./provider/tooltips.js";
import { useDocument } from "./provider/use-item.js";
import { dnd5eAutoPin } from "./auto-pin.js";

/** dnd5e 6.x provider definition (see BaseProvider for the contract). */
export const dnd5eDefinition = {
	id: "dnd5e",
	sections: dnd5eSections,
	legendary: _actorHasLegendary,
	handlers: ACTION_HANDLERS,
	rollContext: resolveRollOptions,
	useDocument,
	uses: getFavoriteUses,
	tooltip: buildTooltipData,
	autoPin: dnd5eAutoPin,
};
