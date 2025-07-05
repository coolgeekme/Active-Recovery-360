import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, User, CreditCard, Package, Heart, Edit2, Save, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const profileFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50, "Username must be less than 50 characters"),
  email: z.string().email("Please enter a valid email address"),
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100, "Full name must be less than 100 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal(""))
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export default function AccountPage() {
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
      fullName: user?.fullName || "",
      password: ""
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const updateData: any = {
        username: data.username,
        email: data.email,
        fullName: data.fullName
      };
      
      // Only include password if it's provided
      if (data.password && data.password.trim() !== "") {
        updateData.password = data.password;
      }
      
      const response = await apiRequest("PATCH", "/api/user/profile", updateData);
      return await response.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Profile updated",
        description: "Your profile information has been successfully updated.",
      });
      setIsEditingProfile(false);
      form.reset({
        username: updatedUser.username,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        password: ""
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !logoutMutation.isPending) {
      navigate("/auth");
    }
  }, [user, navigate, logoutMutation.isPending]);

  // Update form when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        password: ""
      });
    }
  }, [user, form]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    form.reset({
      username: user?.username || "",
      email: user?.email || "",
      fullName: user?.fullName || "",
      password: ""
    });
  };

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
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
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Your personal and account information
                    </CardDescription>
                  </div>
                  {!isEditingProfile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditProfile}
                      disabled={updateProfileMutation.isPending}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditingProfile ? (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter your full name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter your username" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="Enter your email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password (optional)</FormLabel>
                            <FormControl>
                              <Input {...field} type="password" placeholder="Enter new password (leave empty to keep current)" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2 pt-4">
                        <Button
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                        >
                          {updateProfileMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={updateProfileMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
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
                        <a href="/membership-checkout">Manage Membership</a>
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
                )}
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
                        <a href="/membership-checkout">
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
                Manage your alliance membership
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
                    <a href="/membership-checkout">Become a Member</a>
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