/**
 * Builds a visual progress indicator for active light sources (e.g. "◆ ◆ ◆ ◇").
 * @param {Item} item
 * @returns {{ pips: string, timeRemaining: string, remainingMinutes: number, active: boolean }}
 */
export function getLightSourceInfo(item) {
	if (!item?.system?.light?.isSource) {
		return { pips: "", timeRemaining: "", remainingMinutes: 0, active: false };
	}

	const light = item.system.light;
	const active = Boolean(light.active);
	const remainingSecs = Number(light.remainingSecs || 0);
	const longevityMins = Number(light.longevityMins || 60);
	const maxSeconds = longevityMins * 60;
	const remainingMinutes = Math.ceil(remainingSecs / 60);

	let pips = [];
	for (let i = 0; i < 4; i++) {
		if (remainingSecs > (maxSeconds * i) / 4) {
			pips.push("◆");
		} else {
			pips.push("◇");
		}
	}
	const pipsStr = pips.join(" ");

	let timeRemaining = "";
	if (remainingSecs <= 0) {
		timeRemaining = game.i18n?.localize?.("SHADOWDARK.chat.light_source.expired") || "Expired";
	} else if (remainingSecs < 60) {
		timeRemaining = game.i18n?.localize?.("SHADOWDARK.inventory.item.light_seconds_remaining") || "< 1m";
	} else {
		timeRemaining = game.i18n?.format?.("SHADOWDARK.inventory.item.light_remaining", { timeRemaining: remainingMinutes })
			|| `${remainingMinutes}m`;
	}

	return {
		pips: active ? pipsStr : "◇ ◇ ◇ ◇",
		timeRemaining,
		remainingMinutes,
		active,
	};
}
