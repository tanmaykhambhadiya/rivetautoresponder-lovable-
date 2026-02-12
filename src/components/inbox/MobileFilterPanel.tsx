import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Search,
  Filter,
  X,
  Calendar,
  AlertTriangle,
  Paperclip,
  SlidersHorizontal,
} from 'lucide-react';

interface MobileFilterPanelProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string;
  setCategoryFilter: (filter: string) => void;
  readFilter: string;
  setReadFilter: (filter: string) => void;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  importanceFilter: string;
  setImportanceFilter: (filter: string) => void;
  attachmentFilter: string;
  setAttachmentFilter: (filter: string) => void;
}

export function MobileFilterPanel({
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  readFilter,
  setReadFilter,
  dateFilter,
  setDateFilter,
  importanceFilter,
  setImportanceFilter,
  attachmentFilter,
  setAttachmentFilter,
}: MobileFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters =
    categoryFilter !== 'all' ||
    readFilter !== 'all' ||
    dateFilter !== 'all' ||
    importanceFilter !== 'all' ||
    attachmentFilter !== 'all';

  const activeFilterCount = [
    categoryFilter !== 'all',
    readFilter !== 'all',
    dateFilter !== 'all',
    importanceFilter !== 'all',
    attachmentFilter !== 'all',
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setCategoryFilter('all');
    setReadFilter('all');
    setDateFilter('all');
    setImportanceFilter('all');
    setAttachmentFilter('all');
  };

  return (
    <div className="flex flex-col gap-2 sm:hidden">
      {/* Search and Filter Button Row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-muted/50 border-0"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant={hasActiveFilters ? 'default' : 'outline'}
              size="icon"
              className="h-10 w-10 shrink-0 relative"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-xl">
            <SheetHeader className="text-left pb-4">
              <SheetTitle className="flex items-center justify-between">
                <span>Filters</span>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    Clear all
                  </Button>
                )}
              </SheetTitle>
              <SheetDescription>
                Filter your emails to find what you're looking for
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 overflow-y-auto">
              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Category
                </label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="shift_request">Shift Requests</SelectItem>
                    <SelectItem value="confirmation">Confirmations</SelectItem>
                    <SelectItem value="inquiry">Inquiries</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Read Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <div className="flex flex-wrap gap-2">
                  {['all', 'unread', 'read', 'starred'].map((status) => (
                    <Button
                      key={status}
                      variant={readFilter === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setReadFilter(status)}
                      className="capitalize"
                    >
                      {status === 'all' ? 'All' : status}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Date Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date
                </label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Any time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This week</SelectItem>
                    <SelectItem value="month">This month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Importance Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Importance
                </label>
                <div className="flex flex-wrap gap-2">
                  {['all', 'high', 'normal', 'low'].map((level) => (
                    <Button
                      key={level}
                      variant={importanceFilter === level ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setImportanceFilter(level)}
                      className="capitalize"
                    >
                      {level === 'all' ? 'All' : level}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Attachment Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={attachmentFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAttachmentFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={attachmentFilter === 'with' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAttachmentFilter('with')}
                  >
                    With attachments
                  </Button>
                  <Button
                    variant={attachmentFilter === 'without' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAttachmentFilter('without')}
                  >
                    No attachments
                  </Button>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
              <Button className="w-full" onClick={() => setIsOpen(false)}>
                Apply Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filters Display */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1.5 overflow-hidden"
          >
            {categoryFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs">
                {categoryFilter}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setCategoryFilter('all')}
                />
              </Badge>
            )}
            {readFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs capitalize">
                {readFilter}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setReadFilter('all')}
                />
              </Badge>
            )}
            {dateFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs capitalize">
                {dateFilter}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setDateFilter('all')}
                />
              </Badge>
            )}
            {importanceFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs capitalize">
                {importanceFilter} priority
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setImportanceFilter('all')}
                />
              </Badge>
            )}
            {attachmentFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs">
                {attachmentFilter === 'with' ? 'Has attachments' : 'No attachments'}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setAttachmentFilter('all')}
                />
              </Badge>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
