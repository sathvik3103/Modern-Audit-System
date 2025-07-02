import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FileText } from "lucide-react";
import { parseExcelData, validateUploadData, type UploadData } from "@/lib/data-processor";
import { useToast } from "@/hooks/use-toast";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (data: UploadData) => void;
  loading: boolean;
}

export default function UploadDialog({ open, onOpenChange, onUpload, loading }: UploadDialogProps) {
  const [jsonData, setJsonData] = useState("");
  const { toast } = useToast();

  const handleUpload = () => {
    try {
      const parsed = JSON.parse(jsonData);
      const data = parseExcelData(parsed);
      const validation = validateUploadData(data);
      
      if (!validation.valid) {
        toast({
          title: "Validation Error",
          description: validation.errors.join(", "),
          variant: "destructive",
        });
        return;
      }
      
      onUpload(data);
      setJsonData("");
      toast({
        title: "Upload Successful",
        description: `Uploaded ${data.companies.length} companies and ${data.audits?.length || 0} audit records`,
      });
    } catch (error) {
      toast({
        title: "Parse Error",
        description: "Invalid JSON format. Please check your data.",
        variant: "destructive",
      });
    }
  };

  const handleSampleData = () => {
    const sampleData = {
      "Returns": [
        {
          "Corp Name": "Sample Corp",
          "ID": 999999,
          "Period Start Date": "2023-01-01T00:00:00",
          "Period End Date": "2023-12-31T00:00:00",
          "Taxable Income": 500000,
          "Salary": 200000,
          "Revenue": 800000,
          "Amount Taxable": 100000,
          "Bubblegum Tax": 75000,
          "Confectionary Sales Tax %": 15.5
        }
      ],
      "Audit": [
        {
          "ID": "Sample Corp",
          "Audit Name": 999999,
          "Audit Date": "2020-01-01T00:00:00"
        }
      ]
    };
    setJsonData(JSON.stringify(sampleData, null, 2));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Audit Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="jsonData">Audit Data (JSON Format)</Label>
            <p className="text-xs text-gray-500 mb-2">
              Paste your audit data in JSON format. The data should contain "Returns" and optionally "Audit" arrays.
            </p>
            <Textarea
              id="jsonData"
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder="Paste your JSON data here..."
              rows={15}
              className="font-mono text-sm"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Expected Format</h4>
            <p className="text-xs text-blue-700 mb-2">
              Your JSON should have this structure:
            </p>
            <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
{`{
  "Returns": [
    {
      "Corp Name": "Company Name",
      "ID": 123456,
      "Period Start Date": "2023-01-01T00:00:00",
      "Period End Date": "2023-12-31T00:00:00",
      "Taxable Income": 500000,
      "Salary": 200000,
      "Revenue": 800000,
      "Bubblegum Tax": 75000,
      "Confectionary Sales Tax %": 15.5
    }
  ],
  "Audit": [
    {
      "ID": "Company Name",
      "Audit Name": 123456,
      "Audit Date": "2020-01-01T00:00:00"
    }
  ]
}`}
            </pre>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleSampleData}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Load Sample Data
          </Button>
          
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!jsonData.trim() || loading}
              className="bg-audit-blue hover:bg-blue-700"
            >
              {loading ? "Uploading..." : "Upload Data"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
