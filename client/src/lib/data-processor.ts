export interface UploadData {
  companies: Array<{
    corpName: string;
    corpId: number;
    periodStartDate: string;
    periodEndDate: string;
    taxableIncome?: string;
    salary?: string | null;
    revenue?: string | null;
    amountTaxable?: string;
    bubblegumTax?: string;
    confectionarySalesTaxPercent?: string;
  }>;
  audits?: Array<{
    corpId: number;
    corpName: string;
    auditDate: string;
  }>;
}

export function parseExcelData(data: any): UploadData {
  const companies = [];
  const audits = [];

  // Handle direct Excel data format (when called from Excel upload)
  if (data.companies && data.audits) {
    // Process companies/returns data
    for (const returnData of data.companies) {
      companies.push({
        corpName: returnData["Corp Name"] || returnData.corpName,
        corpId: returnData.ID || returnData.corpId,
        periodStartDate: returnData["Period Start Date"] || returnData.periodStartDate,
        periodEndDate: returnData["Period End Date"] || returnData.periodEndDate,
        taxableIncome: returnData["Taxable Income"] || returnData.taxableIncome,
        salary: returnData.Salary !== undefined && returnData.Salary !== null ? returnData.Salary : returnData.salary,
        revenue: returnData.Revenue !== undefined && returnData.Revenue !== null ? returnData.Revenue : returnData.revenue,
        amountTaxable: returnData["Amount Taxable"] || returnData.amountTaxable,
        bubblegumTax: returnData["Bubblegum Tax"] || returnData.bubblegumTax,
        confectionarySalesTaxPercent: returnData["Confectionary Sales Tax %"] || returnData.confectionarySalesTaxPercent,
      });
    }

    // Process audits data
    for (const auditData of data.audits) {
      audits.push({
        corpId: auditData["Audit Name"] || auditData.corpId,
        corpName: auditData.ID || auditData.corpName,
        auditDate: auditData["Audit Date"] || auditData.auditDate,
      });
    }
  }
  // Handle legacy format (JSON with Returns/Audit keys)
  else {
    // Process Returns data
    if (data.Returns && Array.isArray(data.Returns)) {
      for (const returnData of data.Returns) {
        companies.push({
          corpName: returnData["Corp Name"] || returnData.corpName,
          corpId: returnData.ID || returnData.corpId,
          periodStartDate: returnData["Period Start Date"] || returnData.periodStartDate,
          periodEndDate: returnData["Period End Date"] || returnData.periodEndDate,
          taxableIncome: returnData["Taxable Income"] || returnData.taxableIncome,
          salary: returnData.Salary !== undefined && returnData.Salary !== null ? returnData.Salary : returnData.salary,
          revenue: returnData.Revenue !== undefined && returnData.Revenue !== null ? returnData.Revenue : returnData.revenue,
          amountTaxable: returnData["Amount Taxable"] || returnData.amountTaxable,
          bubblegumTax: returnData["Bubblegum Tax"] || returnData.bubblegumTax,
          confectionarySalesTaxPercent: returnData["Confectionary Sales Tax %"] || returnData.confectionarySalesTaxPercent,
        });
      }
    }

    // Process Audit data
    if (data.Audit && Array.isArray(data.Audit)) {
      for (const auditData of data.Audit) {
        audits.push({
          corpId: auditData["Audit Name"] || auditData.corpId,
          corpName: auditData.ID || auditData.corpName,
          auditDate: auditData["Audit Date"] || auditData.auditDate,
        });
      }
    }
  }

  return { companies, audits };
}

export function validateUploadData(data: UploadData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.companies || !Array.isArray(data.companies) || data.companies.length === 0) {
    errors.push("No company data found");
    return { valid: false, errors };
  }

  for (let i = 0; i < data.companies.length; i++) {
    const company = data.companies[i];
    if (!company.corpName) {
      errors.push(`Company ${i + 1}: Missing corporation name`);
    }
    if (!company.corpId) {
      errors.push(`Company ${i + 1}: Missing corporation ID`);
    }
    if (!company.periodStartDate) {
      errors.push(`Company ${i + 1}: Missing period start date`);
    }
    if (!company.periodEndDate) {
      errors.push(`Company ${i + 1}: Missing period end date`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function exportToCsv(data: any[], filename: string): void {
  if (data.length === 0) {
    alert("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value || '';
      }).join(',')
    )
  ].join('\n');

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
