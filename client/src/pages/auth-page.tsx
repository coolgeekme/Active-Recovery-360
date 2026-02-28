import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation } from "wouter";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, CheckIcon } from "lucide-react";
import { ERALogo } from "@/lib/era-logo";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

// Login schema
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

// Registration schema
const registerSchema = z.object({
  fullName: z.string().min(2, { message: "Full name is required" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
  isDoctor: z.boolean().optional(),
  doctorTitle: z.string().optional(),
  doctorSpecialty: z.string().optional(),
  doctorBio: z.string().optional(),
  profileImage: z.string().optional(),
  isMember: z.boolean().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const { user, firebaseLoginMutation } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  // Get tab from URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1]);
    const tab = params.get("tab");
    if (tab === "register") {
      setActiveTab("register");
    }
  }, [location]);

  // If user is already logged in, redirect to home page
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      isDoctor: false,
      doctorTitle: "",
      doctorSpecialty: "",
      doctorBio: "",
      profileImage: "",
      isMember: false,
    },
  });

  // Handle Google Sign-in
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();
      
      // Send to backend to create/update user and establish session
      firebaseLoginMutation.mutate({
        idToken,
        email: user.email || "",
        fullName: user.displayName || "",
        profileImage: user.photoURL || "",
      });
      
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      toast({
        title: "Sign-in failed",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Handle Email/Password Login
  const onLoginSubmit = async (data: LoginFormValues) => {
    setIsEmailLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, data.email, data.password);
      const idToken = await result.user.getIdToken();
      
      // Send to backend to establish session
      firebaseLoginMutation.mutate({
        idToken,
        email: result.user.email || "",
        fullName: result.user.displayName || "",
        profileImage: result.user.photoURL || "",
      });
      
    } catch (error: any) {
      console.error("Email login error:", error);
      let errorMessage = "Invalid email or password";
      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password";
      } else if (error.code === "auth/invalid-credential") {
        errorMessage = "Invalid email or password";
      }
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsEmailLoading(false);
    }
  };

  // Handle Email/Password Registration
  const onRegisterSubmit = async (data: RegisterFormValues) => {
    setIsEmailLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, data.email, data.password);
      
      // Update Firebase profile with display name
      await updateProfile(result.user, {
        displayName: data.fullName,
      });
      
      const idToken = await result.user.getIdToken();
      
      // Send to backend to create user with additional fields
      firebaseLoginMutation.mutate({
        idToken,
        email: data.email,
        fullName: data.fullName,
        profileImage: data.profileImage || "",
        isDoctor: data.isDoctor,
        doctorTitle: data.doctorTitle,
        doctorSpecialty: data.doctorSpecialty,
        doctorBio: data.doctorBio,
      }, {
        onSuccess: () => {
          // If user wants membership, redirect to checkout
          if (data.isMember) {
            navigate("/membership/checkout");
          }
        }
      });
      
    } catch (error: any) {
      console.error("Registration error:", error);
      let errorMessage = "Failed to create account";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "An account with this email already exists";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak";
      }
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsEmailLoading(false);
    }
  };

  const isDoctor = registerForm.watch("isDoctor");

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex flex-col lg:flex-row gap-8 items-stretch">
        {/* Auth Forms */}
        <div className="lg:w-1/2">
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login to Your Account</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter your email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter your password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full mt-4" 
                        disabled={isEmailLoading || firebaseLoginMutation.isPending}
                      >
                        {isEmailLoading || firebaseLoginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </form>
                  </Form>
                  
                  <div className="mt-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={handleGoogleSignIn}
                      disabled={isGoogleLoading || firebaseLoginMutation.isPending}
                      data-testid="button-google-login"
                    >
                      {isGoogleLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      )}
                      Continue with Google
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col">
                  <div className="text-sm text-muted-foreground text-center mb-2">
                    Don't have an account?{" "}
                    <a 
                      className="text-primary hover:underline cursor-pointer"
                      onClick={() => setActiveTab("register")}
                    >
                      Create an account
                    </a>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an Account</CardTitle>
                  <CardDescription>
                    Sign up to access recovery products and resources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="********" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="********" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={registerForm.control}
                        name="isDoctor"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="mt-1"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>I am a healthcare professional</FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Check this if you're a doctor or healthcare provider who wants to create a storefront
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      {isDoctor && (
                        <div className="space-y-4 border-t pt-4 mt-4">
                          <h3 className="font-semibold">Professional Information</h3>
                          
                          <FormField
                            control={registerForm.control}
                            name="doctorTitle"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Professional Title</FormLabel>
                                <FormControl>
                                  <Input placeholder="Dr., PT, DC, etc." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={registerForm.control}
                            name="doctorSpecialty"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Specialty</FormLabel>
                                <FormControl>
                                  <Input placeholder="Physical Therapy, Sports Medicine, etc." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={registerForm.control}
                            name="doctorBio"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Professional Bio</FormLabel>
                                <FormControl>
                                  <Input placeholder="Brief description of your practice and expertise" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={registerForm.control}
                            name="profileImage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Profile Image URL</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://example.com/image.jpg" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                      
                      {/* Membership Purchase Option */}
                      <div className="border rounded-lg p-4 space-y-4 bg-gradient-to-r from-primary/5 to-secondary/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">Become a Member</h3>
                            <p className="text-sm text-muted-foreground">
                              Unlock exclusive recovery products and resources
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">$29</div>
                            <div className="text-sm text-muted-foreground">one-time</div>
                          </div>
                        </div>
                        
                        <FormField
                          control={registerForm.control}
                          name="isMember"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="h-4 w-4"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal">
                                  Add membership to my account (+$29)
                                </FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  Access member-only products and exclusive content
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full mt-4" 
                        disabled={isEmailLoading || firebaseLoginMutation.isPending}
                      >
                        {isEmailLoading || firebaseLoginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </form>
                  </Form>
                  
                  <div className="mt-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={handleGoogleSignIn}
                      disabled={isGoogleLoading || firebaseLoginMutation.isPending}
                      data-testid="button-google-signup"
                    >
                      {isGoogleLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      )}
                      Sign up with Google
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col">
                  <div className="text-sm text-muted-foreground text-center mb-2">
                    Already have an account?{" "}
                    <a 
                      className="text-primary hover:underline cursor-pointer"
                      onClick={() => setActiveTab("login")}
                    >
                      Sign in
                    </a>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Hero Section */}
        <div className="lg:w-1/2 bg-primary bg-opacity-5 rounded-lg p-8 flex flex-col justify-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <ERALogo className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-montserrat font-bold text-primary text-center mb-4">
            Join Active Recovery 360
          </h2>
          <p className="text-center text-secondary mb-6">
            Unlock access to professional-grade recovery products and resources trusted by healthcare professionals worldwide.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mr-3 mt-1">
                <CheckIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">Exclusive Products</h3>
                <p className="text-secondary text-sm">Access member-only recovery tools unavailable to the general public</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-8 h-8 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mr-3 mt-1">
                <CheckIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">One-time Fee</h3>
                <p className="text-secondary text-sm">Pay just $29 once for lifetime membership benefits</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-8 h-8 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mr-3 mt-1">
                <CheckIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">Free Welcome Kit</h3>
                <p className="text-secondary text-sm">Receive a recovery starter kit ($35 value) with your membership</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-8 h-8 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mr-3 mt-1">
                <CheckIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">Doctor Storefronts</h3>
                <p className="text-secondary text-sm">Shop from curated collections by medical professionals</p>
              </div>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Already a member? Sign in to access your benefits.
            </p>
            <Button 
              variant="outline" 
              className="border-primary text-primary hover:bg-primary hover:text-white"
              onClick={() => setActiveTab("login")}
            >
              Sign In to Your Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
