'use strict';

function parseJsoncFailClosed(text) {
  try {
    return JSON.parse(text);
  } catch (strictError) {
    if (/\/\*|\*\//.test(text)) {
      throw new Error('ambiguous block comment relative to JSON strings');
    }
    const stripped = text.replace(/^[ \t]*\/\/.*$/gm, '');
    try {
      return JSON.parse(stripped);
    } catch {
      throw strictError;
    }
  }
}

module.exports = { parseJsoncFailClosed };
