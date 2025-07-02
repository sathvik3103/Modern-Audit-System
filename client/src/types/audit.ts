export interface AuditRules {
  bubblegumThreshold: number;
  bubblegumEnabled: boolean;
  bubblegumRiskScore: number;
  auditYearsThreshold: number;
  auditRecencyEnabled: boolean;
  auditRecencyRiskScore: number;
  salesTaxThreshold: number;
  salesTaxEnabled: boolean;
  salesTaxRiskScore: number;
  checkMissingSalary: boolean;
  missingSalaryRiskScore: number;
  checkMissingRevenue: boolean;  
  missingRevenueRiskScore: number;
  dataConsistencyEnabled: boolean;
  dataConsistencyRiskScore: number;
  // Risk level thresholds
  highRiskThreshold: number;
  mediumRiskThreshold: number;
}

export interface Company {
  id: number;
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
}

export interface AuditRecord {
  auditDate: string | null | undefined;
}

export interface AuditFlag {
  flagType: string;
  flagReason: string;
  riskScore: number;
}

export interface FlaggedCompany {
  company: Company;
  audit: AuditRecord | null;
  flags: AuditFlag[];
  riskLevel: 'high' | 'medium' | 'low';
  riskScore: number;
}

export interface AuditSummary {
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  totalFiles: number;
}

export interface CompanyExplanation {
  company: {
    corpName: string;
    corpId: number;
    bubblegumTax: string | null;
    confectionarySalesTaxPercent: string | null;
  };
  audit: {
    auditDate: string;
    yearsAgo: number;
  } | null;
  flags: AuditFlag[];
  recommendation: string;
}
