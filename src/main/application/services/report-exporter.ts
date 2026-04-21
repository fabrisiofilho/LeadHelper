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

// Project colors
const PRIMARY = [37, 99, 235]; // #2563EB
const TEXT_DARK = [15, 23, 42]; // #0F172A
const TEXT_MUTED = [148, 163, 184]; // #94A3B8
const ROW_ALT = [248, 250, 252]; // #F8FAFC

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

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEXT_DARK);
      doc.text('Relatório Azure DevOps', 14, 15);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_MUTED);
      doc.text(`Período: ${formatPeriod(period)}`, 14, 21);
      doc.text(
        `Total de itens: ${items.length}  ·  Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
        14,
        26,
      );

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
        startY: 31,
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          lineWidth: 0,
          textColor: TEXT_DARK,
        },
        headStyles: {
          fillColor: PRIMARY,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7,
          cellPadding: 3,
        },
        alternateRowStyles: { fillColor: ROW_ALT },
        tableLineWidth: 0,
        theme: 'plain',
        didParseCell: (data) => {
          // Remove all borders
          data.cell.styles.lineWidth = 0;
        },
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
