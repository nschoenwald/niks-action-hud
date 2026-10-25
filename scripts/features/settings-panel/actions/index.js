/**
 * Every panel action by name, grouped by the tab (or footer) that owns it. ApplicationV2 calls
 * these through `app.js`, which binds `this` to the panel instance.
 */

import { onSave } from "./footer.js";
import { onSelectTheme } from "./appearance.js";
import { onToggleCollapseCategory, onPickCategoryIcon } from "./customize-hud.js";
import { onExportConfig, onImportConfig, onReset } from "./presets.js";

export { onSave };

export const PANEL_ACTIONS = {
	// Footer
	save: onSave,

	// Appearance
	selectTheme: onSelectTheme,

	// Customize HUD
	toggleCollapseCategory: onToggleCollapseCategory,
	pickCategoryIcon: onPickCategoryIcon,

	// Backup and reset
	exportConfig: onExportConfig,
	importConfig: onImportConfig,
	reset: onReset,
};
