/** Hover card data for a pinned macro. */

import { text } from "./text.js";

export function buildMacroCard(macroId) {
	const macro = fromUuidSync(macroId, { strict: false }) || game.macros?.get(macroId);
	if (!macro) return null;
	return {
		title: macro.name,
		subtitle: text("NAH.Tooltips.Card.Macro", "Macro"),
		icon: macro.img,
		badges: [],
		specs: [],
		description: "",
		footer: text("NAH.Tooltips.Card.UseFooter", "Left-Click to Use"),
	};
}
