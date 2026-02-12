import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UnitSelect } from '@/components/ui/unit-select';
import { useNurseAvailability } from '@/hooks/useNurses';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, Calendar, Clock, Loader2 } from 'lucide-react';
import type { Nurse } from '@/types/database';

interface NurseAvailabilityManagerProps {
  nurse: Nurse;
  canEdit: boolean;
}

export function NurseAvailabilityManager({ nurse, canEdit }: NurseAvailabilityManagerProps) {
  const { availability, addAvailability, deleteAvailability } = useNurseAvailability();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newAvail, setNewAvail] = useState({
    available_date: '',
    shift_start: '07:00',
    shift_end: '19:00',
    unit: nurse.units[0] || '',
  });

  const nurseAvailability = availability.filter(a => a.nurse_id === nurse.id);

  const handleAddAvailability = async () => {
    if (!newAvail.available_date || !newAvail.shift_start || !newAvail.shift_end || !newAvail.unit) {
      return;
    }

    await addAvailability.mutateAsync({
      nurse_id: nurse.id,
      available_date: newAvail.available_date,
      shift_start: newAvail.shift_start,
      shift_end: newAvail.shift_end,
      unit: newAvail.unit,
    });

    setNewAvail({
      available_date: '',
      shift_start: '07:00',
      shift_end: '19:00',
      unit: nurse.units[0] || '',
    });
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          Availability ({nurseAvailability.length} slots)
        </h4>
        {canEdit && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-3 w-3 mr-1" />
                Add Slot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Availability for {nurse.name}</DialogTitle>
                <DialogDescription>
                  Add a new availability slot for this nurse
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newAvail.available_date}
                    onChange={(e) => setNewAvail({ ...newAvail, available_date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start">Start Time *</Label>
                    <Input
                      id="start"
                      type="time"
                      value={newAvail.shift_start}
                      onChange={(e) => setNewAvail({ ...newAvail, shift_start: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">End Time *</Label>
                    <Input
                      id="end"
                      type="time"
                      value={newAvail.shift_end}
                      onChange={(e) => setNewAvail({ ...newAvail, shift_end: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit *</Label>
                  <UnitSelect
                    value={newAvail.unit}
                    onValueChange={(value) => setNewAvail({ ...newAvail, unit: value })}
                    placeholder="Select unit..."
                    allowCustom
                  />
                  {nurse.units.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-xs text-muted-foreground mr-1">Quick select:</span>
                      {nurse.units.map((unit) => (
                        <Badge
                          key={unit}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10"
                          onClick={() => setNewAvail({ ...newAvail, unit })}
                        >
                          {unit}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddAvailability} 
                  disabled={addAvailability.isPending || !newAvail.available_date || !newAvail.unit}
                >
                  {addAvailability.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Availability
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {nurseAvailability.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm bg-muted/30 rounded-lg">
          <Calendar className="h-6 w-6 mx-auto mb-2 opacity-50" />
          No availability slots
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Start</TableHead>
                <TableHead className="text-xs">End</TableHead>
                <TableHead className="text-xs">Unit</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                {canEdit && <TableHead className="text-xs text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {nurseAvailability.map((avail) => (
                <TableRow key={avail.id}>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {format(parseISO(avail.available_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{avail.shift_start.slice(0, 5)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-sm">{avail.shift_end.slice(0, 5)}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant="secondary" className="text-xs">{avail.unit}</Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge 
                      variant={avail.is_assigned ? 'default' : 'outline'}
                      className={avail.is_assigned ? 'bg-success text-success-foreground' : ''}
                    >
                      {avail.is_assigned ? 'Assigned' : 'Available'}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAvailability.mutate(avail.id)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        disabled={avail.is_assigned}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
