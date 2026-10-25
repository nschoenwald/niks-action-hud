/** HTML-escape a value for text or attribute positions (Foundry ships Handlebars globally). */
export const escapeHtml = (value) => Handlebars.escapeExpression(String(value ?? ""));
