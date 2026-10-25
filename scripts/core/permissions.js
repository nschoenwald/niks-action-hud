/** May the current user edit this actor (owner, or a GM)? */
export const mayEdit = (actor) => Boolean(actor?.isOwner || game.user?.isGM);
