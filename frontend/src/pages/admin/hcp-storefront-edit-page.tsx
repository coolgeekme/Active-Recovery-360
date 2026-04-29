import { Link, useParams } from "wouter";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StorefrontEditor from "@/components/hcp/storefront-editor";

export default function AdminHcpStorefrontEditPage() {
  const { userId } = useParams<{ userId: string }>();

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <Link
        href="/admin/hcp"
        className="text-sm text-secondary inline-flex items-center hover:text-primary mb-2"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to HCP applications
      </Link>
      <h1 className="text-3xl font-montserrat font-bold text-primary mb-1">
        Edit HCP Storefront
      </h1>
      <p className="text-secondary mb-8">
        Manage this HCP's published storefront, curated products, and commission %.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Storefront Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <StorefrontEditor
            fetchEndpoint={`/api/admin/hcp/${userId}/storefront`}
            saveEndpoint={`/api/admin/hcp/${userId}/storefront`}
            uploadEndpoint="/api/hcp/uploads/image"
            showCommission
          />
        </CardContent>
      </Card>
    </div>
  );
}
