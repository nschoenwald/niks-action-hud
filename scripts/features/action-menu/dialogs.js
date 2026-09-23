import { MODULE_ID } from "../../constants.js";

export const editSpellSlots = async (ActionMenu, categoryId, tabId) => {
	let realActor = null;
	if (ActionMenu.currentActor.isToken) {
		const token = canvas.tokens.get(ActionMenu.currentActor.token.id);
		realActor = token ? token.actor : null;
	} else {
		realActor = game.actors.get(ActionMenu.currentActor.id);
	}

	if (!ActionMenu.adapter.getSpellSlotInfo) return;
	const slotData = ActionMenu.adapter.getSpellSlotInfo(realActor, tabId);
	if (!slotData) return;

	const content = `
            <div class="ib-dialog-content" style="display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #444; padding-bottom:5px;">
                    <label style="font-weight:bold; font-size:1.1em;">${slotData.label}</label>
                    <span style="font-size:0.8em; color:#aaa;">${game.i18n.localize("IBHUD.Dialog.SpellSlots")}</span>
                </div>
                <div style="display:flex; gap:10px;">
                    <input type="number" name="newValue" value="${slotData.value}" style="flex:1; text-align:center;">
                    <span style="font-size:1.2em; font-weight:bold; color:#888;">/ ${slotData.max}</span>
                </div>
            </div>
        `;

	const { DialogV2 } = foundry.applications.api;

	const newValue = await DialogV2.prompt({
		window: {
			title: game.i18n.localize("IBHUD.Dialog.EditSlotsTitle"),
			icon: "fas fa-magic",
			width: 300,
		},
		content: content,
		ok: {
			label: game.i18n.localize("IBHUD.Dialog.UpdateBtn"),
			icon: "fas fa-check",
			callback: (event, button, dialog) => {
				const root = dialog?.element ?? dialog;
				const input = root.querySelector('input[name="newValue"]');
				return input ? input.value : null;
			},
		},
		rejectClose: false,
	});

	if (newValue !== null) {
		const num = Number(newValue);
		if (isNaN(num)) return;

		const clamped = Math.clamp(num, 0, slotData.max || 0);
		await realActor.update({ [slotData.path]: clamped });

		ActionMenu.refresh();
	}
};

export const editMacro = async (ActionMenu, macroId, options = {}) => {
	const actor = ActionMenu.currentActor;
	if (!actor) return;

	const normalizedId = macroId.startsWith("macro-")
		? macroId.replace(/^macro-/, "")
		: macroId;

	let macro = null;
	if (typeof fromUuidSync === "function") macro = fromUuidSync(macroId);
	if (!macro) macro = game.macros.get(macroId);
	
	const overrides = actor.getFlag?.(MODULE_ID, "macro-overrides") || {};
	const existingOverride =
		foundry.utils.getProperty(overrides, normalizedId) ??
		foundry.utils.getProperty(overrides, macroId);
	const currentFlavor = existingOverride?.flavor || "";
	
	const { DialogV2 } = foundry.applications.api;
	const { HTMLProseMirrorElement } = foundry.applications.elements;

	const editorHtml = HTMLProseMirrorElement.create({
		name: "flavorText",
		value: currentFlavor,
		toggled: false,
	}).outerHTML;

	const content = `
		<div class="ib-dialog-content sah-edit-macro-content" style="display:flex; flex-direction:column; gap:15px; padding:5px; height:100%; min-height:360px; box-sizing:border-box;">
			<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #444; padding-bottom:5px;">
				<label style="font-weight:bold; font-size:1.1em;">${macro?.name || "Macro"}</label>
				<span style="font-size:0.8em; color:#aaa;">Edit Macro</span>
			</div>
			
			<div style="flex:1; display:flex; flex-direction:column; gap:5px; min-height:260px;">
				<label style="font-weight:bold; color:#ccc;">Flavor Text / Description</label>
				<div style="flex:1; min-height:240px; height:100%;">
					${editorHtml}
				</div>
			</div>
		</div>
	`;

	const result = await new Promise((resolve) => {
		const dialog = new DialogV2({
			window: {
				title: "Edit Macro",
				icon: "fas fa-edit",
				width: 420,
				height: 560,
				resizable: true,
				classes: ["sah-edit-macro-dialog"],
			},
			content: content,
			buttons: [
				{
					action: "save",
					label: "Save",
					icon: "fas fa-save",
					callback: (event, button, dlg) => {
						const root = dlg?.element ?? dlg;
						const editor = root.querySelector('prose-mirror[name="flavorText"]');
						const flavor = editor?.value ?? editor?.getAttribute("value") ?? editor?.innerHTML ?? "";
						resolve({ action: "save", flavor: flavor });
					}
				},
				{
					action: "delete",
					label: "Delete Macro",
					icon: "fas fa-trash",
					callback: () => {
						resolve({ action: "delete" });
					}
				}
			],
		});

		dialog.addEventListener("close", () => resolve(null), { once: true });

		dialog.addEventListener("render", () => {
			requestAnimationFrame(() => {
				if (dialog.element) dialog.setPosition({ width: 420, height: 560 });
			});
		}, { once: true });
		dialog.render({ force: true });
	});

	if (!result) return;

	if (result.action === "delete") {
		if (typeof options.onDelete === "function") {
			await options.onDelete();
		} else if (ActionMenu) {
			ActionMenu.removeMacro?.(macroId);
		}
	} else if (result.action === "save") {
		const newOverrides = foundry.utils.deepClone(overrides);
		const removeOverridePath = (obj, path) => {
			const parts = path.split(".");
			let target = obj;
			for (let i = 0; i < parts.length - 1; i++) {
				if (!target || typeof target !== "object") return;
				target = target[parts[i]];
			}
			const last = parts[parts.length - 1];
			if (target && Object.prototype.hasOwnProperty.call(target, last)) {
				delete target[last];
			}
		};
		removeOverridePath(newOverrides, macroId);
		removeOverridePath(newOverrides, normalizedId);
		if (result.flavor.trim()) {
			foundry.utils.setProperty(newOverrides, normalizedId, { flavor: result.flavor });
		}

		await actor.setFlag(MODULE_ID, "macro-overrides", newOverrides);
		ActionMenu.refresh();
	}
};

export const restoreItem = async (ActionMenu, itemId) => {
	if (!ActionMenu.currentActor) return;

	if (ActionMenu.adapter.restoreItem) {
		const result = await ActionMenu.adapter.restoreItem(
			ActionMenu.currentActor,
			itemId,
		);

		if (result) {
			ui.notifications.info(game.i18n.localize("IBHUD.Notifications.Restored"));
			ActionMenu.refresh();
		}
	}
};
