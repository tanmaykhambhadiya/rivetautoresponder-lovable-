import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  Star, 
  StarOff, 
  Clock, 
  Paperclip, 
  Reply, 
  Forward,
  Trash2,
  Archive,
  MailOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { InboxEmail } from '@/hooks/useInboxEmails';
import { cn } from '@/lib/utils';

interface EmailReaderModalProps {
  email: InboxEmail | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleStar: (id: string, currentStarred: boolean) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAsUnread: (id: string) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  categoryConfig: Record<string, { label: string; variant: 'destructive' | 'default' | 'secondary' | 'outline' }>;
}

export function EmailReaderModal({
  email,
  isOpen,
  onClose,
  onToggleStar,
  onMarkAsRead,
  onMarkAsUnread,
  onNavigatePrev,
  onNavigateNext,
  hasPrev = false,
  hasNext = false,
  categoryConfig,
}: EmailReaderModalProps) {
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrev && onNavigatePrev) {
        onNavigatePrev();
      } else if (e.key === 'ArrowRight' && hasNext && onNavigateNext) {
        onNavigateNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrev, hasNext, onNavigatePrev, onNavigateNext, onClose]);

  if (!email) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 flex flex-col [&>button]:hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: [0.36, 0.66, 0.04, 1] }}
          className="flex flex-col h-full overflow-hidden"
        >
          {/* Header Toolbar */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleStar(email.id, email.is_starred)}
                className="h-8 w-8"
              >
                {email.is_starred ? (
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                ) : (
                  <StarOff className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => email.is_read ? onMarkAsUnread(email.id) : onMarkAsRead(email.id)}
                className="h-8 w-8"
                title={email.is_read ? 'Mark as unread' : 'Mark as read'}
              >
                <MailOpen className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="icon" className="h-8 w-8" title="Archive">
                <Archive className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onNavigatePrev}
                disabled={!hasPrev}
                className="h-8 w-8"
                title="Previous email (←)"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNavigateNext}
                disabled={!hasNext}
                className="h-8 w-8"
                title="Next email (→)"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Email Content - scrollable area */}
          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
              {/* Subject */}
              <motion.h1 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl font-bold"
              >
                {email.subject || '(No subject)'}
              </motion.h1>

              {/* Sender Info Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg font-bold shrink-0">
                  {(email.from_name || email.from_email).charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-lg">
                      {email.from_name || email.from_email}
                    </span>
                    <Badge variant={categoryConfig[email.category]?.variant || 'outline'}>
                      {categoryConfig[email.category]?.label || email.category}
                    </Badge>
                    {!email.is_read && (
                      <Badge variant="default" className="bg-primary">
                        Unread
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {email.from_email}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(email.received_at), 'PPpp')}
                    </span>
                    {email.has_attachments && (
                      <span className="flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5" />
                        Attachments
                      </span>
                    )}
                    {email.importance === 'high' && (
                      <Badge variant="destructive" className="text-xs">
                        High Priority
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>

              <Separator />

              {/* Email Body */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="pb-6"
              >
                {email.body ? (
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-table:text-foreground [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted"
                    dangerouslySetInnerHTML={{ __html: email.body }}
                  />
                ) : (
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {email.body_preview || 'No content'}
                  </p>
                )}
              </motion.div>
            </div>
          </div>

          {/* Footer Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 border-t bg-muted/30 flex items-center gap-3 shrink-0"
          >
            <Button variant="outline" className="gap-2">
              <Reply className="h-4 w-4" />
              Reply
            </Button>
            <Button variant="outline" className="gap-2">
              <Forward className="h-4 w-4" />
              Forward
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
