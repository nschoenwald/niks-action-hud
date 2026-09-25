const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const cloneValue = (value) => {
	if (value === undefined || value === null) return value;
	if (typeof structuredClone === "function") return structuredClone(value);
	return JSON.parse(JSON.stringify(value));
};

export const ACTION_MENU_PRESET_KEYS = [
	"customMenu",
	"adapterCategoryOverrides",
	"actionMenuFont",
	"actionMenuEmphasizeFirstButton",
	"actionMenuUseTokenImg",
	"closeMenuOnUse",
	"hideEmptySubmenus",
	"dnd5eGroupActionsByActivation",
];

export const buildActionMenuPresetData = (configuration = {}) => {
	const data = {};
	for (const key of ACTION_MENU_PRESET_KEYS) {
		if (hasOwn(configuration, key)) data[key] = cloneValue(configuration[key]);
	}
	if (!Array.isArray(data.customMenu)) data.customMenu = [];
	if (!data.adapterCategoryOverrides || typeof data.adapterCategoryOverrides !== "object") {
		data.adapterCategoryOverrides = {};
	}
	return data;
};

export const applyActionMenuPresetData = (target, presetData = {}) => {
	if (!target || typeof target !== "object") return target;
	for (const key of ACTION_MENU_PRESET_KEYS) {
		if (hasOwn(presetData, key)) target[key] = cloneValue(presetData[key]);
	}
	return target;
};
