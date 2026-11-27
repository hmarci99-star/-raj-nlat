// Egyszerű CSV-olvasó: vessző az elválasztó, idézőjeles mezőkben lehet vessző
// és duplázott idézőjel ("").

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}

// A munkadíj-táblázat CSV-jéből kód szerint kereshető tételeket készít.
export function parseMunkadijTabla(text) {
  const [, ...rows] = parseCsv(text.replace(/^﻿/, ''));
  const tabla = new Map();
  for (const [kod, tetel, egyseg, ar, megjegyzes = ''] of rows) {
    const egysegar = Number(ar);
    if (!kod || !Number.isFinite(egysegar)) {
      throw new Error(`Hibás sor a munkadíj-táblázatban: ${[kod, tetel, ar].join(', ')}`);
    }
    tabla.set(kod, { kod, tetel, egyseg, egysegar, megjegyzes });
  }
  return tabla;
}
