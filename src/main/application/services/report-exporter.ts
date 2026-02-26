import { dialog } from 'electron';
import * as fs from 'fs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import type {
  ReportItem,
  ReportPeriod,
  ExportResult,
} from '@shared/interfaces/config/index.types';

const PDF_COLUMNS = [
  'ID',
  'Título',
  'Tipo',
  'Estado',
  'Responsável',
  'Projeto',
  'Story Points',
];

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

export class ReportExporter {
  async exportPdf(
    items: ReportItem[],
    period: ReportPeriod,
  ): Promise<ExportResult> {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Exportar Relatório PDF',
        defaultPath: `relatorio-azure-devops-${formatPeriod(period).replace(/\//g, '-')}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });

      if (result.canceled || !result.filePath) {
        return { success: false };
      }

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      doc.setFontSize(16);
      doc.text('Relatório Azure DevOps', 14, 15);

      doc.setFontSize(10);
      doc.text(`Período: ${formatPeriod(period)}`, 14, 22);
      doc.text(`Total de itens: ${items.length}`, 14, 28);

      const tableHead = [PDF_COLUMNS];
      const tableBody = items.map((item) => [
        String(item.id),
        item.title ?? '',
        item.type ?? '',
        item.status ?? '',
        item.assignee ?? '',
        item.project ?? '',
        item.storyPoints != null ? String(item.storyPoints) : '',
      ]);

      autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: 33,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
        },
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
