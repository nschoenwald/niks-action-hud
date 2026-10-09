import { MODULE_ID, FLAGS } from "../constants.js";
import { defaultRegistry } from "./defaults.js";

/**
 * Base abstract system adapter for Nik's Action HUD.
 * Defines the contract for category discovery, submenu resolution, item execution, and macro creation.
 */
export class BaseSystemAdapter {
	constructor(systemId) {
		this.systemId = systemId;
	}

	/**
	 * Check if category is visible for the specified actor based on visibility configuration.
	 * @param {Object} visibility - { mode: "all"|"only"|"except", actorTypes: string[], actorIds: string[] }
	 * @param {Actor} actor
	 * @returns {boolean}
	 */
	_isCategoryVisible(visibility, actor) {
		if (!visibility || !visibility.mode || visibility.mode === "all") return true;
		if (!actor) return true;

		const types = visibility.actorTypes || [];
		const ids = visibility.actorIds || [];
		const matches = types.includes(actor.type) || ids.includes(actor.id);

		if (visibility.mode === "only") return matches;
		if (visibility.mode === "except") return !matches;
		return true;
	}

	/**
	 * Returns true if actor qualifies for the legendary category.
	 * Overridden by system adapters.
	 * @param {Actor} actor
	 * @returns {boolean}
	 */
	actorHasLegendary(actor) {
		return false;
	}

	/**
	 * Returns the top-level categories for the active actor.
	 * Reads from module configuration or falls back to system defaults.
	 * @param {Actor} actor
	 * @returns {Array<Object>}
	 */
	getActionCategories(actor) {
		const config = game.settings.get(MODULE_ID, "configuration") || {};
		const hasLegendary = this.actorHasLegendary(actor);

		if (Array.isArray(config.customMenu) && config.customMenu.length > 0) {
			const entries = config.customMenu.map((cat, menuIndex) => ({ cat, menuIndex }));
			const hasLegendaryInCustom = entries.some((e) => e.cat.systemId === "legendary");

			if (!hasLegendaryInCustom && hasLegendary) {
				const featIndex = entries.findIndex(
					(e) => e.cat.systemId === "feature" || e.cat.systemId === "features"
				);
				const legendaryDef = {
					systemId: "legendary",
					label: game.i18n.localize("NAH.Categories.Legendary") || "Legendary",
					icon: "fas fa-crown",
					type: "submenu",
					useSidebar: false,
				};
				const legendaryEntry = { cat: legendaryDef, menuIndex: -1 };

				if (featIndex !== -1) {
					entries.splice(featIndex + 1, 0, legendaryEntry);
				} else {
					const utilIndex = entries.findIndex(
						(e) => e.cat.systemId === "utility" || e.cat.systemId === "abilities"
					);
					if (utilIndex !== -1) {
						entries.splice(utilIndex, 0, legendaryEntry);
					} else {
						entries.push(legendaryEntry);
					}
				}
			}

			return entries
				.map(({ cat, menuIndex }) => ({
					id: cat.systemId === "legendary" ? "custom-legendary" : `custom-${menuIndex}`,
					label: cat.label,
					icon: cat.icon,
					img: cat.img,
					buttonImg: cat.buttonImg,
					buttonScale: cat.buttonScale ?? 1.0,
					buttonX: cat.buttonX ?? 0,
					buttonY: cat.buttonY ?? 0,
					buttonFrameLayers: cat.buttonFrameLayers || [],
					buttonFrameColor: cat.buttonFrameColor || "",
					fontFamily: cat.fontFamily || "",
					textColor: cat.textColor || "",
					type: "submenu",
					cssClass: menuIndex >= 0 ? `btn-custom-${menuIndex}` : "btn-custom-legendary",
					systemId: cat.systemId || null,
					_visibility: cat.visibility,
				}))
				.filter((cat) => {
					if (cat.systemId === "legendary" && !this.actorHasLegendary(actor)) {
						return false;
					}
					return this._isCategoryVisible(cat._visibility, actor);
				});
		}

		const defaultLayout = defaultRegistry.getDefaultLayout(game.system.id, this);
		if (Array.isArray(defaultLayout) && defaultLayout.length > 0) {
			return defaultLayout
				.filter((cat) => {
					if (cat.systemId === "legendary" && !this.actorHasLegendary(actor)) {
						return false;
					}
					return true;
				})
				.map((cat, index) => ({
					id: cat.systemId ? `menu-${cat.systemId}` : `menu-${index}`,
					systemId: cat.systemId,
					label: cat.label,
					icon: cat.icon,
					type: "submenu",
				}));
		}

		return [];
	}

