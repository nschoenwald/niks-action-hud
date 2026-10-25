/**
 * Nik's Action HUD - Settings Locks Integration
 *
 * Integrates with the "niks-settings-locks" module if active.
 * Allows GMs to soft-lock and hard-lock client-scoped Action HUD settings
 * directly within the Action HUD Configuration interface.
 */

const NSL_MODULE_ID = "niks-settings-locks";
const NAH_MODULE_ID = "niks-action-hud";

/**
 * Check if the "niks-settings-locks" module is currently active.
 * @returns {boolean}
 */
function isSettingsLocksActive() {
	return !!game.modules?.get(NSL_MODULE_ID)?.active;
}

/**
 * Check if the current user has permission to manage setting locks.
 * Defaults to GAMEMASTER if the setting isn't registered or accessible.
 * @returns {boolean}
 */
export function canManageLocks() {
	if (!isSettingsLocksActive()) return false;
	let minRole = CONST.USER_ROLES.GAMEMASTER;
	try {
		minRole = game.settings.get(NSL_MODULE_ID, "minimumRole");
	} catch {
		// Fallback to GM
	}
	return (game.user?.role ?? 0) >= minRole;
}

/**
 * Get the lock definition for an Action HUD setting.
 * @param {string} settingKey - e.g. "hideEmptyDrawers" or "dnd5eDamageTypeDisplay"
 * @returns {{ type: "soft"|"hard", value: any, rev: number } | null}
 */
function getSettingLock(settingKey) {
	if (!isSettingsLocksActive()) return null;
	try {
		const fullKey = settingKey.includes(".") ? settingKey : `${NAH_MODULE_ID}.${settingKey}`;
		const lockMap = game.settings.get(NSL_MODULE_ID, "lockMap") || {};
		return lockMap[fullKey] ?? null;
	} catch {
		return null;
	}
}

/**
 * Get the formatted lock state object for Handlebars rendering.
 * @param {string} settingKey
 * @returns {object}
 */
export function getLockState(settingKey) {
	const active = isSettingsLocksActive();
	if (!active) {
		return {
			active: false,
			canManage: false,
			settingKey,
			isLocked: false,
			isHard: false,
			isSoft: false,
			type: "none",
			disabled: false,
			tooltip: "",
		};
	}

	const canManage = canManageLocks();
	const lock = getSettingLock(settingKey);
	const type = lock?.type || "none";
	const isHard = type === "hard";
	const isSoft = type === "soft";
	const isLocked = isHard || isSoft;

	let tooltip = "";
	if (canManage) {
		if (isHard) {
			tooltip = game.i18n.localize("NSL.Tooltip.Hard") || "Hard Locked — Enforced for all players. Click to unlock.";
		} else if (isSoft) {
			tooltip = game.i18n.localize("NSL.Tooltip.Soft") || "Soft Locked — Applied once, players can override. Click for hard lock.";
		} else {
			tooltip = game.i18n.localize("NSL.Tooltip.Unlocked") || "Unlocked — Click to soft-lock, right-click to hard-lock.";
		}
	} else if (isHard) {
		tooltip = game.i18n.localize("NSL.Tooltip.LockedByGM") || "Locked by GM";
	} else if (isSoft) {
		tooltip = game.i18n.localize("NSL.Tooltip.SoftLockedByGM") || "Soft-locked by GM — You can change this setting";
	}

	return {
		active: true,
		canManage,
		settingKey,
		lock,
		type,
		isLocked,
		isHard,
		isSoft,
		disabled: isHard && !canManage,
		tooltip,
	};
}

/**
 * Cycle a setting lock forward or backward.
 * Forward:  Unlocked -> Soft -> Hard -> Unlocked
 * Backward: Unlocked -> Hard -> Soft -> Unlocked
 *
 * @param {string} settingKey
 * @param {"forward"|"backward"} direction
 * @returns {Promise<{ type: string, value: any, rev: number } | null>}
 */
export async function cycleSettingLock(settingKey, direction = "forward") {
	if (!canManageLocks()) return null;

	const fullKey = settingKey.includes(".") ? settingKey : `${NAH_MODULE_ID}.${settingKey}`;
	const [namespace, key] = fullKey.split(".");

	try {
		const lockMap = foundry.utils.deepClone(game.settings.get(NSL_MODULE_ID, "lockMap") || {});
		const current = lockMap[fullKey] ?? null;

		let nextType = null;
		if (direction === "forward") {
			if (!current) nextType = "soft";
			else if (current.type === "soft") nextType = "hard";
			else nextType = null;
		} else {
			if (!current) nextType = "hard";
			else if (current.type === "hard") nextType = "soft";
			else nextType = null;
		}

		if (nextType) {
			// Read the current setting value from game.settings
			let value = undefined;
			try {
				value = game.settings.get(namespace, key);
			} catch {
				// Setting value fallback
			}
			const rev = (current?.rev ?? 0) + 1;
			lockMap[fullKey] = { type: nextType, value, rev };
		} else {
			delete lockMap[fullKey];
		}

		await game.settings.set(NSL_MODULE_ID, "lockMap", lockMap);

		// Notify connected clients via socket
		if (game.socket) {
			game.socket.emit(`module.${NSL_MODULE_ID}`, { action: "apply-locks" });
		}

		return lockMap[fullKey] ?? null;
	} catch (err) {
		console.error(`Nik's Action HUD | Failed to update lock for ${fullKey}:`, err);
		return null;
	}
}
