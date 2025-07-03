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
  riskScore: integer("risk_score").notNull(), // User-defined risk score for this flag
  createdAt: timestamp("created_at").defaultNow(),
});

export const anomalyFeedback = pgTable("anomaly_feedback", {
  id: serial("id").primaryKey(),
  corpId: integer("corp_id").notNull(),
  anomalySessionId: text("anomaly_session_id").notNull(),
  anomalyScore: decimal("anomaly_score", { precision: 10, scale: 6 }).notNull(),
  detectionMethod: text("detection_method").notNull(), // 'isolation_forest' or 'lof'
  feedbackType: text("feedback_type").notNull(), // 'accept_anomaly', 'false_positive', 'false_negative', 'ignore'
  auditorNotes: text("auditor_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customRules = pgTable("custom_rules", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  ruleName: text("rule_name").notNull(),
  fieldName: text("field_name").notNull(), // Which company field to evaluate
  operator: text("operator").notNull(), // '>', '<', '>=', '<=', '==', '!=', 'contains', 'not_contains', 'empty', 'not_empty'
  value: text("value"), // Threshold value or comparison value (null for empty/not_empty checks)
  riskScore: integer("risk_score").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const insertAnomalyFeedbackSchema = createInsertSchema(anomalyFeedback).omit({
  id: true,
  createdAt: true,
});

export const insertCustomRuleSchema = createInsertSchema(customRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Audit = typeof audits.$inferSelect;
export type InsertAudit = z.infer<typeof insertAuditSchema>;
export type AuditFlag = typeof auditFlags.$inferSelect;
export type InsertAuditFlag = z.infer<typeof insertAuditFlagSchema>;
export type AnomalyFeedback = typeof anomalyFeedback.$inferSelect;
export type InsertAnomalyFeedback = z.infer<typeof insertAnomalyFeedbackSchema>;
export type CustomRule = typeof customRules.$inferSelect;
export type InsertCustomRule = z.infer<typeof insertCustomRuleSchema>;

// Custom rule validation schema
export const customRuleSchema = z.object({
  id: z.number().optional(),
  sessionId: z.string(),
  ruleName: z.string().min(1, "Rule name is required"),
  fieldName: z.string().min(1, "Field name is required"),
  operator: z.enum(['>', '<', '>=', '<=', '==', '!=', 'contains', 'not_contains', 'empty', 'not_empty']),
  value: z.string().optional(),
  riskScore: z.number().min(0).max(100),
  enabled: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// Additional types for API responses
export const auditRulesSchema = z.object({
  bubblegumThreshold: z.number().min(0),
  bubblegumEnabled: z.boolean(),
  bubblegumRiskScore: z.number().min(0).max(100),
  auditYearsThreshold: z.number().min(1),
  auditRecencyEnabled: z.boolean(),
  auditRecencyRiskScore: z.number().min(0).max(100),
  salesTaxThreshold: z.number().min(0).max(100),
  salesTaxEnabled: z.boolean(),
  salesTaxRiskScore: z.number().min(0).max(100),
  checkMissingSalary: z.boolean(),
  missingSalaryRiskScore: z.number().min(0).max(100),
  checkMissingRevenue: z.boolean(),
  missingRevenueRiskScore: z.number().min(0).max(100),
  dataConsistencyEnabled: z.boolean(),
  dataConsistencyRiskScore: z.number().min(0).max(100),
  // Risk level thresholds
  highRiskThreshold: z.number().min(0).max(200),
  mediumRiskThreshold: z.number().min(0).max(200),
  // Custom rules
  customRules: z.array(customRuleSchema).default([]),
});

export type AuditRules = z.infer<typeof auditRulesSchema>;
export type CustomRuleType = z.infer<typeof customRuleSchema>;

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
    riskScore: z.number(),
  })),
  riskLevel: z.string(),
  riskScore: z.number(),
});

export type FlaggedCompany = z.infer<typeof flaggedCompanySchema>;
