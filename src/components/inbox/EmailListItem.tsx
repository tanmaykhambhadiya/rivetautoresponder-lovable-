import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Star, StarOff, Paperclip, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { InboxEmail } from '@/hooks/useInboxEmails';
import { cn } from '@/lib/utils';

interface EmailListItemProps {
  email: InboxEmail;
  isSelected: boolean;
  isActive: boolean;
  index: number;
  onSelect: (checked: boolean) => void;
  onToggleStar: (e?: React.MouseEvent) => void;
  onClick: () => void;
  categoryConfig: Record<string, { label: string; variant: 'destructive' | 'default' | 'secondary' | 'outline' }>;
}

export function EmailListItem({
  email,
  isSelected,
  isActive,
  index,
  onSelect,
  onToggleStar,
  onClick,
  categoryConfig,
}: EmailListItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.03,
        duration: 0.3,
        ease: [0.36, 0.66, 0.04, 1],
      }}
      whileHover={{ 
        scale: 1.005,
        y: -2,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.995 }}
      className={cn(
        "flex items-center gap-3 p-4 cursor-pointer transition-all duration-200 overflow-hidden border-b",
        "hover:bg-muted/70 hover:shadow-sm",
        !email.is_read && "bg-accent/10",
        isActive && "bg-primary/10 border-l-4 border-l-primary shadow-sm"
      )}
      onClick={onClick}
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: index * 0.03 + 0.1 }}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select email from ${email.from_name || email.from_email}`}
          className="shrink-0"
        />
      </motion.div>

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
        className="text-muted-foreground hover:text-yellow-500 transition-colors shrink-0"
      >
        {email.is_starred ? (
          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
        ) : (
          <StarOff className="h-4 w-4" />
        )}
      </motion.button>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.03 + 0.1 }}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold shrink-0 transition-transform duration-200",
          email.is_read
            ? "bg-muted text-muted-foreground"
            : "bg-gradient-to-br from-primary to-accent text-primary-foreground"
        )}
      >
        {(email.from_name || email.from_email).charAt(0).toUpperCase()}
      </motion.div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 mb-1 overflow-hidden">
          <span className={cn("text-sm truncate max-w-[150px]", !email.is_read && "font-semibold")}>
            {email.from_name || email.from_email}
          </span>
          <Badge
            variant={categoryConfig[email.category]?.variant || 'outline'}
            className="shrink-0 text-[10px] px-1.5 py-0"
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
        <p className="text-xs text-muted-foreground truncate max-w-full">
          {email.body_preview}
        </p>
      </div>

      <div className="text-right shrink-0 w-20">
        <p className="text-xs text-muted-foreground whitespace-nowrap">
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
  );
}
