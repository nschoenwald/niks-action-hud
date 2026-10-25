import { _getPrimaryAttackActivity } from "./activities.js";

/** At or below this many pieces the loaded ammunition is flagged as running low. */
const LOW_STOCK = 5;
const POPOVER_CLASS = "nah-ammo-popover";
const lastAmmoFlag = (activityId) => `last.${activityId}.ammunition`;
const stockOf = (item) => Number(item?.system?.quantity) || 0;
const loc = (key, fallback) => game.i18n?.localize?.(key) || fallback;

/** The activity whose "last used ammunition" flag the dnd5e system keeps for this weapon. */
function ammoActivity(weapon) {
	return _getPrimaryAttackActivity(weapon) || weapon.system?.activities?.contents?.[0] || null;
}

/** Ammunition entries dnd5e offers for the weapon ({ value, label, item }). */
function ammoChoices(weapon) {
	return weapon.system?.ammunitionOptions ?? [];
}

/**
 * The ammunition item the next attack will consume: the remembered choice when it is still offered,
 * otherwise the first offered entry.
 * @param {Item} weapon
 * @returns {Item|null}
 */
export function _readLoadedAmmo(weapon) {
	const activity = ammoActivity(weapon);
	if (!activity) return null;

	const choices = ammoChoices(weapon);
	const remembered = weapon.getFlag?.("dnd5e", lastAmmoFlag(activity.id));
	const pick = choices.find((choice) => choice.value === remembered) ?? choices[0];
	return pick ? (weapon.actor?.items?.get(pick.value) ?? null) : null;
}

/**
 * Ammunition state for a weapon that uses ammunition, as plain data (null for other weapons).
 * `loaded` is null when no ammunition is selected; `level` is "stocked" | "low" | "empty".
 * @param {Item} weapon
 * @returns {{ weaponId: string, loaded: ({ name: string, img: string, quantity: number, level: string }|null) }|null}
 */
export function _readAmmoState(weapon) {
	const props = weapon.system.properties;
	if (!(props instanceof Set) || !props.has("amm")) return null;

	const ammo = _readLoadedAmmo(weapon);
	if (!ammo) return { weaponId: weapon.id, loaded: null };

	const quantity = stockOf(ammo);
	const level = !quantity ? "empty" : quantity <= LOW_STOCK ? "low" : "stocked";
	return { weaponId: weapon.id, loaded: { name: ammo.name, img: ammo.img || "", quantity, level } };
}

// ── Picker popover ───────────────────────────────────────

function node(tag, { className, text, attrs } = {}, ...kids) {
	const el = document.createElement(tag);
	if (className) el.className = className;
	if (text !== undefined) el.textContent = text;
	for (const [name, value] of Object.entries(attrs ?? {})) el.setAttribute(name, value);
	el.append(...kids);
	return el;
}

/** Place `popover` under (or above, when there is no room) the anchor rect, kept inside the viewport. */
function placeNear(popover, anchor) {
	const gap = 6;
	const { width, height } = popover.getBoundingClientRect();
	const room = { below: window.innerHeight - anchor.bottom, above: anchor.top };
	const top = room.below >= height + gap || room.below >= room.above ? anchor.bottom + gap : anchor.top - height - gap;
	const left = Math.min(Math.max(gap, anchor.left), window.innerWidth - width - gap);
	popover.style.left = `${Math.round(left)}px`;
	popover.style.top = `${Math.round(Math.max(gap, Math.min(top, window.innerHeight - height - gap)))}px`;
}

function anchorRect(event) {
	const target = event?.target?.closest?.("[data-action], button") ?? event?.currentTarget;
	if (target?.getBoundingClientRect) return target.getBoundingClientRect();
	const x = event?.clientX ?? window.innerWidth / 2;
	const y = event?.clientY ?? window.innerHeight / 2;
	return new DOMRect(x, y, 0, 0);
}

function openAmmoPicker(weapon, event) {
	document.querySelector(`.${POPOVER_CLASS}`)?.remove();

	const activity = ammoActivity(weapon);
	const choices = ammoChoices(weapon);
	const current = _readLoadedAmmo(weapon);

	const list = node("div", { className: "nah-ammo-popover-list custom-scrollbar", attrs: { role: "menu" } });
	if (!choices.length) {
		list.append(node("div", { className: "nah-ammo-popover-empty", text: loc("NAH.Dnd5e.NoAmmoAvailable", "No ammunition in inventory") }));
	}

	const controller = new AbortController();
	const popover = node("div", { className: POPOVER_CLASS }, node("div", { className: "nah-ammo-popover-title", text: loc("NAH.Dnd5e.SelectAmmo", "Select Ammunition") }), list);
	const close = () => {
		controller.abort();
		popover.remove();
	};

	const choose = async (ammoId) => {
		close();
		if (!activity) return;
		try {
			await weapon.setFlag("dnd5e", lastAmmoFlag(activity.id), ammoId);
		} catch (err) {
			console.warn("Nik's Action HUD | Could not remember ammunition choice:", err);
		}
	};

	for (const { item } of choices) {
		if (!item) continue;
		const stock = stockOf(item);
		const classes = ["nah-ammo-popover-item", item.id === current?.id && "is-selected", !stock && "is-depleted"].filter(Boolean);
		const row = node("div", { className: classes.join(" "), attrs: { role: "menuitemradio", tabindex: "0", "aria-checked": String(item.id === current?.id), "data-ammo-id": item.id } });
		if (item.img) row.append(node("img", { className: "nah-ammo-popover-img", attrs: { src: item.img, alt: "" } }));
		row.append(node("span", { className: "nah-ammo-popover-name", text: item.name }), node("span", { className: "nah-ammo-popover-qty", text: `x${stock}` }));
		row.addEventListener("click", (e) => {
			e.stopPropagation();
			choose(item.id);
		});
		row.addEventListener("keydown", (e) => {
			if (e.key !== "Enter" && e.key !== " ") return;
			e.preventDefault();
			choose(item.id);
		});
		list.append(row);
	}

	document.body.append(popover);
	placeNear(popover, anchorRect(event));
	(list.querySelector(".is-selected") ?? list.firstElementChild)?.focus?.();

	// Registered after the opening click has finished so it cannot close the popover it just created.
	setTimeout(() => {
		if (controller.signal.aborted) return;
		document.addEventListener("pointerdown", (e) => { if (!popover.contains(e.target)) close(); }, { capture: true, signal: controller.signal });
		document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); }, { signal: controller.signal });
	}, 0);
}

async function nudgeStock(weapon, delta) {
	const ammo = _readLoadedAmmo(weapon);
	if (!ammo) return;
	await ammo.update({ "system.quantity": Math.max(0, stockOf(ammo) + delta) });
}

const COMMANDS = {
	plus: (weapon) => nudgeStock(weapon, 1),
	minus: (weapon) => nudgeStock(weapon, -1),
	dropdown: (weapon, event) => openAmmoPicker(weapon, event),
};

/**
 * Handles the ammunition controls on a weapon row.
 * @param {Actor} actor
 * @param {string} weaponId
 * @param {"dropdown"|"plus"|"minus"} command
 * @param {Event} event
 */
export async function _dispatchAmmoCommand(actor, weaponId, command, event) {
	const weapon = actor?.items?.get(weaponId);
	if (weapon) await COMMANDS[command]?.(weapon, event);
}
