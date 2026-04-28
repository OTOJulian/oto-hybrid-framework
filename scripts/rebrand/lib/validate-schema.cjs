'use strict';

// Hand-rolled subset of JSON Schema 2020-12. Zero deps per CLAUDE.md.
// Supports the schema constructs used by Phase 2 artifacts only.

function resolveRef(ref, root) {
  if (!ref.startsWith('#/$defs/')) throw new Error(`Unsupported $ref: ${ref}`);
  const key = ref.slice('#/$defs/'.length);
  if (!root.$defs || !root.$defs[key]) throw new Error(`Missing $defs entry: ${key}`);
  return root.$defs[key];
}

function check(data, schema, root, path, errors) {
  if (!root) root = schema;
  if (schema.$ref) schema = resolveRef(schema.$ref, root);

  if (schema.const !== undefined && data !== schema.const) {
    errors.push(`${path}: expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(data)}`);
    return;
  }
  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(`${path}: value ${JSON.stringify(data)} not in enum ${JSON.stringify(schema.enum)}`);
    return;
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = Array.isArray(data) ? 'array' : (data === null ? 'null' : typeof data);
    const okType = actual === 'number' && types.includes('integer') ? Number.isInteger(data) : types.includes(actual);
    if (!okType) {
      errors.push(`${path}: expected type ${types.join('|')}, got ${actual}`);
      return;
    }
  }
  if (schema.pattern && typeof data === 'string') {
    if (!new RegExp(schema.pattern).test(data)) errors.push(`${path}: pattern /${schema.pattern}/ failed for ${JSON.stringify(data)}`);
  }
  if (schema.minLength !== undefined && typeof data === 'string' && data.length < schema.minLength) {
    errors.push(`${path}: minLength ${schema.minLength} not met (length ${data.length})`);
  }
  if (schema.minItems !== undefined && Array.isArray(data) && data.length < schema.minItems) {
    errors.push(`${path}: minItems ${schema.minItems} not met (length ${data.length})`);
  }
  if (schema.minimum !== undefined && typeof data === 'number' && data < schema.minimum) errors.push(`${path}: minimum ${schema.minimum} not met`);
  if (schema.maximum !== undefined && typeof data === 'number' && data > schema.maximum) errors.push(`${path}: maximum ${schema.maximum} exceeded`);

  if (schema.required && typeof data === 'object' && data !== null) {
    for (const key of schema.required) if (!(key in data)) errors.push(`${path}: missing required field "${key}"`);
  }
  if (schema.properties && typeof data === 'object' && data !== null && !Array.isArray(data)) {
    for (const [key, sub] of Object.entries(schema.properties)) {
      if (key in data) check(data[key], sub, root, `${path}.${key}`, errors);
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(data)) if (!allowed.has(key)) errors.push(`${path}: additional property "${key}" not allowed`);
    }
  }
  if (schema.items && Array.isArray(data)) {
    data.forEach((el, i) => check(el, schema.items, root, `${path}[${i}]`, errors));
  }
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((s) => {
      const e = [];
      check(data, s, root, path, e);
      return e.length === 0;
    });
    if (matches.length !== 1) errors.push(`${path}: oneOf matched ${matches.length} schemas (expected 1)`);
  }
  if (schema.allOf) {
    for (const sub of schema.allOf) {
      if (sub.if && sub.then) {
        const condErrors = [];
        check(data, sub.if, root, path, condErrors);
        if (condErrors.length === 0) check(data, sub.then, root, path, errors);
      } else {
        check(data, sub, root, path, errors);
      }
    }
  }
}

function validate(data, schema) {
  const errors = [];
  check(data, schema, schema, '$', errors);
  return { valid: errors.length === 0, errors };
}

module.exports = { validate };
