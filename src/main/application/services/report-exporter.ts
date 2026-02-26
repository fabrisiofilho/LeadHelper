import { dialog } from 'electron';
import * as fs from 'fs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import type { ReportItem, ReportPeriod, ExportResult } from '@shared/interfaces/config/index.types';

export const CSV_COLUMNS = [
  'ID',
  'Título',
  'Tipo',
  'Tipo Original',
  'Estado',
  'Responsável',
  'Projeto',
  'Area Path',
  'Iteration Path',
  'Tags',
  'Story Points',
  'Data de Criação',
  'Data de Atualização',
];

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(date?: Date): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('pt-BR');
}

function formatPeriod(period: ReportPeriod): string {
  const start = formatDate(period.startDate);
  const end = formatDate(period.endDate);
  return `${start} - ${end}`;
}

function itemToCsvRow(item: ReportItem): string {
  const fields = [
    String(item.id),
    item.title ?? '',
    item.type ?? '',
    item.originalType ?? '',
    item.status ?? '',
    item.assignee ?? '',
    item.project ?? '',
    item.areaPath ?? '',
    item.iterationPath ?? '',
    item.tags ?? '',
    item.storyPoints != null ? String(item.storyPoints) : '',
    formatDate(item.createdAt),
    formatDate(item.updatedAt),
  ];
  return fields.map(escapeCsvField).join(',');
}

export function generateCsvContent(items: ReportItem[]): string {
  const header = CSV_COLUMNS.map(escapeCsvField).join(',');
  const rows = items.map(itemToCsvRow);
  return [header, ...rows].join('\n');
}

export class ReportExporter {
  async exportCsv(items: ReportItem[], period: ReportPeriod): Promise<ExportResult> {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Exportar Relatório CSV',
        defaultPath: `relatorio-azure-devops-${formatPeriod(period).replace(/\//g, '-')}.csv`,
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      });

      if (result.canceled || !result.filePath) {
        return { success: false };
      }

      const csvContent = generateCsvContent(items);
      fs.writeFileSync(result.filePath, '\uFEFF' + csvContent, 'utf-8');

      return { success: true, filePath: result.filePath };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  async exportPdf(items: ReportItem[], period: ReportPeriod): Promise<ExportResult> {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Exportar Relatório PDF',
        defaultPath: `relatorio-azure-devops-${formatPeriod(period).replace(/\//g, '-')}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });

      if (result.canceled || !result.filePath) {
        return { success: false };
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      doc.setFontSize(16);
      doc.text('Relatório Azure DevOps', 14, 15);

      doc.setFontSize(10);
      doc.text(`Período: ${formatPeriod(period)}`, 14, 22);
      doc.text(`Total de itens: ${items.length}`, 14, 28);

      const tableHead = [CSV_COLUMNS];
      const tableBody = items.map((item) => [
        String(item.id),
        item.title ?? '',
        item.type ?? '',
        item.originalType ?? '',
        item.status ?? '',
        item.assignee ?? '',
        item.project ?? '',
        item.areaPath ?? '',
        item.iterationPath ?? '',
        item.tags ?? '',
        item.storyPoints != null ? String(item.storyPoints) : '',
        formatDate(item.createdAt),
        formatDate(item.updatedAt),
      ]);

      autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: 33,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      const pdfBuffer = doc.output('arraybuffer');
      fs.writeFileSync(result.filePath, Buffer.from(pdfBuffer));

      return { success: true, filePath: result.filePath };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }
}
