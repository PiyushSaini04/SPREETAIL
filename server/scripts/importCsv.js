/**
 * importCsv.js
 *
 * Reads server/data/expenses.csv, detects data anomalies, inserts clean
 * data into the database via Prisma, and writes an import_report.md to
 * the project root.
 *
 * Run: node server/scripts/importCsv.js
 * (from the D:\SPREETAIL directory with DATABASE_URL in server/.env)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { createReadStream } from 'fs';
import csvParser from 'csv-parser';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import { PrismaClient, SplitType } from '@prisma/client';
import { config } from 'dotenv';

// ── Bootstrap ──────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
config({ path: path.join(__dirname, '..', '.env') });
dayjs.extend(customParseFormat);

const prisma = new PrismaClient();

// ── Constants ──────────────────────────────────────────────────────────────────
const CSV_PATH    = path.join(__dirname, '..', 'data', 'expenses.csv');
const REPORT_PATH = path.join(__dirname, '..', '..', 'import_report.md');
const USD_TO_INR  = 83;   // Fixed exchange rate
const DEFAULT_PASSWORD = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKkSoKzle'; // "password123" bcrypt hash

// ── Name normaliser ────────────────────────────────────────────────────────────
// Maps all raw name variants to a canonical name
const NAME_MAP = {
  'aisha':   'Aisha',
  'rohan':   'Rohan',
  'priya':   'Priya',
  'priya s': 'Priya',
  'meera':   'Meera',
  'dev':     'Dev',
  'sam':     'Sam',
  "dev's friend kabir": 'Kabir',
  'kabir':   'Kabir',
};

function normalizeName(raw) {
  if (!raw || !raw.trim()) return null;
  const key = raw.trim().toLowerCase();
  return NAME_MAP[key] || (raw.trim().split(' ').map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' '));
}

// ── Date parser ────────────────────────────────────────────────────────────────
function parseDate(raw) {
  const formats = [
    'YYYY-MM-DD',
    'DD/MM/YYYY',
    'MM/DD/YYYY',
    'MMM D',
    'MMM DD',
  ];
  const cleaned = raw.trim();
  // "Mar 14" — append year
  if (/^[A-Za-z]{3}\s+\d{1,2}$/.test(cleaned)) {
    const d = dayjs(`${cleaned} 2026`, 'MMM D YYYY');
    if (d.isValid()) return { date: d.toDate(), anomaly: `Date "${raw}" had no year — assumed 2026` };
  }
  // Ambiguous DD/MM vs MM/DD (e.g. 04/05/2026)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) {
    const [a, b, y] = cleaned.split('/');
    const aNum = parseInt(a), bNum = parseInt(b);
    // If first segment > 12 it must be a day, otherwise assume DD/MM (Indian locale)
    const d = dayjs(`${y}-${b}-${a}`, 'YYYY-MM-DD');
    const anomaly = aNum > 12
      ? null
      : `Date "${raw}" is ambiguous (DD/MM vs MM/DD) — treated as DD/MM/YYYY (Indian locale)`;
    return { date: d.toDate(), anomaly };
  }
  for (const fmt of formats) {
    const d = dayjs(cleaned, fmt, true);
    if (d.isValid()) return { date: d.toDate(), anomaly: null };
  }
  return { date: null, anomaly: `Date "${raw}" could not be parsed — row skipped` };
}

// ── Amount parser ──────────────────────────────────────────────────────────────
function parseAmount(raw) {
  // Remove commas (e.g. "1,200"), trim whitespace
  const cleaned = raw.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return { amount: null, anomaly: `Amount "${raw}" is not a number — row skipped` };
  if (num === 0)  return { amount: null, anomaly: `Amount "${raw}" is zero — row skipped` };
  if (num < 0)   return { amount: null, anomaly: `Amount "${raw}" is negative — row skipped (refund recorded separately)` };
  const rounded = Math.round(num * 100) / 100;
  const anomaly = rounded !== num ? `Amount "${raw}" rounded to ${rounded}` : null;
  return { amount: rounded, anomaly };
}

// ── Currency normaliser ────────────────────────────────────────────────────────
function normalizeCurrency(amount, currency, description) {
  if (!currency || !currency.trim()) {
    return { amountInr: amount, anomaly: `Currency missing for "${description}" — defaulted to INR` };
  }
  const cur = currency.trim().toUpperCase();
  if (cur === 'INR') return { amountInr: amount, anomaly: null };
  if (cur === 'USD') {
    const converted = Math.round(amount * USD_TO_INR * 100) / 100;
    return { amountInr: converted, anomaly: `Currency USD converted to INR at 1 USD = ₹${USD_TO_INR} (₹${converted})` };
  }
  return { amountInr: amount, anomaly: `Unknown currency "${currency}" — kept as-is` };
}

// ── Split parser ───────────────────────────────────────────────────────────────
function parseSplitWith(raw) {
  if (!raw || !raw.trim()) return [];
  return raw.split(';').map(n => normalizeName(n.trim())).filter(Boolean);
}

function parseSplitDetails(raw) {
  if (!raw || !raw.trim()) return {};
  const result = {};
  // "Rohan 700; Priya 400; Meera 400" or "Aisha 30%; Rohan 30%"
  const parts = raw.split(';');
  for (const part of parts) {
    const match = part.trim().match(/^(.+?)\s+([\d.]+)%?$/);
    if (match) {
      const name = normalizeName(match[1].trim());
      const val  = parseFloat(match[2]);
      if (name) result[name] = val;
    }
  }
  return result;
}

// ── Percentage fixer ───────────────────────────────────────────────────────────
function fixPercentages(details) {
  const total = Object.values(details).reduce((s, v) => s + v, 0);
  if (Math.abs(total - 100) < 0.01) return { fixed: details, anomaly: null };
  const normalized = {};
  for (const [k, v] of Object.entries(details)) {
    normalized[k] = Math.round((v / total) * 10000) / 100;
  }
  return { fixed: normalized, anomaly: `Percentages summed to ${total}% — normalized to 100%` };
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const report   = { processed: 0, skipped: 0, settlements: 0, anomalies: [] };
  const rows     = [];
  const userCache = {}; // name -> User

  // Collect users first pass
  const allNames = new Set();

  // Read CSV
  await new Promise((resolve, reject) => {
    createReadStream(CSV_PATH)
      .pipe(csvParser())
      .on('data', row => rows.push(row))
      .on('end',  resolve)
      .on('error', reject);
  });

  console.log(`📂 Read ${rows.length} rows from CSV`);

  // Collect all names
  for (const row of rows) {
    const payer   = normalizeName(row['paid_by']);
    const members = parseSplitWith(row['split_with']);
    if (payer)   allNames.add(payer);
    for (const m of members) allNames.add(m);
  }

  // Upsert all users
  console.log(`👤 Upserting ${allNames.size} users: ${[...allNames].join(', ')}`);
  for (const name of allNames) {
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}@splitwise.demo`;
    const user  = await prisma.user.upsert({
      where:  { email },
      update: {},
      create: { name, email, passwordHash: DEFAULT_PASSWORD },
    });
    userCache[name] = user;
  }

  // Upsert one Group for the flat
  const adminUser = userCache['Aisha'];
  const group = await prisma.group.upsert({
    where:  { id: 'flat-group-001' },
    update: {},
    create: {
      id:        'flat-group-001',
      name:      'The Flat',
      createdBy: adminUser.id,
      members:   {
        create: Object.values(userCache).map(u => ({
          userId: u.id,
          role:   u.id === adminUser.id ? 'ADMIN' : 'MEMBER',
        })),
      },
    },
  });
  console.log(`🏠 Group "The Flat" ready (id: ${group.id})`);

  // Duplicate tracker: date+payer+amount
  const seenKeys = new Set();
  // Track inserted expense descriptions for near-duplicates
  const seenDescriptions = new Map(); // normalised description -> row

  for (const row of rows) {
    const rawDate        = row['date']?.trim() ?? '';
    const description    = row['description']?.trim() ?? '';
    const rawPaidBy      = row['paid_by']?.trim() ?? '';
    const rawAmount      = row['amount']?.trim() ?? '';
    const currency       = row['currency']?.trim() ?? '';
    const splitType      = row['split_type']?.trim().toLowerCase() ?? '';
    const splitWithRaw   = row['split_with']?.trim() ?? '';
    const splitDetailsRaw= row['split_details']?.trim() ?? '';
    const notes          = row['notes']?.trim() ?? '';

    const rowAnomalies = [];

    // ── Date ────────────────────────────────────────────────────────────────
    const { date, anomaly: dateAnomaly } = parseDate(rawDate);
    if (dateAnomaly) rowAnomalies.push(dateAnomaly);
    if (!date) {
      report.anomalies.push({ row: description, issues: rowAnomalies, action: 'SKIPPED' });
      report.skipped++;
      continue;
    }

    // ── Amount ──────────────────────────────────────────────────────────────
    const { amount: rawAmountNum, anomaly: amountAnomaly } = parseAmount(rawAmount);
    if (amountAnomaly) rowAnomalies.push(amountAnomaly);
    if (rawAmountNum === null) {
      report.anomalies.push({ row: description, issues: rowAnomalies, action: 'SKIPPED' });
      report.skipped++;
      continue;
    }

    // ── Currency ────────────────────────────────────────────────────────────
    const { amountInr, anomaly: currencyAnomaly } = normalizeCurrency(rawAmountNum, currency, description);
    if (currencyAnomaly) rowAnomalies.push(currencyAnomaly);

    // ── Payer ───────────────────────────────────────────────────────────────
    const payerName = normalizeName(rawPaidBy);
    if (!payerName) {
      rowAnomalies.push(`Missing payer for "${description}" — row skipped`);
      report.anomalies.push({ row: description, issues: rowAnomalies, action: 'SKIPPED' });
      report.skipped++;
      continue;
    }
    const payer = userCache[payerName];
    if (!payer) {
      rowAnomalies.push(`Unknown payer "${payerName}" — row skipped`);
      report.anomalies.push({ row: description, issues: rowAnomalies, action: 'SKIPPED' });
      report.skipped++;
      continue;
    }

    // ── Settlement detection ────────────────────────────────────────────────
    if (!splitType) {
      // Treat as settlement
      const members = parseSplitWith(splitWithRaw);
      if (members.length === 1) {
        const receiver = userCache[members[0]];
        if (receiver) {
          await prisma.settlement.create({
            data: {
              groupId:  group.id,
              paidById: payer.id,
              paidToId: receiver.id,
              amount:   amountInr,
              note:     notes || description,
            },
          });
          rowAnomalies.push(`No split_type — treated as Settlement (${payerName} → ${members[0]})`);
          report.anomalies.push({ row: description, issues: rowAnomalies, action: 'SETTLEMENT' });
          report.settlements++;
          continue;
        }
      }
    }

    // ── Duplicate detection ─────────────────────────────────────────────────
    const dupeKey = `${rawDate}|${payerName}|${rawAmountNum}`;
    if (seenKeys.has(dupeKey)) {
      rowAnomalies.push(`Exact duplicate (same date, payer, amount) — skipped`);
      report.anomalies.push({ row: description, issues: rowAnomalies, action: 'SKIPPED (DUPLICATE)' });
      report.skipped++;
      continue;
    }
    seenKeys.add(dupeKey);

    // ── Near-duplicate detection (same description, different payer/amount) ─
    const descKey = description.toLowerCase().replace(/\s+/g, ' ');
    if (seenDescriptions.has(descKey)) {
      rowAnomalies.push(`Near-duplicate description "${description}" — kept (different payer or amount, both logged)`);
    }
    seenDescriptions.set(descKey, row);

    // ── Split type ──────────────────────────────────────────────────────────
    let finalSplitType = SplitType.EQUAL;
    if (splitType === 'unequal')    finalSplitType = SplitType.UNEQUAL;
    if (splitType === 'percentage') finalSplitType = SplitType.PERCENTAGE;
    if (splitType === 'share')      finalSplitType = SplitType.SHARES;

    // Handle "equal but has share details" conflict
    if (splitType === 'equal' && splitDetailsRaw) {
      rowAnomalies.push(`split_type is "equal" but split_details are present — treating as EQUAL (details ignored)`);
    }

    // ── Members ─────────────────────────────────────────────────────────────
    let members = parseSplitWith(splitWithRaw);

    // Filter out non-existent or ad-hoc members (e.g. Kabir in Parasailing)
    const validMembers = members.filter(m => userCache[m]);
    const unknownMembers = members.filter(m => !userCache[m]);
    if (unknownMembers.length > 0) {
      rowAnomalies.push(`Unknown member(s) "${unknownMembers.join(', ')}" — excluded from split`);
      members = validMembers;
    }

    // Meera still in list after she moved out (April expenses)
    const expDate = dayjs(date);
    if (expDate.isAfter(dayjs('2026-03-28')) && members.includes('Meera')) {
      members = members.filter(m => m !== 'Meera');
      rowAnomalies.push(`Meera in split_with but she moved out — removed from split`);
    }

    if (members.length === 0) {
      rowAnomalies.push(`No valid members for split — row skipped`);
      report.anomalies.push({ row: description, issues: rowAnomalies, action: 'SKIPPED' });
      report.skipped++;
      continue;
    }

    // ── Split details ───────────────────────────────────────────────────────
    const splitDetails = parseSplitDetails(splitDetailsRaw);

    // Build splits array
    let splits = [];

    if (finalSplitType === SplitType.EQUAL) {
      const share = Math.round((amountInr / members.length) * 100) / 100;
      splits = members.map(name => ({ name, amountOwed: share }));

    } else if (finalSplitType === SplitType.UNEQUAL) {
      const sum = Object.values(splitDetails).reduce((s, v) => s + v, 0);
      if (Math.abs(sum - amountInr) > 0.5) {
        rowAnomalies.push(`Unequal split sum ₹${sum} ≠ expense ₹${amountInr} — kept as specified`);
      }
      splits = members.map(name => ({ name, amountOwed: splitDetails[name] ?? 0 }));

    } else if (finalSplitType === SplitType.PERCENTAGE) {
      const { fixed, anomaly: pctAnomaly } = fixPercentages(splitDetails);
      if (pctAnomaly) rowAnomalies.push(pctAnomaly);
      splits = members.map(name => ({
        name,
        amountOwed:  Math.round((fixed[name] ?? 0) / 100 * amountInr * 100) / 100,
        percentage:  fixed[name] ?? 0,
      }));

    } else if (finalSplitType === SplitType.SHARES) {
      const totalShares = Object.values(splitDetails).reduce((s, v) => s + v, 0);
      splits = members.map(name => {
        const sh = splitDetails[name] ?? 1;
        return {
          name,
          amountOwed: Math.round((sh / totalShares) * amountInr * 100) / 100,
          shares: sh,
        };
      });
    }

    // ── Insert Expense ──────────────────────────────────────────────────────
    try {
      await prisma.expense.create({
        data: {
          groupId:     group.id,
          description,
          amount:      amountInr,
          createdById: payer.id,
          paidById:    payer.id,
          splitType:   finalSplitType,
          createdAt:   date,
          splits: {
            create: splits.map(s => ({
              userId:     userCache[s.name].id,
              amountOwed: s.amountOwed,
              percentage: s.percentage ?? null,
              shares:     s.shares     ?? null,
            })),
          },
        },
      });

      report.processed++;
      if (rowAnomalies.length > 0) {
        report.anomalies.push({ row: description, issues: rowAnomalies, action: 'IMPORTED WITH FIXES' });
      }
    } catch (e) {
      rowAnomalies.push(`DB insert error: ${e.message}`);
      report.anomalies.push({ row: description, issues: rowAnomalies, action: 'SKIPPED (DB ERROR)' });
      report.skipped++;
    }
  }

  console.log(`\n✅ Import complete:`);
  console.log(`   Expenses imported : ${report.processed}`);
  console.log(`   Settlements       : ${report.settlements}`);
  console.log(`   Rows skipped      : ${report.skipped}`);
  console.log(`   Anomalies logged  : ${report.anomalies.length}`);

  // ── Write Import Report ─────────────────────────────────────────────────────
  const lines = [
    '# Import Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `CSV File: \`server/data/expenses.csv\``,
    `Exchange Rate Used: 1 USD = ₹${USD_TO_INR}`,
    '',
    '## Summary',
    '',
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Total CSV rows | ${rows.length} |`,
    `| Expenses imported | ${report.processed} |`,
    `| Settlements imported | ${report.settlements} |`,
    `| Rows skipped | ${report.skipped} |`,
    `| Anomalies detected | ${report.anomalies.length} |`,
    '',
    '## Anomaly Log',
    '',
    '| Row / Description | Anomaly Detected | Action Taken |',
    '|---|---|---|',
    ...report.anomalies.flatMap(a =>
      a.issues.map((issue, i) =>
        `| ${i === 0 ? a.row : ''} | ${issue} | ${i === 0 ? a.action : ''} |`
      )
    ),
  ];

  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
  console.log(`\n📄 Import report written to: import_report.md`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('❌ Import failed:', e);
  prisma.$disconnect();
  process.exit(1);
});
