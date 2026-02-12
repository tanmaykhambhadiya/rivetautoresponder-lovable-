import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { 
  Search, 
  RefreshCw, 
  Mail, 
  MailOpen, 
  Star, 
  StarOff,
  Clock,
  Paperclip,
  Filter,
  Inbox,
  AlertCircle,
  CheckCircle,
  MailCheck,
  MailX,
  Trash2,
  X,
  ChevronRight,
  Calendar,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { format, formatDistanceToNow, isAfter, isBefore, subDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useInboxEmails, InboxEmail } from '@/hooks/useInboxEmails';
import { useEmailAccounts } from '@/hooks/useEmailAccounts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { EmailListItem } from '@/components/inbox/EmailListItem';
import { SwipeableEmailItem } from '@/components/inbox/SwipeableEmailItem';
import { MobileFilterPanel } from '@/components/inbox/MobileFilterPanel';
import { EmailReaderModal } from '@/components/inbox/EmailReaderModal';

const categoryConfig: Record<string, { label: string; variant: 'destructive' | 'default' | 'secondary' | 'outline' }> = {
  shift_request: { label: 'Shift Request', variant: 'destructive' },
  nhs_shift_asking: { label: 'Shift Request', variant: 'destructive' },
  nhs_shift_confirmed: { label: 'Confirmed', variant: 'default' },
  confirmation: { label: 'Confirmation', variant: 'default' },
  inquiry: { label: 'Inquiry', variant: 'secondary' },
  other: { label: 'Other', variant: 'outline' },
};

const EMAILS_PER_PAGE = 10;

export default function InboxPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [importanceFilter, setImportanceFilter] = useState<string>('all');
  const [attachmentFilter, setAttachmentFilter] = useState<string>('all');
  const [selectedEmail, setSelectedEmail] = useState<InboxEmail | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  
  const { 
    emails, 
    isLoading, 
    error,
    toggleStar, 
    markAsRead,
    markAsUnread,
    updateEmail
  } = useInboxEmails();

  const {
    getOutlookAccount,
    getGmailAccount,
    startOutlookOAuth,
    startGmailOAuth,
    syncEmails,
    isLoading: accountsLoading,
  } = useEmailAccounts();

  const outlookAccount = getOutlookAccount();
  const gmailAccount = getGmailAccount();
  const hasConnectedAccount = !!outlookAccount || !!gmailAccount;
  const connectedProvider = outlookAccount ? 'Outlook' : gmailAccount ? 'Gmail' : null;
  const connectedEmail = outlookAccount?.email || gmailAccount?.email;

  // Stats
  const stats = useMemo(() => {
    const total = emails.length;
    const unread = emails.filter(e => !e.is_read).length;
    const starred = emails.filter(e => e.is_starred).length;
    const withAttachments = emails.filter(e => e.has_attachments).length;
    return { total, unread, starred, withAttachments };
  }, [emails]);

  const filteredEmails = useMemo(() => {
    return emails.filter(email => {
      const matchesSearch = 
        (email.subject?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (email.from_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        email.from_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (email.body_preview?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || email.category === categoryFilter;
      const matchesRead = readFilter === 'all' || 
        (readFilter === 'unread' && !email.is_read) ||
        (readFilter === 'read' && email.is_read) ||
        (readFilter === 'starred' && email.is_starred);
      
      const emailDate = new Date(email.received_at);
      const matchesDate = dateFilter === 'all' ||
        (dateFilter === 'today' && isAfter(emailDate, subDays(new Date(), 1))) ||
        (dateFilter === 'week' && isAfter(emailDate, subDays(new Date(), 7))) ||
        (dateFilter === 'month' && isAfter(emailDate, subDays(new Date(), 30)));

      const matchesImportance = importanceFilter === 'all' ||
        (importanceFilter === 'high' && email.importance === 'high') ||
        (importanceFilter === 'normal' && (!email.importance || email.importance === 'normal')) ||
        (importanceFilter === 'low' && email.importance === 'low');

      const matchesAttachment = attachmentFilter === 'all' ||
        (attachmentFilter === 'with' && email.has_attachments) ||
        (attachmentFilter === 'without' && !email.has_attachments);
      
      return matchesSearch && matchesCategory && matchesRead && matchesDate && matchesImportance && matchesAttachment;
    });
  }, [emails, searchQuery, categoryFilter, readFilter, dateFilter, importanceFilter, attachmentFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredEmails.length / EMAILS_PER_PAGE);
  const paginatedEmails = filteredEmails.slice(
    (currentPage - 1) * EMAILS_PER_PAGE,
    currentPage * EMAILS_PER_PAGE
  );

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, readFilter, dateFilter, importanceFilter, attachmentFilter]);

  const handleSync = () => {
    if (!hasConnectedAccount) {
      toast.error('Please connect an email account first');
      return;
    }
    syncEmails.mutate();
  };

  const handleConnectGmail = () => {
    toast.info('Opening Google sign-in in a new tab...');
    startGmailOAuth();
  };

  const handleConnectOutlook = () => {
    toast.info('Opening Microsoft sign-in in a new tab...');
    startOutlookOAuth();
  };

  const handleToggleStar = (emailId: string, currentStarred: boolean, e?: React.MouseEvent) => {
    e?.stopPropagation();
    toggleStar(emailId, currentStarred);
  };

  const handleEmailClick = (email: InboxEmail) => {
    if (!email.is_read) {
      markAsRead(email.id);
    }
    setSelectedEmail(email);
    setIsReaderOpen(true);
  };

  const handleCloseReader = useCallback(() => {
    setIsReaderOpen(false);
  }, []);

  const handleNavigatePrev = useCallback(() => {
    if (!selectedEmail) return;
    const currentIndex = filteredEmails.findIndex(e => e.id === selectedEmail.id);
    if (currentIndex > 0) {
      const prevEmail = filteredEmails[currentIndex - 1];
      if (!prevEmail.is_read) markAsRead(prevEmail.id);
      setSelectedEmail(prevEmail);
    }
  }, [selectedEmail, filteredEmails, markAsRead]);

  const handleNavigateNext = useCallback(() => {
    if (!selectedEmail) return;
    const currentIndex = filteredEmails.findIndex(e => e.id === selectedEmail.id);
    if (currentIndex < filteredEmails.length - 1) {
      const nextEmail = filteredEmails[currentIndex + 1];
      if (!nextEmail.is_read) markAsRead(nextEmail.id);
      setSelectedEmail(nextEmail);
    }
  }, [selectedEmail, filteredEmails, markAsRead]);

  const selectedEmailIndex = selectedEmail ? filteredEmails.findIndex(e => e.id === selectedEmail.id) : -1;
  const hasPrevEmail = selectedEmailIndex > 0;
  const hasNextEmail = selectedEmailIndex < filteredEmails.length - 1 && selectedEmailIndex !== -1;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedEmails.map(e => e.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectEmail = (emailId: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(emailId);
    } else {
      newSet.delete(emailId);
    }
    setSelectedIds(newSet);
  };

  const handleBulkMarkRead = () => {
    selectedIds.forEach(id => {
      const email = emails.find(e => e.id === id);
      if (email && !email.is_read) {
        markAsRead(id);
      }
    });
    setSelectedIds(new Set());
    toast.success(`Marked ${selectedIds.size} emails as read`);
  };

  const handleBulkMarkUnread = () => {
    selectedIds.forEach(id => {
      const email = emails.find(e => e.id === id);
      if (email && email.is_read) {
        markAsUnread(id);
      }
    });
    setSelectedIds(new Set());
    toast.success(`Marked ${selectedIds.size} emails as unread`);
  };

  const handleBulkStar = () => {
    selectedIds.forEach(id => {
      const email = emails.find(e => e.id === id);
      if (email && !email.is_starred) {
        toggleStar(id, false);
      }
    });
    setSelectedIds(new Set());
    toast.success(`Starred ${selectedIds.size} emails`);
  };

  const handleBulkUnstar = () => {
    selectedIds.forEach(id => {
      const email = emails.find(e => e.id === id);
      if (email && email.is_starred) {
        toggleStar(id, true);
      }
    });
    setSelectedIds(new Set());
    toast.success(`Unstarred ${selectedIds.size} emails`);
  };

  const isSyncing = syncEmails.isPending;
  const hasSelection = selectedIds.size > 0;
  const allSelected = paginatedEmails.length > 0 && selectedIds.size === paginatedEmails.length;

  return (
    <DashboardLayout>
      <div className="flex flex-col w-full h-full min-w-0">
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary/90 to-accent p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-primary-foreground">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Inbox className="h-6 w-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Email Inbox</h1>
              </div>
              <p className="opacity-90">
                {hasConnectedAccount ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Connected to {connectedProvider}
                    {connectedEmail && <span className="text-xs opacity-75">({connectedEmail})</span>}
                  </span>
                ) : (
                  'Connect your email account to sync messages'
                )}
              </p>
            </div>
            <Button 
              onClick={handleSync} 
              disabled={isSyncing || !hasConnectedAccount}
              size="lg"
              className="bg-white/20 hover:bg-white/30 text-primary-foreground border-white/30 backdrop-blur-sm"
              variant="outline"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
              {isSyncing ? 'Syncing...' : 'Sync Emails'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Card className="group hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer min-w-0" onClick={() => setReadFilter('all')}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">Total Emails</p>
                  <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{stats.total}</p>
                </div>
                <div className="p-2 sm:p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors shrink-0">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="group hover:shadow-lg hover:border-destructive/50 transition-all duration-300 cursor-pointer min-w-0" onClick={() => setReadFilter('unread')}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">Unread</p>
                  <p className="text-xl sm:text-2xl font-bold text-destructive">{stats.unread}</p>
                </div>
                <div className="p-2 sm:p-3 bg-destructive/10 rounded-xl group-hover:bg-destructive/20 transition-colors shrink-0">
                  <MailOpen className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="group hover:shadow-lg hover:border-yellow-500/50 transition-all duration-300 cursor-pointer min-w-0" onClick={() => setReadFilter('starred')}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">Starred</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.starred}</p>
                </div>
                <div className="p-2 sm:p-3 bg-yellow-500/10 rounded-xl group-hover:bg-yellow-500/20 transition-colors shrink-0">
                  <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 fill-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="group hover:shadow-lg hover:border-accent/50 transition-all duration-300 cursor-pointer min-w-0" onClick={() => setAttachmentFilter('with')}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">Attachments</p>
                  <p className="text-xl sm:text-2xl font-bold text-accent">{stats.withAttachments}</p>
                </div>
                <div className="p-2 sm:p-3 bg-accent/10 rounded-xl group-hover:bg-accent/20 transition-colors shrink-0">
                  <Paperclip className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connection Banner */}
        {!accountsLoading && !hasConnectedAccount && (
          <Card className="border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 mb-6">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4">
                <Mail className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Connect Your Email</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Connect your Gmail or Outlook account to sync and manage your emails directly from this dashboard.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button onClick={handleConnectGmail} size="lg" className="gap-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                  </svg>
                  Connect Gmail
                </Button>
                <Button onClick={handleConnectOutlook} size="lg" variant="outline" className="gap-2 border-2 hover:bg-blue-50 dark:hover:bg-blue-950">
                  <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.159.152-.352.228-.581.228h-8.322V6.576h8.322c.23 0 .422.08.581.238.159.159.238.352.238.573zM7.5 11.5l4.29 2.648V6.852L7.5 9.5v2zm6.29-4.59v10.58l9.71-5.29-9.71-5.29zM0 4.285l9.21 1.603V19.11L0 20.715V4.285z"/>
                  </svg>
                  Connect Outlook
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load emails. Please check your email connection in Settings.
            </AlertDescription>
          </Alert>
        )}

        {/* Mobile Filter Panel */}
        <div className="mb-4">
          <MobileFilterPanel
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            readFilter={readFilter}
            setReadFilter={setReadFilter}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            importanceFilter={importanceFilter}
            setImportanceFilter={setImportanceFilter}
            attachmentFilter={attachmentFilter}
            setAttachmentFilter={setAttachmentFilter}
          />
        </div>

        {/* Desktop Advanced Filters */}
        <Card className="mb-4 sm:mb-6 overflow-hidden hidden sm:block">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search emails by subject, sender, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 sm:h-11 bg-muted/50 border-0 focus-visible:ring-2"
                />
              </div>
              
              {/* Filter Row */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[140px] h-9 bg-muted/50 border-0 text-sm">
                    <Filter className="mr-2 h-3 w-3 shrink-0" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="shift_request">Shift Requests</SelectItem>
                    <SelectItem value="confirmation">Confirmations</SelectItem>
                    <SelectItem value="inquiry">Inquiries</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={readFilter} onValueChange={setReadFilter}>
                  <SelectTrigger className="w-[120px] h-9 bg-muted/50 border-0 text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="starred">Starred</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[120px] h-9 bg-muted/50 border-0 text-sm">
                    <Calendar className="mr-2 h-3 w-3 shrink-0" />
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This week</SelectItem>
                    <SelectItem value="month">This month</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={importanceFilter} onValueChange={setImportanceFilter}>
                  <SelectTrigger className="w-[130px] h-9 bg-muted/50 border-0 text-sm">
                    <AlertTriangle className="mr-2 h-3 w-3 shrink-0" />
                    <SelectValue placeholder="Importance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={attachmentFilter} onValueChange={setAttachmentFilter}>
                  <SelectTrigger className="w-[140px] h-9 bg-muted/50 border-0 text-sm">
                    <Paperclip className="mr-2 h-3 w-3 shrink-0" />
                    <SelectValue placeholder="Attachments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="with">With attachments</SelectItem>
                    <SelectItem value="without">No attachments</SelectItem>
                  </SelectContent>
                </Select>

                {(categoryFilter !== 'all' || readFilter !== 'all' || dateFilter !== 'all' || importanceFilter !== 'all' || attachmentFilter !== 'all') && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9"
                    onClick={() => {
                      setCategoryFilter('all');
                      setReadFilter('all');
                      setDateFilter('all');
                      setImportanceFilter('all');
                      setAttachmentFilter('all');
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content - Email List + Preview Panel */}
        <div className="flex flex-1 min-w-0 gap-2 sm:gap-4 overflow-hidden">
          {/* Email List */}
          <Card className="flex-1 min-w-0 flex flex-col overflow-hidden max-w-full">
            {/* Bulk Actions Bar - hidden on mobile */}
            <div className="p-2 sm:p-3 border-b bg-muted/30 flex items-center gap-2 sm:gap-3 shrink-0">
              <Checkbox 
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all emails"
                className="shrink-0 hidden sm:flex"
              />
              {hasSelection ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm text-muted-foreground">{selectedIds.size} selected</span>
                  <Separator orientation="vertical" className="h-4 hidden sm:block" />
                  <div className="hidden sm:flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleBulkMarkRead} className="h-7 gap-1">
                      <MailCheck className="h-3 w-3" />
                      Mark read
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleBulkMarkUnread} className="h-7 gap-1">
                      <MailX className="h-3 w-3" />
                      Mark unread
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleBulkStar} className="h-7 gap-1">
                      <Star className="h-3 w-3" />
                      Star
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleBulkUnstar} className="h-7 gap-1">
                      <StarOff className="h-3 w-3" />
                      Unstar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between flex-1">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''}
                    {filteredEmails.length !== emails.length && (
                      <span className="hidden sm:inline"> (filtered from {emails.length})</span>
                    )}
                  </span>
                  <span className="text-[10px] text-muted-foreground sm:hidden">
                    Swipe for actions
                  </span>
                </div>
              )}
            </div>

            {/* Email List Content */}
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                      <Skeleton className="h-4 w-4 hidden sm:block" />
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : paginatedEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Mail className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-base sm:text-lg font-medium text-muted-foreground">No emails found</p>
                  <p className="text-xs sm:text-sm text-muted-foreground/70 max-w-xs">
                    {searchQuery || categoryFilter !== 'all' || readFilter !== 'all' 
                      ? 'Try adjusting your filters'
                      : 'Click "Sync Emails" to fetch emails'}
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  <div className="divide-y">
                    {paginatedEmails.map((email, index) => (
                      <>
                        {/* Desktop: Regular EmailListItem */}
                        <div key={`desktop-${email.id}`} className="hidden sm:block">
                          <EmailListItem
                            email={email}
                            isSelected={selectedIds.has(email.id)}
                            isActive={selectedEmail?.id === email.id}
                            index={index}
                            onSelect={(checked) => handleSelectEmail(email.id, checked)}
                            onToggleStar={(e) => handleToggleStar(email.id, email.is_starred, e)}
                            onClick={() => handleEmailClick(email)}
                            categoryConfig={categoryConfig}
                          />
                        </div>
                        {/* Mobile: Swipeable version */}
                        <div key={`mobile-${email.id}`} className="sm:hidden">
                          <SwipeableEmailItem
                            email={email}
                            isSelected={selectedIds.has(email.id)}
                            isActive={selectedEmail?.id === email.id}
                            index={index}
                            onSelect={(checked) => handleSelectEmail(email.id, checked)}
                            onToggleStar={(e) => handleToggleStar(email.id, email.is_starred, e)}
                            onMarkAsRead={() => markAsRead(email.id)}
                            onMarkAsUnread={() => markAsUnread(email.id)}
                            onClick={() => handleEmailClick(email)}
                            categoryConfig={categoryConfig}
                          />
                        </div>
                      </>
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </ScrollArea>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-2 sm:p-4 border-t bg-muted/30">
                <Pagination>
                  <PaginationContent className="gap-1">
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={cn(
                          "h-8 sm:h-9 px-2 sm:px-3",
                          currentPage === 1 && "pointer-events-none opacity-50"
                        )}
                      />
                    </PaginationItem>
                    {/* Show fewer pages on mobile */}
                    {Array.from({ length: Math.min(window.innerWidth < 640 ? 3 : 5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      const maxPages = window.innerWidth < 640 ? 3 : 5;
                      if (totalPages <= maxPages) {
                        pageNum = i + 1;
                      } else if (currentPage <= Math.ceil(maxPages / 2)) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - Math.floor(maxPages / 2)) {
                        pageNum = totalPages - (maxPages - 1) + i;
                      } else {
                        pageNum = currentPage - Math.floor(maxPages / 2) + i;
                      }
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNum)}
                            isActive={currentPage === pageNum}
                            className="h-8 w-8 sm:h-9 sm:w-9 text-xs sm:text-sm"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={cn(
                          "h-8 sm:h-9 px-2 sm:px-3",
                          currentPage === totalPages && "pointer-events-none opacity-50"
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </Card>

          {/* Quick Preview Panel - Click to open full reader */}
          <AnimatePresence>
            {selectedEmail && !isReaderOpen && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.3, ease: [0.36, 0.66, 0.04, 1] }}
                className="w-[360px] shrink-0"
              >
                <Card 
                  className="w-full h-full flex-col hidden lg:flex overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setIsReaderOpen(true)}
                >
                  <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                    <h3 className="font-semibold truncate flex-1 mr-4">
                      {selectedEmail.subject || '(No subject)'}
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 shrink-0" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEmail(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">
                      {/* Sender Info */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
                          {(selectedEmail.from_name || selectedEmail.from_email).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{selectedEmail.from_name || selectedEmail.from_email}</p>
                          <p className="text-sm text-muted-foreground truncate">{selectedEmail.from_email}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStar(selectedEmail.id, selectedEmail.is_starred, e);
                          }}
                          className="text-muted-foreground hover:text-yellow-500 transition-colors"
                        >
                          {selectedEmail.is_starred ? (
                            <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                          ) : (
                            <StarOff className="h-5 w-5" />
                          )}
                        </button>
                      </div>

                      {/* Meta Info */}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={categoryConfig[selectedEmail.category]?.variant || 'outline'}>
                          {categoryConfig[selectedEmail.category]?.label || selectedEmail.category}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(selectedEmail.received_at), 'PPpp')}
                        </div>
                        {selectedEmail.has_attachments && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Paperclip className="h-3 w-3" />
                            Attachments
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Email Body Preview */}
                      <div className="min-h-0 relative">
                        {selectedEmail.body ? (
                          <div 
                            className="prose prose-sm max-w-none dark:prose-invert line-clamp-6"
                            dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                          />
                        ) : (
                          <p className="text-muted-foreground whitespace-pre-wrap line-clamp-6">
                            {selectedEmail.body_preview || 'No content'}
                          </p>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                      </div>

                      <Button variant="outline" className="w-full" onClick={() => setIsReaderOpen(true)}>
                        Open Full Email
                      </Button>
                    </div>
                  </ScrollArea>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Full-screen Email Reader Modal */}
      <EmailReaderModal
        email={selectedEmail}
        isOpen={isReaderOpen}
        onClose={handleCloseReader}
        onToggleStar={(id, starred) => toggleStar(id, starred)}
        onMarkAsRead={markAsRead}
        onMarkAsUnread={markAsUnread}
        onNavigatePrev={handleNavigatePrev}
        onNavigateNext={handleNavigateNext}
        hasPrev={hasPrevEmail}
        hasNext={hasNextEmail}
        categoryConfig={categoryConfig}
      />
    </DashboardLayout>
  );
}
