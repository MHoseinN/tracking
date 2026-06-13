function escapeCell(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTable(headers, rows) {
  const head = headers.map((header) => `<th>${escapeCell(header)}</th>`).join('');
  const body = rows.map((row) => (
    `<tr>${row.map((cell) => `<td>${escapeCell(cell)}</td>`).join('')}</tr>`
  )).join('');

  return `
    <table>
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

export function exportRowsToExcel({ fileName, sheetTitle, headers, rows }) {
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Tahoma, Arial, sans-serif; direction: rtl; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; }
          th { background: #e2e8f0; font-weight: 700; }
          tr:nth-child(even) td { background: #f8fafc; }
          caption { text-align: right; font-size: 18px; font-weight: bold; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <caption>${escapeCell(sheetTitle)}</caption>
        ${buildTable(headers, rows)}
      </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
