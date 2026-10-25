/**
 * Roll options derived from the held modifier keys, and the roll hooks that apply them.
 *
 * Shadowdark registers no fast-forward keybindings of its own, so the HUD maps the modifier keys itself:
 * Shift rolls with advantage, Alt/Option rolls normally, Ctrl/Cmd rolls with disadvantage, each without the roll prompt.
 */

/** Config key carrying the forced advantage (1 / -1) from the click to the roll hooks below. */
const ADVANTAGE_FLAG = "_nahAdvantage";

/**
 * Shadowdark hooks that receive the roll config after its generators and the (skipped) prompt, right before the roll.
 * The generators write `mainRoll.advantage` from Active Effects, so a value passed in up front would be overwritten.
 */
const ROLL_HOOKS = ["SD-Stat-Check", "SD-Player-Attack", "SD-Player-Spell", "SD-Player-classAbility", "SD-NPC-Attack", "SD-NPC-Spell-Cast"];

/** Roll options for a click: `skipPrompt` plus the forced advantage, or `{}` when no modifier key is held. */
export function rollOptionsFor(ev) {
	const advantage = ev.shiftKey ? 1 : ((ev.ctrlKey || ev.metaKey) ? -1 : 0);
	if (!advantage && !ev.altKey) return {};
	return advantage ? { skipPrompt: true, [ADVANTAGE_FLAG]: advantage } : { skipPrompt: true };
}

Hooks.once("init", () => {
	if (game.system.id !== "shadowdark") return;

	// A forced advantage wins over the one from Active Effects, as picking it in the roll prompt would.
	const applyForcedAdvantage = (config) => {
		const advantage = config?.[ADVANTAGE_FLAG];
		if (advantage !== 1 && advantage !== -1) return;
		config.mainRoll ??= {};
		config.mainRoll.advantage = advantage;
	};
	for (const hook of ROLL_HOOKS) Hooks.on(hook, applyForcedAdvantage);
});
