import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface ExportTable {
  headers: string[]
  rows: (string | number)[][]
}

/**
 * Trigger download file via <a download> sementara + Blob URL - TIDAK
 * ADA utility semacam ini di codebase sebelum Task 10 (dicek, gak ada
 * pola Blob/createObjectURL lain buat ditiru), jadi ditulis dari nol
 * di sini. `xlsx`/`jspdf` masing-masing punya mekanisme download
 * internal sendiri (writeFile/save), TIDAK pakai helper ini - cuma
 * dipakai buat CSV yang ditulis manual tanpa library.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * CSV ditulis manual (BUKAN lewat library xlsx) - format-nya sepele
 * (cuma escaping koma/kutip/newline), gak perlu bawa dependency xlsx
 * buat generate CSV. ﻿ (BOM) di awal - biar Excel buka file ini
 * dengan encoding UTF-8 yang benar (karakter nama Indonesia dst),
 * tanpa BOM Excel sering salah tebak encoding-nya jadi Latin-1.
 */
export function exportTableToCsv(table: ExportTable, filename: string): void {
  function escapeCell(value: string | number): string {
    const str = String(value)
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }

  const lines = [table.headers.map(escapeCell).join(','), ...table.rows.map((row) => row.map(escapeCell).join(','))]

  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, filename)
}

/** Excel (.xlsx) via library `xlsx` (SheetJS) - XLSX.writeFile trigger download sendiri, gak perlu downloadBlob(). */
export function exportTableToExcel(table: ExportTable, filename: string): void {
  const worksheet = XLSX.utils.aoa_to_sheet([table.headers, ...table.rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
  XLSX.writeFile(workbook, filename)
}

/**
 * PDF via jsPDF + jspdf-autotable - tabel flat sesuai apa yang
 * ditampilkan di layar (instruksi eksplisit tugas: JANGAN layout
 * kompleks/grid karyawan x tanggal). Orientasi landscape kalau
 * kolomnya banyak (>6) biar gak kepotong/terlalu sempit.
 */
export function exportTableToPdf(table: ExportTable, filename: string, title: string, subtitle: string): void {
  const doc = new jsPDF({ orientation: table.headers.length > 6 ? 'landscape' : 'portrait' })

  doc.setFontSize(14)
  doc.text(title, 14, 15)
  doc.setFontSize(10)
  doc.text(subtitle, 14, 22)

  autoTable(doc, {
    head: [table.headers],
    body: table.rows,
    startY: 28,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 102, 255] },
  })

  doc.save(filename)
}
