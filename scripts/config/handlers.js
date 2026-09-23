import { defaultRegistry } from "../systems/defaults.js";
import { ActorPresetManager } from "./preset-manager.js";
import { MODULE_ID } from "../constants.js";
import {
	addAMLayer,
	EFFECTS_DEFAULTS,
	getAMElementSaveData,
	getAttributeBadgeConditionDefaults,
	getAttributeIconDefaults,
	getAttributeImageDefaults,
	getAttributeLinkedBarDefaults,
	getAttributeMetaDefaults,
	getAttributeQualitativeDefaults,
	getAttributeScaleDefaults,
	getAttributeTextColorDefaults,
	getAttributeThresholdColorDefaults,
	getAttributeVisibilityDefaults,
	getExcludedActorTypesSaveData,
	getGlobalImageSaveData,
	getGlobalMenuBehaviorSaveData,
	getGlobalResponsiveSaveData,
	getGlobalScaleSaveData,
	getGlobalSimpleSaveData,
	getGlobalThemeFontLayoutSaveData,
	getLayerDefaults,
	getNewAttributeStageDefault,
	removeAMLayer,
} from "./schema.js";
import { exportTheme, importTheme } from "./theme-export.js";
import {
	applyActionMenuPresetData,
	buildActionMenuPresetData,
} from "./action-menu-presets.js";
import {
	ACTOR_RESET_SECTION_IDS,
	RESET_SCOPE_IDS,
	resetActorSection,
	resetGlobalSection,
} from "./reset-sections.js";

const canEditTracking = () => {
	const role =
		game.settings.get(MODULE_ID, "trackingConfigRole") ?? 4;
	return game.user.role >= role;
};

const canEditStyle = () => {
	const role =
		game.settings.get(MODULE_ID, "styleConfigRole") ?? 4;
	return game.user.role >= role;
};

const canEditMenu = () => {
	const role =
		game.settings.get(MODULE_ID, "menuConfigRole") ??
		game.settings.get(MODULE_ID, "styleConfigRole") ?? 4;
	return game.user.role >= role;
};

const canEditEffects = () => game.user.isGM;

const RESET_SCOPE_I18N = Object.freeze({
	[RESET_SCOPE_IDS.TRACKING]: {
		label: "IBHUD.Config.Tabs.Tracking",
		description: "IBHUD.Config.Reset.TrackingHint",
	},
	[RESET_SCOPE_IDS.COMMON]: {
		label: "IBHUD.Config.Tabs.Common",
		description: "IBHUD.Config.Reset.CommonHint",
	},
	[RESET_SCOPE_IDS.CARD]: {
		label: "IBHUD.Config.Tabs.Card",
		description: "IBHUD.Config.Reset.CardHint",
	},
	[RESET_SCOPE_IDS.ACTION_MENU]: {
		label: "IBHUD.Config.Tabs.ActionMenu",
		description: "IBHUD.Config.Reset.ActionMenuHint",
	},
	[RESET_SCOPE_IDS.MENU]: {
		label: "IBHUD.Config.Reset.MenuLabel",
		description: "IBHUD.Config.Reset.MenuHint",
	},
	[RESET_SCOPE_IDS.EFFECTS]: {
		label: "IBHUD.Config.Tabs.Effects",
		description: "IBHUD.Config.Reset.EffectsHint",
	},
	[RESET_SCOPE_IDS.PORTRAIT]: {
		label: "IBHUD.Config.Tabs.Portrait",
		description: "IBHUD.Config.Reset.PortraitHint",
	},
});

const getResetScopeOptions = (app) => {
	const isGlobal = app.currentEditId === "global";
	const scopes = [];
	const add = (id) => {
		const strings = RESET_SCOPE_I18N[id];
		scopes.push({
			id,
			label: game.i18n.localize(strings.label),
			description: game.i18n.localize(strings.description),
		});
	};

	if (canEditTracking()) add(RESET_SCOPE_IDS.TRACKING);
	if (canEditStyle()) {
		if (isGlobal) add(RESET_SCOPE_IDS.COMMON);
		add(RESET_SCOPE_IDS.CARD);
		add(isGlobal ? RESET_SCOPE_IDS.ACTION_MENU : RESET_SCOPE_IDS.PORTRAIT);
	}
	if (isGlobal && canEditMenu()) add(RESET_SCOPE_IDS.MENU);
	if (isGlobal && canEditEffects()) add(RESET_SCOPE_IDS.EFFECTS);

	if (scopes.length > 1) {
		scopes.push({
			id: RESET_SCOPE_IDS.ALL,
			label: game.i18n.localize(
				isGlobal
					? "IBHUD.Config.Reset.AllGlobalLabel"
					: "IBHUD.Config.Reset.AllActorLabel",
			),
			description: game.i18n.localize("IBHUD.Config.Reset.AllHint"),
		});
	}

	return scopes;
};

export const onToggleActor = (app, event, target) => {
	app._captureInputData(app.element);
	const actorId = target.dataset.id;
	const index = app.tempData.actors.indexOf(actorId);
	if (index > -1) app.tempData.actors.splice(index, 1);
	else app.tempData.actors.push(actorId);
	app.render();
};

export const onDeselectAllActors = (app, event, target) => {
	app._captureInputData(app.element);
	app.tempData.actors = [];
	app.render();
};

export const onReorderRosterActor = (app, event, target) => {
	if (!game.user.isGM) return;
	app._captureInputData(app.element);
	const actorId = target.dataset.id;
	const dir = target.dataset.dir;
	const actors = app.tempData.actors;
	if (!Array.isArray(actors)) return;
	const index = actors.indexOf(actorId);
	if (index === -1) return;

	const step = dir === "up" ? -1 : 1;
	let neighbor = index + step;
	while (neighbor >= 0 && neighbor < actors.length && !game.actors.get(actors[neighbor])) {
		neighbor += step;
	}
	if (neighbor < 0 || neighbor >= actors.length) return;

	[actors[index], actors[neighbor]] = [actors[neighbor], actors[index]];
	app.render();
};

export const onSaveActorGroup = async (app, event, target) => {
	app._captureInputData(app.element);
	if (!app.tempData.actors.length) {
		ui.notifications.warn(game.i18n.localize("IBHUD.Config.ActorGroups.NoActors"));
		return;
	}
	const { DialogV2 } = foundry.applications.api;
	const name = await DialogV2.prompt({
		window: { title: game.i18n.localize("IBHUD.Config.ActorGroups.SaveTitle") },
		content: `<input type="text" name="groupName" placeholder="${game.i18n.localize("IBHUD.Config.ActorGroups.NamePlaceholder")}" autofocus style="width:100%; margin-top:4px;">`,
		ok: { label: game.i18n.localize("IBHUD.Config.ActorGroups.Save"), callback: (event, button) => button.form.elements.groupName?.value?.trim() },
		rejectClose: false,
		classes: ["stylish-hud-dialog"],
	});
	if (!name) return;
	if (!Array.isArray(app.tempData.actorGroups)) app.tempData.actorGroups = [];
	app.tempData.actorGroups.push({
		id: `grp_${foundry.utils.randomID(8)}`,
		label: name,
		actors: [...app.tempData.actors],
	});
	app.render();
};

const _getSelectedGroupId = (app) => {
	const select = app.element?.querySelector(".actor-group-select");
	return select?.value || null;
};

export const onLoadActorGroup = (app, event, target) => {
	app._captureInputData(app.element);
	const groupId = _getSelectedGroupId(app);
	const group = app.tempData.actorGroups?.find(g => g.id === groupId);
	if (!group) return;
	app.tempData.actors = [...group.actors];
	app.render();
};

export const onRenameActorGroup = async (app, event, target) => {
	app._captureInputData(app.element);
	const groupId = _getSelectedGroupId(app);
	const group = app.tempData.actorGroups?.find(g => g.id === groupId);
	if (!group) return;
	const { DialogV2 } = foundry.applications.api;
	const name = await DialogV2.prompt({
		window: { title: game.i18n.localize("IBHUD.Config.ActorGroups.RenameTitle") },
		content: `<input type="text" name="groupName" value="${group.label}" autofocus style="width:100%; margin-top:4px;">`,
		ok: { label: game.i18n.localize("IBHUD.Config.ActorGroups.Rename"), callback: (event, button) => button.form.elements.groupName?.value?.trim() },
		rejectClose: false,
		classes: ["stylish-hud-dialog"],
	});
	if (!name) return;
	group.label = name;
	app.render();
};