	/**
	 * Retrieve submenu items and tab data for a specific category.
	 * @param {Actor} actor
	 * @param {string} categoryId
	 * @param {Object|null} category
	 * @returns {Promise<Object>}
	 */
	async getSubMenuData(actor, categoryId, category = null) {
		if (!category && actor) {
			const categories = this.getActionCategories(actor);
			category = categories?.find((c) => String(c.id) === String(categoryId)) || null;
		}

		const parts = String(categoryId).split("-");
		const index = parseInt(parts[parts.length - 1], 10);
		const config = game.settings.get(MODULE_ID, "configuration") || {};
		const defaultLayout = defaultRegistry.getDefaultLayout(game.system.id, this);

		let menuData = null;
		const cleanSysId = parts.slice(1).join("-");

		const targetSystemId =
			category?.systemId ||
			(cleanSysId && defaultLayout?.some((c) => c.systemId === cleanSysId) ? cleanSysId : null);

		if (targetSystemId) {
			menuData =
				config.customMenu?.find((c) => c.systemId === targetSystemId) ||
				defaultLayout?.find((c) => c.systemId === targetSystemId) ||
				(category?.systemId ? { systemId: category.systemId, label: category.label || "" } : null);
		}

		if (!menuData && !Number.isNaN(index)) {
			if (String(categoryId).startsWith("custom-")) {
				menuData = config.customMenu?.[index];
			} else if (String(categoryId).startsWith("menu-")) {
				menuData = defaultLayout?.[index];
			}
		}

		if (!menuData && category?.systemId) {
			menuData = defaultLayout?.find((c) => c.systemId === category.systemId) || {
				systemId: category.systemId,
				label: category.label || "",
			};
		}

		if (!menuData) return { title: "", items: [] };

		if (menuData.systemId) {
			return await this._getSystemSubMenuData(actor, menuData.systemId, menuData);
		}

		return this._getCustomSubMenuData(actor, menuData, index);
	}

	/**
	 * Synchronous inspection for empty submenu state checking.
	 * @param {Actor} actor
	 * @param {string} categoryId
	 * @param {Object|null} category
	 * @returns {Object|null}
	 */
	getSubMenuDataSync(actor, categoryId, category = null) {
		if (!category && actor) {
			const categories = this.getActionCategories(actor);
			category = categories?.find((c) => String(c.id) === String(categoryId)) || null;
		}

		const parts = String(categoryId).split("-");
		const index = parseInt(parts[parts.length - 1], 10);
		const config = game.settings.get(MODULE_ID, "configuration") || {};
		const defaultLayout = defaultRegistry.getDefaultLayout(game.system.id, this);

		let menuData = null;
		const cleanSysId = parts.slice(1).join("-");

		const targetSystemId =
			category?.systemId ||
			(cleanSysId && defaultLayout?.some((c) => c.systemId === cleanSysId) ? cleanSysId : null);

		if (targetSystemId) {
			menuData =
				config.customMenu?.find((c) => c.systemId === targetSystemId) ||
				defaultLayout?.find((c) => c.systemId === targetSystemId) ||
				(category?.systemId ? { systemId: category.systemId, label: category.label || "" } : null);
		}

		if (!menuData && !Number.isNaN(index)) {
			if (String(categoryId).startsWith("custom-")) {
				menuData = config.customMenu?.[index];
			} else if (String(categoryId).startsWith("menu-")) {
				menuData = defaultLayout?.[index];
			}
		}

		if (!menuData && category?.systemId) {
			menuData = defaultLayout?.find((c) => c.systemId === category.systemId) || {
				systemId: category.systemId,
				label: category.label || "",
			};
		}

		if (!menuData) return { title: "", items: [] };

		if (menuData.systemId) {
			if (typeof this._getSystemSubMenuDataSync === "function") {
				return this._getSystemSubMenuDataSync(actor, menuData.systemId, menuData);
			}
			return null;
		}

		return this._getCustomSubMenuData(actor, menuData, index);
	}

	_getSystemSubMenuDataSync(actor, systemId, menuData) {
		return { title: menuData.label, items: [] };
	}

	async _getSystemSubMenuData(actor, systemId, menuData) {
		if (typeof this._getSystemSubMenuDataSync === "function") {
			return this._getSystemSubMenuDataSync(actor, systemId, menuData);
		}
		return { title: menuData.label, items: [] };
	}

