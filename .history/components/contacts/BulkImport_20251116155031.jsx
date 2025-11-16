import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function BulkImport({ chatroomId, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setResult(null);
    } else {
      alert('Please select a valid CSV file.');
    }
  };

  const handleImport = async () => {
    if (!file || !chatroomId) return;

    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatroomId', chatroomId);

      const res = await fetch('/api/chatrooms/import-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Import failed.');
      }

      setResult({ success: true, imported: data.imported });
      onSuccess?.();
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Import Contacts (CSV)</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <FileText className="w-4 h-4" />
            <AlertDescription>
              Upload a CSV with headers: <strong>phone_number</strong>{' '}
              (name and email optional)
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Select CSV File</Label>
            <Input type="file" accept=".csv" onChange={handleFileChange} disabled={importing} />
            {file && (
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <AlertDescription>
                {result.success
                  ? `✅ Successfully imported ${result.imported} contacts`
                  : `❌ Error: ${result.error}`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || importing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {importing ? 'Importing...' : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
