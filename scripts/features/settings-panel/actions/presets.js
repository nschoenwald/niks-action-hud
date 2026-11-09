/**
 * Backup and reset tab actions: export / import the whole configuration as one JSON file, and reset to defaults.
 */

import { saveProfile } from "../../../core/profile.js";
import { hud } from "../../../core/runtime.js";
import { writeMirroredSettings } from "../settings-sync.js";
import { pullForm, requireSettingsPermission } from "./shared.js";

const localize = (key, fallback) => game.i18n.localize(key) || fallback;

/** Download the configuration as shown in the panel (including edits that are not saved yet). */
function downloadConfig(app) {
	pullForm(app);
	foundry.utils.saveDataToFile(JSON.stringify(app.draft.toProfile(), null, 2), "application/json", `niks-action-hud-config-${Date.now()}.json`);
}

export const onExportConfig = (app) => downloadConfig(app);

/** Let the user choose one local file; resolves to the file, or nothing when the choice is cancelled. */
function pickFile(accept) {
	const picker = Object.assign(document.createElement("input"), { type: "file", accept });
	return new Promise((resolve) => {
		picker.addEventListener("change", () => resolve(picker.files?.[0]), { once: true });
		picker.addEventListener("cancel", () => resolve(undefined), { once: true });
		picker.click();
	});
}

/** Load a JSON file into the draft; nothing is applied until the panel is saved. */
export async function onImportConfig(app) {
	if (!requireSettingsPermission()) return;

	const file = await pickFile(".json");
	if (!file) return;
	try {
		app.draft.load(JSON.parse(await file.text()));
	} catch (err) {
		console.error("Nik's Action HUD | Import error:", err);
		ui.notifications.error("Failed to parse imported configuration file.");
		return;
	}
	ui.notifications.info(localize("NAH.Config.ImportDone", "Configuration imported. Save to apply it."));
	await app.render();
}

export async function onReset(app) {
	if (!requireSettingsPermission()) return;

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

	ui.notifications.info(localize("NAH.Config.ResetSuccess", "Configuration restored to defaults."));
	if (hud.refresh) hud.refresh();
	app.draft.clearBaseline();
	await app.render();
}
