'use strict';
const path = require('node:path');

// Implements the RESEARCH.md package.cjs parsed-package rewrite strategy.

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function applies(filePath) {
  return path.basename(filePath) === 'package.json';
}

function apply(pkgObject, rule, context = {}) {
  void context;
  const pkg = clone(pkgObject);
  let replacements = 0;

  for (const field of rule.fields || []) {
    if (field === 'name' && pkg.name === rule.from) {
      pkg.name = rule.to;
      replacements += 1;
    }

    if (field === 'bin' && typeof pkg.bin === 'string' && pkg.bin === rule.from) {
      pkg.bin = rule.to;
      replacements += 1;
    } else if (field === 'bin' && pkg.bin && typeof pkg.bin === 'object' && !Array.isArray(pkg.bin)) {
      if (Object.prototype.hasOwnProperty.call(pkg.bin, rule.from)) {
        pkg.bin[rule.to] = pkg.bin[rule.from];
        delete pkg.bin[rule.from];
        replacements += 1;
      }
      for (const key of Object.keys(pkg.bin)) {
        if (pkg.bin[key] === rule.from) {
          pkg.bin[key] = rule.to;
          replacements += 1;
        }
      }
    }
  }

  return { pkg, replacements };
}

function classify(token, rule, context = {}) {
  void context;
  return token === rule.from ? 'match' : 'unclassified';
}

function listMatches(pkgObject, rule, context = {}) {
  void context;
  const matches = [];
  for (const field of rule.fields || []) {
    if (field === 'name' && pkgObject.name === rule.from) {
      matches.push({ from: rule.from, to: rule.to, line: 0, col: 0, classification: 'rename' });
    }
    if (field === 'bin' && typeof pkgObject.bin === 'string' && pkgObject.bin === rule.from) {
      matches.push({ from: rule.from, to: rule.to, line: 0, col: 0, classification: 'rename' });
    } else if (field === 'bin' && pkgObject.bin && typeof pkgObject.bin === 'object' && !Array.isArray(pkgObject.bin)) {
      if (Object.prototype.hasOwnProperty.call(pkgObject.bin, rule.from)) {
        matches.push({ from: rule.from, to: rule.to, line: 0, col: 0, classification: 'rename' });
      }
      for (const value of Object.values(pkgObject.bin)) {
        if (value === rule.from) {
          matches.push({ from: rule.from, to: rule.to, line: 0, col: 0, classification: 'rename' });
        }
      }
    }
  }
  return matches;
}

module.exports = { applies, classify, apply, listMatches };
