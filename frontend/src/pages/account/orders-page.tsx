import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Order } from "@/types";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, ChevronLeft } from "lucide-react";

export default function OrdersPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-20 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(date);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex items-center mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/account")} className="mr-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-montserrat font-bold text-primary mb-1">My Orders</h1>
          <p className="text-secondary">View and track your order history</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Orders Yet</h3>
            <p className="text-muted-foreground mb-4">
              You haven't placed any orders yet. Browse our products to get started.
            </p>
            <Button asChild>
              <a href="/shop">Browse Products</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="bg-primary bg-opacity-5">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                  <div>
                    <CardTitle>Order #{order.id}</CardTitle>
                    <CardDescription>
                      Placed on {formatDate(order.createdAt.toString())}
                    </CardDescription>
                  </div>
                  <div className="mt-2 md:mt-0 flex items-center">
                    {getStatusBadge(order.status)}
                    <span className="ml-4 font-semibold">{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* @ts-ignore - items is a jsonb column that contains an array */}
                  {order.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                      <span className="font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 border-t pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Shipping Address</p>
                      <p className="text-sm text-muted-foreground mt-1">{order.shippingAddress}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Track Order
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
