// Export a CSV que abre directo en Excel (UTF-8 con BOM + separador ';' para es-AR).
// Sin dependencias externas — se arma el CSV y se dispara la descarga vía Blob.
// Reunión 2026-06-05 §3.9: exportar tablas (Cuotas/Pagos, Presupuesto) para backup/informe.

export interface CsvColumn<T> {
  label: string
  value: (row: T) => string | number | null | undefined
}

function escape(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportToCsv<T>(filename: string, rows: T[], cols: CsvColumn<T>[]): void {
  const sep = ';'
  const header = cols.map(c => escape(c.label)).join(sep)
  const body = rows.map(r => cols.map(c => escape(c.value(r))).join(sep))
  const csv = '﻿' + [header, ...body].join('\r\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Helper para timestamp en el nombre del archivo (ej. cuotas-2026-06-08.csv).
export function dateStamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
