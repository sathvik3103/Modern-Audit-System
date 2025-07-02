import { pgTable, text, serial, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  corpName: text("corp_name").notNull(),
  corpId: integer("corp_id").notNull().unique(),
  periodStartDate: timestamp("period_start_date").notNull(),
  periodEndDate: timestamp("period_end_date").notNull(),
  taxableIncome: text("taxable_income"),
  salary: text("salary"),
  revenue: text("revenue"),
  amountTaxable: text("amount_taxable"),
  bubblegumTax: text("bubblegum_tax"),
  confectionarySalesTaxPercent: text("confectionary_sales_tax_percent"),
});

export const audits = pgTable("audits", {
  id: serial("id").primaryKey(),
  corpId: integer("corp_id").notNull(),
  corpName: text("corp_name").notNull(),
  auditDate: timestamp("audit_date").notNull(),
});

export const auditFlags = pgTable("audit_flags", {
  id: serial("id").primaryKey(),
  corpId: integer("corp_id").notNull(),
  flagType: text("flag_type").notNull(), // 'high_bubblegum_tax', 'old_audit', 'high_sales_tax', 'missing_data'
  flagReason: text("flag_reason").notNull(),
  severity: text("severity").notNull(), // 'high', 'medium', 'low'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
});

export const insertAuditSchema = createInsertSchema(audits).omit({
  id: true,
});

export const insertAuditFlagSchema = createInsertSchema(auditFlags).omit({
  id: true,
  createdAt: true,
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Audit = typeof audits.$inferSelect;
export type InsertAudit = z.infer<typeof insertAuditSchema>;
export type AuditFlag = typeof auditFlags.$inferSelect;
export type InsertAuditFlag = z.infer<typeof insertAuditFlagSchema>;

// Additional types for API responses
export const auditRulesSchema = z.object({
  bubblegumThreshold: z.number().min(0),
  bubblegumEnabled: z.boolean(),
  auditYearsThreshold: z.number().min(1),
  auditRecencyEnabled: z.boolean(),
  salesTaxThreshold: z.number().min(0).max(100),
  salesTaxEnabled: z.boolean(),
  checkMissingSalary: z.boolean(),
  checkMissingRevenue: z.boolean(),
  dataConsistencyEnabled: z.boolean(),
});

export type AuditRules = z.infer<typeof auditRulesSchema>;

export const flaggedCompanySchema = z.object({
  company: z.object({
    id: z.number(),
    corpName: z.string(),
    corpId: z.number(),
    periodStartDate: z.string(),
    periodEndDate: z.string(),
    taxableIncome: z.string().nullable(),
    salary: z.string().nullable(),
    revenue: z.string().nullable(),
    amountTaxable: z.string().nullable(),
    bubblegumTax: z.string().nullable(),
    confectionarySalesTaxPercent: z.string().nullable(),
  }),
  audit: z.object({
    auditDate: z.string().nullable(),
  }).nullable(),
  flags: z.array(z.object({
    flagType: z.string(),
    flagReason: z.string(),
    severity: z.string(),
  })),
  riskLevel: z.string(),
  riskScore: z.number(),
});

export type FlaggedCompany = z.infer<typeof flaggedCompanySchema>;
