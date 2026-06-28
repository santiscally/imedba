// Export a XLSX (Excel nativo) usando SheetJS. Reemplazó al CSV original — abre
// directo en Excel sin diálogo de import, mantiene tipos numéricos y soporta
// acentos sin tema de encoding. La API pública (`exportToCsv`/`dateStamp`) se
// mantiene para no romper los 13 callsites de las grillas.
//
// xlsx pesa ~280 KB → import dinámico para no cargarlo en la ruta principal.
// Solo se descarga cuando el usuario hace click en "Exportar".

export interface CsvColumn<T> {
  label: string
  value: (row: T) => string | number | null | undefined
}

export async function exportToCsv<T>(filename: string, rows: T[], cols: CsvColumn<T>[]): Promise<void> {
  const XLSX = await import('xlsx')

  const aoa: Array<Array<string | number>> = [
    cols.map(c => c.label),
    ...rows.map(r => cols.map(c => {
      const v = c.value(r)
      return v == null ? '' : v
    })),
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  ws['!cols'] = cols.map(c => ({ wch: Math.max(12, c.label.length + 2) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')

  const stem = filename.replace(/\.(csv|xlsx)$/i, '')
  XLSX.writeFile(wb, `${stem}.xlsx`)
}

// Helper para timestamp en el nombre del archivo (ej. cuotas-2026-06-12.xlsx).
export function dateStamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
