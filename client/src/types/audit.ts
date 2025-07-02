export interface AuditRules {
  bubblegumThreshold: number;
  auditYearsThreshold: number;
  salesTaxThreshold: number;
  checkMissingSalary: boolean;
  checkMissingRevenue: boolean;
}

export interface Company {
  id: number;
  corpName: string;
  corpId: number;
  bubblegumTax: string | null;
  confectionarySalesTaxPercent: string | null;
  salary: string | null;
  revenue: string | null;
}

export interface AuditRecord {
  auditDate: string | null;
}

export interface AuditFlag {
  flagType: string;
  flagReason: string;
  severity: 'high' | 'medium' | 'low';
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
