import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

/**
 * AuthCallback component handles the OAuth callback from Emergent Auth
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
 */
export default function AuthCallback() {
  const [, navigate] = useLocation();
  const { refetch } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processOAuthCallback = async () => {
      try {
        // Extract session_id from URL hash
        const hash = window.location.hash;
        const sessionIdMatch = hash.match(/session_id=([^&]+)/);
        
        if (!sessionIdMatch) {
          console.error("No session_id found in URL");
          navigate("/auth");
          return;
        }
        
        const sessionId = sessionIdMatch[1];
        console.log("Processing Emergent OAuth session");
        
        // Exchange session_id for user data via backend
        const response = await fetch("/api/auth/emergent-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ session_id: sessionId }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          console.error("OAuth session exchange failed:", error);
          navigate("/auth");
          return;
        }
        
        const user = await response.json();
        console.log("OAuth successful, user:", user.email);
        
        // Refetch user data to update auth context
        await refetch();
        
        // Clear the hash from URL and redirect to home
        window.history.replaceState(null, "", window.location.pathname);
        
        // Redirect to home or membership page if not a member
        if (!user.isMember) {
          const wantsMembership = window.confirm(
            "Welcome to Active Recovery 360! Would you like to upgrade to a membership for $29 to access exclusive recovery products?"
          );
          if (wantsMembership) {
            navigate("/membership/checkout");
            return;
          }
        }
        
        navigate("/");
        
      } catch (error) {
        console.error("OAuth callback error:", error);
        navigate("/auth");
      }
    };
    
    processOAuthCallback();
  }, [navigate, refetch]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Completing sign in...</p>
    </div>
  );
}
