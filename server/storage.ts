import { companies, audits, auditFlags, anomalyFeedback, customRules, type Company, type InsertCompany, type Audit, type InsertAudit, type AuditFlag, type InsertAuditFlag, type AnomalyFeedback, type InsertAnomalyFeedback, type CustomRule, type InsertCustomRule } from "@shared/schema";

export interface IStorage {
  // Company operations
  getCompanies(): Promise<Company[]>;
  getCompany(corpId: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  bulkCreateCompanies(companies: InsertCompany[]): Promise<Company[]>;
  clearCompanies(): Promise<void>;
  
  // Audit operations
  getAudits(): Promise<Audit[]>;
  getAuditByCorpId(corpId: number): Promise<Audit | undefined>;
  createAudit(audit: InsertAudit): Promise<Audit>;
  bulkCreateAudits(audits: InsertAudit[]): Promise<Audit[]>;
  clearAudits(): Promise<void>;
  
  // Flag operations
  getFlags(): Promise<AuditFlag[]>;
  getFlagsByCorpId(corpId: number): Promise<AuditFlag[]>;
  createFlag(flag: InsertAuditFlag): Promise<AuditFlag>;
  bulkCreateFlags(flags: InsertAuditFlag[]): Promise<AuditFlag[]>;
  clearFlags(): Promise<void>;
  
  // Anomaly feedback operations
  getAnomalyFeedback(): Promise<AnomalyFeedback[]>;
  getAnomalyFeedbackBySessionId(sessionId: string): Promise<AnomalyFeedback[]>;
  getAnomalyFeedbackByCorpId(corpId: number): Promise<AnomalyFeedback[]>;
  createAnomalyFeedback(feedback: InsertAnomalyFeedback): Promise<AnomalyFeedback>;
  updateAnomalyFeedback(id: number, feedback: Partial<InsertAnomalyFeedback>): Promise<AnomalyFeedback>;
  bulkCreateAnomalyFeedback(feedback: InsertAnomalyFeedback[]): Promise<AnomalyFeedback[]>;
  clearAnomalyFeedback(): Promise<void>;
  
  // Custom rule operations
  getCustomRules(): Promise<CustomRule[]>;
  getCustomRulesBySessionId(sessionId: string): Promise<CustomRule[]>;
  getCustomRule(id: number): Promise<CustomRule | undefined>;
  createCustomRule(rule: InsertCustomRule): Promise<CustomRule>;
  updateCustomRule(id: number, rule: Partial<InsertCustomRule>): Promise<CustomRule>;
  deleteCustomRule(id: number): Promise<void>;
  clearCustomRules(): Promise<void>;
}

export class MemStorage implements IStorage {
  private companies: Map<number, Company>;
  private audits: Map<number, Audit>;
  private flags: Map<number, AuditFlag>;
  private anomalyFeedback: Map<number, AnomalyFeedback>;
  private customRules: Map<number, CustomRule>;
  private currentCompanyId: number;
  private currentAuditId: number;
  private currentFlagId: number;
  private currentAnomalyFeedbackId: number;
  private currentCustomRuleId: number;

