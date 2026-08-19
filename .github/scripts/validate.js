#!/usr/bin/env node
/**
 * Lightweight repository health check — no external dependencies.
 *
 * Checks:
 *  1. Every data/*.json file parses as valid JSON.
 *  2. Every record in the content collections has the fields the
 *     rest of the site relies on.
 *  3. Every root-relative link/asset reference (href="/..." or
 *     src="/...") in an .html file points at a file that exists.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
let errors = 0;

function fail(message) {
  console.error(`✗ ${message}`);
  errors += 1;
}

function ok(message) {
  console.log(`✓ ${message}`);
}

// ---------------------------------------------------------------------
// 1 & 2. JSON validity + required fields
// ---------------------------------------------------------------------
const REQUIRED_FIELDS = {
  'site.json': null, // object, not an array — checked separately
  'programs.json': ['id', 'number', 'title', 'description', 'status', 'order'],
  'activities.json': ['id', 'title', 'date', 'category', 'excerpt', 'content', 'status'],
  'articles.json': ['id', 'title', 'author', 'date', 'category', 'excerpt', 'content', 'status'],
};

for (const [file, fields] of Object.entries(REQUIRED_FIELDS)) {
  const filePath = path.join(ROOT, 'data', file);
  if (!fs.existsSync(filePath)) {
    fail(`data/${file} tidak ditemukan.`);
    continue;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    fail(`data/${file} bukan JSON valid: ${err.message}`);
    continue;
  }
  ok(`data/${file} adalah JSON valid.`);

  if (fields === null) {
    const required = ['organization', 'school', 'hero', 'contact', 'social'];
    required.forEach((key) => {
      if (!(key in data)) fail(`data/${file} kehilangan field "${key}".`);
    });
    continue;
  }

  if (!Array.isArray(data)) {
    fail(`data/${file} seharusnya berupa array.`);
    continue;
  }

  const seenIds = new Set();
  data.forEach((item, i) => {
    fields.forEach((field) => {
      if (!(field in item) || item[field] === undefined) {
        fail(`data/${file}[${i}] kehilangan field "${field}".`);
      }
    });
    if (item.id) {
      if (seenIds.has(item.id)) fail(`data/${file} memiliki id duplikat: "${item.id}".`);
      seenIds.add(item.id);
    }
    if (item.status && !['draft', 'published', 'active', 'inactive'].includes(item.status)) {
      fail(`data/${file}[${i}] memiliki status tidak dikenal: "${item.status}".`);
    }
  });
}

// ---------------------------------------------------------------------
// 3. Broken root-relative internal links / asset references
// ---------------------------------------------------------------------
function listHtmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listHtmlFiles(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const REF_PATTERN = /(?:href|src)="(\/[^"]*)"/g;

for (const htmlFile of listHtmlFiles(ROOT)) {
  const content = fs.readFileSync(htmlFile, 'utf8');
  let match;
  while ((match = REF_PATTERN.exec(content))) {
    let ref = match[1].split('#')[0].split('?')[0];
    if (!ref || ref === '/') continue;
    const target = path.join(ROOT, ref);
    if (!fs.existsSync(target)) {
      fail(`${path.relative(ROOT, htmlFile)} mereferensikan path yang tidak ada: "${match[1]}".`);
    }
  }
}
ok('Pemeriksaan tautan internal (root-relative) selesai.');

// ---------------------------------------------------------------------
if (errors > 0) {
  console.error(`\n${errors} masalah ditemukan.`);
  process.exit(1);
}
console.log('\nSemua pemeriksaan lolos.');
