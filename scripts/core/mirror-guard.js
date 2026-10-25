/**
 * Whether this client should copy a changed mirrored setting into the world profile.
 * A world setting's onChange fires on every connected client, so only the active GM writes;
 * a client setting only changed here, so any user who may modify settings writes.
 */
export function mayMirror(spec, { game }) {
	if (spec.scope === "world") return Boolean(game.users?.activeGM?.isSelf);
	return Boolean(game.user?.can?.("SETTINGS_MODIFY"));
}
