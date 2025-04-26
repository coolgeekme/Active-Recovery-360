import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, CreditCard, Package, Heart } from "lucide-react";

export default function AccountPage() {
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !logoutMutation.isPending) {
      navigate("/auth");
    }
  }, [user, navigate, logoutMutation.isPending]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (!user) {
    return (
      <div className="container mx-auto py-20 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-montserrat font-bold text-primary mb-1">My Account</h1>
          <p className="text-secondary">Manage your profile and view orders</p>
        </div>
        <Button 
          variant="outline" 
          className="mt-4 md:mt-0"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Sign Out
        </Button>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-8">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="membership">Membership</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Your personal and account information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                      <div className="text-lg">{user.fullName}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Username</label>
                      <div className="text-lg">{user.username}</div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <div className="text-lg">{user.email}</div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">Account Status</h3>
                      <p className="text-sm text-muted-foreground">Manage your account status and role</p>
                    </div>
                    <Button variant="outline" asChild>
                      <a href="/membership">Manage Membership</a>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-primary bg-opacity-5 p-4 rounded-lg text-center">
                      <div className="font-semibold mb-1">Member Status</div>
                      <div className={`${user.isMember ? "text-green-600" : "text-gray-500"}`}>
                        {user.isMember ? "Active Member" : "Not a Member"}
                      </div>
                    </div>

                    {user.isDoctor && (
                      <div className="bg-primary bg-opacity-5 p-4 rounded-lg text-center">
                        <div className="font-semibold mb-1">Doctor Status</div>
                        <div className="text-green-600">Verified Healthcare Professional</div>
                      </div>
                    )}

                    {user.isAdmin && (
                      <div className="bg-primary bg-opacity-5 p-4 rounded-lg text-center">
                        <div className="font-semibold mb-1">Admin Status</div>
                        <div className="text-green-600">Administrator</div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href="/account/orders">
                        <Package className="h-4 w-4 mr-2" />
                        View Orders
                      </a>
                    </Button>
                    
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href="/shop">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Shop Products
                      </a>
                    </Button>
                    
                    {!user.isMember && (
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <a href="/membership">
                          <Heart className="h-4 w-4 mr-2" />
                          Become a Member
                        </a>
                      </Button>
                    )}
                    
                    {user.isAdmin && (
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <a href="/admin">
                          <User className="h-4 w-4 mr-2" />
                          Admin Panel
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {user.isDoctor && (
                <Card>
                  <CardHeader>
                    <CardTitle>Doctor Storefront</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      You have a doctor storefront where patients can view your recommended products.
                    </p>
                    <Button className="w-full" asChild>
                      <a href={`/doctors/${user.id}`}>View Your Storefront</a>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>
                View and track your past orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">View Your Complete Order History</h3>
                <p className="text-muted-foreground mb-4">
                  Track shipments, view past orders, and manage your purchases
                </p>
                <Button asChild>
                  <a href="/account/orders">Go to Orders</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="membership">
          <Card>
            <CardHeader>
              <CardTitle>Membership Status</CardTitle>
              <CardDescription>
                Manage your Exercise Recovery Alliance membership
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user.isMember ? (
                <div className="bg-primary bg-opacity-5 p-6 rounded-lg">
                  <div className="flex items-center mb-4">
                    <div className="bg-green-100 rounded-full p-2 mr-4">
                      <Heart className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-primary">Active Membership</h3>
                      <p className="text-secondary">You have lifetime access to all member benefits</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start">
                      <div className="bg-white rounded-full p-1 mr-3 mt-0.5">
                        <CheckIcon className="h-3 w-3 text-primary" />
                      </div>
                      <p className="text-secondary">Access to member-only products</p>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-white rounded-full p-1 mr-3 mt-0.5">
                        <CheckIcon className="h-3 w-3 text-primary" />
                      </div>
                      <p className="text-secondary">Doctor storefront access</p>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-white rounded-full p-1 mr-3 mt-0.5">
                        <CheckIcon className="h-3 w-3 text-primary" />
                      </div>
                      <p className="text-secondary">Exclusive recovery resources</p>
                    </div>
                  </div>
                  
                  <Button className="w-full" asChild>
                    <a href="/shop?visibility=member">Browse Member-Only Products</a>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Become a Member Today</h3>
                  <p className="text-muted-foreground mb-4">
                    Join the Exercise Recovery Alliance for just $49 to unlock exclusive products and benefits
                  </p>
                  <Button asChild>
                    <a href="/membership">Become a Member</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { CheckIcon } from "lucide-react";
