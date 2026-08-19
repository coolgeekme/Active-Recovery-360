import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import StorefrontEditor from "@/components/hcp/storefront-editor";
import { Loader2, ChevronLeft, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function HcpApplicationForm({ rejectionReason }: { rejectionReason?: string | null }) {
  const { toast } = useToast();
  const [licenseNumber, setLicenseNumber] = useState("");
  const [specialty, setSpecialty] = useState("");

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/hcp/reapply", { licenseNumber, specialty });
      return await res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Application submitted",
        description: "We'll review your credentials and email you once approved.",
      });
    },
    onError: (e: Error) => {
      toast({
        title: "Could not submit",
        description: e.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        applyMutation.mutate();
      }}
      className="space-y-4 mt-4 border rounded-md p-5 bg-white"
    >
      {rejectionReason && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Previous application was declined: {rejectionReason}</span>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="hcp-license">License Number *</Label>
        <Input
          id="hcp-license"
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          placeholder="Your professional license number"
          data-testid="hcp-apply-license"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hcp-specialty">Specialty</Label>
        <Input
          id="hcp-specialty"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          placeholder="e.g., Physical Therapy, Sports Medicine"
          data-testid="hcp-apply-specialty"
        />
      </div>
      <Button
        type="submit"
        disabled={applyMutation.isPending || !licenseNumber.trim()}
        className="w-full sm:w-auto"
        data-testid="hcp-apply-submit"
      >
        {applyMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="mr-2 h-4 w-4" />
        )}
        Apply for HCP Access
      </Button>
    </form>
  );
}

export default function HcpDashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="container mx-auto py-20 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-montserrat font-bold text-primary mb-3">
          Sign in to manage your storefront
        </h1>
        <Link href="/auth" className="text-primary underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (!user.isDoctor || user.hcpStatus !== "approved") {
    const isPending = user.hcpStatus === "pending";
    const isRejected = user.hcpStatus === "rejected";
    return (
      <div className="container mx-auto py-12 max-w-2xl">
        <h1 className="text-2xl font-montserrat font-bold text-primary mb-3">
          HCP Dashboard
        </h1>
        {isPending ? (
          <p className="text-secondary mb-2">
            Your application is under review. We'll email you once it's approved.
          </p>
        ) : (
          <>
            <p className="text-secondary mb-2">
              {isRejected
                ? "Your previous application wasn't approved. Reapply below with updated information."
                : "Healthcare Professionals can apply to set up a personalized storefront and access professional-grade products."}
            </p>
            <HcpApplicationForm rejectionReason={user.hcpRejectionReason} />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="mb-8">
        <Link href="/" className="text-sm text-secondary inline-flex items-center hover:text-primary mb-2">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to site
        </Link>
        <h1 className="text-3xl font-montserrat font-bold text-primary">
          My Storefront
        </h1>
        <p className="text-secondary mt-1">
          Hi {user.fullName?.split(" ")[0]} — customize the page customers see when they visit your Active Recovery 360 storefront.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Storefront Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <StorefrontEditor
            fetchEndpoint="/api/hcp/me/storefront"
            saveEndpoint="/api/hcp/me/storefront"
            uploadEndpoint="/api/hcp/uploads/image"
            showOnboarding
          />
        </CardContent>
      </Card>
    </div>
  );
}