  constructor() {
    this.companies = new Map();
    this.audits = new Map();
    this.flags = new Map();
    this.anomalyFeedback = new Map();
    this.customRules = new Map();
    this.currentCompanyId = 1;
    this.currentAuditId = 1;
    this.currentFlagId = 1;
    this.currentAnomalyFeedbackId = 1;
    this.currentCustomRuleId = 1;
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private async initializeSampleData() {
    const sampleData = {
      "Returns": [
        {
          "Corp Name": "Candy Corp",
          "ID": 100000,
          "Period Start Date": "2020-01-01T00:00:00",
          "Period End Date": "2020-12-31T00:00:00",
          "Taxable Income": 413224,
          "Salary": null,
          "Revenue": 513224.0,
          "Amount Taxable": 78513,
          "Bubblegum Tax": 6281,
          "Confectionary Sales Tax %": 12.74
        },
        {
          "Corp Name": "Gum Co",
          "ID": 100001,
          "Period Start Date": "2022-01-01T00:00:00",
          "Period End Date": "2022-12-31T00:00:00",
          "Taxable Income": 1041579,
          "Salary": 445480.0,
          "Revenue": 2041579.0,
          "Amount Taxable": 120345,
          "Bubblegum Tax": 2548,
          "Confectionary Sales Tax %": 14.38
        },
        {
          "Corp Name": "Sweet Inc",
          "ID": 100002,
          "Period Start Date": "2021-01-01T00:00:00",
          "Period End Date": "2021-12-31T00:00:00",
          "Taxable Income": 1066955,
          "Salary": 492518.0,
          "Revenue": null,
          "Amount Taxable": 174598,
          "Bubblegum Tax": 14587,
          "Confectionary Sales Tax %": 9.46
        },
        {
          "Corp Name": "Choco Ltd",
          "ID": 100003,
          "Period Start Date": "2012-01-01T00:00:00",
          "Period End Date": "2012-12-31T00:00:00",
          "Taxable Income": 1460887,
          "Salary": 507124.0,
          "Revenue": 2560887.0,
          "Amount Taxable": 156789,
          "Bubblegum Tax": 65879,
          "Confectionary Sales Tax %": 9.51
        },
        {
          "Corp Name": "Toffee Co",
          "ID": 100004,
          "Period Start Date": "2013-01-02T00:00:00",
          "Period End Date": "2013-12-31T00:00:00",
          "Taxable Income": 629325,
          "Salary": 412568.0,
          "Revenue": 1229325.0,
          "Amount Taxable": 145698,
          "Bubblegum Tax": 321458,
          "Confectionary Sales Tax %": 13.24
        },
        {
          "Corp Name": "Lolly Corp",
          "ID": 100005,
          "Period Start Date": "2010-01-03T00:00:00",
          "Period End Date": "2010-12-31T00:00:00",
          "Taxable Income": 499296,
          "Salary": 421014.0,
          "Revenue": null,
          "Amount Taxable": 897456,
          "Bubblegum Tax": 100005,
          "Confectionary Sales Tax %": 8.05
        },
        {
          "Corp Name": "Sugar Co",
          "ID": 100006,
          "Period Start Date": "2007-01-04T00:00:00",
          "Period End Date": "2007-12-31T00:00:00",
          "Taxable Income": 107245,
          "Salary": 88639.0,
          "Revenue": 657245.0,
          "Amount Taxable": 54789,
          "Bubblegum Tax": 36547,
          "Confectionary Sales Tax %": 14.2
        },
        {
          "Corp Name": "Fudge Inc",
          "ID": 100007,
          "Period Start Date": "2008-01-05T00:00:00",
          "Period End Date": "2008-12-31T00:00:00",
          "Taxable Income": 108617,
          "Salary": 11256.0,
          "Revenue": 208617.0,
          "Amount Taxable": 65428,
          "Bubblegum Tax": 245789,
          "Confectionary Sales Tax %": 9.97
        },
        {
          "Corp Name": "Taffy Ltd",
          "ID": 100008,
          "Period Start Date": "2010-01-06T00:00:00",
          "Period End Date": "2010-12-31T00:00:00",
          "Taxable Income": 103495,
          "Salary": null,
          "Revenue": 503495.0,
          "Amount Taxable": 65478,
          "Bubblegum Tax": 25478,
          "Confectionary Sales Tax %": 8.51
        },
        {
          "Corp Name": "Treats Co",
          "ID": 100009,
          "Period Start Date": "2001-01-07T00:00:00",
          "Period End Date": "2001-12-31T00:00:00",
          "Taxable Income": 112922,
          "Salary": 4789.0,
          "Revenue": 452922.0,
          "Amount Taxable": 12456,
          "Bubblegum Tax": 14587,
          "Confectionary Sales Tax %": 6.87
        },
        {
          "Corp Name": "Snack Inc",
          "ID": 100010,
          "Period Start Date": "2012-01-08T00:00:00",
          "Period End Date": "2012-12-31T00:00:00",
          "Taxable Income": 321278,
          "Salary": 4587.0,
          "Revenue": 631278.0,
          "Amount Taxable": 36547,
          "Bubblegum Tax": 568794,
          "Confectionary Sales Tax %": 9.74
        },
        {
          "Corp Name": "Minty Co",
          "ID": 100011,
          "Period Start Date": "2019-01-09T00:00:00",
          "Period End Date": "2019-12-31T00:00:00",
          "Taxable Income": 396118,
          "Salary": 32147.0,
          "Revenue": null,
          "Amount Taxable": 65478,
          "Bubblegum Tax": 98745,
          "Confectionary Sales Tax %": 12.82
        },
        {
          "Corp Name": "Crispy Corp",
          "ID": 100012,
          "Period Start Date": "2012-01-10T00:00:00",
          "Period End Date": "2012-12-31T00:00:00",
          "Taxable Income": 333369,
          "Salary": 35478.0,
          "Revenue": 587969.0,
          "Amount Taxable": 32589,
          "Bubblegum Tax": 3254,
          "Confectionary Sales Tax %": 13.94
        },
        {
          "Corp Name": "Sweets & Co",
          "ID": 100013,
          "Period Start Date": "2014-01-11T00:00:00",
          "Period End Date": "2014-12-31T00:00:00",
          "Taxable Income": 135914,
          "Salary": null,
          "Revenue": 875914.0,
          "Amount Taxable": 56478,
          "Bubblegum Tax": 12,
          "Confectionary Sales Tax %": 5.04
        },
        {
          "Corp Name": "Choco Candy Ltd",
          "ID": 100014,
          "Period Start Date": "2020-01-12T00:00:00",
          "Period End Date": "2020-12-31T00:00:00",
          "Taxable Income": 675392,
          "Salary": 13895.0,
          "Revenue": 695392.0,
          "Amount Taxable": 45789,
          "Bubblegum Tax": 3657,
          "Confectionary Sales Tax %": 7.0
        }
      ],
      "Audit": [
        {
          "ID": "Candy Corp",
          "Audit Name": 100000,
          "Audit Date": "2023-10-14T00:00:00"
        },
        {
          "ID": "Gum Co",
          "Audit Name": 100001,
          "Audit Date": "2024-09-30T00:00:00"
        },
        {
          "ID": "Sweet Inc",
          "Audit Name": 100002,
          "Audit Date": "2022-08-01T00:00:00"
        },
        {
          "ID": "Taffy Ltd",
          "Audit Name": 100008,
          "Audit Date": "2011-12-07T00:00:00"
        },
        {
          "ID": "Treats Co",
          "Audit Name": 100009,
          "Audit Date": "2003-02-23T00:00:00"
        },
        {
          "ID": "Snack Inc",
          "Audit Name": 100010,
          "Audit Date": "2024-09-04T00:00:00"
        },
        {
          "ID": "Minty Co",
          "Audit Name": 100011,
          "Audit Date": "2024-12-15T00:00:00"
        },
        {
          "ID": "Crispy Corp",
          "Audit Name": 100012,
          "Audit Date": "2015-07-21T00:00:00"
        },
        {
          "ID": "Sweets & Co",
          "Audit Name": 100013,
          "Audit Date": "2015-07-21T00:00:00"
        },
        {
          "ID": "Choco Candy Ltd",
          "Audit Name": 100014,
          "Audit Date": "2022-01-12T00:00:00"
        }
      ]
    };

    // Initialize companies
    for (const returnData of sampleData.Returns) {
      const company: InsertCompany = {
        corpName: returnData["Corp Name"],
        corpId: returnData.ID,
        periodStartDate: new Date(returnData["Period Start Date"]),
        periodEndDate: new Date(returnData["Period End Date"]),
        taxableIncome: returnData["Taxable Income"]?.toString() || null,
        salary: returnData.Salary !== null && returnData.Salary !== undefined ? returnData.Salary.toString() : null,
        revenue: returnData.Revenue !== null && returnData.Revenue !== undefined ? returnData.Revenue.toString() : null,
        amountTaxable: returnData["Amount Taxable"]?.toString() || null,
        bubblegumTax: returnData["Bubblegum Tax"]?.toString() || null,
        confectionarySalesTaxPercent: returnData["Confectionary Sales Tax %"]?.toString() || null,
      };
      await this.createCompany(company);
    }

    // Initialize audits
    for (const auditData of sampleData.Audit) {
      const audit: InsertAudit = {
        corpId: auditData["Audit Name"],
        corpName: auditData.ID,
        auditDate: new Date(auditData["Audit Date"]),
      };
      await this.createAudit(audit);
    }
  }

  async getCompanies(): Promise<Company[]> {
    return Array.from(this.companies.values());
  }

  async getCompany(corpId: number): Promise<Company | undefined> {
    return Array.from(this.companies.values()).find(c => c.corpId === corpId);
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const id = this.currentCompanyId++;
    const company: Company = { 
      ...insertCompany, 
      id,
      taxableIncome: insertCompany.taxableIncome || null,
      salary: insertCompany.salary || null,
      revenue: insertCompany.revenue || null,
      amountTaxable: insertCompany.amountTaxable || null,
      bubblegumTax: insertCompany.bubblegumTax || null,
      confectionarySalesTaxPercent: insertCompany.confectionarySalesTaxPercent || null,
    };
    this.companies.set(id, company);
    return company;
  }

  async bulkCreateCompanies(companies: InsertCompany[]): Promise<Company[]> {
    const created: Company[] = [];
    for (const company of companies) {
      created.push(await this.createCompany(company));
    }
    return created;
  }

  async clearCompanies(): Promise<void> {
    this.companies.clear();
    this.currentCompanyId = 1;
  }

  async getAudits(): Promise<Audit[]> {
    return Array.from(this.audits.values());
  }

  async getAuditByCorpId(corpId: number): Promise<Audit | undefined> {
    return Array.from(this.audits.values()).find(a => a.corpId === corpId);
  }

  async createAudit(insertAudit: InsertAudit): Promise<Audit> {
    const id = this.currentAuditId++;
    const audit: Audit = { ...insertAudit, id };
    this.audits.set(id, audit);
    return audit;
  }

  async bulkCreateAudits(audits: InsertAudit[]): Promise<Audit[]> {
    const created: Audit[] = [];
    for (const audit of audits) {
      created.push(await this.createAudit(audit));
    }
    return created;
  }

  async clearAudits(): Promise<void> {
    this.audits.clear();
    this.currentAuditId = 1;
  }

  async getFlags(): Promise<AuditFlag[]> {
    return Array.from(this.flags.values());
  }

  async getFlagsByCorpId(corpId: number): Promise<AuditFlag[]> {
    return Array.from(this.flags.values()).filter(f => f.corpId === corpId);
  }

  async createFlag(insertFlag: InsertAuditFlag): Promise<AuditFlag> {
    const id = this.currentFlagId++;
    const flag: AuditFlag = { 
      ...insertFlag, 
      id,
      createdAt: new Date()
    };
    this.flags.set(id, flag);
    return flag;
  }

  async bulkCreateFlags(flags: InsertAuditFlag[]): Promise<AuditFlag[]> {
    const created: AuditFlag[] = [];
    for (const flag of flags) {
      created.push(await this.createFlag(flag));
    }
    return created;
  }

  async clearFlags(): Promise<void> {
    this.flags.clear();
    this.currentFlagId = 1;
  }

  // Anomaly feedback operations
  async getAnomalyFeedback(): Promise<AnomalyFeedback[]> {
    return Array.from(this.anomalyFeedback.values());
  }

  async getAnomalyFeedbackBySessionId(sessionId: string): Promise<AnomalyFeedback[]> {
    return Array.from(this.anomalyFeedback.values()).filter(f => f.anomalySessionId === sessionId);
  }

  async getAnomalyFeedbackByCorpId(corpId: number): Promise<AnomalyFeedback[]> {
    return Array.from(this.anomalyFeedback.values()).filter(f => f.corpId === corpId);
  }

  async createAnomalyFeedback(insertFeedback: InsertAnomalyFeedback): Promise<AnomalyFeedback> {
    const id = this.currentAnomalyFeedbackId++;
    const feedback: AnomalyFeedback = { 
      ...insertFeedback, 
      id,
      auditorNotes: insertFeedback.auditorNotes || null,
      createdAt: new Date()
    };
    this.anomalyFeedback.set(id, feedback);
    return feedback;
  }

  async updateAnomalyFeedback(id: number, updates: Partial<InsertAnomalyFeedback>): Promise<AnomalyFeedback> {
    const existing = this.anomalyFeedback.get(id);
    if (!existing) {
      throw new Error(`Anomaly feedback with id ${id} not found`);
    }
    
    const updated: AnomalyFeedback = { 
      ...existing, 
      ...updates 
    };
    this.anomalyFeedback.set(id, updated);
    return updated;
  }

  async bulkCreateAnomalyFeedback(feedbacks: InsertAnomalyFeedback[]): Promise<AnomalyFeedback[]> {
    const created: AnomalyFeedback[] = [];
    for (const feedback of feedbacks) {
      created.push(await this.createAnomalyFeedback(feedback));
    }
    return created;
  }

  async clearAnomalyFeedback(): Promise<void> {
    this.anomalyFeedback.clear();
    this.currentAnomalyFeedbackId = 1;
  }

  // Custom rule operations
  async getCustomRules(): Promise<CustomRule[]> {
    return Array.from(this.customRules.values());
  }

  async getCustomRulesBySessionId(sessionId: string): Promise<CustomRule[]> {
    return Array.from(this.customRules.values()).filter(rule => rule.sessionId === sessionId);
  }

  async getCustomRule(id: number): Promise<CustomRule | undefined> {
    return this.customRules.get(id);
  }

  async createCustomRule(insertRule: InsertCustomRule): Promise<CustomRule> {
    const id = this.currentCustomRuleId++;
    const rule: CustomRule = { 
      id, 
      sessionId: insertRule.sessionId,
      ruleName: insertRule.ruleName,
      fieldName: insertRule.fieldName,
      operator: insertRule.operator,
      value: insertRule.value || null,
      riskScore: insertRule.riskScore,
      enabled: insertRule.enabled !== undefined ? insertRule.enabled : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.customRules.set(id, rule);
    return rule;
  }

  async updateCustomRule(id: number, updates: Partial<InsertCustomRule>): Promise<CustomRule> {
    const existingRule = this.customRules.get(id);
    if (!existingRule) {
      throw new Error(`Custom rule with id ${id} not found`);
    }
    
    const updated: CustomRule = { 
      ...existingRule, 
      ...updates,
      updatedAt: new Date()
    };
    this.customRules.set(id, updated);
    return updated;
  }

  async deleteCustomRule(id: number): Promise<void> {
    this.customRules.delete(id);
  }

  async clearCustomRules(): Promise<void> {
    this.customRules.clear();
    this.currentCustomRuleId = 1;
  }
}

export const storage = new MemStorage();
