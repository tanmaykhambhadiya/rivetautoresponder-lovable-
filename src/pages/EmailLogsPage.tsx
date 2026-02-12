import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEmailLogs } from '@/hooks/useEmailLogs';
import { format } from 'date-fns';
import { Search, Mail, RefreshCw, Eye, CheckCircle2, XCircle, Clock, Ban } from 'lucide-react';
import type { EmailLog, Nurse } from '@/types/database';

const statusConfig = {
  pending: { icon: Clock, className: 'bg-warning/10 text-warning border-warning/50', label: 'Pending' },
  sent: { icon: CheckCircle2, className: 'bg-success/10 text-success border-success/50', label: 'Sent' },
  failed: { icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/50', label: 'Failed' },
  blocked: { icon: Ban, className: 'bg-muted text-muted-foreground border-muted', label: 'Blocked' }
};

export default function EmailLogsPage() {
  const { logs, isLoading, resendEmail } = useEmailLogs();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<(EmailLog & { nurse: Nurse | null }) | null>(null);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.sender_email.toLowerCase().includes(search.toLowerCase()) ||
      log.subject?.toLowerCase().includes(search.toLowerCase()) ||
      log.nurse?.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Email Logs</h1>
            <p className="text-muted-foreground mt-1">
              View and manage all processed emails
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, subject, or nurse..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email History
              <Badge variant="secondary" className="ml-2">{filteredLogs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No emails found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Matched Nurse</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const status = statusConfig[log.status];
                      const StatusIcon = status.icon;
                      
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="outline" className={status.className}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            <span className="truncate max-w-[200px] block">{log.sender_email}</span>
                          </TableCell>
                          <TableCell>
                            <span className="truncate max-w-[200px] block">
                              {log.subject || '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {log.nurse ? (
                              <span className="text-accent font-medium">{log.nurse.name}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedLog(log)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {log.status === 'failed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => resendEmail.mutate(log.id)}
                                  disabled={resendEmail.isPending}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Email Details</DialogTitle>
              <DialogDescription>
                Full details of the email and response
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">From</p>
                    <p>{selectedLog.sender_email}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Status</p>
                    <Badge variant="outline" className={statusConfig[selectedLog.status].className}>
                      {statusConfig[selectedLog.status].label}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Received</p>
                    <p>{format(new Date(selectedLog.created_at), 'PPpp')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Processed</p>
                    <p>{selectedLog.processed_at 
                      ? format(new Date(selectedLog.processed_at), 'PPpp')
                      : '—'
                    }</p>
                  </div>
                </div>

                {selectedLog.shift_date && (
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="font-medium mb-2">Shift Details</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Date:</span> {selectedLog.shift_date}</div>
                      <div><span className="text-muted-foreground">Time:</span> {selectedLog.shift_start} - {selectedLog.shift_end}</div>
                      <div><span className="text-muted-foreground">Unit:</span> {selectedLog.unit}</div>
                      <div><span className="text-muted-foreground">Grade:</span> {selectedLog.grade}</div>
                    </div>
                  </div>
                )}

                {selectedLog.nurse && (
                  <div className="p-4 rounded-lg bg-accent/10">
                    <p className="font-medium mb-2">Matched Nurse</p>
                    <p className="text-accent font-semibold">{selectedLog.nurse.name}</p>
                    <p className="text-sm text-muted-foreground">Grade: {selectedLog.nurse.grade}</p>
                  </div>
                )}

                <div>
                  <p className="font-medium text-muted-foreground mb-2">Subject</p>
                  <p className="p-3 bg-muted/50 rounded-lg">{selectedLog.subject || '—'}</p>
                </div>

                <div>
                  <p className="font-medium text-muted-foreground mb-2">Original Email</p>
                  <pre className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap overflow-x-auto max-h-48">
                    {selectedLog.body || '—'}
                  </pre>
                </div>

                {selectedLog.response_body && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-2">Response Sent</p>
                    <div 
                      className="p-3 bg-muted/50 rounded-lg text-sm max-h-48 overflow-auto"
                      dangerouslySetInnerHTML={{ __html: selectedLog.response_body }}
                    />
                  </div>
                )}

                {selectedLog.error_message && (
                  <div>
                    <p className="font-medium text-destructive mb-2">Error</p>
                    <p className="p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
                      {selectedLog.error_message}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}