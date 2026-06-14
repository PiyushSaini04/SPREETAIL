import csvParser from 'csv-parser';
import { Readable } from 'stream';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import prisma from '../config/prisma.js';
import { SplitType } from '@prisma/client';
import AppError from '../utils/AppError.js';

dayjs.extend(customParseFormat);

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

function parseDate(raw) {
  const formats = [
    'YYYY-MM-DD',
    'DD/MM/YYYY',
    'MM/DD/YYYY',
    'MMM D',
    'MMM DD',
  ];
  const cleaned = raw.trim();
  if (/^[A-Za-z]{3}\s+\d{1,2}$/.test(cleaned)) {
    const d = dayjs(`${cleaned} 2026`, 'MMM D YYYY');
    if (d.isValid()) return { date: d.toDate(), format: 'MMM D', anomaly: null };
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) {
    const [a, b, y] = cleaned.split('/');
    const aNum = parseInt(a), bNum = parseInt(b);
    if (aNum > 12 && bNum <= 12) {
      return { date: dayjs(`${y}-${b}-${a}`, 'YYYY-MM-DD').toDate(), format: 'DD/MM/YYYY', anomaly: null };
    } else if (bNum > 12 && aNum <= 12) {
      return { date: dayjs(`${y}-${a}-${b}`, 'YYYY-MM-DD').toDate(), format: 'MM/DD/YYYY', anomaly: null };
    } else {
      return { date: null, format: 'AMBIGUOUS', anomaly: 'Ambiguous Date' };
    }
  }
  for (const fmt of formats) {
    const d = dayjs(cleaned, fmt, true);
    if (d.isValid()) return { date: d.toDate(), format: fmt, anomaly: null };
  }
  return { date: null, format: 'UNKNOWN', anomaly: 'Invalid Date' };
}

function parseSplitWith(raw) {
  if (!raw || !raw.trim()) return [];
  return raw.split(';').map(n => normalizeName(n.trim())).filter(Boolean);
}

