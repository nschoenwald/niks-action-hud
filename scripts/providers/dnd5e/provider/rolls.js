/**
 * Roll option resolution (modifier-key shortcuts) and the pre-roll hooks that honour them.
 */



/**
 * Register roll hooks once during initialization so fast-forwarded modifier shortcuts
 * (Advantage, Disadvantage, Normal) properly set advantage/disadvantage on DnD5e rolls.
 */
Hooks.once("init", () => {
	if (game.system.id !== "dnd5e") return;

	Hooks.on("dnd5e.preRollD20Test", (config, dialog) => {
		if (config.event?._nahAdvantage === true) {
			config.advantage = true;
			if (dialog) dialog.configure = false;
			for (const roll of config.rolls ?? []) {
				roll.options ??= {};
				roll.options.advantage = true;
			}
		} else if (config.event?._nahDisadvantage === true) {
			config.disadvantage = true;
			if (dialog) dialog.configure = false;
			for (const roll of config.rolls ?? []) {
				roll.options ??= {};
				roll.options.disadvantage = true;
			}
		} else if (config.event?._nahFastForward === true) {
			if (dialog) dialog.configure = false;
		}
	});

	Hooks.on("dnd5e.preRollDamage", (config, dialog) => {
		if (config.event?._nahAdvantage === true) {
			config.isCritical = true;
			if (dialog) dialog.configure = false;
			for (const roll of config.rolls ?? []) {
				roll.options ??= {};
				roll.options.isCritical = true;
			}
		} else if (config.event?._nahDisadvantage === true) {
			config.isCritical = false;
			if (dialog) dialog.configure = false;
			for (const roll of config.rolls ?? []) {
				roll.options ??= {};
				roll.options.isCritical = false;
			}
		} else if (config.event?._nahFastForward === true) {
			if (dialog) dialog.configure = false;
		}
	});
});

/** Roll mode requested by the dnd5e skip-dialog keybindings, then by plain modifier keys. */
function requestedRollMode(ev) {
	const pressed = (action) => Boolean(ev && dnd5e.utils.areKeysPressed(ev, action));
	const wantsAdv = pressed("skipDialogAdvantage");
	const wantsDis = pressed("skipDialogDisadvantage");
	if (wantsAdv !== wantsDis) return wantsAdv ? "advantage" : "disadvantage";
	if (pressed("skipDialogNormal")) return "normal";

	const ctrl = Boolean(ev?.ctrlKey || ev?.metaKey);
	if (ev?.altKey && !ctrl) return "advantage";
	if (ctrl && !ev?.altKey) return "disadvantage";
	if (ev?.shiftKey) return "normal";
	return null;
}

const ROLL_MODE_FLAGS = {
	advantage: { advantage: true, disadvantage: false },
	disadvantage: { advantage: false, disadvantage: true },
	normal: { advantage: false, disadvantage: false },
};

export function resolveRollOptions(event) {
	const ev = event || window.event || null;
	const mode = requestedRollMode(ev);
	const fastForward = mode !== null;
	const { advantage = null, disadvantage = null } = ROLL_MODE_FLAGS[mode] ?? {};

	if (ev) {
		if (advantage === true) ev._nahAdvantage = true;
		if (disadvantage === true) ev._nahDisadvantage = true;
		if (fastForward === true) ev._nahFastForward = true;
	}

	// dnd5e's roll dialog configuration only reads `configure`; the roll mode travels on the process config.
	const dialogOptions = { configure: !fastForward };
	const config = { event: ev };
	if (advantage !== null) config.advantage = advantage;
	if (disadvantage !== null) config.disadvantage = disadvantage;

	return { ev, fastForward, advantage, disadvantage, dialogOptions, config };
}
