/**
 * Generic array-of-objects → CSV string converter.
 * Handles commas, quotes, and newlines in values.
 */

function escapeField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function toCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(escapeField).join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeField(row[h])).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

module.exports = { toCsv };
