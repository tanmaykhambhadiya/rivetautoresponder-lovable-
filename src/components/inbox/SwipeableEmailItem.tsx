import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Star, StarOff, Paperclip, ChevronRight, Mail, MailOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { InboxEmail } from '@/hooks/useInboxEmails';
import { cn } from '@/lib/utils';

interface SwipeableEmailItemProps {
  email: InboxEmail;
  isSelected: boolean;
  isActive: boolean;
  index: number;
  onSelect: (checked: boolean) => void;
  onToggleStar: (e?: React.MouseEvent) => void;
  onMarkAsRead: () => void;
  onMarkAsUnread: () => void;
  onClick: () => void;
  categoryConfig: Record<string, { label: string; variant: 'destructive' | 'default' | 'secondary' | 'outline' }>;
}

const SWIPE_THRESHOLD = 80;

export function SwipeableEmailItem({
  email,
  isSelected,
  isActive,
  index,
  onSelect,
  onToggleStar,
  onMarkAsRead,
  onMarkAsUnread,
  onClick,
  categoryConfig,
}: SwipeableEmailItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const constraintsRef = useRef(null);
  const x = useMotionValue(0);
  
  // Transform x position to background opacity
  const leftBgOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const rightBgOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const leftIconScale = useTransform(x, [0, SWIPE_THRESHOLD], [0.5, 1]);
  const rightIconScale = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0.5]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    if (info.offset.x > SWIPE_THRESHOLD) {
      // Swiped right - toggle star
      onToggleStar();
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      // Swiped left - toggle read status
      if (email.is_read) {
        onMarkAsUnread();
      } else {
        onMarkAsRead();
      }
    }
  };

  return (
    <div ref={constraintsRef} className="relative overflow-hidden">
      {/* Left swipe background (Star) */}
      <motion.div 
        className="absolute inset-y-0 left-0 w-20 flex items-center justify-center bg-yellow-500"
        style={{ opacity: leftBgOpacity }}
      >
        <motion.div style={{ scale: leftIconScale }}>
          <Star className="h-6 w-6 text-white" />
        </motion.div>
      </motion.div>
      
      {/* Right swipe background (Read/Unread) */}
      <motion.div 
        className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-primary"
        style={{ opacity: rightBgOpacity }}
      >
        <motion.div style={{ scale: rightIconScale }}>
          {email.is_read ? (
            <MailOpen className="h-6 w-6 text-white" />
          ) : (
            <Mail className="h-6 w-6 text-white" />
          )}
        </motion.div>
      </motion.div>
      
      {/* Draggable email content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{
          delay: index * 0.03,
          duration: 0.3,
          ease: [0.36, 0.66, 0.04, 1],
        }}
        whileTap={{ scale: isDragging ? 1 : 0.995 }}
        className={cn(
          "relative flex items-center gap-2 sm:gap-3 p-3 sm:p-4 cursor-pointer transition-all duration-200 overflow-hidden border-b bg-background touch-pan-y",
          "hover:bg-muted/70 hover:shadow-sm",
          !email.is_read && "bg-accent/10",
          isActive && "bg-primary/10 border-l-4 border-l-primary shadow-sm"
        )}
        onClick={() => !isDragging && onClick()}
      >
        {/* Checkbox - hidden on mobile */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.03 + 0.1 }}
          className="hidden sm:block"
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select email from ${email.from_name || email.from_email}`}
            className="shrink-0"
          />
        </motion.div>

        {/* Star button - hidden on mobile (use swipe instead) */}
        <motion.button
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.03 + 0.15 }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(e);
          }}
          className="text-muted-foreground hover:text-yellow-500 transition-colors shrink-0 hidden sm:block"
        >
          {email.is_starred ? (
            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
          ) : (
            <StarOff className="h-4 w-4" />
          )}
        </motion.button>

        {/* Avatar */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.03 + 0.1 }}
          className={cn(
            "flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-sm font-semibold shrink-0 transition-transform duration-200",
            email.is_read
              ? "bg-muted text-muted-foreground"
              : "bg-gradient-to-br from-primary to-accent text-primary-foreground"
          )}
        >
          {(email.from_name || email.from_email).charAt(0).toUpperCase()}
        </motion.div>

        {/* Email content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 overflow-hidden">
            {/* Star indicator on mobile */}
            {email.is_starred && (
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 shrink-0 sm:hidden" />
            )}
            <span className={cn("text-sm truncate", !email.is_read && "font-semibold")}>
              {email.from_name || email.from_email}
            </span>
            <Badge
              variant={categoryConfig[email.category]?.variant || 'outline'}
              className="shrink-0 text-[10px] px-1.5 py-0 hidden sm:inline-flex"
            >
              {categoryConfig[email.category]?.label || email.category}
            </Badge>
            {email.has_attachments && (
              <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </div>
          <p className={cn("text-sm truncate max-w-full", !email.is_read ? "text-foreground" : "text-muted-foreground")}>
            {email.subject || '(No subject)'}
          </p>
          <p className="text-xs text-muted-foreground truncate max-w-full hidden sm:block">
            {email.body_preview}
          </p>
        </div>

        {/* Time and unread indicator */}
        <div className="text-right shrink-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
          </p>
          {!email.is_read && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="w-2 h-2 rounded-full bg-primary mt-1 ml-auto"
            />
          )}
        </div>

        <motion.div
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: index * 0.03 + 0.2 }}
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
        </motion.div>
      </motion.div>
    </div>
  );
}
