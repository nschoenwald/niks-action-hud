/**
 * Footer actions: save the draft.
 */

import { saveProfile } from "../../../core/profile.js";
import { hud } from "../../../core/runtime.js";
import { writeMirroredSettings } from "../settings-sync.js";
import { pullForm } from "./shared.js";

export async function onSave(app) {
	const canConfigure = Boolean(game.user.can("SETTINGS_MODIFY") || game.user.isGM);
	app.isSaving = true;
	try {
		pullForm(app);
		const profile = app.draft.toProfile();

		if (canConfigure) await saveProfile(profile);
		// Client-level settings apply to everyone; profile-level ones only to users who may configure.
		await writeMirroredSettings(profile, { profileLevel: canConfigure });

		const savedKey = canConfigure ? "NAH.Config.Saved" : "NAH.Config.SavedClientOnly";
		ui.notifications.info(game.i18n.localize(savedKey));
		if (hud.refresh) hud.refresh();
		await app.close();
	} catch (err) {
		console.error("Nik's Action HUD | Error saving configuration:", err);
		ui.notifications.error("Failed to save configuration.");
	} finally {
		app.isSaving = false;
	}
}
