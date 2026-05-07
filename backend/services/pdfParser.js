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