function parseSplitDetails(raw) {
  if (!raw || !raw.trim()) return {};
  const result = {};
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

export const previewImport = async (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    Readable.from(fileBuffer)
      .pipe(csvParser())
      .on('data', (row) => rows.push(row))
      .on('end', async () => {
        try {
          const processedData = await processPreviewRows(rows);
          resolve(processedData);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
};

const processPreviewRows = async (rows) => {
  const anomalies = [];
  const processedRows = [];
  const summary = { total: rows.length, valid: 0, anomalies: 0 };
  const seenKeys = new Set();
  
  // Find all DB users
  const dbUsers = await prisma.user.findMany();
  const dbUserMap = dbUsers.reduce((acc, u) => {
    acc[u.name.toLowerCase()] = u;
    return acc;
  }, {});

  let rowId = 1;

  for (const row of rows) {
    const description = row['description']?.trim() ?? '';
    const rawAmount = row['amount']?.replace(/,/g, '').trim() ?? '';
    const rawCurrency = row['currency']?.trim().toUpperCase() || 'INR';
    const rawDate = row['date']?.trim() ?? '';
    const rawPaidBy = row['paid_by']?.trim() ?? '';
    const splitType = row['split_type']?.trim().toLowerCase() ?? '';
    const splitWithRaw = row['split_with']?.trim() ?? '';
    const notes = row['notes']?.trim() ?? '';
    
    let amount = parseFloat(rawAmount);
    let issueType = null;
    let suggestedAction = 'Import Row';
    let anomalyDetails = [];
    
    // 1. Negative amounts
    if (amount < 0) {
      issueType = 'Negative Amount';
      suggestedAction = 'Reject Row';
      anomalyDetails.push(`Amount ₹${amount} is negative. Expense amounts must be > 0.`);
    }

    // 2. Dates
    const { date, format, anomaly: dateAnomaly } = parseDate(rawDate);
    if (dateAnomaly === 'Ambiguous Date') {
      issueType = 'Ambiguous Date';
      suggestedAction = 'Require Format Selection';
      anomalyDetails.push(`Date "${rawDate}" is ambiguous (could be DD/MM or MM/DD).`);
    } else if (!date) {
      issueType = 'Invalid Date';
      suggestedAction = 'Reject Row';
      anomalyDetails.push(`Date "${rawDate}" could not be parsed.`);
    }

    // 3. Duplicates
    const payerName = normalizeName(rawPaidBy);
    if (date && payerName && amount) {
      const dupeKey = `${date.toISOString()}|${payerName}|${amount}|${description}`;
      if (seenKeys.has(dupeKey)) {
        issueType = 'Duplicate';
        suggestedAction = 'Skip Duplicate';
        anomalyDetails.push(`Exact duplicate detected for ${description}.`);
      } else {
        seenKeys.add(dupeKey);
      }
    }

    // 4. Settlements as Expenses
    if (!splitType && amount > 0 && !issueType) {
      const members = parseSplitWith(splitWithRaw);
      if (members.length === 1) {
        issueType = 'Settlement';
        suggestedAction = 'Import as Settlement';
        anomalyDetails.push(`No split type. Seems like ${payerName} paid ${members[0]}.`);
      }
    }

    // 5. Missing / Unknown Users
    if (!payerName) {
      anomalyDetails.push(`Missing Payer for expense: ${description}`);
      if (!issueType) { issueType = 'Missing Payer'; suggestedAction = 'Reject Row'; }
    } else if (!dbUserMap[payerName.toLowerCase()]) {
       anomalyDetails.push(`Unknown payer "${payerName}".`);
       if (!issueType) { issueType = 'Unknown User'; suggestedAction = 'Create User'; }
    }

    const processedRow = {
      id: rowId++,
      originalRow: row,
      parsed: {
        description,
        amount,
        currency: rawCurrency,
        date: date ? date.toISOString() : null,
        paidBy: payerName,
        splitType,
        splitWith: parseSplitWith(splitWithRaw),
        splitDetails: parseSplitDetails(row['split_details']?.trim() ?? ''),
        notes
      },
      hasAnomaly: issueType !== null || anomalyDetails.length > 0,
      issueType,
      anomalyDetails,
      suggestedAction,
      userDecision: issueType ? null : 'Approve' // If no issue, auto approve
    };

    if (processedRow.hasAnomaly) {
      anomalies.push(processedRow);
      summary.anomalies++;
    } else {
      summary.valid++;
    }
    
    processedRows.push(processedRow);
  }

  // Detect USD presence
  const hasUSD = processedRows.some(r => r.parsed.currency === 'USD');

  return { summary, rows: processedRows, anomalies, hasUSD };
};

export const confirmImport = async (groupId, rows, exchangeRate) => {
  let importedCount = 0;
  let skippedCount = 0;
  let settlementsCount = 0;

  // We fetch users to map name to ID
  let dbUsers = await prisma.user.findMany();
  let userMap = dbUsers.reduce((acc, u) => {
    acc[u.name.toLowerCase()] = u.id;
    return acc;
  }, {});
  
  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const decision = row.userDecision || (row.suggestedAction === 'Import as Settlement' ? 'Import as Settlement' : 'Approve');

      if (decision === 'Skip Row' || decision === 'Reject Row') {
        skippedCount++;
        continue;
      }
      
      const p = row.parsed;

      if (!p.paidBy) {
        throw new AppError(`Cannot import expense "${p.description || 'Unknown'}" because the payer is missing.`, 400);
      }
      if (isNaN(p.amount) || p.amount < 0) {
        throw new AppError(`Invalid amount for expense "${p.description || 'Unknown'}".`, 400);
      }
      
      // Auto-create missing users if approved
      if (p.paidBy && !userMap[p.paidBy.toLowerCase()]) {
        const newUser = await tx.user.create({
          data: { name: p.paidBy, email: `${p.paidBy.toLowerCase()}@splitwise.demo`, passwordHash: 'hashed' }
        });
        userMap[p.paidBy.toLowerCase()] = newUser.id;
        
        // Add to group
        await tx.groupMember.create({
          data: { groupId, userId: newUser.id }
        });
      }
      
      for (const member of p.splitWith) {
        if (!userMap[member.toLowerCase()]) {
          const newUser = await tx.user.create({
            data: { name: member, email: `${member.toLowerCase()}@splitwise.demo`, passwordHash: 'hashed' }
          });
          userMap[member.toLowerCase()] = newUser.id;
          await tx.groupMember.create({
            data: { groupId, userId: newUser.id }
          });
        }
      }
      
      let finalAmountInr = p.amount;
      if (p.currency === 'USD') {
        finalAmountInr = p.amount * exchangeRate;
      }

      if (decision === 'Import as Settlement') {
        const receiverId = userMap[p.splitWith[0]?.toLowerCase()];
        if (!receiverId) throw new AppError(`Settlement "${p.description}" requires a valid receiver.`, 400);

        await tx.settlement.create({
          data: {
            groupId,
            paidById: userMap[p.paidBy.toLowerCase()],
            paidToId: receiverId,
            amount: finalAmountInr,
            note: p.notes || p.description
          }
        });
        settlementsCount++;
        importedCount++;
        continue;
      }

      // Import as Expense
      let finalSplitType = SplitType.EQUAL;
      if (p.splitType === 'unequal') finalSplitType = SplitType.UNEQUAL;
      if (p.splitType === 'percentage') finalSplitType = SplitType.PERCENTAGE;
      if (p.splitType === 'share') finalSplitType = SplitType.SHARES;

      // Handle split amounts
      let splits = [];
      const members = p.splitWith;
      if (finalSplitType === SplitType.EQUAL) {
        const share = Math.round((finalAmountInr / members.length) * 100) / 100;
        splits = members.map(name => ({ userId: userMap[name.toLowerCase()], amountOwed: share }));
      } else if (finalSplitType === SplitType.UNEQUAL) {
        splits = members.map(name => ({ userId: userMap[name.toLowerCase()], amountOwed: p.splitDetails[name] ?? 0 }));
      } else if (finalSplitType === SplitType.PERCENTAGE) {
        splits = members.map(name => ({
          userId: userMap[name.toLowerCase()],
          amountOwed: Math.round(((p.splitDetails[name] ?? 0) / 100 * finalAmountInr) * 100) / 100,
          percentage: p.splitDetails[name] ?? 0
        }));
      } else if (finalSplitType === SplitType.SHARES) {
        const totalShares = Object.values(p.splitDetails).reduce((s, v) => s + v, 0);
        splits = members.map(name => ({
          userId: userMap[name.toLowerCase()],
          amountOwed: Math.round(((p.splitDetails[name] ?? 1) / totalShares * finalAmountInr) * 100) / 100,
          shares: p.splitDetails[name] ?? 1
        }));
      }

      await tx.expense.create({
        data: {
          groupId,
          description: p.description,
          amountInInr: finalAmountInr,
          originalAmount: p.currency === 'USD' ? p.amount : null,
          currency: p.currency,
          exchangeRate: p.currency === 'USD' ? exchangeRate : null,
          expenseDate: p.date ? new Date(p.date) : new Date(),
          createdById: userMap[p.paidBy.toLowerCase()],
          paidById: userMap[p.paidBy.toLowerCase()],
          splitType: finalSplitType,
          splits: {
            create: splits
          }
        }
      });
      importedCount++;
    }
  });

  return { importedCount, skippedCount, settlementsCount };
};
