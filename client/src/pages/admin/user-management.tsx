import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, 
  Users, 
  Loader2,
  Search,
  Shield,
  ShieldCheck,
  UserCheck,
  User,
  Crown
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  isMember: boolean;
  isAdmin: boolean;
  isDoctor: boolean;
  doctorTitle: string | null;
  doctorSpecialty: string | null;
  createdAt: string;
}

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const { toast } = useToast();

  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role, value }: { userId: number; role: string; value: boolean }) => {
      return apiRequest(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ [role]: value }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesRole = true;
    switch (roleFilter) {
      case "admin":
        matchesRole = user.isAdmin;
        break;
      case "doctor":
        matchesRole = user.isDoctor;
        break;
      case "member":
        matchesRole = user.isMember && !user.isDoctor && !user.isAdmin;
        break;
      case "regular":
        matchesRole = !user.isMember && !user.isDoctor && !user.isAdmin;
        break;
      default:
        matchesRole = true;
    }
    
    return matchesSearch && matchesRole;
  });

  const getUserRole = (user: User) => {
    if (user.isAdmin) return { label: "Admin", icon: Crown, color: "bg-red-100 text-red-800" };
    if (user.isDoctor) return { label: "Doctor", icon: ShieldCheck, color: "bg-blue-100 text-blue-800" };
    if (user.isMember) return { label: "Member", icon: UserCheck, color: "bg-green-100 text-green-800" };
    return { label: "Regular", icon: User, color: "bg-gray-100 text-gray-800" };
  };

  const handleRoleToggle = (userId: number, role: string, currentValue: boolean) => {
    updateUserRoleMutation.mutate({
      userId,
      role,
      value: !currentValue,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600">Error loading users. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-montserrat font-bold text-primary mb-1">User Management</h1>
            <p className="text-secondary">Manage user accounts and permissions</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by username, email, or full name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="doctor">Doctors</SelectItem>
                <SelectItem value="member">Members</SelectItem>
                <SelectItem value="regular">Regular Users</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground">
                {searchTerm || roleFilter !== "all" 
                  ? "Try adjusting your search or filter criteria" 
                  : "No users have registered yet"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Member Status</TableHead>
                    <TableHead>Doctor Status</TableHead>
                    <TableHead>Admin Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const userRole = getUserRole(user);
                    const RoleIcon = userRole.icon;
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.fullName}</div>
                            <div className="text-sm text-muted-foreground">@{user.username}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                            {user.isDoctor && user.doctorTitle && (
                              <div className="text-sm text-blue-600">
                                {user.doctorTitle}
                                {user.doctorSpecialty && ` - ${user.doctorSpecialty}`}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={userRole.color}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {userRole.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant={user.isMember ? "default" : "outline"}
                                disabled={updateUserRoleMutation.isPending}
                              >
                                {user.isMember ? "Remove" : "Grant"}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {user.isMember ? "Remove Member Status" : "Grant Member Status"}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {user.isMember 
                                    ? `Remove member privileges for ${user.fullName}? They will lose access to member-only products.`
                                    : `Grant member privileges to ${user.fullName}? They will gain access to member-only products.`
                                  }
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRoleToggle(user.id, "isMember", user.isMember)}
                                >
                                  {user.isMember ? "Remove" : "Grant"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant={user.isDoctor ? "default" : "outline"}
                                disabled={updateUserRoleMutation.isPending}
                              >
                                {user.isDoctor ? "Remove" : "Grant"}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {user.isDoctor ? "Remove Doctor Status" : "Grant Doctor Status"}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {user.isDoctor 
                                    ? `Remove doctor privileges for ${user.fullName}? They will lose access to doctor-exclusive products.`
                                    : `Grant doctor privileges to ${user.fullName}? They will gain access to doctor-exclusive products.`
                                  }
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRoleToggle(user.id, "isDoctor", user.isDoctor)}
                                >
                                  {user.isDoctor ? "Remove" : "Grant"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant={user.isAdmin ? "destructive" : "outline"}
                                disabled={updateUserRoleMutation.isPending}
                              >
                                {user.isAdmin ? "Remove" : "Grant"}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {user.isAdmin ? "Remove Admin Status" : "Grant Admin Status"}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {user.isAdmin 
                                    ? `Remove admin privileges for ${user.fullName}? This will revoke all administrative access.`
                                    : `Grant admin privileges to ${user.fullName}? This will give them full administrative access to the system.`
                                  }
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRoleToggle(user.id, "isAdmin", user.isAdmin)}
                                >
                                  {user.isAdmin ? "Remove" : "Grant"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                        <TableCell>
                          {format(new Date(user.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}