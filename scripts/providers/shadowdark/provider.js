import { shadowdarkSections } from "./sections.js";
import { ACTION_HANDLERS } from "./provider/actions.js";
import { buildFavoriteEntry, getFavoriteUses } from "./provider/favorites.js";
import { buildShadowdarkTooltipData } from "./lib/tooltips.js";
import { useDocument } from "./provider/use-item.js";
import { shadowdarkAutoPin } from "./auto-pin.js";

/** Shadowdark provider definition (see BaseProvider for the contract). */
export const shadowdarkDefinition = {
	id: "shadowdark",
	sections: shadowdarkSections,
	handlers: ACTION_HANDLERS,
	useDocument,
	describe: buildFavoriteEntry,
	uses: getFavoriteUses,
	tooltip: buildShadowdarkTooltipData,
	autoPin: shadowdarkAutoPin,
};
