import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useShiftAssignments } from '@/hooks/useShiftAssignments';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { assignments, isLoading } = useShiftAssignments();

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const assignmentsByDate = useMemo(() => {
    const map: Record<string, typeof assignments> = {};
    assignments.forEach(assignment => {
      const date = assignment.shift_date;
      if (!map[date]) map[date] = [];
      map[date].push(assignment);
    });
    return map;
  }, [assignments]);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shift Calendar</h1>
            <p className="text-muted-foreground mt-1">
              View all nurse shift assignments
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-96 bg-muted animate-pulse rounded-lg" />
            ) : (
              <div className="border rounded-lg overflow-hidden">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 bg-muted/50">
                  {WEEKDAYS.map(day => (
                    <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground border-b">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7">
                  {days.map((day, idx) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayAssignments = assignmentsByDate[dateKey] || [];
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isCurrentDay = isToday(day);

                    return (
                      <div
                        key={idx}
                        className={cn(
                          "min-h-24 p-2 border-b border-r",
                          !isCurrentMonth && "bg-muted/30",
                          isCurrentDay && "bg-primary/5"
                        )}
                      >
                        <div className={cn(
                          "text-sm font-medium mb-1",
                          !isCurrentMonth && "text-muted-foreground",
                          isCurrentDay && "text-primary"
                        )}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                          {dayAssignments.slice(0, 3).map(assignment => (
                            <div
                              key={assignment.id}
                              className="text-xs p-1 rounded bg-accent/20 text-accent-foreground truncate"
                              title={`${assignment.nurse?.name} - ${assignment.unit} (${assignment.shift_start}-${assignment.shift_end})`}
                            >
                              <span className="font-medium">{assignment.nurse?.name}</span>
                              <span className="text-muted-foreground ml-1">
                                {assignment.shift_start.slice(0, 5)}
                              </span>
                            </div>
                          ))}
                          {dayAssignments.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{dayAssignments.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-primary/20" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-accent/20" />
                <span>Shift Assigned</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}