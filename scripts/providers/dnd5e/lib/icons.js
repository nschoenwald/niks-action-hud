import { readSetting } from "../../../core/setting-read.js";

const DND5E_ABILITY_ICONS = {
	str: "icons/magic/control/buff-strength-muscle-damage.webp",
	dex: "icons/skills/movement/feet-winged-sandals-tan.webp",
	con: "icons/magic/life/heart-glowing-red.webp",
	int: "icons/skills/trades/academics-investigation-puzzles.webp",
	wis: "icons/tools/navigation/compass-worn-copper.webp",
	cha: "icons/magic/control/control-influence-crown-gold.webp",
};

/**
 * Returns the ability icon path for a given ability key, falling back to bundled SVGs then d20.
 * @param {string} abilityKey
 * @param {string} [defaultIcon="icons/svg/d20-highlight.svg"]
 * @returns {string}
 */
export function getAbilityIcon(abilityKey, defaultIcon = "icons/svg/d20-highlight.svg") {
	return DND5E_ABILITY_ICONS[abilityKey?.toLowerCase()] || defaultIcon;
}

/**
 * Display name for an ability roll, e.g. "Strength Check" / "Strength Save".
 * @param {"check"|"save"} kind
 * @param {string} abilityLabel
 */
export function abilityActionName(kind, abilityLabel) {
	const key = kind === "save" ? "NAH.Rolls.SaveName" : "NAH.Rolls.CheckName";
	const fallback = `${abilityLabel} ${kind === "save" ? "Save" : "Check"}`;
	return game.i18n.has?.(key) ? game.i18n.format(key, { ability: abilityLabel }) : fallback;
}

/**
 * Icon for a skill: the system's own skill art (every dnd5e skill has one), else the ability icon the
 * caller supplies (skills added by other modules).
 * @param {string} skillKey
 * @param {string} [abilityIcon]
 * @returns {string}
 */
export function getSkillIcon(skillKey, abilityIcon = "icons/svg/d20-highlight.svg") {
	const key = skillKey?.toLowerCase();
	return CONFIG.DND5E.skills[key]?.icon || abilityIcon;
}

/**
 * Checks whether tool checks should be displayed in the Abilities/Utility menu.
 * @returns {boolean}
 */
export function shouldShowToolChecks() {
	return Boolean(readSetting("dnd5eShowToolChecks"));
}

/**
 * Fallback icon mappings for DnD5e tool checks when compendium artwork is unavailable.
 */
const DND5E_TOOL_ICONS = {
	alchemist: "icons/tools/laboratory/mortar-powder-green.webp",
	brewer: "icons/tools/laboratory/cauldron-empty-black.webp",
	calligrapher: "icons/tools/scribal/brush-ink.webp",
	carpenter: "icons/tools/hand/hammer-modern-wood.webp",
	cartographer: "icons/tools/navigation/map-chart.webp",
	cobbler: "icons/tools/hand/awl.webp",
	cook: "icons/tools/cooking/pot-iron-grey.webp",
	glassblower: "icons/tools/laboratory/burner-steel-grey.webp",
	jeweler: "icons/tools/hand/magnifying-glass.webp",
	leatherworker: "icons/tools/hand/shears.webp",
	mason: "icons/tools/hand/chisel-steel-brown.webp",
	painter: "icons/tools/hand/paint-palette.webp",
	potter: "icons/tools/laboratory/bowl-mixing.webp",
	smith: "icons/tools/smithing/anvil.webp",
	tinker: "icons/tools/hand/wrench-adjustable-toothed.webp",
	weaver: "icons/tools/hand/punch-awl.webp",
	woodcarver: "icons/tools/hand/knife-paring.webp",
	disg: "icons/tools/hand/mirror-hand.webp",
	forg: "icons/tools/scribal/wax-seal.webp",
	game: "icons/sundries/gaming/dice-pair-white.webp",
	chess: "icons/sundries/gaming/chess-piece-knight-white.webp",
	dice: "icons/sundries/gaming/dice-pair-white.webp",
	card: "icons/sundries/gaming/playing-cards.webp",
	herb: "icons/tools/laboratory/bowl-herbs-green.webp",
	music: "icons/tools/instruments/harp-yellow-teal.webp",
	bagpipes: "icons/tools/instruments/horn-white-gray.webp",
	drum: "icons/tools/instruments/drum-snare-red.webp",
	dulcimer: "icons/tools/instruments/harp-yellow-teal.webp",
	flute: "icons/tools/instruments/pipe-flute-yellow.webp",
	horn: "icons/tools/instruments/horn-white-gray.webp",
	lute: "icons/tools/instruments/harp-yellow-teal.webp",
	lyre: "icons/tools/instruments/harp-yellow-teal.webp",
	panflute: "icons/tools/instruments/pipe-flute-brown.webp",
	shawm: "icons/tools/instruments/pipe-flue-tan.webp",
	viol: "icons/tools/instruments/harp-yellow-teal.webp",
	navg: "icons/tools/navigation/compass-brass.webp",
	pois: "icons/tools/laboratory/vials-blue-pink.webp",
	thief: "icons/tools/hand/lockpicks-steel.webp",
	art: "icons/tools/smithing/anvil.webp",
	vehicle: "icons/vehicles/land/cart-wood.webp",
	air: "icons/vehicles/air/airship.webp",
	land: "icons/vehicles/land/cart-wood.webp",
	space: "icons/vehicles/air/airship.webp",
	water: "icons/vehicles/sea/boat.webp",
};

const _toolIconCache = new Map();

/**
 * Returns the best available icon path for a tool check in DnD5e 6.x.
 * Prioritizes the art of the tool's base item (from the compendium index), then the map above,
 * falling back to dnd5e's tool trait icon.
 * @param {string} key
 * @returns {string}
 */
export function getToolIcon(key) {
	const normKey = String(key || "").toLowerCase();
	if (_toolIconCache.has(normKey)) {
		return _toolIconCache.get(normKey);
	}

	// Vehicle proficiencies (air, land, space, water) have no tool config; their art comes from the map above.
	const toolConfig = CONFIG.DND5E.tools[normKey];

	if (toolConfig?.id) {
		try {
			const { Trait } = dnd5e.documents;
			const baseItem = Trait.getBaseItem(Trait.getBaseItemUUID(toolConfig.id), { indexOnly: true });
			if (baseItem?.img) {
				_toolIconCache.set(normKey, baseItem.img);
				return baseItem.img;
			}
		} catch (_err) {
			// Ignore compendium cache errors and fall back
		}
	}
	const icon = DND5E_TOOL_ICONS[normKey] || "systems/dnd5e/icons/svg/trait-tool-proficiencies.svg";
	_toolIconCache.set(normKey, icon);
	return icon;
}
