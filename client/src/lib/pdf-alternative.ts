import jsPDF from 'jspdf';
import { ExportData } from './export-utils';
import { AuditSummary } from '@/types/audit';

export async function exportToPdfDirect(
  exportData: ExportData[], 
  summary: AuditSummary,
  filename: string,
  auditInsights?: { [corpId: number]: string }
): Promise<void> {
  if (exportData.length === 0) {
    alert("No data to export");
    return;
  }

  console.log('Starting direct PDF export with jsPDF');

  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Add header
    doc.setFontSize(20);
    doc.setTextColor(31, 41, 55); // #1f2937
    doc.text('ABCD Auditing', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setTextColor(107, 114, 128); // #6b7280
    doc.text('Intelligent Audit Prioritization Report', 20, yPosition);
    yPosition += 8;
    
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPosition);
    yPosition += 20;

    // Add summary section
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.text('Risk Assessment Summary', 20, yPosition);
    yPosition += 15;

    // Summary boxes
    doc.setFontSize(10);
    const boxWidth = 40;
    const boxHeight = 25;
    let xPosition = 20;

    // High Risk box
    doc.setFillColor(254, 242, 242); // #fef2f2
    doc.rect(xPosition, yPosition, boxWidth, boxHeight, 'F');
    doc.setTextColor(220, 38, 38); // #dc2626
    doc.setFontSize(14);
    doc.text(summary.highRisk.toString(), xPosition + boxWidth/2, yPosition + 12, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(153, 27, 27); // #991b1b
    doc.text('High Risk', xPosition + boxWidth/2, yPosition + 18, { align: 'center' });

    xPosition += boxWidth + 10;

    // Medium Risk box
    doc.setFillColor(255, 251, 235); // #fffbeb
    doc.rect(xPosition, yPosition, boxWidth, boxHeight, 'F');
    doc.setTextColor(217, 119, 6); // #d97706
    doc.setFontSize(14);
    doc.text(summary.mediumRisk.toString(), xPosition + boxWidth/2, yPosition + 12, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14); // #92400e
    doc.text('Medium Risk', xPosition + boxWidth/2, yPosition + 18, { align: 'center' });

    xPosition += boxWidth + 10;

    // Low Risk box
    doc.setFillColor(240, 253, 244); // #f0fdf4
    doc.rect(xPosition, yPosition, boxWidth, boxHeight, 'F');
    doc.setTextColor(22, 163, 74); // #16a34a
    doc.setFontSize(14);
    doc.text(summary.lowRisk.toString(), xPosition + boxWidth/2, yPosition + 12, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(21, 128, 61); // #15803d
    doc.text('Low Risk', xPosition + boxWidth/2, yPosition + 18, { align: 'center' });

    yPosition += boxHeight + 20;

    // Companies section
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.text('Flagged Companies Detailed Analysis', 20, yPosition);
    yPosition += 15;

    // Add companies
    for (const company of exportData) {
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      // Company header
      doc.setFillColor(249, 250, 251); // #f9fafb
      doc.rect(20, yPosition, pageWidth - 40, 20, 'F');
      
      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      doc.text(company.corpName, 25, yPosition + 12);
      
      // Risk level
      const riskColor = getRiskColor(company.riskLevel);
      doc.setFillColor(...riskColor);
      doc.rect(pageWidth - 80, yPosition + 5, 30, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(company.riskLevel.toUpperCase(), pageWidth - 65, yPosition + 12, { align: 'center' });

      yPosition += 25;

      // Company details
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81); // #374151

      const details = [
        `Corp ID: ${company.corpId}`,
        `Period: ${company.periodStartDate} to ${company.periodEndDate}`,
        `Bubblegum Tax: ${formatCurrency(company.bubblegumTax)}`,
        `Sales Tax Rate: ${formatPercentage(company.confectionarySalesTaxPercent)}`,
        `Last Audit: ${company.lastAuditDate}`,
        `Flags: ${company.flags}`
      ];

      for (const detail of details) {
        doc.text(detail, 25, yPosition);
        yPosition += 6;
      }

      // AI Insights
      if (auditInsights && auditInsights[company.corpId]) {
        yPosition += 5;
        doc.setFillColor(240, 249, 255); // #f0f9ff
        const insightHeight = 25;
        doc.rect(20, yPosition, pageWidth - 40, insightHeight, 'F');
        
        doc.setTextColor(3, 105, 161); // #0369a1
        doc.setFontSize(9);
        doc.text('AI Insights:', 25, yPosition + 8);
        
        doc.setTextColor(12, 74, 110); // #0c4a6e
        const insight = auditInsights[company.corpId];
        const lines = doc.splitTextToSize(insight, pageWidth - 50);
        doc.text(lines.slice(0, 2), 25, yPosition + 15); // Limit to 2 lines
        
        yPosition += insightHeight;
      }

      yPosition += 15; // Space between companies
    }

    // Save the PDF
    doc.save(filename);
    console.log('PDF generated successfully with jsPDF');

  } catch (error) {
    console.error('Direct PDF generation error:', error);
    alert(`Failed to generate PDF: ${error.message}`);
  }
}

function getRiskColor(riskLevel: string): [number, number, number] {
  switch (riskLevel.toLowerCase()) {
    case 'high': return [220, 38, 38]; // #dc2626
    case 'medium': return [217, 119, 6]; // #d97706
    case 'low': return [22, 163, 74]; // #16a34a
    default: return [107, 114, 128]; // #6b7280
  }
}

function formatCurrency(value: string | null): string {
  if (!value) return 'N/A';
  const num = parseFloat(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(num);
}

function formatPercentage(value: string | null): string {
  if (!value) return 'N/A';
  return `${parseFloat(value).toFixed(2)}%`;
}