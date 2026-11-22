import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft, 
  Package, 
  Trash2,
  Loader2,
  Search,
  Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import type { Order } from "@/types";

/** The states an order moves through, in order. */
const STATUS_FLOW = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function OrderManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // Order pending deletion — non-null opens the confirm dialog.
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [nextStatus, setNextStatus] = useState<string>("pending");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const openOrder = (order: Order) => {
    setSelectedOrder(order);
    setNextStatus(order.status || "pending");
    setTrackingNumber((order as any).trackingNumber || "");
    setCarrier((order as any).carrier || "");
  };

  const saveStatus = async () => {
    if (!selectedOrder) return;
    setIsUpdating(true);
    try {
      await apiRequest("PUT", `/api/orders/${selectedOrder.id}/status`, {
        status: nextStatus,
        trackingNumber: trackingNumber.trim() || null,
        carrier: carrier.trim() || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({
        title: "Order updated",
        description: `Marked as ${STATUS_LABEL[nextStatus] || nextStatus}.`,
      });
      setSelectedOrder(null);
    } catch (e: any) {
      toast({
        title: "Could not update order",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      // apiRequest resolves to a Response; the body carries what was removed.
      const res = await apiRequest("DELETE", `/api/orders/${pendingDelete.id}`);
      let detail = "";
      try {
        const body = await res.json();
        if (body?.deleted?.paymentStatus === "paid") {
          detail = " This order had been paid — its record is now gone.";
        }
      } catch {
        /* body is optional */
      }
      toast({
        title: "Order deleted",
        description: `Order #${pendingDelete.id} has been removed.${detail}`,
      });
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    } catch (e: any) {
      toast({
        title: "Could not delete order",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const { data: orders = [], isLoading, error } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
  });

  const filteredOrders = orders.filter(order => {
    // Guard the strings: an order whose user record is missing a username or
    // email used to throw here and blank the entire page.
    const term = searchTerm.toLowerCase();
    const username = (order.user?.username ?? "").toLowerCase();
    const email = (order.user?.email ?? "").toLowerCase();
    const matchesSearch =
      username.includes(term) ||
      email.includes(term) ||
      String(order.id ?? "").includes(searchTerm);
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
              <p className="text-red-600">Error loading orders. Please try again.</p>
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
            <h1 className="text-3xl font-montserrat font-bold text-primary mb-1">Order Management</h1>
            <p className="text-secondary">Manage and track customer orders</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by customer name, email, or order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Orders ({filteredOrders.length})
          </CardTitle>
          <CardDescription>
            Manage customer orders and update their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No orders found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your search or filter criteria" 
                  : "Orders will appear here once customers make purchases"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.user?.username || 'Unknown User'}</div>
                          <div className="text-sm text-muted-foreground">{order.user?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>${((order.totalAmount ?? 0) / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.createdAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => openOrder(order)}>
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete order"
                            aria-label={`Delete order ${order.id}`}
                            data-testid={`delete-order-${order.id}`}
                            onClick={() => setPendingDelete(order)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation — destructive and irreversible, so it is never a
          single click. Paid orders get an explicit extra warning. */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Order <span className="font-semibold">#{pendingDelete?.id}</span>
                  {pendingDelete?.user?.username
                    ? ` (${pendingDelete.user.username})`
                    : ""}{" "}
                  for{" "}
                  <span className="font-semibold">
                    ${(Number(pendingDelete?.totalAmount ?? 0) / 100).toFixed(2)}
                  </span>{" "}
                  will be permanently removed.
                </p>
                <p className="text-destructive font-medium">
                  This cannot be undone. There is no way to restore a deleted order.
                </p>
                {pendingDelete?.paymentStatus === "paid" && (
                  <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
                    <strong>This order was paid.</strong> Deleting it erases the
                    record of that payment here. The money itself is unaffected
                    and still shows in Stripe, but this site will no longer have
                    a record of the sale.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              data-testid="confirm-delete-order"
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {isDeleting ? "Deleting…" : "Delete order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Order details + fulfilment. This is where an admin actually works an
          order: see what was bought and paid, then move it through
          pending -> processing -> shipped -> delivered. */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.id?.slice(-8).toUpperCase()}</DialogTitle>
            <DialogDescription>
              {selectedOrder?.createdAt
                ? `Placed ${format(new Date(selectedOrder.createdAt), "MMM dd, yyyy 'at' h:mm a")}`
                : "Order details"}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer */}
              <div>
                <h4 className="text-sm font-semibold mb-1">Customer</h4>
                <p className="text-sm">
                  {selectedOrder.user?.fullName || selectedOrder.user?.username || "Unknown"}
                </p>
                <p className="text-sm text-muted-foreground">{selectedOrder.user?.email}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ship to: {selectedOrder.shippingAddress || "—"}
                </p>
              </div>

              {/* Items */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Items</h4>
                <div className="rounded-md border divide-y">
                  {(selectedOrder.items || []).map((it, i) => (
                    <div key={i} className="flex justify-between px-3 py-2 text-sm">
                      <span>
                        {it.name} <span className="text-muted-foreground">× {it.quantity}</span>
                      </span>
                      <span>${((it.price ?? 0) / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Money */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Payment</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>${((selectedOrder.shippingAmount ?? 0) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Sales tax{selectedOrder.taxState ? ` (${selectedOrder.taxState})` : ""}
                    </span>
                    <span>${((selectedOrder.taxAmount ?? 0) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Total</span>
                    <span>${((selectedOrder.totalAmount ?? 0) / 100).toFixed(2)}</span>
                  </div>
                </div>
                <p className="mt-2 text-sm">
                  <Badge
                    className={
                      selectedOrder.paymentStatus === "paid"
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }
                  >
                    {selectedOrder.paymentStatus === "paid" ? "Paid" : "Not paid online"}
                  </Badge>
                  {selectedOrder.paidAt && (
                    <span className="ml-2 text-muted-foreground">
                      {format(new Date(selectedOrder.paidAt), "MMM dd, yyyy 'at' h:mm a")}
                    </span>
                  )}
                </p>
              </div>

              {/* Affiliate trail */}
              {(selectedOrder.affiliateRef || selectedOrder.hcpReferralId) && (
                <div className="text-sm">
                  <h4 className="text-sm font-semibold mb-1">Attribution</h4>
                  {selectedOrder.affiliateRef && (
                    <p className="text-muted-foreground">
                      Affiliate referral: <code>{selectedOrder.affiliateRef}</code>
                      {selectedOrder.goaffproSyncStatus && (
                        <span className="ml-2">({selectedOrder.goaffproSyncStatus})</span>
                      )}
                    </p>
                  )}
                  {selectedOrder.hcpReferralId && (
                    <p className="text-muted-foreground">
                      Provider referral: {selectedOrder.hcpReferralName || selectedOrder.hcpReferralId}
                    </p>
                  )}
                </div>
              )}

              {/* Fulfilment */}
              <div className="border-t pt-4 space-y-3">
                <h4 className="text-sm font-semibold">Fulfilment</h4>

                <div>
                  <Label htmlFor="order-status">Status</Label>
                  <Select value={nextStatus} onValueChange={setNextStatus}>
                    <SelectTrigger id="order-status" data-testid="order-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_FLOW.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Marking an order shipped or delivered reports the sale to GoAffPro
                    so the affiliate is credited.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="order-carrier">Carrier (optional)</Label>
                    <Input
                      id="order-carrier"
                      placeholder="UPS, FedEx…"
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="order-tracking">Tracking number (optional)</Label>
                    <Input
                      id="order-tracking"
                      placeholder="1Z…"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                    Close
                  </Button>
                  <Button
                    onClick={saveStatus}
                    disabled={isUpdating || nextStatus === selectedOrder.status}
                    data-testid="save-order-status"
                  >
                    {isUpdating ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}