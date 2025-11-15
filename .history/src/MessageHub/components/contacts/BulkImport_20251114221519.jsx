import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';

export default function BulkImport({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('');

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => base44.entities.Group.list()
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
      setFile(selectedFile);
      setResult(null);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      // Upload file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data from CSV
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            contacts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  phone_number: { type: 'string' },
                  country_code: { type: 'string' },
                  status: { type: 'string' }
                }
              }
            }
          }
        }
      });

      if (extractResult.status === 'success' && extractResult.output?.contacts) {
        const contacts = extractResult.output.contacts.map(c => ({
          ...c,
          status: c.status || 'active',
          country_code: c.country_code || 'US'
        }));

        // Bulk create contacts
        await base44.entities.Contact.bulkCreate(contacts);

        // Add to group if selected
        if (selectedGroup) {
          const createdContacts = await base44.entities.Contact.list('-created_date', contacts.length);
          const groupMembers = createdContacts.map(c => ({
            group_id: selectedGroup,
            contact_id: c.id,
            added_at: new Date().toISOString()
          }));
          await base44.entities.GroupMember.bulkCreate(groupMembers);

          // Update group count
          const group = groups.find(g => g.id === selectedGroup);
          if (group) {
            await base44.entities.Group.update(selectedGroup, {
              contact_count: (group.contact_count || 0) + contacts.length
            });
          }
        }

        setResult({
          success: true,
          count: contacts.length
        });
        onSuccess();
      } else {
        setResult({
          success: false,
          error: extractResult.details || 'Failed to parse CSV file'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Bulk Import Contacts</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <FileText className="w-4 h-4" />
            <AlertDescription>
              Upload a CSV file with columns: name, email, phone_number, country_code, status
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Select CSV File</Label>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={importing}
            />
            {file && (
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Add to Group (Optional)</Label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Select a group..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name} ({group.contact_count || 0} contacts)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <AlertDescription>
                {result.success
                  ? `Successfully imported ${result.count} contacts!`
                  : `Error: ${result.error}`}
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
            {importing ? (
              <>Importing...</>
            ) : (
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