import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Use lib path directly to avoid pdf-parse's test-file side effect on import
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

/**
 * Parse a PDF buffer and return an array of { pageNumber, text } objects.
 */
export async function parsePDF(buffer) {
  const pageTexts = [];
  let pageCounter = 0;

  await pdfParse(buffer, {
    pagerender: (pageData) =>
      pageData.getTextContent().then(({ items }) => {
        pageCounter++;
        const text = items.map((i) => i.str).join(" ");
        pageTexts.push({ pageNumber: pageCounter, text });
        return text;
      }),
  });

  // fallback: pagerender may not fire in all pdfjs versions
  if (pageTexts.length === 0) {
    const data = await pdfParse(buffer);
    pageTexts.push({ pageNumber: 1, text: data.text });
  }

  return pageTexts;
}

/**
 * Parse a plain-text buffer and return it as a single page.
 */
export function parseTXT(buffer) {
  return [{ pageNumber: 1, text: buffer.toString("utf-8") }];
}

function parseCSVRows(csvText) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field.trim());
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);

  return rows;
}

/**
 * Parse a CSV buffer and return readable row text as a single page.
 */
export function parseCSV(buffer) {
  const rows = parseCSVRows(buffer.toString("utf-8"));
  if (rows.length === 0) return [{ pageNumber: 1, text: "" }];

  const headers = rows[0].map((header, index) => header || `Column ${index + 1}`);
  const dataRows = rows.slice(1);

  const text = dataRows
    .map((row, rowIndex) => {
      const values = headers.map((header, columnIndex) => {
        const value = row[columnIndex] ?? "";
        return `${header}: ${value}`;
      });
      return `Row ${rowIndex + 1}\n${values.join("\n")}`;
    })
    .join("\n\n");

  return [{ pageNumber: 1, text }];
}
