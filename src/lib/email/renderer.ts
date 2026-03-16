/**
 * Email Template Renderer
 *
 * Simple Mustache-style {{variable}} replacement engine.
 * Designed to be safe and predictable — no logic, no conditionals.
 */

/**
 * Render a template string by replacing {{variable}} placeholders.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return key in variables ? variables[key] : match
  })
}

/**
 * Extract all unique variable names ({{key}}) from a template string.
 */
export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g)
  if (!matches) return []

  const keys = matches.map((m) => m.replace(/\{\{|\}\}/g, ""))
  return [...new Set(keys)]
}

/**
 * Extract all unique variables across HTML content and subject.
 */
export function extractAllVariables(htmlContent: string, subject: string): string[] {
  const htmlVars = extractVariables(htmlContent)
  const subjectVars = extractVariables(subject)
  return [...new Set([...htmlVars, ...subjectVars])]
}

/**
 * Validate that all required template variables have been provided.
 * Returns an array of missing variable names.
 */
export function validateVariables(
  template: string,
  provided: Record<string, string>
): string[] {
  const required = extractVariables(template)
  return required.filter((key) => !(key in provided))
}
