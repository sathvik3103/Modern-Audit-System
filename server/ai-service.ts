
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

export interface MLExplanationRequest {
  company: {
    corpName: string;
    corpId: number;
  };
  anomalyScore: number;
  predictionProbabilities: {
    normal: number;
    anomaly: number;
  };
  featureContributions: Array<{
    display_name: string;
    formatted_value: string;
    contribution: number;
    context: string;
  }>;
}

export async function generateMLExplanationSummary(request: MLExplanationRequest): Promise<string> {
  try {
    const client = getOpenAIClient();
    
    // Prepare feature contributions summary
    const topContributions = request.featureContributions.slice(0, 5);
    const suspiciousFeatures = topContributions.filter(f => f.contribution > 0);
    const normalFeatures = topContributions.filter(f => f.contribution < 0);
    
    const prompt = `You are an expert financial auditor analyzing why a company was flagged as anomalous by machine learning.

Company: ${request.company.corpName} (ID: ${request.company.corpId})
Anomaly Probability: ${(request.predictionProbabilities.anomaly * 100).toFixed(1)}%
Normal Probability: ${(request.predictionProbabilities.normal * 100).toFixed(1)}%

Key Contributing Factors:
${suspiciousFeatures.length > 0 ? `
Suspicious Indicators:
${suspiciousFeatures.map(f => `- ${f.display_name}: ${f.formatted_value} (${f.context})`).join('\n')}
` : ''}
${normalFeatures.length > 0 ? `
Normal Indicators:
${normalFeatures.map(f => `- ${f.display_name}: ${f.formatted_value} (${f.context})`).join('\n')}
` : ''}

Provide a clear, professional summary (2-3 sentences) explaining:
1. Why this company was flagged as anomalous
2. The main areas of concern for auditors
3. What auditors should investigate first

Write in simple, non-technical language that both technical and non-technical users can understand. Focus on actionable insights for audit prioritization.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert financial auditor providing clear, actionable insights for audit prioritization. Keep responses concise and professional.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    return response.choices[0]?.message?.content || 'Unable to generate explanation summary.';
  } catch (error) {
    console.error('Error generating ML explanation summary:', error);
    return 'ML analysis complete. Review the feature contributions below for detailed insights.';
  }
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
