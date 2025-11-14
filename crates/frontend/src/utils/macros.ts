/**
 * Macro expansion system for text input
 *
 * Macros are special tokens (e.g., @date) that get replaced with dynamic content.
 */

type MacroExpander = () => string;

/**
 * Registry of available macros and their expansion functions
 */
const MACROS: Record<string, MacroExpander> = {
  "@date": () => {
    const now = new Date();
    return now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  },
};

/**
 * Expands all macros in the given text
 *
 * @param text - The input text potentially containing macros
 * @returns The text with all macros expanded
 *
 * @example
 * expandMacros("Meeting on @date") // => "Meeting on Nov 14, 2025"
 */
export function expandMacros(text: string): string {
  let result = text;

  for (const [macro, expander] of Object.entries(MACROS)) {
    result = result.replace(macro, expander());
  }

  return result;
}
