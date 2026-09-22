const VALID_SUBMENU_SIDES = new Set(["auto", "left", "right"]);

export function resolveSubMenuSide({
	preference = "auto",
	spaceLeft = 0,
	spaceRight = 0,
	submenuWidth = 0,
	minPadding = 20,
} = {}) {
	const normalizedPreference = VALID_SUBMENU_SIDES.has(preference)
		? preference
		: "auto";

	if (normalizedPreference !== "auto") return normalizedPreference;

	return spaceLeft < submenuWidth + minPadding && spaceRight > spaceLeft
		? "right"
		: "left";
}
