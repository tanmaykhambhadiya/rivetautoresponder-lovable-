import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { useNurses, useNurseAvailability } from '@/hooks/useNurses';
import { NurseAvailabilityManager } from '@/components/nurses/NurseAvailabilityManager';
import { MultiUnitSelect } from '@/components/ui/unit-select';
import { format } from 'date-fns';
import { Search, Users, Plus, Upload, Trash2, Edit2, Loader2, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function NursesPage() {
  const { nurses, isLoading, addNurse, deleteNurse } = useNurses();
  const { availability, addAvailability, deleteAvailability } = useNurseAvailability();
  const { isAdmin, isEditor } = useAuth();
  const canEdit = isAdmin || isEditor;
  
  const [search, setSearch] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newNurse, setNewNurse] = useState({ name: '', grade: '', units: [] as string[] });
  const [expandedNurse, setExpandedNurse] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredNurses = nurses.filter(nurse =>
    nurse.name.toLowerCase().includes(search.toLowerCase()) ||
    nurse.grade.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddNurse = async () => {
    if (!newNurse.name || !newNurse.grade) {
      toast.error('Please fill in all required fields');
      return;
    }

    await addNurse.mutateAsync({
      name: newNurse.name,
      grade: newNurse.grade,
      units: newNurse.units
    });

    setNewNurse({ name: '', grade: '', units: [] });
    setIsAddDialogOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic CSV parsing for nurse data
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      toast.error('CSV file appears to be empty or invalid');
      return;
    }

    // Assume headers: Name, Grade, Units, AvailableDate, ShiftStart, ShiftEnd, Unit
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      if (row.name && row.grade) {
        try {
          // Check if nurse already exists
          const existingNurse = nurses.find(n => n.name.toLowerCase() === row.name.toLowerCase());
          
          if (!existingNurse) {
            await addNurse.mutateAsync({
              name: row.name,
              grade: row.grade,
              units: row.units ? row.units.split(';').map(u => u.trim()) : []
            });
          }
          imported++;
        } catch (err) {
          console.error('Error importing nurse:', err);
        }
      }
    }

    toast.success(`Imported ${imported} nurses from CSV`);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nurse Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage nurse profiles and availability
            </p>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Nurse
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Nurse</DialogTitle>
                    <DialogDescription>
                      Enter the nurse's details to add them to the system.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={newNurse.name}
                        onChange={(e) => setNewNurse({ ...newNurse, name: e.target.value })}
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="grade">Grade *</Label>
                      <Input
                        id="grade"
                        value={newNurse.grade}
                        onChange={(e) => setNewNurse({ ...newNurse, grade: e.target.value })}
                        placeholder="Band 5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="units">Units</Label>
                      <MultiUnitSelect
                        values={newNurse.units}
                        onValuesChange={(units) => setNewNurse({ ...newNurse, units })}
                        placeholder="Select units..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddNurse} disabled={addNurse.isPending}>
                      {addNurse.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Add Nurse
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Search */}
        <Card>
          <CardContent className="py-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or grade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Nurses Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Nurses
              <Badge variant="secondary" className="ml-2">{filteredNurses.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredNurses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No nurses found</p>
                {canEdit && (
                  <p className="text-sm mt-2">Add nurses manually or import from CSV</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Units</TableHead>
                      <TableHead>Added</TableHead>
                      {canEdit && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNurses.map((nurse) => {
                      const isExpanded = expandedNurse === nurse.id;
                      const nurseAvail = availability.filter(a => a.nurse_id === nurse.id);
                      
                      return (
                        <>
                          <TableRow 
                            key={nurse.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setExpandedNurse(isExpanded ? null : nurse.id)}
                          >
                            <TableCell className="py-2">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {nurse.name}
                                {nurseAvail.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {nurseAvail.length}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{nurse.grade}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {nurse.units.map((unit, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {unit}
                                  </Badge>
                                ))}
                                {nurse.units.length === 0 && (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(nurse.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            {canEdit && (
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNurse.mutate(nurse.id);
                                  }}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${nurse.id}-avail`}>
                              <TableCell colSpan={canEdit ? 6 : 5} className="bg-muted/30 p-4">
                                <NurseAvailabilityManager nurse={nurse} canEdit={canEdit} />
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}