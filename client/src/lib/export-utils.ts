// @ts-ignore
import html2pdf from 'html2pdf.js';
import { FlaggedCompany, AuditSummary } from '@/types/audit';

export interface ExportData {
  corpName: string;
  corpId: number;
  periodStartDate: string;
  periodEndDate: string;
  taxableIncome: string | null;
  salary: string | null;
  revenue: string | null;
  amountTaxable: string | null;
  bubblegumTax: string | null;
  confectionarySalesTaxPercent: string | null;
  lastAuditDate: string;
  riskLevel: string;
  riskScore: number;
  flags: string;
  flagCount: number;
}

export function exportToCsv(data: ExportData[], filename: string): void {
  if (data.length === 0) {
    alert("No data to export");
    return;
  }

  // Define column headers in order
  const headers = [
    'Company Name',
    'Corp ID',
    'Period Start',
    'Period End', 
    'Taxable Income',
    'Salary',
    'Revenue',
    'Amount Taxable',
    'Bubblegum Tax',
    'Sales Tax %',
    'Last Audit Date',
    'Risk Level',
    'Risk Score',
    'Flags',
    'Flag Count'
  ];

  // Map data to match header order
  const csvData = data.map(row => [
    row.corpName,
    row.corpId,
    row.periodStartDate,
    row.periodEndDate,
    row.taxableIncome || 'N/A',
    row.salary || 'N/A',
    row.revenue || 'N/A',
    row.amountTaxable || 'N/A',
    row.bubblegumTax || 'N/A',
    row.confectionarySalesTaxPercent || 'N/A',
    row.lastAuditDate,
    row.riskLevel,
    row.riskScore,
    `"${row.flags}"`, // Quote flags to handle commas
    row.flagCount
  ]);

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...csvData.map(row => row.join(','))
  ].join('\n');

  // Download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportToPdf(
  exportData: ExportData[], 
  summary: AuditSummary,
  filename: string,
  auditInsights?: { [corpId: number]: string }
): Promise<void> {
  if (exportData.length === 0) {
    alert("No data to export");
    return;
  }

  // Create PDF content HTML
  const pdfContent = createPdfContent(exportData, summary, auditInsights);
  
  // Create temporary element for PDF generation
  const element = document.createElement('div');
  element.innerHTML = pdfContent;
  element.style.position = 'absolute';
  element.style.left = '-9999px';
  element.style.top = '-9999px';
  document.body.appendChild(element);

  try {
    const options = {
      margin: 0.5,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'in', 
        format: 'a4', 
        orientation: 'portrait' 
      }
    };

    await html2pdf().set(options).from(element).save();
  } finally {
    document.body.removeChild(element);
  }
}

function createPdfContent(
  exportData: ExportData[], 
  summary: AuditSummary,
  auditInsights?: { [corpId: number]: string }
): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formatCurrency = (value: string | null) => {
    if (!value) return 'N/A';
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const formatPercentage = (value: string | null) => {
    if (!value) return 'N/A';
    return `${parseFloat(value).toFixed(2)}%`;
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'high': return '#dc2626';
      case 'medium': return '#d97706';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  };

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: white;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px;">
        <div style="display: inline-flex; align-items: center; margin-bottom: 10px;">
          <div style="width: 40px; height: 40px; background: #3b82f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
            <span style="color: white; font-weight: bold; font-size: 18px;">A</span>
          </div>
          <div>
            <h1 style="margin: 0; font-size: 24px; color: #1f2937;">ABCD Auditing</h1>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Intelligent Audit Prioritization Report</p>
          </div>
        </div>
        <p style="margin: 0; color: #6b7280; font-size: 12px;">Generated on ${currentDate}</p>
      </div>

      <!-- Summary Metrics -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #1f2937; margin-bottom: 15px; font-size: 18px;">Risk Assessment Summary</h2>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; text-align: center;">
            <div style="color: #dc2626; font-size: 24px; font-weight: bold;">${summary.highRisk}</div>
            <div style="color: #991b1b; font-size: 12px;">High Risk</div>
          </div>
          <div style="background: #fffbeb; border: 1px solid #fed7aa; border-radius: 8px; padding: 15px; text-align: center;">
            <div style="color: #d97706; font-size: 24px; font-weight: bold;">${summary.mediumRisk}</div>
            <div style="color: #92400e; font-size: 12px;">Medium Risk</div>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; text-align: center;">
            <div style="color: #16a34a; font-size: 24px; font-weight: bold;">${summary.lowRisk}</div>
            <div style="color: #15803d; font-size: 12px;">Low Risk</div>
          </div>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; text-align: center;">
            <div style="color: #2563eb; font-size: 24px; font-weight: bold;">${summary.totalFiles}</div>
            <div style="color: #1d4ed8; font-size: 12px;">Total Files</div>
          </div>
        </div>
      </div>

      <!-- Company Details -->
      <div>
        <h2 style="color: #1f2937; margin-bottom: 20px; font-size: 18px;">Flagged Companies Detailed Analysis</h2>
        ${exportData.map(company => `
          <div style="margin-bottom: 25px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <!-- Company Header -->
            <div style="background: #f9fafb; padding: 15px; border-bottom: 1px solid #e5e7eb;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <h3 style="margin: 0; color: #1f2937; font-size: 16px;">${company.corpName}</h3>
                  <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 12px;">Corp ID: ${company.corpId}</p>
                </div>
                <div style="text-align: right;">
                  <span style="background: ${getRiskColor(company.riskLevel)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
                    ${company.riskLevel.toUpperCase()} RISK
                  </span>
                  <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 11px;">Score: ${company.riskScore}</p>
                </div>
              </div>
            </div>
            
            <!-- Company Details -->
            <div style="padding: 15px;">
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px;">
                <div>
                  <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">Financial Information</h4>
                  <div style="font-size: 12px; line-height: 1.4;">
                    <div><strong>Bubblegum Tax:</strong> ${formatCurrency(company.bubblegumTax)}</div>
                    <div><strong>Sales Tax Rate:</strong> ${formatPercentage(company.confectionarySalesTaxPercent)}</div>
                    <div><strong>Taxable Income:</strong> ${formatCurrency(company.taxableIncome)}</div>
                    <div><strong>Revenue:</strong> ${formatCurrency(company.revenue)}</div>
                  </div>
                </div>
                <div>
                  <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">Audit Information</h4>
                  <div style="font-size: 12px; line-height: 1.4;">
                    <div><strong>Period:</strong> ${company.periodStartDate} to ${company.periodEndDate}</div>
                    <div><strong>Last Audit:</strong> ${company.lastAuditDate}</div>
                    <div><strong>Flags:</strong> ${company.flags}</div>
                  </div>
                </div>
              </div>
              
              ${auditInsights && auditInsights[company.corpId] ? `
                <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 12px;">
                  <h4 style="margin: 0 0 8px 0; color: #0369a1; font-size: 14px;">AI Insights</h4>
                  <p style="margin: 0; color: #0c4a6e; font-size: 12px; line-height: 1.4;">${auditInsights[company.corpId]}</p>
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      
      <!-- Footer -->
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 11px;">
        <p>This report was generated by ABCD Auditing's Intelligent Audit Prioritization System</p>
        <p>Generated on ${currentDate} • Confidential Document</p>
      </div>
    </div>
  `;
}