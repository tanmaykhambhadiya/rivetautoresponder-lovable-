import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useEmailLogs } from '@/hooks/useEmailLogs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, RotateCcw, Eye, CheckCircle, XCircle, Mail } from 'lucide-react';
import { format } from 'date-fns';

export function FailedEmailsManager() {
  const { logs, isLoading } = useEmailLogs();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);

  const failedEmails = logs.filter(log => log.status === 'failed');

  

  const handleRetry = async (emailId: string) => {
    setRetryingId(emailId);
    try {
      // Reset the email status to pending for reprocessing
      const { error } = await supabase
        .from('email_logs')
        .update({ 
          status: 'pending',
          error_message: null,
          retry_count: supabase.rpc ? undefined : 0
        })
        .eq('id', emailId);

      if (error) throw error;

      // Trigger processing
      await supabase.functions.invoke('process-emails');
      
      toast.success('Email queued for retry');
      // Data will auto-refresh via query invalidation
    } catch (error: any) {
      toast.error('Failed to retry: ' + error.message);
    } finally {
      setRetryingId(null);
    }
  };

  const handleMarkResolved = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('email_logs')
        .update({ 
          status: 'blocked',
          error_message: 'Manually marked as resolved'
        })
        .eq('id', emailId);

      if (error) throw error;
      
      toast.success('Email marked as resolved');
      // Data will auto-refresh via query invalidation
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  if (failedEmails.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold">No Failed Emails</h3>
          <p className="text-muted-foreground text-center mt-2">
            All emails have been processed successfully. Great job!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Failed Emails ({failedEmails.length})
          </CardTitle>
          <CardDescription>
            Emails that failed to send and may need attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sender</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failedEmails.map((email) => (
                <TableRow key={email.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-[150px]">{email.sender_email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {email.subject || 'No subject'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive" className="text-xs">
                      {email.error_message?.slice(0, 30) || 'Unknown error'}...
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {email.retry_count || 0} attempts
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {email.created_at ? format(new Date(email.created_at), 'MMM d, HH:mm') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedEmail(email)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Email Details</DialogTitle>
                            <DialogDescription>
                              Full details for failed email
                            </DialogDescription>
                          </DialogHeader>
                          {selectedEmail && (
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">From</label>
                                <p className="text-sm text-muted-foreground">{selectedEmail.sender_email}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Subject</label>
                                <p className="text-sm text-muted-foreground">{selectedEmail.subject || 'No subject'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Error Message</label>
                                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                  {selectedEmail.error_message || 'No error details'}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Classification</label>
                                <p className="text-sm text-muted-foreground">{selectedEmail.classification || 'Not classified'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Body Preview</label>
                                <p className="text-sm text-muted-foreground bg-muted p-2 rounded max-h-32 overflow-auto">
                                  {selectedEmail.body?.slice(0, 500) || 'No body'}
                                </p>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRetry(email.id)}
                        disabled={retryingId === email.id}
                      >
                        <RotateCcw className={`h-4 w-4 ${retryingId === email.id ? 'animate-spin' : ''}`} />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleMarkResolved(email.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
