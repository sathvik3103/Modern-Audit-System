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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Info, Brain, Download, ArrowLeft, Eye, MessageSquare, FileText, FileDown } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatPercentage } from "@/lib/audit-rules";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';

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
    display_name: string;
    formatted_value: string;
    contribution: number;
    context: string;
    raw_value: number;
  }>;
  feature_values: Record<string, number>;
  ai_summary?: string;
}

interface AnomalyFeedback {
  id: number;
  corpId: number;
  anomalySessionId: string;
  anomalyScore: string;
  detectionMethod: string;
  feedbackType: 'accept_anomaly' | 'false_positive' | 'false_negative' | 'ignore';
  auditorNotes: string | null;
  createdAt: Date;
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
  const [sessionId, setSessionId] = useState<string>('');
  const [feedbackMap, setFeedbackMap] = useState<Map<number, AnomalyFeedback>>(new Map());
  const [selectedAnomalies, setSelectedAnomalies] = useState<Set<number>>(new Set());
  const [bulkFeedbackOpen, setBulkFeedbackOpen] = useState(false);
  const [feedbackNotesOpen, setFeedbackNotesOpen] = useState(false);
  const [currentFeedbackCorpId, setCurrentFeedbackCorpId] = useState<number | null>(null);

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
        const newSessionId = `ml_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(newSessionId);
        setFeedbackMap(new Map());
        setSelectedAnomalies(new Set());
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
        parameters: parameters
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

  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async (feedback: {
      corpId: number;
      anomalyScore: number;
      detectionMethod: string;
      feedbackType: string;
      auditorNotes?: string;
    }) => {
      const response = await apiRequest('POST', '/api/anomaly-feedback', {
        ...feedback,
        anomalySessionId: sessionId,
        anomalyScore: feedback.anomalyScore.toString(),
        auditorNotes: feedback.auditorNotes || null,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setFeedbackMap(prev => new Map(prev.set(data.corpId, data)));
      queryClient.invalidateQueries({ queryKey: ['/api/anomaly-feedback', sessionId] });
      toast({
        title: "Feedback Saved",
        description: "Auditor feedback has been recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Feedback Failed",
        description: error instanceof Error ? error.message : "Failed to save feedback",
        variant: "destructive",
      });
    }
  });

  // Bulk feedback mutation
  const bulkFeedbackMutation = useMutation({
    mutationFn: async (feedback: {
      feedbackType: string;
      auditorNotes?: string;
      corpIds: number[];
    }) => {
      const promises = feedback.corpIds.map(corpId => {
        const anomaly = mlResult?.anomalies.find(a => a.corp_id === corpId);
        if (!anomaly) return null;
        
        return apiRequest('POST', '/api/anomaly-feedback', {
          corpId,
          anomalySessionId: sessionId,
          anomalyScore: anomaly.anomaly_score.toString(),
          detectionMethod: anomaly.detection_method,
          feedbackType: feedback.feedbackType,
          auditorNotes: feedback.auditorNotes || null,
        });
      });
      
      return Promise.all(promises.filter(p => p !== null));
    },
    onSuccess: (responses) => {
      const newFeedbackMap = new Map(feedbackMap);
      responses.forEach(async (response) => {
        if (response) {
          const data = await response.json();
          newFeedbackMap.set(data.corpId, data);
        }
      });
      setFeedbackMap(newFeedbackMap);
      setSelectedAnomalies(new Set());
      setBulkFeedbackOpen(false);
      toast({
        title: "Bulk Feedback Saved",
        description: `Applied feedback to ${responses.length} anomalies.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Bulk Feedback Failed",
        description: error instanceof Error ? error.message : "Failed to save bulk feedback",
        variant: "destructive",
      });
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

  const handleFeedback = (corpId: number, feedbackType: string, auditorNotes?: string) => {
    const anomaly = mlResult?.anomalies.find(a => a.corp_id === corpId);
    if (!anomaly) return;

    feedbackMutation.mutate({
      corpId,
      anomalyScore: anomaly.anomaly_score,
      detectionMethod: anomaly.detection_method,
      feedbackType,
      auditorNotes
    });
  };

  const handleToggleSelection = (corpId: number) => {
    const newSelection = new Set(selectedAnomalies);
    if (newSelection.has(corpId)) {
      newSelection.delete(corpId);
    } else {
      newSelection.add(corpId);
    }
    setSelectedAnomalies(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedAnomalies.size === mlResult?.anomalies.length) {
      setSelectedAnomalies(new Set());
    } else {
      setSelectedAnomalies(new Set(mlResult?.anomalies.map(a => a.corp_id) || []));
    }
  };

  const getFeedbackBadge = (corpId: number) => {
    const feedback = feedbackMap.get(corpId);
    if (!feedback) return null;

    const feedbackLabels = {
      accept_anomaly: { label: "Accepted", color: "bg-red-100 text-red-800" },
      false_positive: { label: "False +", color: "bg-yellow-100 text-yellow-800" },
      false_negative: { label: "False -", color: "bg-blue-100 text-blue-800" },
      ignore: { label: "Ignored", color: "bg-gray-100 text-gray-800" }
    };

    const config = feedbackLabels[feedback.feedbackType];
    return (
      <Badge variant="outline" className={`text-xs ${config.color}`}>
        {config.label}
      </Badge>
    );
  };



  const handleExportResults = () => {
    if (!mlResult || !mlResult.anomalies.length) return;

    const csvData = mlResult.anomalies.map(anomaly => {
      const feedback = feedbackMap.get(anomaly.corp_id);
      const feedbackLabels = {
        accept_anomaly: "Accepted",
        false_positive: "False Positive",
        false_negative: "False Negative",
        ignore: "Ignored"
      };

      return {
        company_name: anomaly.corp_name,
        corp_id: anomaly.corp_id,
        anomaly_score: anomaly.anomaly_score.toFixed(3),
        detection_method: anomaly.detection_method,
        taxable_income: anomaly.record_data.taxableIncome || '',
        salary: anomaly.record_data.salary || '',
        revenue: anomaly.record_data.revenue || '',
        amount_taxable: anomaly.record_data.amountTaxable || '',
        bubblegum_tax: anomaly.record_data.bubblegumTax || '',
        sales_tax_percent: anomaly.record_data.confectionarySalesTaxPercent || '',
        auditor_feedback: feedback ? feedbackLabels[feedback.feedbackType] || feedback.feedbackType : '',
        auditor_notes: feedback?.auditorNotes || '',
        session_id: sessionId
      };
    });

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ml_anomalies_with_feedback_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (!mlResult || !mlResult.anomalies.length) return;

    const doc = new jsPDF();
    const currentDate = new Date().toLocaleString();
    
    // Helper function to add text with automatic wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * fontSize * 0.4);
    };

    // Title and Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ML-Based Anomaly Detection Report', 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${currentDate}`, 20, 35);
    doc.text(`Session ID: ${sessionId}`, 20, 42);
    
    // Add horizontal line
    doc.setLineWidth(0.5);
    doc.line(20, 48, 190, 48);
    
    let currentY = 55;
    
    // Analysis Configuration Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Analysis Configuration', 20, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`• Contamination Rate: ${(mlResult.parameters_used.contamination * 100).toFixed(1)}%`, 25, currentY);
    currentY += 6;
    doc.text(`• Number of Neighbors: ${mlResult.parameters_used.n_neighbors}`, 25, currentY);
    currentY += 6;
    doc.text(`• Anomaly Threshold: ${mlResult.parameters_used.anomaly_threshold}`, 25, currentY);
    currentY += 15;
    
    // Summary Statistics Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Statistics', 20, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`• Total Records Analyzed: ${mlResult.total_records}`, 25, currentY);
    currentY += 6;
    doc.text(`• Anomalies Detected: ${mlResult.anomalies_detected}`, 25, currentY);
    currentY += 6;
    doc.text(`• Anomaly Rate: ${(mlResult.anomaly_rate * 100).toFixed(1)}%`, 25, currentY);
    currentY += 15;
    
    // Feature Importance Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Feature Importance', 20, currentY);
    currentY += 10;
    
    const featureEntries = Object.entries(mlResult.feature_importance || {})
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8); // Top 8 features
    
    featureEntries.forEach(([feature, importance]) => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const featureText = `• ${feature}: ${(importance * 100).toFixed(1)}%`;
      doc.text(featureText, 25, currentY);
      currentY += 6;
    });
    
    currentY += 10;
    
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage();
      currentY = 25;
    }
    
    // Detected Anomalies Table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detected Anomalies', 20, currentY);
    currentY += 15;
    
    // Table headers
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const headers = ['Company', 'Corp ID', 'Score', 'Method', 'Taxable Income', 'Bubblegum Tax', 'Feedback'];
    const columnWidths = [35, 20, 18, 20, 25, 25, 25];
    let startX = 20;
    
    headers.forEach((header, index) => {
      doc.text(header, startX, currentY);
      startX += columnWidths[index];
    });
    
    currentY += 8;
    
    // Table data
    doc.setFont('helvetica', 'normal');
    mlResult.anomalies.forEach((anomaly, index) => {
      if (currentY > 270) {
        doc.addPage();
        currentY = 25;
        
        // Repeat headers on new page
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        startX = 20;
        headers.forEach((header, i) => {
          doc.text(header, startX, currentY);
          startX += columnWidths[i];
        });
        currentY += 8;
        doc.setFont('helvetica', 'normal');
      }
      
      const feedback = feedbackMap.get(anomaly.corp_id);
      const feedbackLabels = {
        accept_anomaly: "Accepted",
        false_positive: "False +",
        false_negative: "False -",
        ignore: "Ignored"
      };
      
      const rowData = [
        anomaly.corp_name.length > 15 ? anomaly.corp_name.substring(0, 15) + '...' : anomaly.corp_name,
        anomaly.corp_id.toString(),
        anomaly.anomaly_score.toFixed(3),
        anomaly.detection_method === 'isolation_forest' ? 'Isolation F.' : 'LOF',
        formatCurrency(anomaly.record_data.taxableIncome),
        formatCurrency(anomaly.record_data.bubblegumTax),
        feedback ? feedbackLabels[feedback.feedbackType] || feedback.feedbackType : 'None'
      ];
      
      startX = 20;
      rowData.forEach((data, i) => {
        const text = data || '';
        doc.text(text.toString(), startX, currentY);
        startX += columnWidths[i];
      });
      
      currentY += 6;
    });
    
    // Add footer to all pages
    const totalPages = (doc as any).internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Page ${i} of ${totalPages}`, 170, 285);
      doc.text('ABCD Auditing - ML Anomaly Detection Report', 20, 285);
    }
    
    // Save the PDF
    const fileName = `ml_anomaly_detection_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    toast({
      title: "PDF Export Complete",
      description: "ML analysis report exported successfully",
    });
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
                  Expected proportion of anomalies (0.05 = 5%, 0.1 = 10%, 0.2 = 20%). Lower values find fewer, more certain anomalies.
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
                  How many similar companies to compare each record against. Lower values (5-15) find local outliers, higher values (20-40) find global patterns.
                </p>
              </div>
              
              <div>
                <Label htmlFor="threshold">Anomaly Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={parameters.anomaly_threshold}
                  onChange={(e) => setParameters({
                    ...parameters,
                    anomaly_threshold: parseFloat(e.target.value)
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  <Info className="w-3 h-3 inline mr-1" />
                  Minimum score to flag as anomaly. Typical range: 0.5 (catch more) to 1.5 (only most suspicious).
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
                      {selectedAnomalies.size > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBulkFeedbackOpen(true)}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Bulk Feedback ({selectedAnomalies.size})
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportResults}
                        disabled={mlResult.anomalies.length === 0}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportPDF}
                        disabled={mlResult.anomalies.length === 0}
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        Export PDF
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
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedAnomalies.size === mlResult.anomalies.length && mlResult.anomalies.length > 0}
                                onCheckedChange={handleSelectAll}
                              />
                            </TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Corp ID</TableHead>
                            <TableHead>Anomaly Score</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Taxable Income</TableHead>
                            <TableHead>Bubblegum Tax</TableHead>
                            <TableHead>Sales Tax %</TableHead>
                            <TableHead>Auditor Feedback</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mlResult.anomalies.map((anomaly, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedAnomalies.has(anomaly.corp_id)}
                                  onCheckedChange={() => handleToggleSelection(anomaly.corp_id)}
                                />
                              </TableCell>
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
                                <div className="flex items-center space-x-2">
                                  {getFeedbackBadge(anomaly.corp_id)}
                                  <Select
                                    onValueChange={(value) => handleFeedback(anomaly.corp_id, value)}
                                    disabled={feedbackMutation.isPending}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue placeholder="Add feedback" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="accept_anomaly">Accept Anomaly</SelectItem>
                                      <SelectItem value="false_positive">False Positive</SelectItem>
                                      <SelectItem value="false_negative">False Negative</SelectItem>
                                      <SelectItem value="ignore">Ignore</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {feedbackMap.has(anomaly.corp_id) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setCurrentFeedbackCorpId(anomaly.corp_id);
                                        setFeedbackNotesOpen(true);
                                      }}
                                    >
                                      <FileText className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
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
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Understanding Feature Importance</h3>
                    <p className="text-blue-800 text-sm leading-relaxed">
                      This analysis shows how much each financial metric contributes to anomaly detection. 
                      Higher percentages indicate features that are more influential in identifying unusual patterns. 
                      Features with high importance should be prioritized during manual audit reviews.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {Object.entries(mlResult.feature_importance).map(([feature, importance]) => {
                      const featureLabels: Record<string, string> = {
                        'taxableIncome': 'Taxable Income',
                        'salary': 'Total Payroll',
                        'revenue': 'Total Revenue',
                        'amountTaxable': 'Amount Taxable',
                        'bubblegumTax': 'Bubblegum Tax',
                        'confectionarySalesTaxPercent': 'Sales Tax Rate'
                      };
                      const displayName = featureLabels[feature] || feature;
                      const importanceLevel = importance > 0.25 ? 'High' : importance > 0.15 ? 'Medium' : 'Low';
                      
                      return (
                        <div key={feature} className="p-4 rounded-lg border bg-gradient-to-r from-blue-50 to-white hover:shadow-sm transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <h4 className="font-medium text-gray-900">{displayName}</h4>
                              <Badge variant="outline" className="text-xs">
                                {importanceLevel} Impact
                              </Badge>
                            </div>
                            <span className="text-lg font-bold text-blue-600">{(importance * 100).toFixed(1)}%</span>
                          </div>
                          
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
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">
                ML Insights - {selectedAnomaly?.corp_name}
              </DialogTitle>
            </div>
          </DialogHeader>
          
          {limeExplanation && (
            <div className="space-y-6">
              {/* AI Summary Section */}
              {limeExplanation.ai_summary && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Analysis Summary</h3>
                  <p className="text-blue-800 leading-relaxed">{limeExplanation.ai_summary}</p>
                </div>
              )}
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Left Panel - Visual Impact */}
                  <div className="space-y-3">
                    <h4 className="text-md font-medium text-gray-700 mb-3">Visual Impact</h4>
                    {limeExplanation.feature_contributions.map((contrib, index) => {
                      const isSuspicious = contrib.contribution > 0;
                      const maxContribution = Math.max(...limeExplanation.feature_contributions.map(c => Math.abs(c.contribution)));
                      const barWidth = Math.abs(contrib.contribution) / maxContribution * 100;
                      
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700">{contrib.display_name}</span>
                            <span className={`font-bold ${isSuspicious ? 'text-red-600' : 'text-green-600'}`}>
                              {contrib.contribution > 0 ? '+' : ''}{contrib.contribution.toFixed(3)}
                            </span>
                          </div>
                          <div className="relative h-6 bg-gray-100 rounded">
                            <div 
                              className={`h-full rounded transition-all ${
                                isSuspicious ? 'bg-red-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Panel - Detailed Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-md font-medium text-gray-700 mb-3">Detailed Breakdown</h4>
                    <div className="space-y-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 font-medium text-gray-700">Feature</th>
                            <th className="text-left py-2 font-medium text-gray-700">Value</th>
                            <th className="text-left py-2 font-medium text-gray-700">Impact Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {limeExplanation.feature_contributions.map((contrib, index) => {
                            const isSuspicious = contrib.contribution > 0;
                            return (
                              <tr key={index} className="border-b last:border-b-0">
                                <td className="py-3">
                                  <div className="space-y-1">
                                    <div className="font-medium text-gray-900">{contrib.display_name}</div>
                                    <div className="text-xs text-gray-500">{contrib.context}</div>
                                  </div>
                                </td>
                                <td className="py-3">
                                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                    {contrib.formatted_value}
                                  </span>
                                </td>
                                <td className="py-3">
                                  <span className={`font-bold ${isSuspicious ? 'text-red-600' : 'text-green-600'}`}>
                                    {contrib.contribution > 0 ? '+' : ''}{contrib.contribution.toFixed(3)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
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

      {/* Bulk Feedback Dialog */}
      <Dialog open={bulkFeedbackOpen} onOpenChange={setBulkFeedbackOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Auditor Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Apply feedback to {selectedAnomalies.size} selected anomalies.
            </p>
            <div className="space-y-2">
              <Label>Feedback Type</Label>
              <Select onValueChange={(value) => {
                const notes = document.getElementById('bulk-notes') as HTMLTextAreaElement;
                bulkFeedbackMutation.mutate({
                  feedbackType: value,
                  auditorNotes: notes?.value || undefined,
                  corpIds: Array.from(selectedAnomalies)
                });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select feedback type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accept_anomaly">Accept Anomaly</SelectItem>
                  <SelectItem value="false_positive">False Positive</SelectItem>
                  <SelectItem value="false_negative">False Negative</SelectItem>
                  <SelectItem value="ignore">Ignore</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-notes">Notes (Optional)</Label>
              <Textarea
                id="bulk-notes"
                placeholder="Add notes for all selected anomalies..."
                rows={3}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Notes Dialog */}
      <Dialog open={feedbackNotesOpen} onOpenChange={setFeedbackNotesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Auditor Notes</DialogTitle>
          </DialogHeader>
          {currentFeedbackCorpId && feedbackMap.has(currentFeedbackCorpId) && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-medium">
                  {mlResult?.anomalies.find(a => a.corp_id === currentFeedbackCorpId)?.corp_name}
                </h4>
                <p className="text-sm text-gray-600">
                  Corp ID: {currentFeedbackCorpId}
                </p>
                <div className="mt-2">
                  {getFeedbackBadge(currentFeedbackCorpId)}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Current Notes</Label>
                <div className="p-3 border rounded bg-gray-50 min-h-[100px]">
                  {feedbackMap.get(currentFeedbackCorpId)?.auditorNotes || "No notes added"}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-notes">Update Notes</Label>
                <Textarea
                  id="new-notes"
                  placeholder="Update auditor notes..."
                  rows={3}
                  defaultValue={feedbackMap.get(currentFeedbackCorpId)?.auditorNotes || ""}
                />
                <Button
                  onClick={() => {
                    const textarea = document.getElementById('new-notes') as HTMLTextAreaElement;
                    const feedback = feedbackMap.get(currentFeedbackCorpId!);
                    if (feedback && textarea) {
                      handleFeedback(currentFeedbackCorpId!, feedback.feedbackType, textarea.value);
                      setFeedbackNotesOpen(false);
                    }
                  }}
                  disabled={feedbackMutation.isPending}
                >
                  Update Notes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}