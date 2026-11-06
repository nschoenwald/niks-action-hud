/**
 * Hides the HUD (dock, drawer, hover card, popovers) while the player picks a spot on the canvas, and brings it
 * back once that is done, whether confirmed or cancelled:
 * - placing a template: dnd5e's TemplatePlacement (and anything else) goes through Foundry's
 *   `RegionLayer#placeRegions`, which resolves when the placement ends;
 * - choosing a teleport destination with Automated Animations' teleport preset (a Sequencer effect named
 *   "teleportation" marks the range until the token moves), including the teleport UI of niks-foundry-tweaks
 *   (niks-dnd5e-tweaks before 14.70.0), which marks its session with a class on <body>.
 */

const HIDDEN_CLASS = "nah-canvas-workflow";
/**
 * Body classes the teleport UI sets for the length of its targeting session: niks-foundry-tweaks, and
 * niks-dnd5e-tweaks before 14.70.0 (the feature moved there).
 */
const TWEAKS_TELEPORT_CLASSES = ["nft-teleport-active", "nd5t-teleport-active"];
/** Name Automated Animations gives the range effect of its teleport preset. */
const AA_TELEPORT_EFFECT = "teleportation";

const active = new Set();
let teleportTokenId = null;

function begin(reason, hud) {
	if (active.has(reason)) return;
	if (!active.size) {
		hud.closeDrawer();
		hud.dismissHoverCard(true);
		document.body.classList.add(HIDDEN_CLASS);
	}
	active.add(reason);
}

function end(reason) {
	if (!active.delete(reason)) return;
	if (!active.size) document.body.classList.remove(HIDDEN_CLASS);
}

/** Wrap template placement: hidden from the first preview until the placement promise settles. */
function wrapRegionPlacement(hud) {
	const RegionLayer = foundry.canvas.layers.RegionLayer;
	const original = RegionLayer?.prototype.placeRegions;
	if (typeof original !== "function") return;
	RegionLayer.prototype.placeRegions = async function (...args) {
		const reason = Symbol("placeRegions");
		begin(reason, hud);
		try {
			return await original.apply(this, args);
		} finally {
			end(reason);
		}
	};
}

function endTeleport() {
	teleportTokenId = null;
	end("aa-teleport");
}

/** Automated Animations' teleport preset, for the player who controls the teleporting token. */
function watchAutomatedAnimationsTeleport(hud) {
	Hooks.on("aa.preDataSanitize", (handler, data) => {
		if (data?.menu !== "preset" || data.presetType !== "teleportation") return;
		const token = handler?.sourceToken;
		if (!token || token.scene?.id !== canvas.scene?.id) return;
		if (!token.isOwner && !game.user.isGM) return;
		teleportTokenId = token.id;
		begin("aa-teleport", hud);
	});
	// The range effect ends when a destination is picked (or the tweaks module cancels the teleport).
	Hooks.on("endedSequencerEffect", (effect) => {
		if (effect?.data?.name === AA_TELEPORT_EFFECT) endTeleport();
	});
	// Fallbacks for when the effect is not played on this client (e.g. hidden from players): the token moved or is gone.
	Hooks.on("updateToken", (doc, changes) => {
		if (doc.id === teleportTokenId && ("x" in changes || "y" in changes)) endTeleport();
	});
	Hooks.on("deleteToken", (doc) => {
		if (doc.id === teleportTokenId) endTeleport();
	});
	Hooks.on("canvasTearDown", endTeleport);
}

/** The teleport UI of Nik's Foundry Tweaks (or an older Nik's DnD5e Tweaks): follow its body class. */
function watchTweaksTeleport(hud) {
	const sync = () => {
		const classes = document.body.classList;
		if (TWEAKS_TELEPORT_CLASSES.some(cls => classes.contains(cls))) begin("tweaks-teleport", hud);
		else end("tweaks-teleport");
	};
	new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ["class"] });
	sync();
}

/** Register once at init. */
export function registerCanvasWorkflowHiding(hud) {
	wrapRegionPlacement(hud);
	if (game.modules.get("autoanimations")?.active) watchAutomatedAnimationsTeleport(hud);
	watchTweaksTeleport(hud);
}
