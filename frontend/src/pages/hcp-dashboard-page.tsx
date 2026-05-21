import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import StorefrontEditor from "@/components/hcp/storefront-editor";
import { Loader2, ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    return (
      <div className="container mx-auto py-12 max-w-2xl">
        <h1 className="text-2xl font-montserrat font-bold text-primary mb-3">
          HCP Dashboard
        </h1>
        <p className="text-secondary mb-2">
          Your account isn't yet approved as a Healthcare Professional.
        </p>
        {user.hcpStatus === "pending" ? (
          <p className="text-sm text-muted-foreground">
            Your application is under review. We'll email you when it's approved.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Apply for HCP access during registration, or contact admin.
          </p>
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
          />
        </CardContent>
      </Card>
    </div>
  );
}
