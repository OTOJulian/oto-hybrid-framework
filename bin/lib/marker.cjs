'use strict';
const fs = require('node:fs');

const OPEN_MARKER = '<!-- OTO Configuration -->';
const CLOSE_MARKER = '<!-- /OTO Configuration -->';

function injectMarkerBlock(filePath, openMarker, closeMarker, body) {
  const block = `${openMarker}\n${body.trim()}\n${closeMarker}`;
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, block + '\n');
    return;
  }
  const existing = fs.readFileSync(filePath, 'utf8');
  const openIdx = existing.indexOf(openMarker);
  const closeIdx = existing.indexOf(closeMarker);
  if (openIdx !== -1 && closeIdx !== -1) {
    const before = existing.substring(0, openIdx).trimEnd();
    const after = existing.substring(closeIdx + closeMarker.length).trimStart();
    let newContent = '';
    if (before) newContent += before + '\n\n';
    newContent += block;
    if (after) newContent += '\n\n' + after;
    fs.writeFileSync(filePath, newContent + '\n');
    return;
  }
  fs.writeFileSync(filePath, existing.trimEnd() + '\n\n' + block + '\n');
}

function removeMarkerBlock(filePath, openMarker, closeMarker) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const openIdx = content.indexOf(openMarker);
  const closeIdx = content.indexOf(closeMarker);
  if (openIdx === -1 || closeIdx === -1) return;
  const before = content.substring(0, openIdx).trimEnd();
  const after = content.substring(closeIdx + closeMarker.length).trimStart();
  const cleaned = (before + (before && after ? '\n\n' : '') + after).trim();
  if (!cleaned) fs.unlinkSync(filePath);
  else fs.writeFileSync(filePath, cleaned + '\n');
}

function findUpstreamMarkers(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const markers = [];
  if (content.includes('<!-- GSD Configuration')) markers.push('GSD');
  if (content.includes('<EXTREMELY_IMPORTANT>You have superpowers.')) markers.push('Superpowers');
  if (content.match(/superpowers-codex bootstrap/i)) markers.push('Superpowers-Codex');
  return markers;
}

module.exports = {
  CLOSE_MARKER,
  OPEN_MARKER,
  findUpstreamMarkers,
  injectMarkerBlock,
  removeMarkerBlock,
};