	/**
	 * Build custom submenu data from user-created menu configurations.
	 */
	_getCustomSubMenuData(actor, menuData, index) {
		const useSidebar = menuData.useSidebar === true;
		const personalMap = actor.getFlag(MODULE_ID, FLAGS.PERSONAL_MAP) || {};

		const items = {};
		const tabLabels = {};
		const subTabLabels = {};

		if (Array.isArray(menuData.tabs)) {
			menuData.tabs.forEach((tab, tIdx) => {
				let sKey = "";
				let tKey = "";
				let sLabel = tab.label || "General";
				let tLabel = tab.subLabel || "All";

				if (useSidebar) {
					sKey = sLabel.replace(/\s+/g, "_").toLowerCase();
					tKey = `tab-${tIdx}`;
					if (!items[sKey]) {
						items[sKey] = {};
						tabLabels[sKey] = sLabel;
						subTabLabels[sKey] = {};
					}
					if (!items[sKey][tKey]) {
						items[sKey][tKey] = [];
						subTabLabels[sKey][tKey] = tLabel;
					}
				} else {
					sKey = `tab-${tIdx}`;
					if (!items[sKey]) {
						items[sKey] = [];
						tabLabels[sKey] = sLabel;
					}
				}

				const targetArray = useSidebar ? items[sKey][tKey] : items[sKey];

				if (Array.isArray(tab.items)) {
					tab.items.forEach((savedItem, iIdx) => {
						this._processCustomItem(savedItem, targetArray, false, {
							catIdx: index,
							tabIdx: tIdx,
							itemIdx: iIdx,
						});
					});
				}

				const pKey = `${index}-${tIdx}`;
				const personalItems = personalMap[pKey];
				if (Array.isArray(personalItems)) {
					if (targetArray.length > 0) {
						targetArray.push({ isHeader: true, name: "Personal" });
					}
					personalItems.forEach((pItem, pIdx) => {
						this._processCustomItem(pItem, targetArray, true, {
							catIdx: index,
							tabIdx: tIdx,
							itemIdx: pIdx,
						});
					});
				}
			});
		}

		return {
			title: menuData.label,
			theme: "blue",
			hasTabs: true,
			hasSubTabs: useSidebar,
			items,
			tabLabels,
			subTabLabels,
		};
	}

	_processCustomItem(savedItem, targetArray, isPersonal, meta = {}) {
		if (!savedItem || !savedItem.id || !savedItem.type) return;

		if (savedItem.type === "Macro") {
			targetArray.push({
				id: `macro-${savedItem.id}`,
				name: savedItem.name || "Macro",
				img: savedItem.img || "icons/svg/dice-target.svg",
				cost: "",
				description: savedItem.flavor || "Macro",
				globalFlavor: !isPersonal ? savedItem.flavor || "" : "",
				isPersonal,
				customCatIndex: meta.catIdx,
				customTabIndex: meta.tabIdx,
				customItemIndex: meta.itemIdx,
			});
		}
	}

	/**
	 * Execute system-level action (rests, initiative, etc.).
	 */
	async executeAction(actor, actionId) {}

	/**
	 * Trigger use or roll of an item by ID.
	 */
	async useItem(actor, itemId, event = null) {
		if (itemId.startsWith("macro-")) {
			const uuid = itemId.replace("macro-", "");
			const macro = (await fromUuid(uuid)) || game.macros.get(uuid);
			if (macro) {
				return macro.execute({ actor, token: actor.token });
			}
			ui.notifications.warn(`Macro not found: ${uuid}`);
			return;
		}

		const item = actor.items.get(itemId);
		if (!item) {
			ui.notifications.warn(`Item not found: ${itemId}`);
			return;
		}

		if (typeof item.use === "function") return item.use({}, { event });
		if (typeof item.roll === "function") return item.roll({}, { event });
		return item.sheet.render(true);
	}

	/**
	 * Helper to create macros from dragged items.
	 */
	async createSystemMacro(dropData) {
		if (dropData.type !== "Item") return null;
		const item = await Item.fromDropData(dropData);
		if (!item) return null;

		const rootName = "Action HUD Macros";
		let folder = game.folders.find((f) => f.name === rootName && f.type === "Macro");
		if (!folder) {
			folder = await Folder.create({
				name: rootName,
				type: "Macro",
				color: "#4493ad",
				sorting: "a",
			});
		}

		const existing = game.macros.find(
			(m) => m.name === item.name && m.command?.includes(item.id) && m.folder?.id === folder.id
		);
		if (existing) return existing;

		const command = `const item = await fromUuid("${item.uuid}");\nif (item) item.use ? item.use() : item.sheet.render(true);`;

		return await Macro.create({
			name: item.name,
			type: "script",
			img: item.img,
			command,
			folder: folder.id,
			flags: { [MODULE_ID]: { sourceId: item.uuid } },
		});
	}
}
