/**
 * PDF: schedulePdf
 * Autor: Antonio Rafael Souza Cruz de Noronha — rafasouzacruz@gmail.com
 * Descrição: Gera PDF de escalas a partir de dados da API.
 * Entradas:
 * - title: título do documento
 * - items: array de objetos { date, endDate?, agentName, start, end, durationHours, notes? }
 * Layout:
 * - Cabeçalho com branding e título
 * - Tabela com colunas: Data, Agente, Início, Fim, Horas, Obs.
 * - Linhas alternadas, quebra de página automática, rodapé informativo
 */
const PDFDocument = require('pdfkit');

// Gera PDF de escalas com layout tabular, espaçamento adequado e inclusão de observações
function buildSchedulePDF({ title, items }) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 20 });
    const chunks = [];

    function formatBRDate(iso) {
      if (!iso) {
        return '';
      }
      const s = String(iso);
      const base = s.includes('T') ? s.slice(0, 10) : s; // suporta 'YYYY-MM-DD' e 'YYYY-MM-DDTHH:mm:ssZ'
      const [y, m, d] = base.split('-');
      return `${d}/${m}/${y}`;
    }

    // stream buffer
    doc.on('data', (d) => chunks.push(d));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // Cabeçalho
    doc.fontSize(20).fillColor('#1E40AF').text('GuardScale', 40, 40);
    doc
      .fontSize(14)
      .fillColor('#374151')
      .text(title || 'Relatório de Escalas', 40, 70);
    doc.moveDown(2);

    // Configurações da tabela
    const tableTop = doc.y;
    const rowHeightBase = 26; // altura base
    const headerHeight = 34;

    // Larguras reequilibradas (total 550) para caber em 555px (margem 20)
    const colWidths = {
      date: 75,
      agent: 260,
      start: 45,
      end: 45,
      hours: 40,
      // Removido: period
      obs: 85
    };

    const leftMargin = 20;
    const tableWidth = 555;
    let x = leftMargin;
    const colPositions = {
      date: x,
      agent: (x += colWidths.date),
      start: (x += colWidths.agent),
      end: (x += colWidths.start),
      hours: (x += colWidths.end),
      // Removido: period
      obs: (x += colWidths.hours)
    };

    // Cabeçalho da tabela
    doc
      .rect(leftMargin, tableTop, tableWidth, headerHeight)
      .fill('#F3F4F6')
      .stroke('#E5E7EB');
    doc.fillColor('#1F2937').fontSize(11).font('Helvetica-Bold');

    doc.text('Data', colPositions.date + 8, tableTop + 10, {
      width: colWidths.date - 16
    });
    doc.text('Agente', colPositions.agent + 8, tableTop + 10, {
      width: colWidths.agent - 16
    });
    doc.text('Início', colPositions.start, tableTop + 10, {
      width: colWidths.start,
      align: 'center'
    });
    doc.text('Fim', colPositions.end, tableTop + 10, {
      width: colWidths.end,
      align: 'center'
    });
    doc.text('Horas', colPositions.hours, tableTop + 10, {
      width: colWidths.hours,
      align: 'center'
    });
    // Removido: cabeçalho Turno
    doc.text('Obs.', colPositions.obs + 8, tableTop + 10, {
      width: colWidths.obs - 16
    });

    let y = tableTop + headerHeight;

    // Dados da tabela
    doc.font('Helvetica').fontSize(10);
    items.forEach((it, idx) => {
      // Textos
      const dateText =
        it.endDate && it.endDate !== it.date
          ? `${formatBRDate(it.date)} a ${formatBRDate(it.endDate)}`
          : formatBRDate(it.date);
      const agentText = String(it.agentName || 'N/A');
      const startText = String(it.start || '');
      const endText = String(it.end || '');
      const hoursText = String(it.durationHours || '');
      // Removido: periodText
      const notesText = String(it.notes || '');

      // Altura dinâmica (medindo com as mesmas larguras usadas no desenho)
      const hDate = doc.heightOfString(dateText, {
        width: colWidths.date - 12
      });
      const hAgent = doc.heightOfString(agentText, {
        width: colWidths.agent - 12
      });
      const hObs = doc.heightOfString(notesText, { width: colWidths.obs - 12 });
      const padY = 14;
      const rowHeight = Math.max(rowHeightBase, hDate, hAgent, hObs) + padY;

      // Quebra de página
      if (y + rowHeight > 770) {
        doc.addPage();
        y = 50;
      }

      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
      doc.rect(leftMargin, y, tableWidth, rowHeight).fill(bg).stroke('#E5E7EB');
      doc.fillColor('#111827');

      // Desenho das células
      doc.text(dateText, colPositions.date + 8, y + 6, {
        width: colWidths.date - 16
      });
      doc.text(agentText, colPositions.agent + 8, y + 6, {
        width: colWidths.agent - 16
      });
      doc.text(startText, colPositions.start, y + 6, {
        width: colWidths.start,
        align: 'center'
      });
      doc.text(endText, colPositions.end, y + 6, {
        width: colWidths.end,
        align: 'center'
      });
      doc.text(hoursText, colPositions.hours, y + 6, {
        width: colWidths.hours,
        align: 'center'
      });
      // Removido: coluna Turno
      doc.text(notesText, colPositions.obs + 8, y + 6, {
        width: colWidths.obs - 16
      });

      y += rowHeight;
    });

    // Rodapé
    doc.moveDown(2);
    doc
      .strokeColor('#E5E7EB')
      .lineWidth(1)
      .moveTo(leftMargin, y + 20)
      .lineTo(leftMargin + tableWidth, y + 20)
      .stroke();
    doc
      .fontSize(8)
      .fillColor('#6B7280')
      .text(
        `Relatório gerado em ${new Date().toLocaleString(
          'pt-BR'
        )} | Total de registros: ${items.length}`,
        leftMargin,
        y + 30
      );

    doc.end();
  });
}

module.exports = { buildSchedulePDF };
