import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { auditRulesSchema, type AuditRules, type FlaggedCompany, type InsertCompany, type InsertAudit } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get raw companies data for data exploration
  app.get("/api/companies-raw", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  // Get raw audits data for data exploration
  app.get("/api/audits-raw", async (req, res) => {
    try {
      const audits = await storage.getAudits();
      res.json(audits);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audits" });
    }
  });
  
  // Get all companies with audit data and flags
  app.get("/api/companies", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      const audits = await storage.getAudits();
      const flags = await storage.getFlags();
      
      const companiesWithAudits = companies.map(company => {
        const audit = audits.find(a => a.corpId === company.corpId);
        const companyFlags = flags.filter(f => f.corpId === company.corpId);
        
        return {
          ...company,
          audit,
          flags: companyFlags
        };
      });
      
      res.json(companiesWithAudits);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  // Apply audit rules and get flagged companies
  app.post("/api/audit/flagged", async (req, res) => {
    try {
      const rules = auditRulesSchema.parse(req.body);
      
      // Clear existing flags
      await storage.clearFlags();
      
      const companies = await storage.getCompanies();
      const audits = await storage.getAudits();
      const flaggedCompanies: FlaggedCompany[] = [];
      
      const currentDate = new Date();
      const auditThresholdDate = new Date();
      auditThresholdDate.setFullYear(currentDate.getFullYear() - rules.auditYearsThreshold);
      
      for (const company of companies) {
        const audit = audits.find(a => a.corpId === company.corpId);
        const flags: Array<{flagType: string, flagReason: string, severity: string}> = [];
        let riskScore = 0;
        
        // Rule 1: Bubblegum Tax > threshold
        const bubblegumTax = parseFloat(company.bubblegumTax || "0");
        if (bubblegumTax > rules.bubblegumThreshold) {
          const percentOver = ((bubblegumTax - rules.bubblegumThreshold) / rules.bubblegumThreshold * 100).toFixed(0);
          flags.push({
            flagType: "high_bubblegum_tax",
            flagReason: `Bubblegum Tax of $${bubblegumTax.toLocaleString()} exceeds threshold of $${rules.bubblegumThreshold.toLocaleString()} by ${percentOver}%`,
            severity: bubblegumTax > rules.bubblegumThreshold * 2 ? "high" : "medium"
          });
          riskScore += bubblegumTax > rules.bubblegumThreshold * 2 ? 30 : 20;
        }
        
        // Rule 2: Not audited in past X years
        if (!audit || audit.auditDate < auditThresholdDate) {
          const yearsAgo = audit ? 
            Math.floor((currentDate.getTime() - audit.auditDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) :
            null;
          flags.push({
            flagType: "old_audit",
            flagReason: audit ? 
              `Last audited ${yearsAgo} years ago, exceeding ${rules.auditYearsThreshold}-year requirement` :
              "Never been audited",
            severity: !audit ? "high" : (yearsAgo !== null && yearsAgo > rules.auditYearsThreshold * 2) ? "high" : "medium"
          });
          riskScore += !audit ? 40 : (yearsAgo !== null && yearsAgo > rules.auditYearsThreshold * 2) ? 25 : 15;
        }
        
        // Rule 3: Confectionary Sales Tax % > threshold
        const salesTaxPercent = parseFloat(company.confectionarySalesTaxPercent || "0");
        if (salesTaxPercent > rules.salesTaxThreshold) {
          flags.push({
            flagType: "high_sales_tax",
            flagReason: `Confectionary Sales Tax of ${salesTaxPercent}% exceeds threshold of ${rules.salesTaxThreshold}%`,
            severity: salesTaxPercent > rules.salesTaxThreshold * 1.5 ? "medium" : "low"
          });
          riskScore += salesTaxPercent > rules.salesTaxThreshold * 1.5 ? 15 : 10;
        }
        
        // Rule 4: Data consistency checks
        if (rules.checkMissingSalary && !company.salary) {
          flags.push({
            flagType: "missing_salary",
            flagReason: "Salary data is missing",
            severity: "medium"
          });
          riskScore += 10;
        }
        
        if (rules.checkMissingRevenue && !company.revenue) {
          flags.push({
            flagType: "missing_revenue",
            flagReason: "Revenue data is missing", 
            severity: "medium"
          });
          riskScore += 10;
        }
        
        // Salary provided but revenue blank (or vice versa)
        if ((company.salary && !company.revenue) || (!company.salary && company.revenue)) {
          flags.push({
            flagType: "data_inconsistency",
            flagReason: company.salary ? "Salary provided but Revenue is missing" : "Revenue provided but Salary is missing",
            severity: "medium"
          });
          riskScore += 15;
        }
        
        if (flags.length > 0) {
          // Determine risk level
          let riskLevel = "low";
          if (riskScore >= 50) riskLevel = "high";
          else if (riskScore >= 25) riskLevel = "medium";
          
          // Store flags in database
          for (const flag of flags) {
            await storage.createFlag({
              corpId: company.corpId,
              flagType: flag.flagType,
              flagReason: flag.flagReason,
              severity: flag.severity
            });
          }
          
          flaggedCompanies.push({
            company: {
              id: company.id,
              corpName: company.corpName,
              corpId: company.corpId,
              bubblegumTax: company.bubblegumTax,
              confectionarySalesTaxPercent: company.confectionarySalesTaxPercent,
              salary: company.salary,
              revenue: company.revenue,
            },
            audit: audit ? {
              auditDate: audit.auditDate.toISOString(),
            } : null,
            flags,
            riskLevel,
            riskScore
          });
        }
      }
      
      // Sort by risk score descending
      flaggedCompanies.sort((a, b) => b.riskScore - a.riskScore);
      
      res.json(flaggedCompanies);
    } catch (error) {
      console.error("Error applying audit rules:", error);
      res.status(500).json({ message: "Failed to apply audit rules" });
    }
  });

  // Upload and process audit data
  app.post("/api/upload", async (req, res) => {
    try {
      const uploadSchema = z.object({
        companies: z.array(z.object({
          corpName: z.string(),
          corpId: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val) : val),
          periodStartDate: z.string(),
          periodEndDate: z.string(),
          taxableIncome: z.union([z.number(), z.string()]).optional(),
          salary: z.union([z.number(), z.string()]).optional().nullable(),
          revenue: z.union([z.number(), z.string()]).optional().nullable(),
          amountTaxable: z.union([z.number(), z.string()]).optional(),
          bubblegumTax: z.union([z.number(), z.string()]).optional(),
          confectionarySalesTaxPercent: z.union([z.number(), z.string()]).optional(),
        })),
        audits: z.array(z.object({
          corpId: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val) : val),
          corpName: z.string(),
          auditDate: z.string(),
        })).optional(),
      });
      
      const data = uploadSchema.parse(req.body);
      
      // Clear existing data
      await storage.clearCompanies();
      await storage.clearAudits();
      await storage.clearFlags();
      
      // Insert companies
      const companies: InsertCompany[] = data.companies.map(c => ({
        corpName: c.corpName,
        corpId: c.corpId,
        periodStartDate: new Date(c.periodStartDate),
        periodEndDate: new Date(c.periodEndDate),
        taxableIncome: c.taxableIncome?.toString() || "0",
        salary: c.salary?.toString() || null,
        revenue: c.revenue?.toString() || null,
        amountTaxable: c.amountTaxable?.toString() || "0",
        bubblegumTax: c.bubblegumTax?.toString() || "0",
        confectionarySalesTaxPercent: c.confectionarySalesTaxPercent?.toString() || "0",
      }));
      
      await storage.bulkCreateCompanies(companies);
      
      // Insert audits if provided
      if (data.audits) {
        const audits: InsertAudit[] = data.audits.map(a => ({
          corpId: a.corpId,
          corpName: a.corpName,
          auditDate: new Date(a.auditDate),
        }));
        
        await storage.bulkCreateAudits(audits);
      }
      
      res.json({ message: "Data uploaded successfully", companiesCount: companies.length, auditsCount: data.audits?.length || 0 });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(400).json({ message: "Invalid data format" });
    }
  });

  // Load sample data endpoint
  app.post('/api/load-sample', async (req, res) => {
    try {
      // Clear existing data
      await storage.clearCompanies();
      await storage.clearAudits();
      await storage.clearFlags();

      // Load predefined sample data
      const sampleCompanies: InsertCompany[] = [
        {
          corpName: "Candy Corp",
          corpId: 100000,
          periodStartDate: new Date("2024-01-01"),
          periodEndDate: new Date("2024-12-31"),
          taxableIncome: "2500000",
          salary: "150000",
          revenue: "3000000",
          amountTaxable: "2400000",
          bubblegumTax: "75000",
          confectionarySalesTaxPercent: "12"
        },
        {
          corpName: "Sweet Dreams Inc",
          corpId: 100001,
          periodStartDate: new Date("2024-01-01"),
          periodEndDate: new Date("2024-12-31"),
          taxableIncome: "1800000",
          salary: null,
          revenue: "2200000",
          amountTaxable: "1750000",
          bubblegumTax: "45000",
          confectionarySalesTaxPercent: "8"
        },
        {
          corpName: "Chocolate Factory Ltd",
          corpId: 100002,
          periodStartDate: new Date("2024-01-01"),
          periodEndDate: new Date("2024-12-31"),
          taxableIncome: "3200000",
          salary: "200000",
          revenue: null,
          amountTaxable: "3100000",
          bubblegumTax: "95000",
          confectionarySalesTaxPercent: "15"
        }
      ];

      const sampleAudits: InsertAudit[] = [
        { corpId: 100000, corpName: "Candy Corp", auditDate: new Date("2020-06-15") },
        { corpId: 100002, corpName: "Chocolate Factory Ltd", auditDate: new Date("2022-03-10") }
      ];

      await storage.bulkCreateCompanies(sampleCompanies);
      await storage.bulkCreateAudits(sampleAudits);

      res.json({ message: 'Sample data loaded successfully', companies: sampleCompanies.length, audits: sampleAudits.length });
    } catch (error) {
      console.error('Load sample data error:', error);
      res.status(500).json({ error: 'Failed to load sample data' });
    }
  });

  // Get explanation for a specific company
  app.get("/api/audit/explanation/:corpId", async (req, res) => {
    try {
      const corpId = parseInt(req.params.corpId);
      const company = await storage.getCompany(corpId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const audit = await storage.getAuditByCorpId(corpId);
      const flags = await storage.getFlagsByCorpId(corpId);
      
      const explanation = {
        company: {
          corpName: company.corpName,
          corpId: company.corpId,
          bubblegumTax: company.bubblegumTax,
          confectionarySalesTaxPercent: company.confectionarySalesTaxPercent,
        },
        audit: audit ? {
          auditDate: audit.auditDate.toISOString(),
          yearsAgo: Math.floor((new Date().getTime() - audit.auditDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        } : null,
        flags: flags.map(f => ({
          flagType: f.flagType,
          flagReason: f.flagReason,
          severity: f.severity,
        })),
        recommendation: generateRecommendation(company, audit, flags)
      };
      
      res.json(explanation);
    } catch (error) {
      res.status(500).json({ message: "Failed to get explanation" });
    }
  });

  // Export flagged results
  app.get("/api/audit/export", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      const audits = await storage.getAudits();
      const flags = await storage.getFlags();
      
      const exportData = companies.map(company => {
        const audit = audits.find(a => a.corpId === company.corpId);
        const companyFlags = flags.filter(f => f.corpId === company.corpId);
        
        return {
          corpName: company.corpName,
          corpId: company.corpId,
          bubblegumTax: company.bubblegumTax,
          salesTaxPercent: company.confectionarySalesTaxPercent,
          lastAuditDate: audit?.auditDate.toISOString().split('T')[0] || 'Never',
          flagCount: companyFlags.length,
          flags: companyFlags.map(f => f.flagReason).join('; '),
          riskLevel: companyFlags.length >= 3 ? 'High' : companyFlags.length >= 2 ? 'Medium' : companyFlags.length >= 1 ? 'Low' : 'None'
        };
      }).filter(c => c.flagCount > 0);
      
      res.json(exportData);
    } catch (error) {
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function generateRecommendation(company: any, audit: any, flags: any[]): string {
  const highSeverityFlags = flags.filter(f => f.severity === 'high').length;
  const mediumSeverityFlags = flags.filter(f => f.severity === 'medium').length;
  
  if (highSeverityFlags >= 2) {
    return `Priority: Critical - Immediate audit recommended due to multiple high-risk factors. Focus investigation on bubblegum product line reporting and recent tax filings.`;
  } else if (highSeverityFlags >= 1 || mediumSeverityFlags >= 2) {
    return `Priority: High - Audit recommended within next quarter. Review financial reporting consistency and tax compliance procedures.`;
  } else if (mediumSeverityFlags >= 1) {
    return `Priority: Medium - Schedule audit within next 6 months. Monitor for ongoing compliance and data quality improvements.`;
  } else {
    return `Priority: Low - Standard audit cycle sufficient. Continue regular monitoring.`;
  }
}
