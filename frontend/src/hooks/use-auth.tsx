import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient, setToken, clearToken, getToken } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

// User type (matches backend response)
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  isMember: boolean;
  isAdmin: boolean;
  isDoctor: boolean;
  doctorTitle?: string | null;
  doctorSpecialty?: string | null;
  doctorBio?: string | null;
  profileImage?: string | null;
  createdAt?: string;
  // HCP fields
  licenseNumber?: string | null;
  hcpStatus?: 'pending' | 'approved' | 'rejected' | null;
  specialty?: string | null;
  // HCP storefront fields
  storefrontEnabled?: boolean;
  storefrontSlug?: string | null;
  storefrontBio?: string | null;
  storefrontHeadshotUrl?: string | null;
  storefrontBannerUrl?: string | null;
  storefrontWelcomeMessage?: string | null;
  storefrontFeaturedProductIds?: string[];
  commissionPercent?: number;
}

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  firebaseLoginMutation: UseMutationResult<User, Error, FirebaseLoginData>;
  refetch: () => Promise<any>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  email: string;
  fullName: string;
};

type FirebaseLoginData = {
  idToken: string;
  email: string;
  fullName: string;
  profileImage?: string;
  isDoctor?: boolean;
  doctorTitle?: string;
  doctorSpecialty?: string;
  doctorBio?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!getToken(), // Only fetch if we have a token
  });

  // Traditional username/password login
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      const data = await res.json();
      // Store token
      if (data.token) {
        setToken(data.token);
      }
      // Hydrate user query cache synchronously so ProtectedRoute sees the
      // logged-in user on the very next render after navigate().
      if (data.user) {
        queryClient.setQueryData(["/api/user"], data.user);
      }
      return data.user;
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.fullName}!`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  // Firebase authentication login
  const firebaseLoginMutation = useMutation({
    mutationFn: async (data: FirebaseLoginData) => {
      const res = await apiRequest("POST", "/api/auth/firebase", data);
      const responseData = await res.json();
      // Store token
      if (responseData.token) {
        setToken(responseData.token);
      }
      return responseData.user;
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome, ${user.fullName}!`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Authentication failed",
        variant: "destructive",
      });
    },
  });

  // Traditional registration
  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      const data = await res.json();
      // Store token
      if (data.token) {
        setToken(data.token);
      }
      return data.user;
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome to Active Recovery 360, ${user.fullName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: "Username or email already exists",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Sign out from Firebase
      await signOut(auth);
      // Clear token
      clearToken();
      // Sign out from backend
      try {
        await apiRequest("POST", "/api/logout");
      } catch (e) {
        // Ignore errors on logout
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    },
    onError: (error: Error) => {
      // Still clear local state on error
      clearToken();
      queryClient.setQueryData(["/api/user"], null);
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        firebaseLoginMutation,
        refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
