import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { User } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  UserCheck,
  UserX,
  Eye,
  Store
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function HcpManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch all HCP applications
  const { data: hcpApplications, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/hcp/all"],
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/admin/hcp/${userId}/approve`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hcp/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hcp/pending"] });
      toast({
        title: "Application Approved",
        description: "The healthcare professional has been approved and notified.",
      });
      setShowApproveDialog(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve application",
        variant: "destructive",
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/hcp/${userId}/reject`, { reason });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hcp/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hcp/pending"] });
      toast({
        title: "Application Rejected",
        description: "The application has been rejected and the user has been notified.",
      });
      setShowRejectDialog(false);
      setSelectedUser(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject application",
        variant: "destructive",
      });
    },
  });

  const pendingApplications = hcpApplications?.filter(u => u.hcpStatus === "pending") || [];
  const approvedApplications = hcpApplications?.filter(u => u.hcpStatus === "approved") || [];
  const rejectedApplications = hcpApplications?.filter(u => u.hcpStatus === "rejected") || [];

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const ApplicationTable = ({ applications, showActions = false }: { applications: User[], showActions?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>License #</TableHead>
          <TableHead>Specialty</TableHead>
          <TableHead>Applied</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {applications.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              No applications found
            </TableCell>
          </TableRow>
        ) : (
          applications.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.fullName}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell className="font-mono text-sm">{user.licenseNumber || "N/A"}</TableCell>
              <TableCell>{user.specialty || "Not specified"}</TableCell>
              <TableCell>{formatDate(user.createdAt)}</TableCell>
              <TableCell>{getStatusBadge(user.hcpStatus)}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedUser(user);
                    setShowDetailsDialog(true);
                  }}
                  title="View details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {user.hcpStatus === "approved" && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    title="Manage storefront"
                  >
                    <Link href={`/admin/hcp/${user.id}/storefront`}>
                      <Store className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {showActions && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowApproveDialog(true);
                      }}
                    >
                      <UserCheck className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowRejectDialog(true);
                      }}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">HCP Applications</h1>
          <p className="text-muted-foreground">Manage Healthcare Professional applications</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{pendingApplications.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{approvedApplications.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{rejectedApplications.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>Review and manage healthcare professional applications</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending" className="relative">
                Pending
                {pendingApplications.length > 0 && (
                  <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full px-2">
                    {pendingApplications.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-4">
              <ApplicationTable applications={pendingApplications} showActions={true} />
            </TabsContent>
            <TabsContent value="approved" className="mt-4">
              <ApplicationTable applications={approvedApplications} />
            </TabsContent>
            <TabsContent value="rejected" className="mt-4">
              <ApplicationTable applications={rejectedApplications} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve {selectedUser?.fullName}'s HCP application?
              They will gain access to professional-grade products and features.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{selectedUser?.fullName}</span>
              <span className="text-muted-foreground">License #:</span>
              <span className="font-mono">{selectedUser?.licenseNumber}</span>
              <span className="text-muted-foreground">Specialty:</span>
              <span>{selectedUser?.specialty || "Not specified"}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedUser && approveMutation.mutate(selectedUser.id)}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Reject {selectedUser?.fullName}'s HCP application. They will be notified via email and can reapply later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{selectedUser?.fullName}</span>
              <span className="text-muted-foreground">License #:</span>
              <span className="font-mono">{selectedUser?.licenseNumber}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedUser && rejectMutation.mutate({ 
                userId: selectedUser.id, 
                reason: rejectionReason 
              })}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Full Name</Label>
                <p className="font-medium">{selectedUser?.fullName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{selectedUser?.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">License Number</Label>
                <p className="font-mono font-medium">{selectedUser?.licenseNumber || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Specialty</Label>
                <p className="font-medium">{selectedUser?.specialty || "Not specified"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">{getStatusBadge(selectedUser?.hcpStatus)}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Applied On</Label>
                <p className="font-medium">{formatDate(selectedUser?.createdAt)}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
