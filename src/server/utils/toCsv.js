/**
 * Convert an array of plain objects to a CSV string.
 * Handles commas, quotes, and newlines inside values.
 * Returns an empty string for an empty array.
 *
 * @param {Object[]} rows
 * @returns {string} CSV string with header row
 */
function toCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return '';

  const headers = Object.keys(rows[0]);

  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

module.exports = toCsv;
