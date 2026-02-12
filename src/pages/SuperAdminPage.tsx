import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Building2, UserPlus, Shield, Loader2, Key, Eye, EyeOff, Crown, Users } from 'lucide-react';

const createOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  slug: z.string().min(2, 'Slug must be at least 2 characters').max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  adminEmail: z.string().email('Please enter a valid email address'),
  adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
  adminFullName: z.string().optional(),
});

type CreateOrgFormData = z.infer<typeof createOrgSchema>;

interface Organization {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export default function SuperAdminPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  const isSuperAdmin = profile?.email === 'rivetglobalai@gmail.com';

  const form = useForm<CreateOrgFormData>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: {
      name: '',
      slug: '',
      adminEmail: '',
      adminPassword: '',
      adminFullName: '',
    },
  });

  // Watch name to auto-generate slug
  const watchName = form.watch('name');
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  // Fetch organizations
  const { data: organizations, isLoading: orgsLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Organization[];
    },
    enabled: isSuperAdmin,
  });

  // Fetch org user counts
  const { data: orgUserCounts } = useQuery({
    queryKey: ['org-user-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('organization_id');
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(profile => {
        if (profile.organization_id) {
          counts[profile.organization_id] = (counts[profile.organization_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: isSuperAdmin,
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data: CreateOrgFormData) => {
      const response = await supabase.functions.invoke('create-organization', {
        body: {
          name: data.name,
          slug: data.slug,
          adminEmail: data.adminEmail,
          adminPassword: data.adminPassword,
          adminFullName: data.adminFullName,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create organization');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Organization Created',
        description: 'The new organization and admin user have been created successfully.',
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['org-user-counts'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CreateOrgFormData) => {
    createOrgMutation.mutate(data);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setValue('adminPassword', password);
  };

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Crown className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Super Admin Access Only</h1>
            <p className="text-muted-foreground">
              This page is restricted to the platform super administrator.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Crown className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">SaaS Admin Panel</h1>
            <p className="text-muted-foreground">
              Manage organizations and their administrators
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Create Organization Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Create New Organization
              </CardTitle>
              <CardDescription>
                Create a new organization with an admin user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="NHS Trust London" 
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              form.setValue('slug', generateSlug(e.target.value));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="nhs-trust-london" {...field} />
                        </FormControl>
                        <FormDescription>
                          Unique identifier for this organization
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Organization Admin
                    </h4>
                  </div>

                  <FormField
                    control={form.control}
                    name="adminEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="admin@organization.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adminFullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adminPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Password</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input 
                                type={showPassword ? 'text' : 'password'} 
                                placeholder="Enter password" 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                            <Button type="button" variant="outline" onClick={generatePassword}>
                              <Key className="h-4 w-4 mr-1" />
                              Generate
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={createOrgMutation.isPending}>
                    {createOrgMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Building2 className="mr-2 h-4 w-4" />
                        Create Organization
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Multi-Tenant Architecture
              </CardTitle>
              <CardDescription>
                How the organization system works
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-primary" />
                  Super Admin (You)
                </h4>
                <p className="text-sm text-muted-foreground">
                  Full platform access. Can create organizations, view all data, and manage all users.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Organization
                </h4>
                <p className="text-sm text-muted-foreground">
                  Each organization has isolated data. Users can only see data within their organization.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  Org Admin
                </h4>
                <p className="text-sm text-muted-foreground">
                  Can manage users and settings within their organization. Cannot see other organizations.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Organizations List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              All Organizations
            </CardTitle>
            <CardDescription>
              View and manage all organizations on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orgsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : organizations && organizations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell className="text-muted-foreground">{org.slug}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {orgUserCounts?.[org.id] || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={org.is_active ? 'default' : 'secondary'}>
                          {org.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(org.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No organizations yet. Create your first one above.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
