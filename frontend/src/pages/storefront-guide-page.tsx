/**
 * Storefront setup guide for healthcare providers.
 *
 * Kevin asked for this in the Sep 29 review: a step-by-step walkthrough a
 * provider can follow on their own, linked straight from the storefront
 * editor so nobody has to be talked through it live.
 *
 * Registered at /hcp/guide — it MUST be declared before /hcp/:slug in App.tsx,
 * otherwise the slug route swallows it.
 */
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  Image as ImageIcon,
  LayoutDashboard,
  Link2,
  Package,
  Share2,
  Upload,
  UserPlus,
} from "lucide-react";

interface Step {
  n: number;
  icon: typeof UserPlus;
  title: string;
  body: string;
  detail?: string[];
  href?: string;
  hrefLabel?: string;
}

const steps: Step[] = [
  {
    n: 1,
    icon: UserPlus,
    title: "Apply as a healthcare provider",
    body: "Sign up with your professional details and submit for approval. You'll be notified once your account is approved — storefronts are only available to verified providers.",
    href: "/recovery-services/signup",
    hrefLabel: "Apply as a provider",
  },
  {
    n: 2,
    icon: LayoutDashboard,
    title: "Open your storefront editor",
    body: "Once approved, sign in and go to your provider dashboard. Your storefront editor is where everything below happens.",
    href: "/hcp/dashboard",
    hrefLabel: "Go to my dashboard",
  },
  {
    n: 3,
    icon: Upload,
    title: "Add your details",
    body: "This is what your patients see. None of it is required to publish, but a finished profile is what makes the page look like your practice rather than a blank template.",
    detail: [
      "Headshot — a photo of you, shown in the circle at the top",
      "Clinic logo — displayed in the circle if you don't add a headshot",
      "Banner — the wide image behind the top of the page",
      "Welcome message — one short line, up to 140 characters",
      "Bio — a few sentences about your practice and approach",
    ],
  },
  {
    n: 4,
    icon: Link2,
    title: "Choose your storefront link",
    body: "Pick the address patients will use to find you. Lowercase letters, numbers, and dashes only.",
    detail: ["Example: activerecovery360.com/hcp/your-clinic-name"],
  },
  {
    n: 5,
    icon: Package,
    title: "Pick the products you recommend",
    body: "Search or filter the catalog and select the items you actually use with your patients. These are the products that appear on your storefront.",
    detail: [
      "The order you select them in is the order they display in",
      "You can add or remove products at any time — changes take effect on save",
    ],
  },
  {
    n: 6,
    icon: BadgeCheck,
    title: "Publish, then save",
    body: "Turn on Publish Storefront and press Save Storefront. Publishing switches your page on; saving writes your changes. The publish switch now saves the moment you flip it.",
    detail: [
      "Until you publish, your link returns \"not found\" for everyone else",
      "You can unpublish at any time to take the page offline",
    ],
  },
  {
    n: 7,
    icon: Share2,
    title: "Share your link",
    body: "Your storefront is live. Send it to patients, put it in your email signature, or post it — anyone who arrives through your link is attributed to you.",
    detail: [
      "Orders placed through your storefront are credited to your account",
      "Your patients can still browse the full catalog from your page",
    ],
  },
];

export default function StorefrontGuidePage() {
  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="mb-10">
        <h1 className="text-4xl font-montserrat font-bold text-primary mb-4">
          Setting up your storefront
        </h1>
        <p className="text-xl text-secondary">
          A storefront gives you your own page on Active Recovery 360, stocked with the
          recovery products you recommend — under your name, at your own link. It takes about
          five minutes to set up.
        </p>
      </div>

      <ol className="space-y-6 mb-12">
        {steps.map((step) => (
          <li key={step.n} className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-11 h-11 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="flex-1 border-b border-border pb-6">
              <h2 className="font-montserrat font-bold text-primary text-xl mb-2">
                <span className="text-secondary mr-2">{step.n}.</span>
                {step.title}
              </h2>
              <p className="text-secondary mb-3">{step.body}</p>
              {step.detail && (
                <ul className="space-y-1.5 mb-3">
                  {step.detail.map((d) => (
                    <li key={d} className="flex items-start text-secondary text-sm">
                      <span className="mr-2 mt-0.5">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              )}
              {step.href && (
                <Button asChild variant="outline" size="sm">
                  <Link href={step.href}>
                    {step.hrefLabel}
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="bg-muted/30 rounded-lg p-6 mb-8">
        <h2 className="font-montserrat font-bold text-primary text-xl mb-4 flex items-center gap-2">
          <CircleDollarSign className="h-5 w-5" />
          How you get credited
        </h2>
        <p className="text-secondary">
          When a patient reaches the site through your storefront link, their order is
          attributed to you. Attribution is stored with the order at the time it's placed, so
          it isn't affected by them browsing elsewhere afterwards.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="font-montserrat font-bold text-blue-900 text-xl mb-3">
          Something not working?
        </h2>
        <ul className="space-y-2 text-blue-900/80">
          <li>
            <strong>My products aren't showing.</strong> Check that you've selected at least one
            product <em>and</em> pressed Save Storefront — selections aren't live until saved.
          </li>
          <li>
            <strong>My link says "not found".</strong> Your storefront isn't published yet. Flip
            Publish Storefront on in the editor.
          </li>
          <li>
            <strong>I can't find my storefront editor.</strong> Storefronts are only available
            to approved providers. If your application is still pending, you won't see the
            editor yet.
          </li>
        </ul>
        <p className="text-blue-900/80 mt-4">
          Still stuck? <Link href="/contact" className="text-primary underline">Contact us</Link> and
          we'll sort it out.
        </p>
      </div>

      <div className="mt-10 text-center">
        <Button asChild size="lg" className="btn-primary-enhanced">
          <Link href="/hcp/dashboard">
            <ImageIcon className="h-4 w-4 mr-2" />
            Set up my storefront
          </Link>
        </Button>
      </div>
    </div>
  );
}
