import { useState, useEffect } from "react";
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
import { Info, Brain, Download, ArrowLeft, Eye, MessageSquare, FileText, FileDown, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatPercentage } from "@/lib/audit-rules";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/contexts/SessionContext";
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
  const { session, updateMLParameters, setCurrentStep, markStepCompleted } = useSession();

  // Use parameters from session context
  const parameters = session.mlParameters;

  // Update current step on mount
  useEffect(() => {
    setCurrentStep(4);
  }, [setCurrentStep]);
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
  const [explanationPanelOpen, setExplanationPanelOpen] = useState(false);
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

  const handleExportPDF = async () => {
    if (!mlResult || !mlResult.anomalies.length) return;

    // Show loading toast
    toast({
      title: "Generating PDF Report",
      description: "Fetching detailed explanations for all anomalies...",
    });

    // Fetch explanations for all anomalies
    const explanations = new Map<number, LimeExplanation>();
    for (const anomaly of mlResult.anomalies) {
      try {
        const response = await apiRequest('POST', `/api/ml/explain/${anomaly.record_index}`, {
          anomaly_score: anomaly.anomaly_score,
          explanation_style: 'thresholds',
          parameters: parameters
        });
        const data = await response.json();
        if (data.success && data.explanation) {
          explanations.set(anomaly.corp_id, data.explanation);
          console.log(`Fetched explanation for ${anomaly.corp_name}:`, data.explanation);
        } else {
          console.warn(`No explanation data for ${anomaly.corp_name}:`, data);
        }
      } catch (error) {
        console.error(`Failed to fetch explanation for ${anomaly.corp_name}:`, error);
      }
    }
    
    console.log(`Total explanations fetched: ${explanations.size} out of ${mlResult.anomalies.length} anomalies`);

    const doc = new jsPDF();
    const currentDate = new Date().toLocaleString();
    
    // Color scheme matching the UI
    const colors = {
      primary: [59, 130, 246], // Blue
      secondary: [16, 185, 129], // Green
      accent: [245, 101, 101], // Red
      warning: [251, 191, 36], // Yellow
      background: [248, 250, 252], // Light gray
      text: [30, 41, 59], // Dark gray
      border: [203, 213, 225] // Light border
    };
    
    // Helper functions
    const addColoredRect = (x: number, y: number, width: number, height: number, color: number[]) => {
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(x, y, width, height, 'F');
    };
    
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * fontSize * 0.4);
    };

    // Title page with gradient-like header
    addColoredRect(0, 0, 210, 40, colors.primary);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('ML-Based Anomaly Detection Report', 20, 25);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${currentDate}`, 20, 35);
    
    // Reset text color
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    
    let currentY = 55;
    
    // Executive Summary Section
    addColoredRect(15, currentY - 5, 180, 8, colors.background);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', 20, currentY);
    currentY += 15;
    
    // Summary cards
    const summaryData = [
      { label: 'Total Records', value: mlResult.total_records.toString(), color: colors.primary },
      { label: 'Anomalies Detected', value: mlResult.anomalies_detected.toString(), color: colors.accent },
      { label: 'Anomaly Rate', value: `${(mlResult.anomaly_rate * 100).toFixed(1)}%`, color: colors.warning }
    ];
    
    summaryData.forEach((item, index) => {
      const x = 20 + (index * 60);
      
      // Draw border only
      doc.setDrawColor(item.color[0], item.color[1], item.color[2]);
      doc.setLineWidth(1);
      doc.rect(x, currentY, 50, 25);
      
      // Add text without background fill
      doc.setTextColor(item.color[0], item.color[1], item.color[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(item.label, x + 3, currentY + 8);
      doc.setFontSize(14);
      doc.text(item.value, x + 3, currentY + 18);
    });
    
    currentY += 35;
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    
    // Configuration Section
    addColoredRect(15, currentY - 5, 180, 8, colors.background);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Analysis Configuration', 20, currentY);
    currentY += 15;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`• Contamination Rate: ${(mlResult.parameters_used.contamination * 100).toFixed(1)}% (Expected anomaly proportion)`, 25, currentY);
    currentY += 7;
    doc.text(`• Number of Neighbors: ${mlResult.parameters_used.n_neighbors} (LOF comparison scope)`, 25, currentY);
    currentY += 7;
    doc.text(`• Anomaly Threshold: ${mlResult.parameters_used.anomaly_threshold} (Minimum score for flagging)`, 25, currentY);
    currentY += 15;
    
    // Feature Importance Section
    addColoredRect(15, currentY - 5, 180, 8, colors.background);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Feature Importance Analysis', 20, currentY);
    currentY += 15;
    
    const featureEntries = Object.entries(mlResult.feature_importance || {})
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8);
    
    featureEntries.forEach(([feature, importance], index) => {
      const barWidth = importance * 100; // Reduced width to fit better
      const barHeight = 6;
      const x = 25;
      const y = currentY;
      
      // Feature name
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.text(`${feature}:`, x, y + 3);
      
      // Background bar
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.rect(x + 70, y - 1, 100, barHeight);
      
      // Progress bar
      const color = index < 3 ? colors.primary : colors.secondary;
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(x + 70, y - 1, barWidth, barHeight, 'F');
      
      // Percentage value
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(`${(importance * 100).toFixed(1)}%`, x + 175, y + 3);
      
      currentY += 10;
    });
    
    currentY += 10;
    
    // Start detailed anomaly analysis
    doc.addPage();
    currentY = 25;
    
    // Header for detailed analysis
    addColoredRect(0, 0, 210, 20, colors.primary);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Anomaly Analysis', 20, 12);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    
    // Always use combined method since we run both Isolation Forest and LOF
    const usesCombinedMethod = true;

    // Generate detailed analysis for each anomaly
    for (const anomaly of mlResult.anomalies) {
      // Check if we need a new page (more conservative space check)
      if (currentY > 180) {
        doc.addPage();
        currentY = 25;
      }
      
      // Company header
      addColoredRect(15, currentY - 3, 180, 12, colors.background);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${anomaly.corp_name} (ID: ${anomaly.corp_id})`, 20, currentY + 5);
      currentY += 20;
      
      // Anomaly score visualization
      const scoreColor = anomaly.anomaly_score >= 0.7 ? colors.accent : 
                        anomaly.anomaly_score >= 0.5 ? colors.warning : colors.secondary;
      
      addColoredRect(25, currentY - 3, 8, 8, scoreColor);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Anomaly Score: ${anomaly.anomaly_score.toFixed(3)}`, 38, currentY + 2);
      
      // Detection method - fix the method display
      const methodText = usesCombinedMethod ? 'Combined (Isolation Forest + LOF)' : 
                        anomaly.detection_method === 'isolation_forest' ? 'Isolation Forest' : 'Local Outlier Factor';
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Method: ${methodText}`, 120, currentY + 2);
      currentY += 15;
      
      // Financial data
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Taxable Income: ${formatCurrency(anomaly.record_data.taxableIncome)}`, 25, currentY);
      currentY += 6;
      doc.text(`Bubblegum Tax: ${formatCurrency(anomaly.record_data.bubblegumTax)}`, 25, currentY);
      currentY += 6;
      doc.text(`Sales Tax %: ${formatPercentage(anomaly.record_data.confectionarySalesTaxPercent)}`, 25, currentY);
      currentY += 10;
      
      // Auditor feedback
      const feedback = feedbackMap.get(anomaly.corp_id);
      if (feedback) {
        const feedbackLabels = {
          accept_anomaly: { label: "Accepted as Anomaly", color: colors.accent },
          false_positive: { label: "False Positive", color: colors.warning },
          false_negative: { label: "False Negative", color: colors.secondary },
          ignore: { label: "Ignored", color: [128, 128, 128] }
        };
        
        const feedbackInfo = feedbackLabels[feedback.feedbackType];
        if (feedbackInfo) {
          addColoredRect(25, currentY - 2, 3, 8, feedbackInfo.color);
          doc.setTextColor(feedbackInfo.color[0], feedbackInfo.color[1], feedbackInfo.color[2]);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(`Auditor Feedback: ${feedbackInfo.label}`, 33, currentY + 2);
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          
          if (feedback.auditorNotes) {
            currentY += 8;
            doc.setFont('helvetica', 'normal');
            doc.text(`Notes: ${feedback.auditorNotes}`, 33, currentY);
          }
          currentY += 8;
        }
      }
      
      // LIME Explanation
      const explanation = explanations.get(anomaly.corp_id);
      console.log(`Processing explanation for ${anomaly.corp_name} (ID: ${anomaly.corp_id}):`, explanation);
      
      if (explanation) {
        currentY += 8;
        
        // ML Analysis Summary
        if (explanation.ai_summary) {
          // Section header
          doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          doc.setLineWidth(0.5);
          doc.line(20, currentY, 190, currentY);
          currentY += 5;
          
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          doc.text('ML Analysis Summary', 25, currentY);
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          currentY += 8;
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          const summaryLines = doc.splitTextToSize(explanation.ai_summary, 165);
          summaryLines.forEach((line: string) => {
            doc.text(line, 25, currentY);
            currentY += 4;
          });
          currentY += 8;
        }
        
        // Prediction Probabilities
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.text('Prediction Probabilities', 25, currentY);
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        currentY += 10;
        
        // Normal vs Anomaly probability
        const normalProb = explanation.prediction_probabilities.normal;
        const anomalyProb = explanation.prediction_probabilities.anomaly;
        
        // Normal probability
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Normal: ${(normalProb * 100).toFixed(1)}%`, 25, currentY);
        doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.setLineWidth(0.5);
        doc.rect(80, currentY - 3, normalProb * 60, 5);
        doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.rect(80, currentY - 3, normalProb * 60, 5, 'F');
        currentY += 8;
        
        // Anomaly probability
        doc.text(`Anomaly: ${(anomalyProb * 100).toFixed(1)}%`, 25, currentY);
        doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2]);
        doc.rect(80, currentY - 3, anomalyProb * 60, 5);
        doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
        doc.rect(80, currentY - 3, anomalyProb * 60, 5, 'F');
        currentY += 12;
        
        // Feature Contributions
        if (explanation.feature_contributions && explanation.feature_contributions.length > 0) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          doc.text('Key Feature Contributions', 25, currentY);
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          currentY += 10;
          
          // Show top 4 feature contributions
          const topContributions = explanation.feature_contributions
            .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
            .slice(0, 4);
          
          topContributions.forEach((contrib) => {
            if (currentY > 260) {
              doc.addPage();
              currentY = 25;
            }
            
            const isSuspicious = contrib.contribution > 0;
            const maxContrib = Math.max(...explanation.feature_contributions.map(c => Math.abs(c.contribution)));
            const barWidth = Math.abs(contrib.contribution) / maxContrib * 40;
            
            // Feature name and value
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`${contrib.display_name}: ${contrib.formatted_value}`, 25, currentY);
            
            // Contribution bar
            const barColor = isSuspicious ? colors.accent : colors.secondary;
            doc.setFillColor(barColor[0], barColor[1], barColor[2]);
            doc.rect(25, currentY + 2, barWidth, 3, 'F');
            
            // Impact score
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(barColor[0], barColor[1], barColor[2]);
            doc.text(`${contrib.contribution > 0 ? '+' : ''}${contrib.contribution.toFixed(3)}`, 70, currentY);
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
            
            currentY += 8;
          });
        }
      }
      
      currentY += 15;
      
      // Add separator line
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.5);
      doc.line(20, currentY, 190, currentY);
      currentY += 10;
    }
    
    // Add footer to all pages
    const totalPages = (doc as any).internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} of ${totalPages}`, 170, 285);
      doc.text('ABCD Auditing - ML Anomaly Detection Report', 20, 285);
      doc.text(`Session ID: ${sessionId}`, 20, 290);
    }
    
    // Save the PDF
    const fileName = `ml_anomaly_detection_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    toast({
      title: "PDF Export Complete",
      description: "Enhanced ML analysis report exported successfully",
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
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Brain className="w-5 h-5 mr-2" />
                ML Analysis Configuration
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExplanationPanelOpen(!explanationPanelOpen)}
                className="text-blue-600 hover:text-blue-800"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                How It Works
                {explanationPanelOpen ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Expandable Explanation Panel */}
            {explanationPanelOpen && (
              <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-4 text-blue-900">Understanding ML-Based Anomaly Detection</h3>
                
                <div className="space-y-6">
                  {/* Overview */}
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">What This System Does</h4>
                    <p className="text-sm text-blue-700 leading-relaxed">
                      Our system uses two complementary machine learning algorithms to automatically identify companies with unusual financial patterns that may warrant audit attention. 
                      Think of it as having two expert auditors with different specialties working together to spot potential issues.
                    </p>
                  </div>

                  {/* The Two Methods */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-lg border border-blue-100">
                      <h4 className="font-medium text-purple-800 mb-2 flex items-center">
                        <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                        Isolation Forest
                      </h4>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>What it finds:</strong> Companies that are globally unusual compared to the entire dataset.
                      </p>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>How it works:</strong> Imagine trying to isolate a company by asking yes/no questions about its financial data. 
                        Unusual companies need fewer questions to isolate them from the group.
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Best for:</strong> Finding companies with extreme values or rare combinations of financial metrics.
                      </p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-blue-100">
                      <h4 className="font-medium text-green-800 mb-2 flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        Local Outlier Factor (LOF)
                      </h4>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>What it finds:</strong> Companies that are unusual within their local neighborhood of similar companies.
                      </p>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>How it works:</strong> Compares each company's density (how similar it is to its neighbors) with the density of its neighbors. 
                        Companies in sparse areas are flagged as anomalies.
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Best for:</strong> Finding subtle patterns that might be normal globally but unusual within a specific group.
                      </p>
                    </div>
                  </div>

                  {/* Combined Approach */}
                  <div className="bg-white p-4 rounded-lg border border-blue-100">
                    <h4 className="font-medium text-blue-800 mb-2">Combined Detection Power</h4>
                    <p className="text-sm text-gray-700 mb-2">
                      We run both algorithms and combine their scores to give you comprehensive anomaly detection:
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1 ml-4">
                      <li>• <strong>Isolation Forest</strong> catches companies with extreme or rare financial patterns</li>
                      <li>• <strong>LOF</strong> catches companies that don't fit well with their peers</li>
                      <li>• <strong>Combined Score</strong> gives you the best of both approaches</li>
                    </ul>
                  </div>

                  {/* Feature Importance */}
                  <div className="bg-white p-4 rounded-lg border border-blue-100">
                    <h4 className="font-medium text-orange-800 mb-2">Feature Importance & LIME Explanations</h4>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Feature Importance:</strong> Shows which financial metrics (like revenue, taxes, etc.) are most important for detecting anomalies across your entire dataset.
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>LIME Explanations:</strong> For each flagged company, LIME explains exactly why it was flagged by showing how each financial metric contributed to the decision. 
                      Think of it as a detailed audit trail showing the "reasoning" behind each detection.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Configuration Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="contamination" className="flex items-center">
                  Contamination Rate
                  <Info className="w-3 h-3 ml-1 text-blue-500" />
                </Label>
                <Input
                  id="contamination"
                  type="number"
                  min="0.05"
                  max="0.5"
                  step="0.05"
                  value={parameters.contamination}
                  onChange={(e) => updateMLParameters({
                    ...parameters,
                    contamination: parseFloat(e.target.value)
                  })}
                  className="mt-1"
                />
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                  <p className="text-gray-700 mb-1">
                    <strong>What it controls:</strong> How many companies you expect to be anomalies
                  </p>
                  <p className="text-gray-600">
                    • <strong>0.05 (5%):</strong> Conservative - finds only the most suspicious companies<br/>
                    • <strong>0.1 (10%):</strong> Balanced - good starting point for most audits<br/>
                    • <strong>0.2 (20%):</strong> Aggressive - catches more potential issues but may include false positives
                  </p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="neighbors" className="flex items-center">
                  Number of Neighbors
                  <Info className="w-3 h-3 ml-1 text-blue-500" />
                </Label>
                <Input
                  id="neighbors"
                  type="number"
                  min="5"
                  max="50"
                  value={parameters.n_neighbors}
                  onChange={(e) => updateMLParameters({
                    ...parameters,
                    n_neighbors: parseInt(e.target.value)
                  })}
                  className="mt-1"
                />
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                  <p className="text-gray-700 mb-1">
                    <strong>What it controls:</strong> How many similar companies to compare each record against
                  </p>
                  <p className="text-gray-600">
                    • <strong>5-15:</strong> Local focus - finds companies unusual within small peer groups<br/>
                    • <strong>20-30:</strong> Balanced - considers broader context while staying local<br/>
                    • <strong>35-50:</strong> Global focus - looks for patterns across larger groups
                  </p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="threshold" className="flex items-center">
                  Anomaly Threshold
                  <Info className="w-3 h-3 ml-1 text-blue-500" />
                </Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={parameters.anomaly_threshold}
                  onChange={(e) => updateMLParameters({
                    ...parameters,
                    anomaly_threshold: parseFloat(e.target.value)
                  })}
                  className="mt-1"
                />
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                  <p className="text-gray-700 mb-1">
                    <strong>What it controls:</strong> Minimum "suspiciousness" score to flag a company
                  </p>
                  <p className="text-gray-600">
                    • <strong>0.3-0.6:</strong> Sensitive - catches subtle anomalies but may include borderline cases<br/>
                    • <strong>0.7-1.0:</strong> Balanced - focuses on clear anomalies with good confidence<br/>
                    • <strong>1.1-1.5:</strong> Strict - only flags highly suspicious companies
                  </p>
                </div>
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
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                      <Brain className="w-5 h-5 mr-2" />
                      Understanding Feature Importance
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium text-blue-800 mb-2">What This Shows</h4>
                        <p className="text-blue-700 leading-relaxed">
                          Feature importance reveals which financial metrics are most useful for spotting anomalies across your entire dataset. 
                          Think of it as ranking which "red flags" are most reliable indicators of suspicious activity.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-800 mb-2">How to Use It</h4>
                        <p className="text-blue-700 leading-relaxed">
                          <strong>High importance (&gt;25%):</strong> Critical metrics to scrutinize during audits<br/>
                          <strong>Medium importance (15-25%):</strong> Secondary factors worth examining<br/>
                          <strong>Low importance (&lt;15%):</strong> Less predictive but still worth noting
                        </p>
                      </div>
                    </div>
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
              {/* Explanation Overview */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                  <Brain className="w-5 h-5 mr-2" />
                  Understanding This Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">What You're Seeing</h4>
                    <p className="text-blue-700 leading-relaxed">
                      This analysis shows why our ML system flagged this company as suspicious. Each financial metric 
                      either increases (red) or decreases (green) the suspicion level.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">How to Read It</h4>
                    <p className="text-blue-700 leading-relaxed">
                      <span className="text-red-600 font-semibold">Positive (+)</span> contributions make the company look more suspicious, 
                      while <span className="text-green-600 font-semibold">negative (-)</span> contributions suggest normal behavior.
                    </p>
                  </div>
                </div>
              </div>

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