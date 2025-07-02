
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AIInsightRequest {
  company: {
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
  };
  audit?: {
    auditDate: string;
    yearsAgo: number;
  } | null;
  flags: Array<{
    flagType: string;
    flagReason: string;
    riskScore: number;
  }>;
  auditRules: {
    bubblegumThreshold: number;
    bubblegumRiskScore: number;
    auditYearsThreshold: number;
    auditRecencyRiskScore: number;
    salesTaxThreshold: number;
    salesTaxRiskScore: number;
    missingSalaryRiskScore: number;
    missingRevenueRiskScore: number;
    dataConsistencyRiskScore: number;
    highRiskThreshold: number;
    mediumRiskThreshold: number;
  };
}

export async function generateAIInsights(request: AIInsightRequest): Promise<string> {
  try {
    const totalRiskScore = request.flags.reduce((sum, flag) => sum + flag.riskScore, 0);
    
    let riskLevel = "low";
    if (totalRiskScore >= request.auditRules.highRiskThreshold) riskLevel = "high";
    else if (totalRiskScore >= request.auditRules.mediumRiskThreshold) riskLevel = "medium";

    const prompt = `You are an expert tax auditor analyzing a confectionery company's data for audit prioritization. Provide a comprehensive analysis explaining why this company was flagged.

COMPANY DETAILS:
- Name: ${request.company.corpName}
- Corp ID: ${request.company.corpId}
- Period: ${request.company.periodStartDate} to ${request.company.periodEndDate}
- Taxable Income: ${request.company.taxableIncome || 'Not provided'}
- Salary: ${request.company.salary || 'Not provided'}
- Revenue: ${request.company.revenue || 'Not provided'}
- Amount Taxable: ${request.company.amountTaxable || 'Not provided'}
- Bubblegum Tax: ${request.company.bubblegumTax || 'Not provided'}
- Confectionary Sales Tax %: ${request.company.confectionarySalesTaxPercent || 'Not provided'}

AUDIT HISTORY:
${request.audit ? `- Last audited: ${request.audit.auditDate} (${request.audit.yearsAgo} years ago)` : '- Never been audited'}

AUDIT RULES & THRESHOLDS:
- Bubblegum Tax Threshold: $${request.auditRules.bubblegumThreshold.toLocaleString()} (Risk Score: ${request.auditRules.bubblegumRiskScore})
- Audit Recency Threshold: ${request.auditRules.auditYearsThreshold} years (Risk Score: ${request.auditRules.auditRecencyRiskScore})
- Sales Tax % Threshold: ${request.auditRules.salesTaxThreshold}% (Risk Score: ${request.auditRules.salesTaxRiskScore})
- Missing Salary Risk Score: ${request.auditRules.missingSalaryRiskScore}
- Missing Revenue Risk Score: ${request.auditRules.missingRevenueRiskScore}
- Data Consistency Risk Score: ${request.auditRules.dataConsistencyRiskScore}
- High Risk Threshold: ${request.auditRules.highRiskThreshold} points
- Medium Risk Threshold: ${request.auditRules.mediumRiskThreshold} points

SPECIFIC FLAGS TRIGGERED:
${request.flags.map(flag => `- ${flag.flagReason} (${flag.riskScore} points)`).join('\n')}

RISK ASSESSMENT:
- Total Risk Score: ${totalRiskScore} points
- Risk Level: ${riskLevel.toUpperCase()}

Please provide a detailed analysis that:
1. Explains each flag in context of the company's financial profile
2. Assesses the significance of missing or unusual data patterns
3. Evaluates the audit history and compliance risk
4. Provides specific recommendations for audit focus areas
5. Considers industry context for confectionery businesses

Format your response as a clear, professional audit memo that explains the reasoning behind the flagging decision and provides actionable insights for the audit team.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an experienced tax auditor specializing in corporate compliance for confectionery businesses. Provide clear, professional analysis based on the data provided."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    return completion.choices[0]?.message?.content || "Unable to generate AI insights at this time.";
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate AI insights');
  }
}
