import { MODULE_ID } from "../../../core/ids.js";
import { ensureFontAwesomeCatalog, ensureRpgAwesomeCatalog, fontAwesomeIconNames, rpgAwesomeIconNames } from "./catalog.js";
import { buildIconPickerView, iconFamilyFromValue, iconTabFromValue, imagePickerTarget } from "./view.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class IconPicker extends HandlebarsApplicationMixin(ApplicationV2) {
	static DEFAULT_OPTIONS = {
		classes: ["niks-icon-picker"],
		tag: "div",
		window: {
			title: "NAH.IconPicker.Title",
			icon: "fa-solid fa-magnifying-glass",
			resizable: true,
			minimizable: true,
		},
		position: {
			width: 620,
			height: 620,
		},
	};

	static PARTS = {
		content: {
			template: `modules/${MODULE_ID}/templates/config/icon-picker.hbs`,
		},
	};

	query = "";

	queryCaret = null;

	tab = "fontAwesome";

	family = "fa-solid";

	value = "";

	resolve = null;

	settled = false;

	static pick(current = "") {
		return new Promise((resolve) => {
			const picker = new IconPicker();
			picker.value = String(current ?? "").trim();
			picker.tab = iconTabFromValue(picker.value);
			picker.family = iconFamilyFromValue(picker.value);
			picker.resolve = resolve;
			picker.render({ force: true });
		});
	}

	async _prepareContext(_options) {
		await Promise.all([ensureFontAwesomeCatalog(), ensureRpgAwesomeCatalog()]);
		return buildIconPickerView({
			faNames: fontAwesomeIconNames(this.family),
			raNames: rpgAwesomeIconNames(),
			query: this.query,
			tab: this.tab,
			family: this.family,
			value: this.value,
			t: (key, data) => (data
				? game.i18n.format(`NAH.IconPicker.${key}`, data)
				: game.i18n.localize(`NAH.IconPicker.${key}`)),
		});
	}

	async _onRender(context, options) {
		await super._onRender(context, options);
		const root = this.element;
		if (!root) return;

		const search = root.querySelector(".nah-ip-search-input");
		if (search) {
			search.addEventListener("input", () => {
				this.query = search.value;
				this.queryCaret = search.selectionStart;
				this.render();
			});
			search.focus();
			const caret = Math.min(this.queryCaret ?? search.value.length, search.value.length);
			search.setSelectionRange(caret, caret);
		}

		root.querySelector(".nah-ip-search-clear")?.addEventListener("click", () => {
			this.query = "";
			this.queryCaret = 0;
			this.render();
		});

		root.querySelectorAll(".nah-ip-tab").forEach((button) => {
			button.addEventListener("click", () => {
				this.tab = button.dataset.tab || "fontAwesome";
				this.render();
			});
		});

		root.querySelectorAll(".nah-ip-family").forEach((button) => {
			button.addEventListener("click", () => {
				this.family = button.dataset.family || "fa-solid";
				this.render();
			});
		});

		root.querySelectorAll(".nah-ip-option").forEach((button) => {
			button.addEventListener("click", () => {
				this.value = button.dataset.value ?? "";
				this.render();
			});
		});

		const manual = root.querySelector(".nah-ip-value-input");
		manual?.addEventListener("change", () => {
			this.value = manual.value.trim();
			this.render();
		});
		manual?.addEventListener("keydown", (event) => {
			if (event.key !== "Enter") return;
			event.preventDefault();
			this.choose(manual.value.trim());
		});

		root.querySelector(".nah-ip-browse")?.addEventListener("click", () => this.browse());
		root.querySelector(".nah-ip-clear")?.addEventListener("click", () => {
			this.value = "";
			this.render();
		});
		root.querySelector(".nah-ip-apply")?.addEventListener("click", () => this.choose(this.value));
	}

	async close(options) {
		this.settle(null);
		return super.close(options);
	}

	browse() {
		const FilePicker = foundry.applications.apps.FilePicker.implementation;
		new FilePicker({
			type: "image",
			current: imagePickerTarget(this.value),
			callback: (path) => {
				this.value = path;
				this.render();
			},
		}).browse();
	}

	async choose(value) {
		this.settle(value);
		await this.close();
	}

	settle(value) {
		if (this.settled) return;
		this.settled = true;
		this.resolve?.(value);
		this.resolve = null;
	}
}
