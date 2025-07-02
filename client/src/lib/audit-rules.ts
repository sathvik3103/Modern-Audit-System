import { AuditRules, FlaggedCompany, AuditSummary } from '@/types/audit';

export const defaultRules: AuditRules = {
  bubblegumThreshold: 50000,
  bubblegumEnabled: true,
  bubblegumRiskScore: 25,
  auditYearsThreshold: 3,
  auditRecencyEnabled: true,
  auditRecencyRiskScore: 20,
  salesTaxThreshold: 10,
  salesTaxEnabled: true,
  salesTaxRiskScore: 15,
  checkMissingSalary: true,
  missingSalaryRiskScore: 12,
  checkMissingRevenue: true,
  missingRevenueRiskScore: 12,
  dataConsistencyEnabled: true,
  dataConsistencyRiskScore: 10,
  // Risk level thresholds
  highRiskThreshold: 50,
  mediumRiskThreshold: 25,
};

export function calculateAuditSummary(flaggedCompanies: FlaggedCompany[]): AuditSummary {
  const summary = flaggedCompanies.reduce(
    (acc, company) => {
      switch (company.riskLevel) {
        case 'high':
          acc.highRisk++;
          break;
        case 'medium':
          acc.mediumRisk++;
          break;
        case 'low':
          acc.lowRisk++;
          break;
      }
      return acc;
    },
    { highRisk: 0, mediumRisk: 0, lowRisk: 0, totalFiles: 0 }
  );

  summary.totalFiles = summary.highRisk + summary.mediumRisk + summary.lowRisk;
  return summary;
}

export function getFlagDisplayInfo(flagType: string) {
  const flagMap: Record<string, { label: string; color: string }> = {
    high_bubblegum_tax: { label: 'High Bubblegum Tax', color: 'bg-red-100 text-red-800' },
    old_audit: { label: 'Old Audit', color: 'bg-yellow-100 text-yellow-800' },
    high_sales_tax: { label: 'High Sales Tax %', color: 'bg-blue-100 text-blue-800' },
    missing_salary: { label: 'Missing Salary', color: 'bg-orange-100 text-orange-800' },
    missing_revenue: { label: 'Missing Revenue', color: 'bg-orange-100 text-orange-800' },
    data_inconsistency: { label: 'Data Inconsistency', color: 'bg-purple-100 text-purple-800' },
  };

  return flagMap[flagType] || { label: flagType, color: 'bg-gray-100 text-gray-800' };
}

export function getRiskLevelColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function formatCurrency(value: string | null): string {
  if (!value) return 'N/A';
  const num = parseFloat(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatPercentage(value: string | null): string {
  if (!value) return 'N/A';
  return `${parseFloat(value).toFixed(2)}%`;
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString('en-US');
}

export function getCompanyInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getGradientColor(index: number): string {
  const gradients = [
    'from-blue-500 to-purple-600',
    'from-green-500 to-teal-600',
    'from-purple-500 to-pink-600',
    'from-red-500 to-orange-600',
    'from-indigo-500 to-blue-600',
    'from-yellow-500 to-orange-600',
    'from-pink-500 to-rose-600',
    'from-cyan-500 to-blue-600',
  ];
  
  return gradients[index % gradients.length];
}
