// Nik's Action HUD — Full Actor Reset
// Completely removes all Action HUD data for the selected actor.
// Usage: Select a token, then run this macro.

(async () => {
  const MODULE = "niks-action-hud";

  // 1) Determine target actor
  const token = canvas.tokens.controlled[0];
  if (!token?.actor) {
    ui.notifications.warn("Please select a token first.");
    return;
  }
  const actor = token.actor;
  const actorId = actor.id;

  // 2) Confirm
  const { DialogV2 } = foundry.applications.api;
  const yes = await DialogV2.confirm({
    window: { title: "Reset Action HUD Data" },
    content: `<p>This will <strong>permanently delete</strong> all Action HUD settings for <strong>${actor.name}</strong>.</p>
              <p>This includes: style, portrait, card format, attributes, image rules, position, and actor flags.</p>
              <p style="color:#e44;">This cannot be undone. Continue?</p>`,
    modal: true,
    rejectClose: false,
  });
  if (!yes) return;

  // 3) Clean configuration (actorSettings, actorAttributes, imageRules)
  const config = foundry.utils.deepClone(
    game.settings.get(MODULE, "configuration") || {}
  );
  let changed = false;

  for (const key of ["actorSettings", "actorAttributes", "imageRules"]) {
    if (config[key]?.[actorId]) {
      delete config[key][actorId];
      changed = true;
    }
  }

  if (changed) {
    await game.settings.set(MODULE, "configuration", config);
  }

  // 4) Clean clientPositions
  const positions = foundry.utils.deepClone(
    game.settings.get(MODULE, "clientPositions") || {}
  );
  if (positions[actorId]) {
    delete positions[actorId];
    await game.settings.set(MODULE, "clientPositions", positions);
  }

  // 5) Unset actor-level flags
  const flags = actor.flags?.[MODULE];
  if (flags) {
    for (const key of Object.keys(flags)) {
      await actor.unsetFlag(MODULE, key);
    }
  }

  ui.notifications.info(
    `Nik's Action HUD — All data for "${actor.name}" has been reset. Reload to apply.`
  );
})();
