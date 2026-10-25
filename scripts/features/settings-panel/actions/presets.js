/**
 * Backup and reset tab actions: export / import the whole configuration as one JSON file, and reset to defaults.
 */

import { saveProfile } from "../../../core/profile.js";
import { hud } from "../../../core/runtime.js";
import { writeMirroredSettings } from "../settings-sync.js";
import { pullForm, requireSettingsPermission } from "./shared.js";

/** Download the configuration as shown in the panel (including edits that are not saved yet). */
function downloadConfig(app) {
	pullForm(app);
	foundry.utils.saveDataToFile(JSON.stringify(app.draft.toProfile(), null, 2), "application/json", `niks-action-hud-config-${Date.now()}.json`);
}

export const onExportConfig = (app) => downloadConfig(app);

/** Load a JSON file into the draft; nothing is applied until the panel is saved. */
export function onImportConfig(app) {
	if (!requireSettingsPermission()) return;

	const input = document.createElement("input");
	input.type = "file";
	input.accept = ".json";
	input.onchange = async (event) => {
		const file = event.target.files?.[0];
		if (!file) return;
		try {
			app.draft.load(JSON.parse(await file.text()));
			ui.notifications.info(game.i18n.localize("NAH.Config.ImportDone") || "Configuration imported. Save to apply it.");
			await app.render();
		} catch (err) {
			console.error("Nik's Action HUD | Import error:", err);
			ui.notifications.error("Failed to parse imported configuration file.");
		}
	};
	input.click();
}

export async function onReset(app) {
	if (!requireSettingsPermission()) return;

	const localize = (key, fallback) => game.i18n.localize(key) || fallback;
	const choice = await foundry.applications.api.DialogV2.wait({
		window: { title: localize("NAH.Config.ResetConfirmTitle", "Reset Configuration") },
		content: `<p>${localize("NAH.Config.ResetConfirmAll", "Reset every setting to its default? This cannot be undone.")}</p>`,
		modal: true,
		rejectClose: false,
		buttons: [
			{ action: "export", label: localize("NAH.Config.ResetExportFirst", "Export, then reset"), icon: "fa-solid fa-download", default: true },
			{ action: "reset", label: localize("NAH.Config.ResetOnly", "Reset without export"), icon: "fa-solid fa-rotate-left" },
			{ action: "cancel", label: localize("Cancel", "Cancel"), icon: "fa-solid fa-xmark" },
		],
	});
	if (choice !== "export" && choice !== "reset") return;
	if (choice === "export") downloadConfig(app);

	app.draft.resetToDefaults();

	// The reset is persisted immediately.
	const profile = app.draft.toProfile();
	await saveProfile(profile);
	await writeMirroredSettings(profile);

	ui.notifications.info(game.i18n.localize("NAH.Config.ResetSuccess") || "Configuration reset to defaults.");
	if (hud.refresh) hud.refresh();
	app.draft.clearBaseline();
	await app.render();
}
