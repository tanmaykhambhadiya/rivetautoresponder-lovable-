import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { useUnits, Unit } from '@/hooks/useUnits';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Plus, Trash2, Edit2, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function UnitsPage() {
  const { units, isLoading, addUnit, updateUnit, deleteUnit } = useUnits();
  const { isAdmin, isEditor } = useAuth();
  const canEdit = isAdmin || isEditor;

  const [search, setSearch] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [newUnit, setNewUnit] = useState({ 
    name: '', 
    code: '', 
    hospital: '', 
    aliases: '',
    is_active: true 
  });

  const filteredUnits = units.filter(unit =>
    unit.name.toLowerCase().includes(search.toLowerCase()) ||
    unit.code.toLowerCase().includes(search.toLowerCase()) ||
    unit.hospital?.toLowerCase().includes(search.toLowerCase())
  );

  const generateCode = (name: string) => {
    return name.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '');
  };

  const handleAddUnit = async () => {
    if (!newUnit.name) {
      toast.error('Please enter a unit name');
      return;
    }

    const code = newUnit.code || generateCode(newUnit.name);
    
    await addUnit.mutateAsync({
      name: newUnit.name,
      code,
      hospital: newUnit.hospital || null,
      aliases: newUnit.aliases.split(',').map(a => a.trim()).filter(Boolean),
      is_active: newUnit.is_active
    });

    setNewUnit({ name: '', code: '', hospital: '', aliases: '', is_active: true });
    setIsAddDialogOpen(false);
  };

  const handleUpdateUnit = async () => {
    if (!editingUnit) return;

    await updateUnit.mutateAsync({
      id: editingUnit.id,
      name: editingUnit.name,
      code: editingUnit.code,
      hospital: editingUnit.hospital,
      aliases: editingUnit.aliases,
      is_active: editingUnit.is_active
    });

    setEditingUnit(null);
  };

  const handleToggleActive = async (unit: Unit) => {
    await updateUnit.mutateAsync({
      id: unit.id,
      is_active: !unit.is_active
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Unit Registry</h1>
            <p className="text-muted-foreground mt-1">
              Manage hospital units and wards for consistent matching
            </p>
          </div>
          {canEdit && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Unit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Unit</DialogTitle>
                  <DialogDescription>
                    Add a hospital unit/ward to the registry for consistent matching.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Unit Name *</Label>
                    <Input
                      id="name"
                      value={newUnit.name}
                      onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                      placeholder="Puffin Ward RDH"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Code (auto-generated if empty)</Label>
                    <Input
                      id="code"
                      value={newUnit.code}
                      onChange={(e) => setNewUnit({ ...newUnit, code: e.target.value })}
                      placeholder="PUFFIN-WARD-RDH"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hospital">Hospital</Label>
                    <Input
                      id="hospital"
                      value={newUnit.hospital}
                      onChange={(e) => setNewUnit({ ...newUnit, hospital: e.target.value })}
                      placeholder="Royal Devon Hospital"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aliases">Aliases (comma-separated)</Label>
                    <Input
                      id="aliases"
                      value={newUnit.aliases}
                      onChange={(e) => setNewUnit({ ...newUnit, aliases: e.target.value })}
                      placeholder="Puffin, Puffin Ward, PW-RDH"
                    />
                    <p className="text-xs text-muted-foreground">
                      Alternative names used in emails for matching
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={newUnit.is_active}
                      onCheckedChange={(checked) => setNewUnit({ ...newUnit, is_active: checked })}
                    />
                    <Label htmlFor="active">Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddUnit} disabled={addUnit.isPending}>
                    {addUnit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Unit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search */}
        <Card>
          <CardContent className="py-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search units..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Units Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Units
              <Badge variant="secondary" className="ml-2">{filteredUnits.length}</Badge>
            </CardTitle>
            <CardDescription>
              Registered units are used for dropdown selection and email matching
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No units found</p>
                {canEdit && <p className="text-sm mt-2">Add units to enable dropdown selection</p>}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Hospital</TableHead>
                    <TableHead>Aliases</TableHead>
                    <TableHead>Status</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnits.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{unit.code}</code>
                      </TableCell>
                      <TableCell>{unit.hospital || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {unit.aliases.map((alias, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {alias}
                            </Badge>
                          ))}
                          {unit.aliases.length === 0 && <span className="text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {canEdit ? (
                          <Switch
                            checked={unit.is_active}
                            onCheckedChange={() => handleToggleActive(unit)}
                          />
                        ) : (
                          <Badge variant={unit.is_active ? 'default' : 'secondary'}>
                            {unit.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingUnit(unit)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteUnit.mutate(unit.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingUnit} onOpenChange={() => setEditingUnit(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Unit</DialogTitle>
            </DialogHeader>
            {editingUnit && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Unit Name</Label>
                  <Input
                    value={editingUnit.name}
                    onChange={(e) => setEditingUnit({ ...editingUnit, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    value={editingUnit.code}
                    onChange={(e) => setEditingUnit({ ...editingUnit, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hospital</Label>
                  <Input
                    value={editingUnit.hospital || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, hospital: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Aliases (comma-separated)</Label>
                  <Input
                    value={editingUnit.aliases.join(', ')}
                    onChange={(e) => setEditingUnit({ 
                      ...editingUnit, 
                      aliases: e.target.value.split(',').map(a => a.trim()).filter(Boolean) 
                    })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingUnit.is_active}
                    onCheckedChange={(checked) => setEditingUnit({ ...editingUnit, is_active: checked })}
                  />
                  <Label>Active</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUnit(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUnit} disabled={updateUnit.isPending}>
                {updateUnit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
