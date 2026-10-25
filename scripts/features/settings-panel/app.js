/**
 * Nik's Action HUD Configuration Dialog
 * Exclusively designed for Foundry V14.
 */

import { normalizeIconClass } from "../../core/icon-source.js";
import { MODULE_ID } from "../../core/ids.js";
import { buildContext } from "./view-model.js";
import { DraftStore } from "./draft-store.js";
import { readFormValues } from "./form-reader.js";
import { bindPanelEvents, syncRangeDisplays } from "./panel-events.js";
import { PANEL_ACTIONS } from "./actions/index.js";
import { activateTab, captureChangeBaseline, refreshConfigStatus } from "./panel-utils.js";
import { refreshPreview } from "./live-preview.js";
import { categoryIconValue, iconMarkup } from "../../core/icon-source.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// ── Handlebars helpers used by the panel templates ──────

const PANEL_HELPERS = {
	rpgIconClass: normalizeIconClass,
	includes: (list, value) => Array.isArray(list) && list.includes(value),
	eq: (a, b) => a === b,
	gt: (a, b) => a > b,
	nahCategoryIcon: (category, fallbackClass) => new Handlebars.SafeString(
		iconMarkup(categoryIconValue(category), { fallbackClass: typeof fallbackClass === "string" ? fallbackClass : "" }),
	),
};

for (const [name, helper] of Object.entries(PANEL_HELPERS)) {
	if (globalThis.Handlebars?.helpers?.[name] == null) globalThis.Handlebars?.registerHelper(name, helper);
}

const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates/config`;
const CONFIG_TEMPLATES = ["main", "tabs/behavior", "tabs/system", "tabs/appearance", "tabs/customize-hud", "tabs/presets", "partials/setting-row", "partials/action-row"].map((name) => `${TEMPLATE_ROOT}/${name}.hbs`);

Hooks.once("init", () => {
	foundry.applications.handlebars.loadTemplates(CONFIG_TEMPLATES);
});

/** ApplicationV2 calls actions with `this` set to the app instance; the handlers take it as their first argument. */
const boundActions = () => Object.fromEntries(
	Object.entries(PANEL_ACTIONS).map(([name, handler]) => [name, function (event, target) { return handler(this, event, target); }]),
);

export class NikHudConfigApp extends HandlebarsApplicationMixin(ApplicationV2) {
	#stopStatusUpdates;

	static get DEFAULT_OPTIONS() {
		return {
			tag: "form",
			id: "niks-action-config",
			classes: ["niks-action-config-app"],
			window: {
				title: "NAH.Config.WindowTitle",
				icon: "fas fa-cogs",
				resizable: true,
			},
			position: {
				width: 980,
				height: 740,
			},
			actions: boundActions(),
		};
	}

	static PARTS = {
		main: {
			template: `modules/${MODULE_ID}/templates/config/main.hbs`,
			// Keep the scroll position when the panel re-renders (icon picker, add/remove rows).
			scrollable: [".hud-content-pane"],
		},
	};

	get title() {
		return game.i18n?.has?.("NAH.Config.WindowTitle")
			? game.i18n.localize("NAH.Config.WindowTitle")
			: "Nik's Action HUD Configuration";
	}

	constructor(options = {}) {
		super(options);
		this.activeTab = "all";
		this.isSaving = false;
		this.draft = new DraftStore();
		this.#stopStatusUpdates = null;
		this._foldedCategories = new WeakSet();
	}

	async _prepareContext(options) {
		return buildContext(this, options);
	}

	_readFormValues(formElement) {
		readFormValues(this, formElement);
	}

	_activateTab(tabName, render = false) {
		activateTab(this, tabName, render);
	}

	async _onFirstRender(context, options) {
		await super._onFirstRender(context, options);
		bindPanelEvents(this);
		this.#stopStatusUpdates = this.draft.subscribe(() => refreshConfigStatus(this));
	}

	_onRender(context, options) {
		super._onRender(context, options);

		syncRangeDisplays(this.element);
		this._activateTab(this.activeTab, false);
		if (!this.draft.hasBaseline) captureChangeBaseline(this);
		refreshConfigStatus(this);
		refreshPreview(this);
	}

	async close(options = {}) {
		this.#stopStatusUpdates?.();
		if (!this.isSaving && window.NikHUD?.shell) {
			try {
				window.NikHUD.shell.refresh();
			} catch (e) {
				console.error("Nik's Action HUD | Error during refresh on close:", e);
			}
		}
		return super.close(options);
	}
}