export const onDeleteActorGroup = (app, event, target) => {
	app._captureInputData(app.element);
	const groupId = _getSelectedGroupId(app);
	const idx = app.tempData.actorGroups?.findIndex(g => g.id === groupId);
	if (idx > -1) app.tempData.actorGroups.splice(idx, 1);
	app.render();
};

export const onSelectTarget = (app, event, target) => {
	app._captureInputData(app.element);
	app.currentEditId = target.dataset.id;
	app.render();
};

export const onAddAttr = (app, event, target) => {
	if (!canEditTracking()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	app._captureInputData(app.element);

	let targetList;
	if (app.currentEditId === "global") {
		targetList = app.tempData.globalAttributes;
	} else {
		if (!app.tempData.actorAttributes[app.currentEditId]) {
			app.tempData.actorAttributes[app.currentEditId] = [];
		}
		targetList = app.tempData.actorAttributes[app.currentEditId];
	}

	const type = target.dataset.type || "bar";
	const isDots = type === "dots";
	const isBadge = type === "badge";

	const baseX = 0;
	let baseY = 0;

	const finalX = baseX;
	let finalY = baseY;

	let defaultColor = "#3498db";
	let defaultIcon = "";
	if (isDots) {
		defaultColor = "#ffffff";
	} else if (isBadge) {
		defaultColor = "#ffffff";
		defaultIcon = "fas fa-shield-alt";
	}

	const newAttr = {
		...getAttributeMetaDefaults({ type, defaultColor, x: finalX, y: finalY }),
		...getAttributeTextColorDefaults(),
		...getAttributeIconDefaults(defaultIcon),
		...getAttributeVisibilityDefaults(),
		...getAttributeLinkedBarDefaults(),
		...getAttributeQualitativeDefaults(),
		...getAttributeThresholdColorDefaults(),
		...getAttributeScaleDefaults(),
		...getAttributeImageDefaults(),
	};

	targetList.push(newAttr);
	app.render();

	setTimeout(() => {
		if (app.currentEditId === "global") app._triggerPreviewGlobal();
		else app._triggerPreview();
	}, 100);
};

export const onRemoveAttr = (app, event, target) => {
	if (!canEditTracking()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	app._captureInputData(app.element);
	const index = target.dataset.index;
	if (app.currentEditId === "global") {
		app.tempData.globalAttributes.splice(index, 1);
	} else {
		app.tempData.actorAttributes[app.currentEditId].splice(index, 1);
	}
	app.render();

	setTimeout(() => {
		if (app.currentEditId === "global") app._triggerPreviewGlobal();
		else app._triggerPreview();
	}, 100);
};

const _getOpenBadgeDetails = (app) => {
	const open = [];
	app.element.querySelectorAll("details.badge-conditions-details").forEach((d) => {
		if (d.open) {
			const list = d.querySelector(".badge-conditions-list[data-attr-index]");
			if (list) open.push(list.dataset.attrIndex);
		}
	});
	return open;
};

const _restoreOpenBadgeDetails = (app, openIndices) => {
	for (const idx of openIndices) {
		const list = app.element.querySelector(`.badge-conditions-list[data-attr-index="${idx}"]`);
		const details = list?.closest("details.badge-conditions-details");
		if (details) details.open = true;
	}
};

export const onAddBadgeCondition = (app, event, target) => {
	if (!canEditTracking()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	app._captureInputData(app.element);
	const attrIndex = Number(target.dataset.attrIndex);
	const attrList = app.currentEditId === "global"
		? app.tempData.globalAttributes
		: app.tempData.actorAttributes[app.currentEditId];
	if (!attrList || !attrList[attrIndex]) return;
	if (!Array.isArray(attrList[attrIndex].badgeConditions)) {
		attrList[attrIndex].badgeConditions = [];
	}
	attrList[attrIndex].badgeConditions.push({
		...getAttributeBadgeConditionDefaults(),
		threshold: 50,
	});
	const openIndices = _getOpenBadgeDetails(app);
	openIndices.push(String(attrIndex));
	const scroll = _getScrollTop(app);
	app.render();
	setTimeout(() => {
		_restoreOpenBadgeDetails(app, openIndices);
		_setScrollTop(app, scroll);
	}, 100);
};

export const onRemoveBadgeCondition = (app, event, target) => {
	if (!canEditTracking()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	app._captureInputData(app.element);
	const attrIndex = Number(target.dataset.attrIndex);
	const condIndex = Number(target.dataset.condIndex);
	const attrList = app.currentEditId === "global"
		? app.tempData.globalAttributes
		: app.tempData.actorAttributes[app.currentEditId];
	if (!attrList || !attrList[attrIndex]) return;
	if (Array.isArray(attrList[attrIndex].badgeConditions)) {
		attrList[attrIndex].badgeConditions.splice(condIndex, 1);
	}
	const openIndices = _getOpenBadgeDetails(app);
	const scroll = _getScrollTop(app);
	app.render();
	setTimeout(() => {
		_restoreOpenBadgeDetails(app, openIndices);
		_setScrollTop(app, scroll);
	}, 100);
};

const _getAttributeList = (app) =>
	app.currentEditId === "global"
		? app.tempData.globalAttributes
		: app.tempData.actorAttributes[app.currentEditId];

const _getOpenAttributeStageDetails = (app) => {
	const open = [];
	app.element.querySelectorAll("details.qual-config-details, details.threshold-color-details").forEach((d) => {
		if (!d.open) return;
		const list = d.querySelector(".threshold-stage-list[data-attr-index]");
		if (!list) return;
		open.push(`${list.dataset.attrIndex}:${d.classList.contains("qual-config-details") ? "qual" : "resource"}`);
	});
	return open;
};

const _restoreOpenAttributeStageDetails = (app, openKeys) => {
	for (const key of openKeys) {
		const [attrIndex, type] = key.split(":");
		const selector = type === "qual" ? "details.qual-config-details" : "details.threshold-color-details";
		const details = Array.from(app.element.querySelectorAll(selector))
			.find((d) => d.querySelector(`.threshold-stage-list[data-attr-index="${attrIndex}"]`));
		if (details) details.open = true;
	}
};

const _mutateAttributeStageList = (app, target, listKey, mutate) => {
	if (!canEditTracking()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	app._captureInputData(app.element);
	const attrIndex = Number(target.dataset.attrIndex);
	const attrList = _getAttributeList(app);
	if (!attrList || !attrList[attrIndex]) return;
	if (!Array.isArray(attrList[attrIndex][listKey])) {
		attrList[attrIndex][listKey] = [];
	}

	const openDetails = _getOpenAttributeStageDetails(app);
	const scroll = _getScrollTop(app);
	mutate(attrList[attrIndex][listKey]);
	app.render();
	setTimeout(() => {
		_restoreOpenAttributeStageDetails(app, openDetails);
		_setScrollTop(app, scroll);
		if (app.currentEditId === "global") app._triggerPreviewGlobal();
		else app._triggerPreview();
	}, 100);
};

export const onAddQualitativeStage = (app, event, target) => {
	_mutateAttributeStageList(app, target, "qualitativeStages", (stages) => {
		stages.push(getNewAttributeStageDefault("qualitative"));
	});
};

export const onRemoveQualitativeStage = (app, event, target) => {
	const stageIndex = Number(target.dataset.stageIndex);
	_mutateAttributeStageList(app, target, "qualitativeStages", (stages) => {
		if (Number.isInteger(stageIndex)) stages.splice(stageIndex, 1);
	});
};

export const onAddResourceThresholdStage = (app, event, target) => {
	_mutateAttributeStageList(app, target, "resourceThresholdStages", (stages) => {
		stages.push(getNewAttributeStageDefault("resource"));
	});
};

export const onRemoveResourceThresholdStage = (app, event, target) => {
	const stageIndex = Number(target.dataset.stageIndex);
	_mutateAttributeStageList(app, target, "resourceThresholdStages", (stages) => {
		if (Number.isInteger(stageIndex)) stages.splice(stageIndex, 1);
	});
};

export const onAddRule = (app, event, target) => {
	if (!canEditStyle()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	app._captureInputData(app.element);
	if (app.currentEditId === "global") return;

	if (!app.tempData.imageRules[app.currentEditId]) {
		app.tempData.imageRules[app.currentEditId] = [];
	}

	let defaultPath = "system.attributes.hp";

	const globalAttrs = app.tempData.globalAttributes || [];
	const actorAttrs = app.tempData.actorAttributes[app.currentEditId] || [];
	const allAttrs = [...globalAttrs, ...actorAttrs];

	if (allAttrs.length > 0) {
		defaultPath = allAttrs[0].path;
	}

	app.tempData.imageRules[app.currentEditId].push({
		type: "stat",
		target: "portrait",
		path: defaultPath,
		threshold: 50,
		statusId: "",
		img: "",
		speakingImg: "",
		scale: 1.0,
		x: 0,
		y: 0,
	});
	app.render();

	setTimeout(() => {
		if (app.currentEditId === "global") app._triggerPreviewGlobal();
		else app._triggerPreview();
	}, 100);
};

export const onAddPortraitVariant = (app, event, target) => {
	if (!canEditStyle()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	if (app.currentEditId === "global") return;

	app._captureInputData(app.element);

	if (!app.tempData.actorSettings[app.currentEditId]) {
		app.tempData.actorSettings[app.currentEditId] = {};
	}

	const actor = game.actors.get(app.currentEditId);
	const current = app.tempData.actorSettings[app.currentEditId].portraitVariants || [];
	const variant = {
		id: foundry.utils.randomID(),
		label: `${game.i18n.localize("IBHUD.Config.Portrait.DefaultLabel")} ${current.length + 1}`,
		img: actor?.img || "icons/svg/mystery-man.svg",
		scale: null,
		x: null,
		y: null,
	};

	current.push(variant);
	app.tempData.actorSettings[app.currentEditId].portraitVariants = current;
	if (!app.tempData.actorSettings[app.currentEditId].activePortraitVariantId) {
		app.tempData.actorSettings[app.currentEditId].activePortraitVariantId = variant.id;
	}

	app.render();
	setTimeout(() => app._triggerPreview(), 100);
	void event;
	void target;
};

export const onRemovePortraitVariant = (app, event, target) => {
	if (!canEditStyle()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	if (app.currentEditId === "global") return;

	app._captureInputData(app.element);
	const index = Number(target.dataset.index);
	if (!Number.isInteger(index)) return;

	const settings = app.tempData.actorSettings[app.currentEditId] || {};
	const list = Array.isArray(settings.portraitVariants) ? settings.portraitVariants : [];
	if (index < 0 || index >= list.length) return;

	const removed = list[index];
	list.splice(index, 1);

	if (list.length === 0) {
		const actor = game.actors.get(app.currentEditId);
		const fallback = {
			id: foundry.utils.randomID(),
			label: `${game.i18n.localize("IBHUD.Config.Portrait.DefaultLabel")} 1`,
			img: actor?.img || "icons/svg/mystery-man.svg",
			scale: null,
			x: null,
			y: null,
		};
		list.push(fallback);
	}

	settings.portraitVariants = list;
	if (settings.activePortraitVariantId === removed.id) {
		settings.activePortraitVariantId = list[0].id;
	}
	app.tempData.actorSettings[app.currentEditId] = settings;

	app.render();
	setTimeout(() => app._triggerPreview(), 100);
	void event;
};

export const onAddGlobalPortraitLayer = (app, event, target) => {
	if (!canEditStyle()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}

	app._captureInputData(app.element);

	const current = Array.isArray(app.tempData.portraitLayers) ? app.tempData.portraitLayers : [];
	const layer = getLayerDefaults("portrait");

	current.push(layer);
	app.tempData.portraitLayers = current;

	app.render();
	setTimeout(() => app._triggerPreviewGlobal(), 100);
	void event;
	void target;
};

export const onRemoveGlobalPortraitLayer = (app, event, target) => {
	if (!canEditStyle()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}

	app._captureInputData(app.element);
	const index = Number(target.dataset.index);
	if (!Number.isInteger(index)) return;

	const list = Array.isArray(app.tempData.portraitLayers) ? app.tempData.portraitLayers : [];
	if (index < 0 || index >= list.length) return;

	list.splice(index, 1);
	app.tempData.portraitLayers = list;

	app.render();
	setTimeout(() => app._triggerPreviewGlobal(), 100);
	void event;
};

export const onAddActorPortraitLayer = (app, event, target) => {
	if (!canEditStyle()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	if (app.currentEditId === "global") return;

	app._captureInputData(app.element);

	if (!app.tempData.actorSettings[app.currentEditId]) {
		app.tempData.actorSettings[app.currentEditId] = {};
	}

	const current = app.tempData.actorSettings[app.currentEditId].portraitLayers || [];
	const layer = getLayerDefaults("portrait");

	current.push(layer);
	app.tempData.actorSettings[app.currentEditId].portraitLayers = current;

	app.render();
	setTimeout(() => app._triggerPreview(), 100);
	void event;
	void target;
};

export const onRemoveActorPortraitLayer = (app, event, target) => {
	if (!canEditStyle()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	if (app.currentEditId === "global") return;

	app._captureInputData(app.element);
	const index = Number(target.dataset.index);
	if (!Number.isInteger(index)) return;

	const settings = app.tempData.actorSettings[app.currentEditId] || {};
	const list = Array.isArray(settings.portraitLayers) ? settings.portraitLayers : [];
	if (index < 0 || index >= list.length) return;

	list.splice(index, 1);
	settings.portraitLayers = list;
	app.tempData.actorSettings[app.currentEditId] = settings;

	app.render();
	setTimeout(() => app._triggerPreview(), 100);
	void event;
};

export const onAddGlobalCardBgLayer = (app, event, target) => {
	if (!canEditStyle()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}

	app._captureInputData(app.element);

	const current = Array.isArray(app.tempData.cardBgLayers) ? app.tempData.cardBgLayers : [];
	const layer = getLayerDefaults("cardBg");

	current.push(layer);
	app.tempData.cardBgLayers = current;

	app.render();
	setTimeout(() => app._triggerPreviewGlobal(), 100);
	void event;
	void target;
};

export const onRemoveGlobalCardBgLayer = (app, event, target) => {
	if (!canEditStyle()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}

	app._captureInputData(app.element);
	const index = Number(target.dataset.index);
	if (!Number.isInteger(index)) return;

	const list = Array.isArray(app.tempData.cardBgLayers) ? app.tempData.cardBgLayers : [];
	if (index < 0 || index >= list.length) return;

	list.splice(index, 1);
	app.tempData.cardBgLayers = list;

	app.render();
	setTimeout(() => app._triggerPreviewGlobal(), 100);
	void event;
};

/* ── AM <details> open state helpers ────────────── */

const _getOpenAMDetails = (app) => {
	const open = [];
	app.element.querySelectorAll("details[data-am-element]").forEach((d) => {
		if (d.open) open.push(d.dataset.amElement);
	});
	return open;
};

const _restoreOpenAMDetails = (app, openIds) => {
	for (const id of openIds) {
		const d = app.element.querySelector(`details[data-am-element="${id}"]`);
		if (d) d.open = true;
	}
};

const _getOpenBtnFrameDetails = (app) => {
	const open = [];
	app.element.querySelectorAll("details.btn-frame-details").forEach((d) => {
		if (!d.open) return;
		const key = d.dataset.frameKey
			|| (d.dataset.cindex !== undefined ? `menu:${d.dataset.cindex}` : null);
		if (key) open.push(key);
	});
	return open;
};

const _restoreOpenBtnFrameDetails = (app, openKeys) => {
	const wanted = new Set(openKeys);
	app.element.querySelectorAll("details.btn-frame-details").forEach((d) => {
		const key = d.dataset.frameKey
			|| (d.dataset.cindex !== undefined ? `menu:${d.dataset.cindex}` : null);
		if (key && wanted.has(key)) d.open = true;
	});
};

const _getAdapterFrameTarget = (app, adapterId) => {
	if (!adapterId) return null;
	if (!app.tempData.adapterCategoryOverrides) {
		app.tempData.adapterCategoryOverrides = {};
	}
	const overrides = app.tempData.adapterCategoryOverrides;
	const current = overrides[adapterId] && typeof overrides[adapterId] === "object"
		? overrides[adapterId]
		: {};
	overrides[adapterId] = current;
	if (!Object.prototype.hasOwnProperty.call(current, "buttonFrameLayers")) {
		const editorRow = app._adapterCategoryEditorRows?.find(
			(row) => row.id === adapterId,
		);
		current.buttonFrameLayers = foundry.utils.deepClone(
			editorRow?.effective?.buttonFrameLayers || [],
		);
	}
	return current;
};

const _getScrollTop = (app) => {
	const panel = app.element?.querySelector?.(".tab-content.active");
	return panel ? panel.scrollTop : 0;
};

const _setScrollTop = (app, val) => {
	const panel = app.element?.querySelector?.(".tab-content.active");
	if (panel) panel.scrollTop = val;
};

export const onAddAMLayer = (app, event, target) => {
	if (!canEditStyle()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	app._captureInputData(app.element);
	const layerKey = target.dataset.layerKey;
	if (!layerKey) return;
	const openIds = _getOpenAMDetails(app);
	const scroll = _getScrollTop(app);
	addAMLayer(app.tempData, layerKey);
	app.render();
	setTimeout(() => {
		_restoreOpenAMDetails(app, openIds);
		_setScrollTop(app, scroll);
		app._triggerPreviewGlobal();
	}, 100);
};

export const onRemoveAMLayer = (app, event, target) => {
	if (!canEditStyle()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	app._captureInputData(app.element);
	const layerKey = target.dataset.layerKey;
	const index = Number(target.dataset.index);
	if (!layerKey || !Number.isInteger(index)) return;
	const openIds = _getOpenAMDetails(app);
	const scroll = _getScrollTop(app);
	removeAMLayer(app.tempData, layerKey, index);
	app.render();
	setTimeout(() => {
		_restoreOpenAMDetails(app, openIds);
		_setScrollTop(app, scroll);
		app._triggerPreviewGlobal();
	}, 100);
};

export const onAddBtnFrameLayer = (app, event, target) => {
	if (!canEditMenu()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	app._captureInputData(app.element);
	const adapterId = target.dataset.adapterId;
	const cIdx = Number(target.dataset.cindex);
	const cat = adapterId
		? _getAdapterFrameTarget(app, adapterId)
		: app.tempData.customMenu?.[cIdx];
	if (!cat) return;
	const openFrames = _getOpenBtnFrameDetails(app);
	const scroll = _getScrollTop(app);
	addAMLayer(cat, "buttonFrameLayers");
	app.render();
	setTimeout(() => {
		_restoreOpenBtnFrameDetails(app, openFrames);
		_setScrollTop(app, scroll);
		app._triggerPreviewGlobal();
	}, 100);
};

export const onRemoveBtnFrameLayer = (app, event, target) => {
	if (!canEditMenu()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	app._captureInputData(app.element);
	const adapterId = target.dataset.adapterId;
	const cIdx = Number(target.dataset.cindex);
	const cat = adapterId
		? _getAdapterFrameTarget(app, adapterId)
		: app.tempData.customMenu?.[cIdx];
	if (!cat) return;
	const index = Number(target.dataset.index);
	if (!Number.isInteger(index)) return;
	const openFrames = _getOpenBtnFrameDetails(app);
	const scroll = _getScrollTop(app);
	removeAMLayer(cat, "buttonFrameLayers", index);
	app.render();
	setTimeout(() => {
		_restoreOpenBtnFrameDetails(app, openFrames);
		_setScrollTop(app, scroll);
		app._triggerPreviewGlobal();
	}, 100);
};

export const onAddActorCardBgLayer = (app, event, target) => {
	if (!canEditStyle()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	if (app.currentEditId === "global") return;

	app._captureInputData(app.element);

	if (!app.tempData.actorSettings[app.currentEditId]) {
		app.tempData.actorSettings[app.currentEditId] = {};
	}

	const current = app.tempData.actorSettings[app.currentEditId].cardBgLayers || [];
	const layer = getLayerDefaults("cardBg");

	current.push(layer);
	app.tempData.actorSettings[app.currentEditId].cardBgLayers = current;

	app.render();
	setTimeout(() => app._triggerPreview(), 100);
	void event;
	void target;
};

export const onRemoveActorCardBgLayer = (app, event, target) => {
	if (!canEditStyle()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	if (app.currentEditId === "global") return;

	app._captureInputData(app.element);
	const index = Number(target.dataset.index);
	if (!Number.isInteger(index)) return;

	const settings = app.tempData.actorSettings[app.currentEditId] || {};
	const list = Array.isArray(settings.cardBgLayers) ? settings.cardBgLayers : [];
	if (index < 0 || index >= list.length) return;

	list.splice(index, 1);
	settings.cardBgLayers = list;
	app.tempData.actorSettings[app.currentEditId] = settings;

	app.render();
	setTimeout(() => app._triggerPreview(), 100);
	void event;
};

export const onRemoveRule = (app, event, target) => {
	if (!canEditStyle()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	app._captureInputData(app.element);
	const index = target.dataset.index;
	if (app.tempData.imageRules[app.currentEditId]) {
		app.tempData.imageRules[app.currentEditId].splice(index, 1);
	}
	app.render();

	setTimeout(() => {
		if (app.currentEditId === "global") app._triggerPreviewGlobal();
		else app._triggerPreview();
	}, 100);
};

export const onSave = async (app, event, target) => {
	event.preventDefault();
	app.isSaving = true;
	if (window.ActionHUD) window.ActionHUD._isSavingConfig = true;

	app._captureInputData(app.element);

	const formData = new FormDataExtended(app.element).object;
	const isGM = game.user.isGM;

	const parseNum = (val) => {
		if (val === "" || val === undefined || val === null) return undefined;
		const n = Number(val);
		return isNaN(n) ? undefined : n;
	};
	const toScreen = (value, scale) => {
		if (value === "" || value === null || value === undefined) return value;
		return Math.round(value * scale);
	};

	const oldConfig =
		game.settings.get(MODULE_ID, "configuration") || {};
	const existingClientPos =
		game.settings.get(MODULE_ID, "clientPositions") || {};
	const existingPositionMode =
		existingClientPos.positionMode ?? oldConfig.positionMode ?? "anchor";
	const shouldConvert = existingPositionMode === "screen";
	const positionMode = "anchor";
	const globalScale = app.tempData.globalScale ?? oldConfig.globalScale ?? 1.0;

	if (shouldConvert) {
		for (const settings of Object.values(app.tempData.actorSettings)) {
			settings.freeX = toScreen(settings.freeX, globalScale);
			settings.freeY = toScreen(settings.freeY, globalScale);
		}
	}

	if (isGM) {
		const { DialogV2 } = foundry.applications.api;

		const doSync = await DialogV2.confirm({
			window: {
				title: game.i18n.localize("IBHUD.Dialog.SaveLayoutTitle"),
				icon: "fas fa-sync-alt",
			},
			content: game.i18n.localize("IBHUD.Dialog.SaveLayoutContent"),
			modal: true,
			rejectClose: false,
			classes: ["stylish-hud-dialog"],
		});

		const finalActionMenuPos = oldConfig.actionMenuPos || {
			top: 800,
			left: 1200,
		};
		let finalActionMenuScale = oldConfig.actionMenuScale ?? 1.0;

		if (app.currentEditId === "global") {
			const newTop = parseNum(formData.actionMenuTop);
			const newLeft = parseNum(formData.actionMenuLeft);
			const newScale = parseNum(formData.actionMenuScale);

			if (newTop !== undefined) finalActionMenuPos.top = newTop;
			if (newLeft !== undefined) finalActionMenuPos.left = newLeft;
			if (newScale !== undefined) finalActionMenuScale = newScale;
		}

		if (shouldConvert) {
			finalActionMenuPos.top = toScreen(
				finalActionMenuPos.top,
				finalActionMenuScale,
			);
			finalActionMenuPos.left = toScreen(
				finalActionMenuPos.left,
				finalActionMenuScale,
			);
		}

		const config = {
			actors: app.tempData.actors,
			actorGroups: app.tempData.actorGroups || [],
			globalAttributes: app.tempData.globalAttributes,
			actorAttributes: app.tempData.actorAttributes,
			...getGlobalThemeFontLayoutSaveData(app.tempData),
			actorSettings: app.tempData.actorSettings,
			globalPos: app.tempData.globalPos,
			...getGlobalScaleSaveData(app.tempData),
			positionMode,
			...getGlobalResponsiveSaveData(app.tempData),
			...getGlobalMenuBehaviorSaveData(app.tempData),
			...getExcludedActorTypesSaveData(app.tempData),
			actionMenuPos: finalActionMenuPos,
			actionMenuScale: finalActionMenuScale,
			portraitLayers: app.tempData.portraitLayers,
			cardBgLayers: app.tempData.cardBgLayers,
			amMenuLayers: app.tempData.amMenuLayers,
			amSubMenuLayers: app.tempData.amSubMenuLayers,
			...getGlobalSimpleSaveData(app.tempData),
			...getGlobalImageSaveData(app.tempData),
			...getAMElementSaveData(app.tempData),
			imageRules: app.tempData.imageRules,
			statusEffects: app.tempData.statusEffects,
			customMenu: app.tempData.customMenu,
			adapterCategoryOverrides: app.tempData.adapterCategoryOverrides || {},
			freeGroupAnchor: oldConfig.freeGroupAnchor,
		};
		await game.settings.set(MODULE_ID, "configuration", config);

		if (doSync) {
			const positionDataToKeep = {};

			// First, copy freeGroupAnchor from config if it exists (layout editor saves this)
			if (config.freeGroupAnchor) {
				positionDataToKeep.freeGroupAnchor = config.freeGroupAnchor;
			} else if (existingClientPos.freeGroupAnchor) {
				positionDataToKeep.freeGroupAnchor = existingClientPos.freeGroupAnchor;
			}

			// Sync the newly-edited global layout values (not the pre-save snapshot)
			positionDataToKeep.global = {
				pos: app.tempData.globalPos,
				scale: app.tempData.globalScale,
				gap: app.tempData.globalGap,
			};
			positionDataToKeep.actionMenuPos = finalActionMenuPos;
			positionDataToKeep.actionMenuScale = finalActionMenuScale;

			const reservedKeys = ["global", "positionMode", "actionMenuPos", "actionMenuScale", "freeGroupAnchor"];
			const allActorIds = new Set([
				...Object.keys(config.actorSettings || {}),
				...Object.keys(oldConfig.actorSettings || {}),
				...Object.keys(existingClientPos).filter(k => !reservedKeys.includes(k))
			]);

			for (const actorId of allActorIds) {
				const configSettings = config.actorSettings?.[actorId] || {};
				const oldConfigSettings = oldConfig.actorSettings?.[actorId] || {};
				const clientSettings = existingClientPos[actorId] || {};

				positionDataToKeep[actorId] = {
					relativeX: configSettings.relativeX ?? oldConfigSettings.relativeX ?? clientSettings.relativeX,
					relativeY: configSettings.relativeY ?? oldConfigSettings.relativeY ?? clientSettings.relativeY,
					anchorX: configSettings.anchorX ?? oldConfigSettings.anchorX ?? clientSettings.anchorX,
					anchorY: configSettings.anchorY ?? oldConfigSettings.anchorY ?? clientSettings.anchorY,
					offsetX: configSettings.offsetX ?? oldConfigSettings.offsetX ?? clientSettings.offsetX,
					offsetY: configSettings.offsetY ?? oldConfigSettings.offsetY ?? clientSettings.offsetY,
					freeX: configSettings.freeX ?? oldConfigSettings.freeX ?? clientSettings.freeX,
					freeY: configSettings.freeY ?? oldConfigSettings.freeY ?? clientSettings.freeY,
				};
			}

			// Use anchor mode consistently (layout-manager uses anchor mode)
			positionDataToKeep.positionMode = "anchor";

			if ((window.ActionHUD || window.stylishActionHUD)?.socket?.executeForEveryone) {
				await (window.ActionHUD || window.stylishActionHUD).socket.executeForEveryone(
					"syncClientPositions",
					positionDataToKeep,
				);
			} else {
				await game.settings.set(MODULE_ID, "clientPositions", positionDataToKeep);
			}
			ui.notifications.info(
				game.i18n.localize("IBHUD.Notifications.SavedSynced"),
			);
		} else {
			ui.notifications.info(
				game.i18n.localize("IBHUD.Notifications.SavedWorld"),
			);
		}
	}

	if (!isGM && app.currentEditId !== "global") {
		const actorId = app.currentEditId;
		const actorSettings = app.tempData.actorSettings[actorId];

		// Portrait variants → world-visible via socket (everyone sees portrait changes)
		if (actorSettings && (window.ActionHUD || window.stylishActionHUD)?.socket) {
			const variants = Array.isArray(actorSettings.portraitVariants)
				? actorSettings.portraitVariants
				: [];
			const activeId = actorSettings.activePortraitVariantId || variants[0]?.id || null;
			const voiceId = actorSettings.voicePortraitVariantId || null;
			try {
				await (window.ActionHUD || window.stylishActionHUD).socket.executeAsGM(
					"savePortraitVariants",
					actorId,
					variants,
					activeId,
					voiceId,
				);
			} catch (err) {
				console.error("Stylish Action HUD | Failed to save portrait variants via GM socket:", err);
			}
		}

		// Style overrides → client-local (only visible on this player's screen)
		const clientOverrides = foundry.utils.deepClone(
			game.settings.get(MODULE_ID, "clientActorOverrides") || {},
		);
		if (actorSettings) {
			const { portraitVariants, activePortraitVariantId, voicePortraitVariantId, ...styleFields } = actorSettings;
			clientOverrides[actorId] = {
				actorSettings: styleFields,
				actorAttributes: app.tempData.actorAttributes[actorId] || [],
				imageRules: app.tempData.imageRules[actorId] || [],
			};
		}
		await game.settings.set(MODULE_ID, "clientActorOverrides", clientOverrides);
	}

	const clientPos = foundry.utils.deepClone(existingClientPos);

	for (const [aid, settings] of Object.entries(app.tempData.actorSettings)) {
		if (!clientPos[aid]) clientPos[aid] = {};
		clientPos[aid].relativeX = settings.relativeX;
		clientPos[aid].relativeY = settings.relativeY;
		clientPos[aid].anchorX = settings.anchorX;
		clientPos[aid].anchorY = settings.anchorY;
		clientPos[aid].offsetX = settings.offsetX;
		clientPos[aid].offsetY = settings.offsetY;
		clientPos[aid].freeX = settings.freeX;
		clientPos[aid].freeY = settings.freeY;
	}

	if (app.currentEditId === "global") {
		clientPos.global = {
			pos: app.tempData.globalPos,
			scale: app.tempData.globalScale,
			gap: app.tempData.globalGap,
		};

		const newTop = parseNum(formData.actionMenuTop);
		const newLeft = parseNum(formData.actionMenuLeft);
		const newScale = parseNum(formData.actionMenuScale);
		const actionMenuScaleForConversion =
			newScale ??
			existingClientPos.actionMenuScale ??
			oldConfig.actionMenuScale ??
			1.0;

		if (newTop !== undefined && newLeft !== undefined) {
			const storedTop = shouldConvert
				? toScreen(newTop, actionMenuScaleForConversion)
				: newTop;
			const storedLeft = shouldConvert
				? toScreen(newLeft, actionMenuScaleForConversion)
				: newLeft;
			clientPos.actionMenuPos = { top: storedTop, left: storedLeft };
		} else if (shouldConvert && clientPos.actionMenuPos) {
			clientPos.actionMenuPos = {
				top: toScreen(
					clientPos.actionMenuPos.top,
					actionMenuScaleForConversion,
				),
				left: toScreen(
					clientPos.actionMenuPos.left,
					actionMenuScaleForConversion,
				),
			};
		}

		if (newScale !== undefined) {
			clientPos.actionMenuScale = newScale;
		}
	} else if (shouldConvert && clientPos.actionMenuPos) {
		const actionMenuScaleForConversion =
			existingClientPos.actionMenuScale ?? oldConfig.actionMenuScale ?? 1.0;
		clientPos.actionMenuPos = {
			top: toScreen(clientPos.actionMenuPos.top, actionMenuScaleForConversion),
			left: toScreen(clientPos.actionMenuPos.left, actionMenuScaleForConversion),
		};
	}

	clientPos.positionMode = positionMode;

	await game.settings.set(MODULE_ID, "clientPositions", clientPos);

	if ((window.ActionHUD || window.stylishActionHUD)) (window.ActionHUD || window.stylishActionHUD)._isSavingConfig = false;
	if ((window.ActionHUD || window.stylishActionHUD)) (window.ActionHUD || window.stylishActionHUD).refresh();
	if (window.ActionHUD.actionMenu) window.StylishAction.refresh();

	await app.close();
	ui.notifications.info(game.i18n.localize("IBHUD.Notifications.Saved"));
	app.isSaving = false;
};

export const onEditLayout = async (app, event, target) => {
	if (!canEditStyle()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	await app._onSave(event, target);

	if ((window.ActionHUD || window.stylishActionHUD)) {
		(window.ActionHUD || window.stylishActionHUD).toggleEditMode(true);
	}
};

export const onReset = async (app, event, target) => {
	event?.preventDefault?.();
	app._captureInputData(app.element);

	const isGlobal = app.currentEditId === "global";
	const scopeOptions = getResetScopeOptions(app);
	if (scopeOptions.length === 0) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}

	const selectedByDefault = scopeOptions.some(
		(option) => option.id === app.activeTab,
	)
		? app.activeTab
		: scopeOptions[0].id;
	const optionHtml = scopeOptions.map((option) => `
		<label class="ib-reset-scope-option">
			<input type="radio" name="resetScope" value="${option.id}" ${option.id === selectedByDefault ? "checked" : ""}>
			<span>
				<strong>${option.label}</strong>
				<small>${option.description}</small>
			</span>
		</label>
	`).join("");

	const type = isGlobal
		? game.i18n.localize("IBHUD.Config.GlobalSettings")
		: game.actors.get(app.currentEditId)?.name ||
			game.i18n.localize("IBHUD.Config.ActorSettings");
	const { DialogV2 } = foundry.applications.api;
	let selectedScope;
	try {
		selectedScope = await DialogV2.prompt({
			window: {
				title: game.i18n.format("IBHUD.Dialog.ResetTitle", { type }),
				icon: "fas fa-undo",
			},
			content: `
				<div class="ib-reset-scope-dialog">
					<p>${game.i18n.localize("IBHUD.Dialog.ResetChooseScope")}</p>
					<div class="ib-reset-scope-list">${optionHtml}</div>
					<p class="hint">${game.i18n.localize("IBHUD.Dialog.ResetSaveHint")}</p>
				</div>
			`,
			ok: {
				label: game.i18n.localize("IBHUD.Config.Buttons.Reset"),
				icon: "fas fa-undo",
				callback: (event, button, dialog) => {
					const form = button.form ?? dialog.element?.querySelector?.("form");
					return form?.querySelector?.('input[name="resetScope"]:checked')?.value;
				},
			},
			modal: true,
			rejectClose: false,
			classes: ["stylish-hud-dialog", "stylish-hud-reset-dialog"],
		});
	} catch {
		return;
	}
	if (!selectedScope) return;

	const selectedOption = scopeOptions.find(
		(option) => option.id === selectedScope,
	);
	if (!selectedOption) return;

	const scopesToReset = selectedScope === RESET_SCOPE_IDS.ALL
		? scopeOptions
			.filter((option) => option.id !== RESET_SCOPE_IDS.ALL)
			.map((option) => option.id)
		: [selectedScope];

	if (isGlobal) {
		let globalAttributes = defaultRegistry.getDefaultAttributes(
			game.system.id,
			(window.ActionHUD || window.stylishActionHUD)?.adapter,
		);
		if (globalAttributes.length === 0) {
			globalAttributes = [
				{
					path: "system.attributes.hp",
					label: game.i18n.localize("IBHUD.Attributes.HP"),
					color: "#e61c34",
					style: "bar",
					icon: "",
					iconImg: "",
				},
			];
		}
		const defaults = {
			globalAttributes,
			customMenu: defaultRegistry.getDefaultLayout(
				game.system.id,
				(window.ActionHUD || window.stylishActionHUD)?.adapter,
			),
			statusEffects: defaultRegistry.getDefaultStatusEffects(
				game.system.id,
				(window.ActionHUD || window.stylishActionHUD)?.adapter,
			),
		};
		for (const scope of scopesToReset) {
			resetGlobalSection(app.tempData, scope, defaults);
		}
		if (scopesToReset.includes(RESET_SCOPE_IDS.MENU)) {
			app._collapsedMenuCategories = new WeakSet();
			app._collapsedAdapterCategories = new Set();
		}
	} else {
		for (const scope of scopesToReset) {
			resetActorSection(app.tempData, app.currentEditId, scope);
		}

		const didResetEveryActorSection = ACTOR_RESET_SECTION_IDS.every(
			(scope) => scopesToReset.includes(scope),
		);
		if (didResetEveryActorSection) {
			const actor = game.actors.get(app.currentEditId);
			if (actor) {
				await actor.unsetFlag(MODULE_ID, "hideActionMenu");
				await actor.unsetFlag(MODULE_ID, "favorites");
				await actor.unsetFlag(MODULE_ID, "macro-overrides");
			}
		}
	}

	ui.notifications.info(
		game.i18n.format("IBHUD.Notifications.ResetSection", {
			section: selectedOption.label,
		}),
	);
	await app.render();

	if (isGlobal) app._triggerPreviewGlobal();
	else app._triggerPreview();
};

export const onAddEffect = (app) => {
	if (!canEditStyle()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	app._captureInputData(app.element);
	app.tempData.statusEffects.push({
		id: "",
		label: game.i18n.localize("IBHUD.Config.NewEffect"),
		filters: { ...EFFECTS_DEFAULTS.filters },
		overlayPath: "",
		overlayOpacity: 1,
		overlayBlend: "normal",
		animation: "",
		tintColor: "#000000",
		tintAlpha: 0,
	});
	app.render();
};

export const onRemoveEffect = (app, event, target) => {
	if (!canEditStyle()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	app._captureInputData(app.element);
	const index = target.dataset.index;
	app.tempData.statusEffects.splice(index, 1);
	app.render();
};

export const onAddCategory = (app, event, target) => {
	event.preventDefault();
	if (!canEditMenu()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	app._captureInputData(app.element);

	if (!app.tempData.customMenu) app.tempData.customMenu = [];

	app.tempData.customMenu.push({
		label: game.i18n.localize("IBHUD.Config.NewCategory"),
		icon: "fas fa-bookmark",
		img: "",
		buttonImg: "",
		buttonScale: 1.0,
		buttonX: 0,
		buttonY: 0,
		buttonFrameLayers: [],
		buttonFrameColor: "",
		fontFamily: "",
		textColor: "",
		visibility: { mode: "all", actorTypes: [], actorIds: [] },
		tabs: [{ label: "Main", items: [] }],
	});
	app.render();
};

export const onRemoveCategory = (app, event, target) => {
	event.preventDefault();
	if (!canEditMenu()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	app._captureInputData(app.element);
	const index = target.dataset.index;
	if (index !== undefined) {
		app.tempData.customMenu.splice(index, 1);
		app.render();
	}
};

export const onAddSubCategory = (app, event, target) => {
	event.preventDefault();
	if (!canEditMenu()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	app._captureInputData(app.element);
	const cIndex = target.dataset.index;

	if (app.tempData.customMenu[cIndex]) {
		if (!app.tempData.customMenu[cIndex].tabs) {
			app.tempData.customMenu[cIndex].tabs = [];
		}

		app.tempData.customMenu[cIndex].tabs.push({
			label: game.i18n.localize("IBHUD.Config.NewTab"),
			items: [],
		});
		app.render();
	}
};

export const onRemoveSubCategory = (app, event, target) => {
	event.preventDefault();
	if (!canEditMenu()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	app._captureInputData(app.element);
	const { cindex, tindex } = target.dataset;

	if (app.tempData.customMenu[cindex]?.tabs) {
		app.tempData.customMenu[cindex].tabs.splice(tindex, 1);
		app.render();
	}
};

export const onRemoveItem = (app, event, target) => {
	event.preventDefault();
	event.stopPropagation();
	if (!canEditMenu()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}

	app._captureInputData(app.element);
	const { cindex, tindex, iindex } = target.dataset;

	const tab = app.tempData.customMenu[cindex]?.tabs[tindex];
	if (tab && tab.items) {
		tab.items.splice(iindex, 1);
		app.render();
	}
};

export const onDrop = async (app, event, targetZone) => {
	if (!canEditMenu()) {
		ui.notifications.warn(game.i18n.localize("IBHUD.UI.NoPermission"));
		return;
	}
	const data = TextEditor.getDragEventData(event);
	if (!data || (data.type !== "Item" && data.type !== "Macro")) return;

	const { cindex, tindex } = targetZone.dataset;

	app._captureInputData(app.element);

	const adapter = (window.ActionHUD || window.stylishActionHUD)?.adapter;
	if (!adapter) return;

	let newItem = null;

	if (data.type === "Macro") {
		const macro = await Macro.fromDropData(data);
		if (macro) {
			newItem = {
				id: macro.uuid,
				name: macro.name,
				img: macro.img,
				type: "Macro",
			};
		}
	} else if (data.type === "Item") {
		const macro = await adapter.createSystemMacro(data);
		if (macro) {
			newItem = {
				id: macro.uuid,
				name: macro.name,
				img: macro.img,
				type: "Macro",
			};
		}
	}

	if (newItem) {
		if (!app.tempData.customMenu[cindex].tabs[tindex].items) {
			app.tempData.customMenu[cindex].tabs[tindex].items = [];
		}

		app.tempData.customMenu[cindex].tabs[tindex].items.push(newItem);

		app.render();
	}
};

export const onSaveConfigPreset = async (app, event, target) => {
	if (!game.user.isGM) return;
	app._captureInputData(app.element);

	const { DialogV2 } = foundry.applications.api;
	let presetName;
	try {
		presetName = await DialogV2.prompt({
			window: { title: game.i18n.localize("IBHUD.Preset.Full.SaveTitle"), icon: "fas fa-save" },
			content: `<div class="form-group"><label>${game.i18n.localize("IBHUD.Preset.Full.NameLabel")}</label><input type="text" name="presetName" value="" style="width:100%;" autofocus></div>`,
			ok: {
				label: game.i18n.localize("IBHUD.Preset.Full.Save"),
				icon: "fas fa-save",
				callback: (event, button, dialog) => {
					const input = (button.form ?? dialog.element ?? dialog)?.querySelector?.('input[name="presetName"]')
						?? button.form?.presetName;
					return input?.value?.trim() || "";
				},
			},
			classes: ["stylish-hud-dialog"],
		});
	} catch { return; }
	if (!presetName) return;

	const config = game.settings.get(MODULE_ID, "configuration");
	const presets = foundry.utils.deepClone(game.settings.get(MODULE_ID, "configurationPresets") || {});
	presets[presetName] = { savedAt: new Date().toISOString(), config: foundry.utils.deepClone(config) };
	await game.settings.set(MODULE_ID, "configurationPresets", presets);

	ui.notifications.info(game.i18n.format("IBHUD.Preset.Full.Saved", { name: presetName }));
	app.render();
};

export const onLoadConfigPreset = async (app, event, target) => {
	if (!game.user.isGM) return;
	const select = app.element?.querySelector?.('select[name="configPresetSelect"]');
	const name = select?.value;
	if (!name) { ui.notifications.warn("Please select a preset first."); return; }

	const presets = game.settings.get(MODULE_ID, "configurationPresets") || {};
	const preset = presets[name];
	if (!preset?.config) { ui.notifications.error("Preset data not found."); return; }

	const { DialogV2 } = foundry.applications.api;
	let confirmed;
	try {
		confirmed = await DialogV2.confirm({
			window: { title: game.i18n.localize("IBHUD.Preset.Full.LoadTitle"), icon: "fas fa-upload" },
			content: `<p>${game.i18n.format("IBHUD.Preset.Full.LoadConfirm", { name })}</p>`,
			yes: { label: game.i18n.localize("IBHUD.Preset.Full.Load"), icon: "fas fa-check" },
			no: { label: game.i18n.localize("IBHUD.UI.Cancel"), icon: "fas fa-times" },
			classes: ["stylish-hud-dialog"],
		});
	} catch { return; }
	if (!confirmed) return;

	if ((window.ActionHUD || window.stylishActionHUD)) (window.ActionHUD || window.stylishActionHUD)._isSavingConfig = true;
	await game.settings.set(MODULE_ID, "configuration", foundry.utils.deepClone(preset.config));
	if ((window.ActionHUD || window.stylishActionHUD)) (window.ActionHUD || window.stylishActionHUD)._isSavingConfig = false;
	ui.notifications.info(game.i18n.format("IBHUD.Preset.Full.Loaded", { name }));

	app.isInitialized = false;
	app.render();
	if ((window.ActionHUD || window.stylishActionHUD)) (window.ActionHUD || window.stylishActionHUD).refresh();
	if (window.StylishAction) window.StylishAction.refresh();
};

export const onDeleteConfigPreset = async (app, event, target) => {
	if (!game.user.isGM) return;
	const select = app.element.querySelector('select[name="configPresetSelect"]');
	const name = select?.value;
	if (!name) return;

	const presets = foundry.utils.deepClone(game.settings.get(MODULE_ID, "configurationPresets") || {});
	delete presets[name];
	await game.settings.set(MODULE_ID, "configurationPresets", presets);

	ui.notifications.info(game.i18n.format("IBHUD.Preset.Full.Deleted", { name }));
	app.render();
};

export const onSaveActionMenuPreset = async (app) => {
	if (!game.user.isGM) return;
	app._captureInputData(app.element);

	const { DialogV2 } = foundry.applications.api;
	let name;
	try {
		name = await DialogV2.prompt({
			window: {
				title: game.i18n.localize("IBHUD.Preset.ActionMenu.SaveTitle"),
				icon: "fas fa-save",
			},
			content: `<div class="form-group"><label>${game.i18n.localize("IBHUD.Preset.ActionMenu.NameLabel")}</label><input type="text" name="presetName" value="" style="width:100%;" autofocus></div>`,
			ok: {
				label: game.i18n.localize("IBHUD.Preset.ActionMenu.Save"),
				icon: "fas fa-save",
				callback: (event, button, dialog) => {
					const input = (button.form ?? dialog.element ?? dialog)?.querySelector?.('input[name="presetName"]')
						?? button.form?.presetName;
					return input?.value?.trim() || "";
				},
			},
			classes: ["stylish-hud-dialog"],
		});
	} catch {
		return;
	}
	if (!name) return;

	const presets = foundry.utils.deepClone(
		game.settings.get(MODULE_ID, "actionMenuPresets") || {},
	);
	presets[name] = {
		savedAt: new Date().toISOString(),
		systemId: game.system.id,
		data: buildActionMenuPresetData(app.tempData),
	};
	await game.settings.set(MODULE_ID, "actionMenuPresets", presets);
	ui.notifications.info(game.i18n.format("IBHUD.Preset.ActionMenu.Saved", { name }));
	app.render();
};

export const onLoadActionMenuPreset = async (app) => {
	if (!game.user.isGM) return;
	const select = app.element?.querySelector?.('select[name="actionMenuPresetSelect"]');
	const name = select?.value;
	if (!name) {
		ui.notifications.warn(game.i18n.localize("IBHUD.Preset.ActionMenu.SelectRequired"));
		return;
	}

	const preset = (game.settings.get(MODULE_ID, "actionMenuPresets") || {})[name];
	if (!preset?.data) {
		ui.notifications.error(game.i18n.localize("IBHUD.Preset.ActionMenu.NotFound"));
		return;
	}
	if (preset.systemId && preset.systemId !== game.system.id) {
		ui.notifications.warn(game.i18n.format("IBHUD.Preset.ActionMenu.SystemMismatch", {
			system: preset.systemId,
		}));
		return;
	}

	const { DialogV2 } = foundry.applications.api;
	let confirmed;
	try {
		confirmed = await DialogV2.confirm({
			window: {
				title: game.i18n.localize("IBHUD.Preset.ActionMenu.LoadTitle"),
				icon: "fas fa-upload",
			},
			content: `<p>${game.i18n.format("IBHUD.Preset.ActionMenu.LoadConfirm", { name })}</p>`,
			yes: {
				label: game.i18n.localize("IBHUD.Preset.ActionMenu.Load"),
				icon: "fas fa-check",
			},
			no: {
				label: game.i18n.localize("IBHUD.UI.Cancel"),
				icon: "fas fa-times",
			},
			classes: ["stylish-hud-dialog"],
		});
	} catch {
		return;
	}
	if (!confirmed) return;

	applyActionMenuPresetData(app.tempData, preset.data);
	app._collapsedMenuCategories = new WeakSet();
	app._collapsedAdapterCategories = new Set();
	ui.notifications.info(game.i18n.format("IBHUD.Preset.ActionMenu.Loaded", { name }));
	app.render();
};

export const onDeleteActionMenuPreset = async (app) => {
	if (!game.user.isGM) return;
	const select = app.element?.querySelector?.('select[name="actionMenuPresetSelect"]');
	const name = select?.value;
	if (!name) return;

	const { DialogV2 } = foundry.applications.api;
	let confirmed;
	try {
		confirmed = await DialogV2.confirm({
			window: {
				title: game.i18n.localize("IBHUD.Preset.ActionMenu.DeleteTitle"),
				icon: "fas fa-trash",
			},
			content: `<p>${game.i18n.format("IBHUD.Preset.ActionMenu.DeleteConfirm", { name })}</p>`,
			yes: {
				label: game.i18n.localize("IBHUD.Preset.ActionMenu.Delete"),
				icon: "fas fa-trash",
			},
			no: {
				label: game.i18n.localize("IBHUD.UI.Cancel"),
				icon: "fas fa-times",
			},
			classes: ["stylish-hud-dialog"],
		});
	} catch {
		return;
	}
	if (!confirmed) return;

	const presets = foundry.utils.deepClone(
		game.settings.get(MODULE_ID, "actionMenuPresets") || {},
	);
	delete presets[name];
	await game.settings.set(MODULE_ID, "actionMenuPresets", presets);
	ui.notifications.info(game.i18n.format("IBHUD.Preset.ActionMenu.Deleted", { name }));
	app.render();
};

export const onExportConfigPresetFile = (app, event, target) => {
	const config = game.settings.get(MODULE_ID, "configuration");
	const blob = new Blob([JSON.stringify({ meta: { moduleVersion: game.modules.get(MODULE_ID)?.version, exportDate: new Date().toISOString(), systemId: game.system.id }, config }, null, 2)], { type: "application/json" });
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = `stylish-hud-preset-${Date.now()}.json`;
	a.click();
	URL.revokeObjectURL(a.href);
};

export const onImportConfigPresetFile = async (app, event, target) => {
	if (!game.user.isGM) return;
	const input = document.createElement("input");
	input.type = "file";
	input.accept = ".json";
	input.onchange = async () => {
		const file = input.files[0];
		if (!file) return;
		try {
			const text = await file.text();
			const data = JSON.parse(text);
			if (!data.config) { ui.notifications.error("Invalid preset file."); return; }

			const { DialogV2 } = foundry.applications.api;
			const confirmed = await DialogV2.confirm({
				window: { title: game.i18n.localize("IBHUD.Preset.Full.ImportTitle"), icon: "fas fa-file-import" },
				content: `<p>${game.i18n.localize("IBHUD.Preset.Full.ImportConfirm")}</p>`,
				yes: { label: game.i18n.localize("IBHUD.Preset.Full.Import"), icon: "fas fa-check" },
				no: { label: game.i18n.localize("IBHUD.UI.Cancel"), icon: "fas fa-times" },
				classes: ["stylish-hud-dialog"],
			});
			if (!confirmed) return;

			await game.settings.set(MODULE_ID, "configuration", data.config);
			ui.notifications.info(game.i18n.localize("IBHUD.Preset.Full.Imported"));

			app.isInitialized = false;
			app.render();
			if ((window.ActionHUD || window.stylishActionHUD)) (window.ActionHUD || window.stylishActionHUD).refresh();
			if (window.StylishAction) window.StylishAction.refresh();
		} catch (e) {
			console.error("Stylish HUD | Preset import failed:", e);
			ui.notifications.error("Failed to import preset file.");
		}
	};
	input.click();
};

export const onExportPreset = async (app, event, target) => {
	const api = game.modules.get(MODULE_ID)?.api;
	if (!api) return;

	const preset = await api.exportPreset();

	const { DialogV2 } = foundry.applications.api;
	const result = await DialogV2.prompt({
		window: {
			title: game.i18n.localize("IBHUD.Preset.ExportTitle"),
			icon: "fas fa-file-export",
		},
		content: `
			<div style="display: flex; flex-direction: column; gap: 10px;">
				<div class="form-group">
					<label>${game.i18n.localize("IBHUD.Preset.NameLabel")}</label>
					<input type="text" name="presetName" value="${game.system.title} Preset" style="width: 100%;">
				</div>
				<div class="form-group">
					<label>${game.i18n.localize("IBHUD.Preset.DescLabel")}</label>
					<textarea name="presetDesc" rows="3" style="width: 100%;"></textarea>
				</div>
			</div>
		`,
		ok: {
			label: game.i18n.localize("IBHUD.Preset.Download"),
			icon: "fas fa-download",
			callback: (event, button, dialog) => {
				const form = button.form;
				return {
					name: form.presetName.value,
					description: form.presetDesc.value,
				};
			},
		},
		classes: ["stylish-hud-dialog"],
	});

	if (result) {
		preset.meta.name = result.name || "Untitled Preset";
		preset.meta.description = result.description || "";
		api.downloadPreset(preset, result.name);
		ui.notifications.info(game.i18n.localize("IBHUD.Preset.ExportSuccess"));
	}
};

export const onImportPreset = async (app, event, target) => {
	const api = game.modules.get(MODULE_ID)?.api;
	if (!api) return;

	const result = await api.importPresetFromFile();

	if (result.success) {
		let message = game.i18n.localize("IBHUD.Preset.ImportSuccess");

		if (result.macrosCreated.length > 0) {
			message += `\n${game.i18n.format("IBHUD.Preset.MacrosCreated", { count: result.macrosCreated.length })}`;
		}

		if (result.actorPresetsImported > 0) {
			message += `\n${game.i18n.format("IBHUD.Preset.ActorPresetsImported", { count: result.actorPresetsImported })}`;
		}

		if (result.warnings.length > 0) {
			message += `\n${game.i18n.localize("IBHUD.Preset.Warnings")}: ${result.warnings.length}`;
			console.warn("Stylish HUD Preset Import Warnings:", result.warnings);
		}

		ui.notifications.info(message);

		app.isInitialized = false;
		app.render();

		if ((window.ActionHUD || window.stylishActionHUD)) (window.ActionHUD || window.stylishActionHUD).refresh();
		if (window.StylishAction) window.StylishAction.refresh();
	} else {
		ui.notifications.error(result.error || game.i18n.localize("IBHUD.Preset.ImportFailed"));
	}
};

export const onSaveActorPreset = async (app, event, target) => {
	const saved = await ActorPresetManager.showSaveDialog(app);
	if (saved) {
		app.render();
	}
};

export const onDeleteActorPreset = async (app, event, target) => {
	const selector = app.element.querySelector(".preset-selector");
	const presetId = selector?.value;
	
	if (!presetId) {
		ui.notifications.warn(game.i18n.localize("IBHUD.Preset.Actor.SelectFirst"));
		return;
	}

	const deleted = await ActorPresetManager.showDeleteDialog(presetId);
	if (deleted) {
		app.render();
	}
};

export const onApplyActorPresetClick = (app, event, target) => {
	const selector = app.element.querySelector(".preset-selector");
	const presetId = selector?.value;

	if (!presetId) {
		ui.notifications.warn(game.i18n.localize("IBHUD.Preset.Actor.SelectFirst"));
		return;
	}

	onApplyActorPreset(app, presetId);
};

export const onApplyActorPreset = (app, presetId) => {
	if (!presetId) return;
	
	app._captureInputData(app.element);
	ActorPresetManager.applyPreset(presetId, app);
	app.render();

	setTimeout(() => {
		app._triggerPreview();
	}, 100);
};

export const onExportTheme = async (app) => {
	try {
		ui.notifications.info(game.i18n.localize("IBHUD.Theme.Exporting"));
		const result = await exportTheme();
		if (result.success) {
			let msg = game.i18n.format("IBHUD.Theme.ExportSuccess", { count: result.imageCount });
			if (result.warnings.length > 0) {
				msg += ` (${result.warnings.length} warnings)`;
				console.warn("StylishHUD Theme Export Warnings:", result.warnings);
			}
			ui.notifications.info(msg);
		}
	} catch (err) {
		console.error("StylishHUD | Theme export failed:", err);
		ui.notifications.error(game.i18n.localize("IBHUD.Theme.ExportFailed"));
	}
};

export const onImportTheme = async (app) => {
	try {
		const result = await importTheme();
		if (result.success) {
			let msg = game.i18n.format("IBHUD.Theme.ImportSuccess", { count: result.imageCount });
			if (result.warnings.length > 0) {
				msg += ` (${result.warnings.length} warnings)`;
				console.warn("StylishHUD Theme Import Warnings:", result.warnings);
			}
			ui.notifications.info(msg);

			app.isInitialized = false;
			app.render();

			if ((window.ActionHUD || window.stylishActionHUD)) (window.ActionHUD || window.stylishActionHUD).refresh();
			if (window.StylishAction) window.StylishAction.refresh();
		} else if (result.error !== "Cancelled") {
			ui.notifications.error(result.error || game.i18n.localize("IBHUD.Theme.ImportFailed"));
		}
	} catch (err) {
		console.error("StylishHUD | Theme import failed:", err);
		ui.notifications.error(game.i18n.localize("IBHUD.Theme.ImportFailed"));
	}
};
