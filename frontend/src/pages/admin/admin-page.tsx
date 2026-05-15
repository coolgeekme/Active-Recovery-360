import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Package, 
  Users, 
  ShoppingBag, 
  Tag, 
  Settings, 
  BarChart,
  PlusCircle
} from "lucide-react";

export default function AdminPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch overview data
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ["/api/orders"],
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: false, // This endpoint doesn't exist in the API yet
  });

  if (!user?.isAdmin) {
    return (
      <div className="container mx-auto py-20 px-4 text-center">
        <h2 className="text-2xl font-montserrat font-bold text-primary mb-4">Access Denied</h2>
        <p className="text-secondary mb-6">You don't have permission to access the admin panel.</p>
        <Button asChild>
          <Link href="/">Return to Homepage</Link>
        </Button>
      </div>
    );
  }

  // Overview stats
  const stats = [
    { 
      title: "Total Products", 
      value: products.length, 
      icon: ShoppingBag,
      href: "/admin/products"
    },
    { 
      title: "Total Orders", 
      value: orders.length, 
      icon: Package,
      href: "/admin/orders"
    },
    { 
      title: "Categories", 
      value: categories.length, 
      icon: Tag,
      href: "/admin/categories"
    },
    { 
      title: "Users", 
      value: "View All", 
      icon: Users,
      href: "/admin/users"
    },
  ];

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-montserrat font-bold text-primary mb-1">Admin Dashboard</h1>
          <p className="text-secondary">Manage your products, orders, and users</p>
        </div>
        <Button asChild className="mt-4 md:mt-0">
          <Link href="/admin/products">Manage Products</Link>
        </Button>
      </div>

      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <Link href={stat.href}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-3xl font-bold">{stat.value}</div>
                      <stat.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Recent Orders */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>
                  Latest orders from customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-6">
                    <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex justify-between items-center border-b pb-3">
                        <div>
                          <p className="font-medium">Order #{order.id}</p>
                          <p className="text-sm text-muted-foreground">
                            User ID: {order.userId} • {formatPrice(order.totalAmount)}
                          </p>
                        </div>
                        <Badge 
                          variant={
                            order.status === "completed" ? "success" : 
                            order.status === "cancelled" ? "destructive" : 
                            "secondary"
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/10">
                <Button variant="outline" asChild className="w-full">
                  <Link href="/admin/orders">View All Orders</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common admin tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" asChild>
                  <Link href="/admin/products/new">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add New Product
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/admin/products">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Manage Products
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/admin/orders">
                    <Package className="h-4 w-4 mr-2" />
                    View Orders
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/admin/categories">
                    <Tag className="h-4 w-4 mr-2" />
                    Manage Categories
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/admin/users">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/admin/hcp">
                    <Users className="h-4 w-4 mr-2" />
                    HCP Applications
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/admin/recovery-services">
                    <Tag className="h-4 w-4 mr-2" />
                    Recovery Services
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/admin/discounts">
                    <Tag className="h-4 w-4 mr-2" />
                    Discount Codes
                  </Link>
                </Button>
                <Separator className="my-2" />
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/admin/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Admin Settings
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Product Management</CardTitle>
                <CardDescription>
                  Add, edit, and manage your product inventory
                </CardDescription>
              </div>
              <Button asChild>
                <Link href="/admin/products/new">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Product
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Access Product Management</h3>
                <p className="text-muted-foreground mb-4">
                  Manage your products, set visibility levels, and assign to doctor storefronts
                </p>
                <Button asChild>
                  <Link href="/admin/products">Go to Product Management</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order Management</CardTitle>
              <CardDescription>
                View and manage customer orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Access Order Management</h3>
                <p className="text-muted-foreground mb-4">
                  View orders, update statuses, and manage customer purchases
                </p>
                <Button asChild>
                  <Link href="/admin/orders">Go to Order Management</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Admin Settings</CardTitle>
              <CardDescription>
                Configure system settings and user roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Access Admin Settings</h3>
                <p className="text-muted-foreground mb-4">
                  Configure system settings, manage user roles, and adjust platform behavior
                </p>
                <Button asChild>
                  <Link href="/admin/settings">Go to Settings</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price / 100);
}
