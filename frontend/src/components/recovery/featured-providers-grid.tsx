import {
  Snowflake,
  Waves,
  Flame,
  Droplet,
  HandHeart,
  Activity,
  StretchHorizontal,
  Layers,
} from "lucide-react";

interface DemoProvider {
  name: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string; // tailwind text color class
}

const DEMO_PROVIDERS: DemoProvider[] = [
  {
    name: "Apex Cryotherapy",
    category: "Whole-body cold immersion",
    icon: Snowflake,
    accent: "text-sky-500",
  },
  {
    name: "Stillwater Float",
    category: "Sensory deprivation tanks",
    icon: Waves,
    accent: "text-blue-500",
  },
  {
    name: "Ember Infrared",
    category: "Infrared sauna sessions",
    icon: Flame,
    accent: "text-orange-500",
  },
  {
    name: "Hydrate Drip Lounge",
    category: "Performance IV therapy",
    icon: Droplet,
    accent: "text-cyan-500",
  },
  {
    name: "RestoreWorks Massage",
    category: "Sports & deep-tissue massage",
    icon: HandHeart,
    accent: "text-rose-500",
  },
  {
    name: "Momentum Physio",
    category: "Sports physical therapy",
    icon: Activity,
    accent: "text-emerald-500",
  },
  {
    name: "Mobility Lab",
    category: "Assisted stretching & mobility",
    icon: StretchHorizontal,
    accent: "text-violet-500",
  },
  {
    name: "Pulse Compression",
    category: "Pneumatic compression therapy",
    icon: Layers,
    accent: "text-amber-500",
  },
];

export default function FeaturedProvidersGrid() {
  return (
    <section
      className="my-10 py-10 px-4 sm:px-8 rounded-xl bg-gray-50 border"
      data-testid="featured-providers-grid"
    >
      <div className="text-center mb-10 max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-montserrat font-bold text-primary mb-3 leading-tight">
          Some of the Exercise, Injury & Performance
          <br className="hidden sm:block" />
          Recovery Services we feature
        </h2>
        <p className="text-secondary text-sm">
          From cryotherapy to IV drips — our directory connects members with
          vetted local recovery providers, each offering exclusive savings.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {DEMO_PROVIDERS.map((p) => (
          <div
            key={p.name}
            className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all p-6 flex flex-col items-center justify-center text-center aspect-square"
            data-testid={`demo-provider-${p.name.replace(/\s+/g, "-").toLowerCase()}`}
          >
            <div className="bg-primary/5 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <p.icon className={`h-8 w-8 ${p.accent}`} />
            </div>
            <h3 className="font-montserrat font-bold text-primary text-base sm:text-lg leading-tight mb-1">
              {p.name}
            </h3>
            <p className="text-xs text-secondary leading-snug">{p.category}</p>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        Sample providers shown for illustration. Browse the live directory below for
        local businesses currently partnered with Active Recovery 360.
      </p>
    </section>
  );
}
