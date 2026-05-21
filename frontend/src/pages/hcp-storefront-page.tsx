import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Loader2, Stethoscope, ShieldCheck } from "lucide-react";
import { Product } from "@/types";
import ProductCard from "@/components/product/product-card";
import { useHcpReferral } from "@/hooks/use-hcp-referral";

interface StorefrontProfile {
  id: string;
  fullName: string;
  specialty?: string | null;
  storefrontSlug: string;
  storefrontBio?: string | null;
  storefrontHeadshotUrl?: string | null;
  storefrontBannerUrl?: string | null;
  storefrontWelcomeMessage?: string | null;
  storefrontEnabled: boolean;
}

interface StorefrontResponse {
  profile: StorefrontProfile;
  products: Product[];
}

export default function HcpStorefrontPage() {
  const { slug } = useParams<{ slug: string }>();
  const { capture } = useHcpReferral();

  const { data, isLoading, error } = useQuery<StorefrontResponse>({
    queryKey: [`/api/hcp/storefronts/${slug}`],
    enabled: !!slug,
  });

  // Capture the referral cookie once we know the storefront is real
  useEffect(() => {
    if (data?.profile) {
      capture(data.profile.storefrontSlug, data.profile.fullName);
    }
  }, [data?.profile, capture]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-20 text-center">
        <h1 className="text-2xl font-montserrat font-bold text-primary mb-3">
          Storefront not found
        </h1>
        <p className="text-secondary mb-6">
          The HCP storefront you're looking for doesn't exist or isn't published yet.
        </p>
        <Link href="/shop" className="text-primary underline">
          Browse all products
        </Link>
      </div>
    );
  }

  const { profile, products } = data;
  const banner = profile.storefrontBannerUrl;

  return (
    <div data-testid="hcp-storefront">
      {/* Banner */}
      <div
        className="relative h-48 sm:h-64 bg-gradient-to-br from-primary/20 to-primary/5"
        style={
          banner
            ? { backgroundImage: `url(${banner})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="container mx-auto px-4 -mt-16 pb-12">
        {/* Profile card */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex-shrink-0">
            {profile.storefrontHeadshotUrl ? (
              <img
                src={profile.storefrontHeadshotUrl}
                alt={profile.fullName}
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover border-4 border-white shadow"
                data-testid="hcp-headshot"
              />
            ) : (
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-primary/10 border-4 border-white shadow flex items-center justify-center">
                <Stethoscope className="h-10 w-10 text-primary" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-montserrat font-bold text-primary">
                {profile.fullName}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                <ShieldCheck className="h-3 w-3" />
                Verified HCP
              </span>
            </div>
            {profile.specialty && (
              <p className="text-sm text-secondary mb-3">{profile.specialty}</p>
            )}
            {profile.storefrontWelcomeMessage && (
              <p className="text-base font-medium text-foreground mb-3">
                {profile.storefrontWelcomeMessage}
              </p>
            )}
            {profile.storefrontBio && (
              <p className="text-sm text-secondary whitespace-pre-line">{profile.storefrontBio}</p>
            )}
          </div>
        </div>

        {/* Products */}
        <div className="mt-10">
          <h2 className="text-xl sm:text-2xl font-montserrat font-bold text-primary mb-4">
            {products.length > 0
              ? `Recommended by ${profile.fullName.split(" ")[0]}`
              : "Storefront in progress"}
          </h2>

          {products.length === 0 ? (
            <p className="text-secondary">
              This HCP hasn't curated any products yet. Check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-12 p-4 rounded-md bg-muted/30 text-sm text-secondary">
          <p>
            Purchases made through {profile.fullName.split(" ")[0]}'s storefront
            help support their practice.{" "}
            <Link href="/shop" className="text-primary underline">
              Or browse the full Active Recovery 360 catalog
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
