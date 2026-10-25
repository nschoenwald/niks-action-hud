/** Give `el` the class for `theme`, leaving every other class alone. */
export function setThemeClass(el, theme) {
	for (const name of [...el.classList]) if (name.startsWith("theme-") && name !== `theme-${theme}`) el.classList.remove(name);
	el.classList.add(`theme-${theme}`);
}
