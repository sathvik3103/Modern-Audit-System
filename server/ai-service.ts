
import OpenAI from 'openai';

// Initialize OpenAI client lazily to avoid startup errors
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required but not configured');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

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

    const prompt = `Analyze ${request.company.corpName} (ID: ${request.company.corpId}) for audit prioritization. Be concise and specific.

DATA: Income: ${request.company.taxableIncome || 'N/A'}, Salary: ${request.company.salary || 'N/A'}, Revenue: ${request.company.revenue || 'N/A'}, Bubblegum Tax: ${request.company.bubblegumTax || 'N/A'}, Sales Tax: ${request.company.confectionarySalesTaxPercent || 'N/A'}%

AUDIT: ${request.audit ? `Last audit ${request.audit.yearsAgo} years ago` : 'Never audited'}

FLAGS: ${request.flags.map(flag => flag.flagReason).join(', ')}

RISK: ${riskLevel.toUpperCase()} (${totalRiskScore} points)

Provide a brief analysis focusing on key risks and specific actions needed. Keep response under 300 characters.`;

    const completion = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a tax auditor. Provide concise, actionable analysis in under 300 characters. Focus on key risks and specific actions needed."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      max_tokens: 80,
      temperature: 0.4,
    });

    return completion.choices[0]?.message?.content || "Unable to generate AI insights at this time.";
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate AI insights');
  }
}
