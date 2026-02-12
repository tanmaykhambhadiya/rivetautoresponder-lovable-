import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { UserCog, Shield, UserPlus, Check, X, History, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { AppRole } from '@/types/database';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles: AppRole[];
}

interface AccessRequest {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export default function UsersPage() {
  const { isAdmin, user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      return profiles.map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        created_at: profile.created_at,
        roles: roles
          .filter(r => r.user_id === profile.id)
          .map(r => r.role as AppRole)
      })) as UserWithRole[];
    },
    enabled: isAdmin
  });

  const { data: accessRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['access-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AccessRequest[];
    },
    enabled: isAdmin
  });

  const { data: requestHistory = [] } = useQuery({
    queryKey: ['access-requests-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .neq('status', 'pending')
        .order('reviewed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AccessRequest[];
    },
    enabled: isAdmin
  });

  // Get reviewer names
  const { data: reviewers = [] } = useQuery({
    queryKey: ['reviewers', requestHistory.map(r => r.reviewed_by).filter(Boolean)],
    queryFn: async () => {
      const reviewerIds = requestHistory.map(r => r.reviewed_by).filter(Boolean) as string[];
      if (reviewerIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', reviewerIds);

      if (error) throw error;
      return data;
    },
    enabled: isAdmin && requestHistory.length > 0
  });

  const getReviewerName = (reviewerId: string | null) => {
    if (!reviewerId) return 'System';
    const reviewer = reviewers.find(r => r.id === reviewerId);
    return reviewer?.full_name || reviewer?.email || 'Unknown';
  };

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole | 'none' }) => {
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      if (role !== 'none') {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('User role updated');
    },
    onError: (error) => {
      toast.error('Failed to update role: ' + error.message);
    }
  });

  const approveRequest = useMutation({
    mutationFn: async ({ requestId, userId, role }: { requestId: string; userId: string; role: AppRole }) => {
      // Add the role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (roleError) throw roleError;

      // Update request status
      const { error: updateError } = await supabase
        .from('access_requests')
        .update({ 
          status: 'approved', 
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUser?.id
        })
        .eq('id', requestId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      queryClient.invalidateQueries({ queryKey: ['access-requests-history'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('Access request approved');
    },
    onError: (error) => {
      toast.error('Failed to approve: ' + error.message);
    }
  });

  const rejectRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('access_requests')
        .update({ 
          status: 'rejected', 
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUser?.id
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      queryClient.invalidateQueries({ queryKey: ['access-requests-history'] });
      toast.success('Access request rejected');
    },
    onError: (error) => {
      toast.error('Failed to reject: ' + error.message);
    }
  });

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold">Access Restricted</h2>
            <p className="text-muted-foreground mt-2">
              Only administrators can manage users
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage user roles and permissions
          </p>
        </div>

        {/* Access Requests */}
        {accessRequests.length > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-warning" />
                Pending Access Requests
                <Badge variant="destructive" className="ml-2">{accessRequests.length}</Badge>
              </CardTitle>
              <CardDescription>
                Users requesting access to the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.full_name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{request.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Select
                            onValueChange={(role) => 
                              approveRequest.mutate({ 
                                requestId: request.id, 
                                userId: request.user_id, 
                                role: role as AppRole 
                              })
                            }
                            disabled={approveRequest.isPending}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Approve as..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => rejectRequest.mutate(request.id)}
                            disabled={rejectRequest.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Users
              <Badge variant="secondary" className="ml-2">{users.length}</Badge>
            </CardTitle>
            <CardDescription>
              Assign roles to control access levels. Admin has full access, Editor can modify data, Viewer has read-only access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Current Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Assign Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.full_name || 'No name'}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {user.roles.length === 0 ? (
                              <Badge variant="outline" className="text-muted-foreground">
                                No role
                              </Badge>
                            ) : (
                              user.roles.map((role) => (
                                <Badge 
                                  key={role} 
                                  variant={role === 'admin' ? 'default' : 'secondary'}
                                  className="capitalize"
                                >
                                  {role}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Select
                            value={user.roles[0] || 'none'}
                            onValueChange={(value) => 
                              updateUserRole.mutate({ 
                                userId: user.id, 
                                role: value as AppRole | 'none' 
                              })
                            }
                            disabled={updateUserRole.isPending}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No role</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Access Request History */}
        {requestHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Access Request History
                <Badge variant="outline" className="ml-2">{requestHistory.length}</Badge>
              </CardTitle>
              <CardDescription>
                Audit log of approved and rejected access requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewed By</TableHead>
                    <TableHead>Reviewed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestHistory.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.full_name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{request.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={request.status === 'approved' ? 'default' : 'destructive'}
                          className="capitalize"
                        >
                          {request.status === 'approved' ? (
                            <Check className="h-3 w-3 mr-1" />
                          ) : (
                            <X className="h-3 w-3 mr-1" />
                          )}
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getReviewerName(request.reviewed_by)}
                      </TableCell>
                      <TableCell>
                        {request.reviewed_at 
                          ? format(new Date(request.reviewed_at), 'MMM d, yyyy h:mm a')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Role Descriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Role Descriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-primary/10">
                <Badge className="mb-2">Admin</Badge>
                <p className="text-sm">Full access to all features including user management, settings, and configuration.</p>
              </div>
              <div className="p-4 rounded-lg bg-accent/10">
                <Badge variant="secondary" className="mb-2">Editor</Badge>
                <p className="text-sm">Can edit nurse data, prompts, and view logs. Cannot manage users or system settings.</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <Badge variant="outline" className="mb-2">Viewer</Badge>
                <p className="text-sm">Read-only access to dashboard, logs, and reports. Cannot make any changes.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}