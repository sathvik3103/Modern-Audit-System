import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Info, Brain, Download, ArrowLeft, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatPercentage } from "@/lib/audit-rules";
import { useToast } from "@/hooks/use-toast";

interface MLParameters {
  contamination: number;
  n_neighbors: number;
  anomaly_threshold: number;
}

interface MLAnomaly {
  record_index: number;
  record_id: number;
  corp_name: string;
  corp_id: number;
  anomaly_score: number;
  detection_method: string;
  record_data: any;
}

interface MLResult {
  success: boolean;
  total_records: number;
  anomalies_detected: number;
  anomaly_rate: number;
  parameters_used: MLParameters;
  feature_importance: Record<string, number>;
  anomalies: MLAnomaly[];
}

interface LimeExplanation {
  record_index: number;
  anomaly_score: number;
  prediction_probabilities: {
    normal: number;
    anomaly: number;
  };
  feature_contributions: Array<{
    feature: string;
    contribution: number;
    value: number;
  }>;
  feature_values: Record<string, number>;
}

export default function MLAnalysisPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [parameters, setParameters] = useState<MLParameters>({
    contamination: 0.1,
    n_neighbors: 20,
    anomaly_threshold: 0.5
  });
  const [mlResult, setMlResult] = useState<MLResult | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<MLAnomaly | null>(null);
  const [limeExplanation, setLimeExplanation] = useState<LimeExplanation | null>(null);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [explanationStyle, setExplanationStyle] = useState('thresholds');

  // Check if we have data
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ['/api/companies-raw'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/companies-raw');
      return response.json();
    },
  });

  // ML Analysis mutation
  const mlAnalysisMutation = useMutation({
    mutationFn: async (params: MLParameters) => {
      const response = await apiRequest('POST', '/api/ml/analyze', {
        parameters: params
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setMlResult(data);
        toast({
          title: "Analysis Complete",
          description: `Found ${data.anomalies_detected} anomalies out of ${data.total_records} records`,
        });
      } else {
        toast({
          title: "Analysis Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  });

  // LIME Explanation mutation
  const explanationMutation = useMutation({
    mutationFn: async ({ recordIndex, anomalyScore }: { recordIndex: number; anomalyScore: number }) => {
      const response = await apiRequest('POST', `/api/ml/explain/${recordIndex}`, {
        anomaly_score: anomalyScore,
        parameters: parameters,
        explanation_style: explanationStyle
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setLimeExplanation(data.explanation);
        setExplanationOpen(true);
      } else {
        toast({
          title: "Explanation Failed",
          description: data.error || "Could not generate explanation",
          variant: "destructive",
        });
      }
    }
  });

  const handleRunAnalysis = () => {
    mlAnalysisMutation.mutate(parameters);
  };

  const handleShowExplanation = (anomaly: MLAnomaly) => {
    setSelectedAnomaly(anomaly);
    explanationMutation.mutate({
      recordIndex: anomaly.record_index,
      anomalyScore: anomaly.anomaly_score
    });
  };

  // Helper function to format feature names for better readability
  const formatFeatureName = (featureName: string) => {
    // Extract base feature name and additional info
    const baseFeature = featureName.split(' ')[0].split('<')[0].split('>')[0];
    
    const featureLabels: Record<string, { label: string; description: string; icon: string }> = {
      'taxableIncome': {
        label: 'taxableIncome',
        description: 'Company\'s reported taxable income for the period',
        icon: '💰'
      },
      'salary': {
        label: 'salary',
        description: 'Total employee salary and payroll expenses',
        icon: '👥'
      },
      'revenue': {
        label: 'revenue',
        description: 'Company\'s total revenue for the reporting period',
        icon: '📈'
      },
      'amountTaxable': {
        label: 'amountTaxable',
        description: 'Total amount subject to taxation',
        icon: '🏛️'
      },
      'bubblegumTax': {
        label: 'bubblegumTax',
        description: 'Specific tax on bubblegum confectionery products',
        icon: '🍬'
      },
      'confectionarySalesTaxPercent': {
        label: 'confectionarySalesTaxPercent',
        description: 'Sales tax percentage applied to confectionery products',
        icon: '📊'
      }
    };

    const baseInfo = featureLabels[baseFeature] || {
      label: baseFeature,
      description: `Analysis of ${baseFeature}`,
      icon: '📋'
    };

    // Add quartile/percentile/threshold info to the description
    let enhancedDescription = baseInfo.description;
    if (featureName.includes('Q1')) enhancedDescription += ' (Low quartile - bottom 25%)';
    else if (featureName.includes('Q2')) enhancedDescription += ' (Below average - 25th-50th percentile)';
    else if (featureName.includes('Q3')) enhancedDescription += ' (Above average - 50th-75th percentile)';
    else if (featureName.includes('Q4')) enhancedDescription += ' (High quartile - top 25%)';
    else if (featureName.includes('percentile')) enhancedDescription += ' (Ranked against other companies)';
    else if (featureName.includes('std')) enhancedDescription += ' (Standard deviations from average)';
    else if (featureName.includes('>') || featureName.includes('<')) enhancedDescription += ' (Threshold-based analysis)';

    return {
      label: `${baseInfo.icon} ${baseInfo.label}`,
      description: enhancedDescription,
      baseFeature: baseFeature
    };
  };

  const formatFeatureValue = (value: number, baseFeature: string): string => {
    if (baseFeature === 'confectionarySalesTaxPercent') {
      return `${value}%`;
    } else if (['taxableIncome', 'salary', 'revenue', 'amountTaxable', 'bubblegumTax'].includes(baseFeature)) {
      return value > 0 ? `$${value.toLocaleString()}` : '$0';
    }
    return value.toString();
  };

  const handleExportResults = () => {
    if (!mlResult || !mlResult.anomalies.length) return;

    const csvData = mlResult.anomalies.map(anomaly => ({
      company_name: anomaly.corp_name,
      corp_id: anomaly.corp_id,
      anomaly_score: anomaly.anomaly_score.toFixed(3),
      detection_method: anomaly.detection_method,
      taxable_income: anomaly.record_data.taxableIncome,
      salary: anomaly.record_data.salary,
      revenue: anomaly.record_data.revenue,
      amount_taxable: anomaly.record_data.amountTaxable,
      bubblegum_tax: anomaly.record_data.bubblegumTax,
      sales_tax_percent: anomaly.record_data.confectionarySalesTaxPercent
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ml_anomalies_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRiskColor = (score: number) => {
    if (score >= 0.7) return "bg-red-500";
    if (score >= 0.5) return "bg-orange-500";
    return "bg-yellow-500";
  };

  const getContributionColor = (contribution: number) => {
    if (contribution > 0) return "text-red-600";
    return "text-green-600";
  };

  if (companies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-gray-600 mb-4">
              Please upload data first to run ML analysis.
            </p>
            <Button onClick={() => setLocation("/")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Upload
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/audit")}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Audit Dashboard
              </Button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Step 4: ML-Based Anomaly Detection</h1>
                <p className="text-gray-600">Advanced pattern detection using machine learning</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-sm">
                <Brain className="w-3 h-3 mr-1" />
                ML Analysis
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="w-5 h-5 mr-2" />
              ML Analysis Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="contamination">Contamination Rate</Label>
                <Input
                  id="contamination"
                  type="number"
                  min="0.05"
                  max="0.5"
                  step="0.05"
                  value={parameters.contamination}
                  onChange={(e) => setParameters({
                    ...parameters,
                    contamination: parseFloat(e.target.value)
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  <Info className="w-3 h-3 inline mr-1" />
                  Expected proportion of anomalies in your data (5%-50%). Lower values find fewer, but more certain anomalies.
                </p>
              </div>
              
              <div>
                <Label htmlFor="neighbors">Number of Neighbors</Label>
                <Input
                  id="neighbors"
                  type="number"
                  min="5"
                  max="50"
                  value={parameters.n_neighbors}
                  onChange={(e) => setParameters({
                    ...parameters,
                    n_neighbors: parseInt(e.target.value)
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  <Info className="w-3 h-3 inline mr-1" />
                  How many nearby records to compare against. Higher values find more global patterns.
                </p>
              </div>
              
              <div>
                <Label htmlFor="threshold">Anomaly Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={parameters.anomaly_threshold}
                  onChange={(e) => setParameters({
                    ...parameters,
                    anomaly_threshold: parseFloat(e.target.value)
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  <Info className="w-3 h-3 inline mr-1" />
                  Minimum score to flag as anomaly (0.1-1.0). Higher values show only the most unusual records.
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleRunAnalysis}
                disabled={mlAnalysisMutation.isPending}
                className="px-8 py-2"
              >
                {mlAnalysisMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Running Analysis...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Run Advanced Analysis
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {mlResult && (
          <Tabs defaultValue="anomalies" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="anomalies">Detected Anomalies</TabsTrigger>
              <TabsTrigger value="insights">Feature Importance</TabsTrigger>
            </TabsList>

            <TabsContent value="anomalies">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Anomaly Detection Results</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {mlResult.anomalies_detected} / {mlResult.total_records} records
                      </Badge>
                      <Badge variant="outline">
                        {(mlResult.anomaly_rate * 100).toFixed(1)}% anomaly rate
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportResults}
                        disabled={mlResult.anomalies.length === 0}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {mlResult.anomalies.length === 0 ? (
                    <div className="text-center py-8">
                      <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No anomalies detected with current parameters.</p>
                      <p className="text-sm text-gray-500 mt-2">Try lowering the contamination rate or anomaly threshold.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead>Corp ID</TableHead>
                            <TableHead>Anomaly Score</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Taxable Income</TableHead>
                            <TableHead>Bubblegum Tax</TableHead>
                            <TableHead>Sales Tax %</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mlResult.anomalies.map((anomaly, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{anomaly.corp_name}</TableCell>
                              <TableCell>{anomaly.corp_id}</TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <div className={`w-3 h-3 rounded-full ${getRiskColor(anomaly.anomaly_score)}`}></div>
                                  <span className="font-mono text-sm">{anomaly.anomaly_score.toFixed(3)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {anomaly.detection_method}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatCurrency(anomaly.record_data.taxableIncome)}</TableCell>
                              <TableCell>{formatCurrency(anomaly.record_data.bubblegumTax)}</TableCell>
                              <TableCell>{formatPercentage(anomaly.record_data.confectionarySalesTaxPercent)}</TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleShowExplanation(anomaly)}
                                  disabled={explanationMutation.isPending}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Explain
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights">
              <Card>
                <CardHeader>
                  <CardTitle>Feature Importance Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(mlResult.feature_importance).map(([feature, importance]) => {
                      const humanReadableFeature = formatFeatureName(feature);
                      const importanceLevel = importance > 0.25 ? 'High' : importance > 0.15 ? 'Medium' : 'Low';
                      
                      return (
                        <div key={feature} className="p-4 rounded-lg border bg-gradient-to-r from-blue-50 to-white hover:shadow-sm transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <h4 className="font-medium text-gray-900">{humanReadableFeature.label}</h4>
                              <Badge variant="outline" className="text-xs">
                                {importanceLevel} Impact
                              </Badge>
                            </div>
                            <span className="text-lg font-bold text-blue-600">{(importance * 100).toFixed(1)}%</span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{humanReadableFeature.description}</p>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700"
                                style={{ width: `${importance * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* LIME Explanation Modal */}
      <Dialog open={explanationOpen} onOpenChange={setExplanationOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>ML Insights - {selectedAnomaly?.corp_name}</DialogTitle>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Explanation Style:</label>
                <select 
                  value={explanationStyle} 
                  onChange={(e) => {
                    const newStyle = e.target.value;
                    setExplanationStyle(newStyle);
                    // Automatically refresh explanation with new style
                    if (selectedAnomaly) {
                      // Use the new style value directly in the API call
                      apiRequest('POST', `/api/ml/explain/${selectedAnomaly.record_index}`, {
                        anomaly_score: selectedAnomaly.anomaly_score,
                        parameters: parameters,
                        explanation_style: newStyle
                      })
                      .then(response => response.json())
                      .then(data => {
                        if (data.success) {
                          setLimeExplanation(data.explanation);
                        }
                      })
                      .catch(error => {
                        console.error('Error fetching explanation:', error);
                      });
                    }
                  }}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="thresholds">Business Thresholds</option>
                  <option value="raw">Raw Features</option>
                  <option value="percentiles">Percentile Ranking</option>
                  <option value="quartiles">Quartile Analysis</option>
                  <option value="std_dev">Standard Deviations</option>
                </select>

              </div>
            </div>
          </DialogHeader>
          
          {limeExplanation && (
            <div className="space-y-6">
              {/* Explanation Style Info */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 text-sm">
                <div className="font-medium text-blue-800 mb-1">
                  {explanationStyle === 'thresholds' && 'Business Thresholds'}
                  {explanationStyle === 'raw' && 'Raw Features'}
                  {explanationStyle === 'percentiles' && 'Percentile Ranking'}
                  {explanationStyle === 'quartiles' && 'Quartile Analysis'}
                  {explanationStyle === 'std_dev' && 'Standard Deviations'}
                </div>
                <div className="text-blue-700">
                  {explanationStyle === 'thresholds' && 'Shows business-relevant thresholds like "bubblegumTax > $99,375"'}
                  {explanationStyle === 'raw' && 'Shows simple feature names without thresholds or comparisons'}
                  {explanationStyle === 'percentiles' && 'Shows where each value ranks compared to other companies (e.g., "95th percentile")'}
                  {explanationStyle === 'quartiles' && 'Shows which quartile each value falls into (Q1-Low to Q4-High)'}
                  {explanationStyle === 'std_dev' && 'Shows how many standard deviations each value is from the mean'}
                </div>
              </div>
              {/* Prediction Probabilities */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Normal Probability</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {(limeExplanation.prediction_probabilities.normal * 100).toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Anomaly Probability</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {(limeExplanation.prediction_probabilities.anomaly * 100).toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Feature Contributions */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Feature Contributions</h3>
                <div className="space-y-4">
                  {limeExplanation.feature_contributions.map((contrib, index) => {
                    const isIncrease = contrib.contribution > 0;
                    const humanReadableFeature = formatFeatureName(contrib.feature);
                    const absContribution = Math.abs(contrib.contribution);
                    
                    return (
                      <div key={index} className={`p-5 rounded-lg border-l-4 transition-all hover:shadow-md ${
                        isIncrease 
                          ? 'border-l-red-500 bg-gradient-to-r from-red-50 to-white' 
                          : 'border-l-green-500 bg-gradient-to-r from-green-50 to-white'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h4 className="text-lg font-medium text-gray-900">
                                {humanReadableFeature.label}
                              </h4>
                              <Badge 
                                variant={isIncrease ? "destructive" : "default"} 
                                className={`text-xs font-medium ${
                                  isIncrease 
                                    ? 'bg-red-100 text-red-800 border-red-200' 
                                    : 'bg-green-100 text-green-800 border-green-200'
                                }`}
                              >
                                {isIncrease ? '⚠️ Risk Factor' : '✅ Normal Factor'}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                              {humanReadableFeature.description}
                            </p>
                            
                            <div className="grid grid-cols-2 gap-6 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 font-medium">Company Value:</span>
                                <span className="font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                  {formatFeatureValue(contrib.value, humanReadableFeature.baseFeature)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 font-medium">Impact Score:</span>
                                <span className={`font-bold text-lg ${isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                                  {isIncrease ? '+' : ''}{contrib.contribution.toFixed(3)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Visual contribution indicator */}
                          <div className="ml-6 flex flex-col items-center">
                            <div className="text-xs text-gray-500 mb-2 font-medium">Impact Level</div>
                            <div className="relative">
                              <div className="w-16 h-2 bg-gray-200 rounded-full">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isIncrease ? 'bg-red-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(absContribution * 500, 100)}%` }}
                                ></div>
                              </div>
                              <div className={`text-xs mt-1 text-center font-medium ${
                                isIncrease ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {absContribution > 0.01 ? 'High' : absContribution > 0.005 ? 'Medium' : 'Low'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {explanationMutation.isPending && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Generating explanation...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}