/**
 * Checks section: ability checks, initiative, luck and (for NPCs) rolling hit points.
 */

import { text } from "../../../core/text.js";
import { sd } from "../lib/text.js";
import { ref } from "../../../core/action-ref.js";
import { createRow } from "../../shared/row-model.js";
import { singlePane } from "../../shared/drawer-model.js";
import { getAbilityIcon } from "../lib/icons.js";

const signed = (value) => (value >= 0 ? `+${value}` : `${value}`);

/** One-line roll row that cannot be pinned as a favorite. */
const rollRow = (fields) => createRow({ isAbilityRoll: true, pinnable: false, ...fields });

function abilityCheckRows(actor) {
	const keys = CONFIG.SHADOWDARK.ABILITY_KEYS;
	return keys.map((key) => {
		const ability = actor.system?.abilities?.[key];
		const modifier = signed(Number(ability?.mod ?? 0));
		const longLabel = game.i18n?.localize?.(CONFIG.SHADOWDARK?.ABILITIES_LONG?.[key]) || key.toUpperCase();
		return rollRow({
			id: ref.check(key),
			name: `${longLabel} Check`,
			icon: getAbilityIcon(key),
			modifier,
			// NPCs only have a modifier, characters also a score
			description: ability?.value !== undefined
				? sd("Score", "Score {score} ({mod})", { score: ability.value, mod: modifier })
				: sd("ScoreModifierOnly", "Modifier {mod}", { mod: modifier }),
			type: text("NAH.Tooltips.Card.AbilityCheck", "Ability Check"),
			key,
		});
	});
}

function luckRow(actor) {
	// Characters store both fields: pulp mode counts `remaining`, the standard rules use the `available` token.
	const luck = actor.system.luck;
	const isPulp = Boolean(game.settings.get("shadowdark", "usePulpMode"));
	const available = isPulp ? luck.remaining > 0 : Boolean(luck.available);
	return rollRow({
		id: ref.luck(),
		name: sd("Luck", "Luck"),
		icon: available ? "icons/magic/control/buff-luck-fortune-green.webp" : "icons/magic/symbols/clover-luck-white-green.webp",
		modifier: available ? sd("Ready", "Ready") : sd("Spent", "Spent"),
		description: isPulp ? sd("PulpLeft", "Pulp Luck: {n} left", { n: luck.remaining }) : (available ? sd("LuckAvailable", "Luck Token Available") : sd("LuckSpent", "Luck Spent")),
		type: sd("Luck", "Luck"),
		isDepleted: !available,
	});
}

/** Drawer payload for the checks section. */
export function buildChecks(actor, menuData) {
	const items = abilityCheckRows(actor);

	items.push(rollRow({
		id: ref.check("initiative"),
		name: text("NAH.Tooltips.Card.Initiative", "Initiative"),
		icon: "icons/svg/clockwork.svg",
		modifier: signed(Number(actor.system?.abilities?.dex?.mod ?? 0)),
		description: sd("RollTurnOrder", "Roll Turn Order"),
		type: text("NAH.Tooltips.Card.Initiative", "Initiative"),
	}));

	if (actor.type === "Player") items.push(luckRow(actor));

	if (actor.type === "NPC") {
		items.push(rollRow({ id: ref.rollHp(), name: sd("RollHp", "Roll Hit Points"), icon: "icons/svg/heal.svg", modifier: "HP", description: sd("RollHpDesc", "Roll NPC Max & Current HP"), type: "HP" }));
	}

	return singlePane(menuData?.label || game.i18n?.localize?.("NAH.Shadowdark.Checks") || "Checks", items);
}
