import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, MapPin, Loader2, Crosshair } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RecoveryServiceLocation } from "@/types/recovery-service";

interface LocationEditorProps {
  value: RecoveryServiceLocation[];
  onChange: (next: RecoveryServiceLocation[]) => void;
}

const EMPTY: RecoveryServiceLocation = {
  name: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  phone: "",
  hours: "",
  latitude: null,
  longitude: null,
};

export default function LocationEditor({ value, onChange }: LocationEditorProps) {
  const { toast } = useToast();
  const [geocoding, setGeocoding] = useState<number | null>(null);
  const cooldown = useRef<number>(0); // Nominatim asks for ≤1 req/sec

  const update = (idx: number, patch: Partial<RecoveryServiceLocation>) =>
    onChange(value.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const add = () => onChange([...value, { ...EMPTY }]);

  const geocode = async (idx: number) => {
    const loc = value[idx];
    const parts = [loc.address, loc.city, loc.state, loc.zipCode].filter(Boolean);
    if (!parts.length) {
      toast({ title: "Add an address first", variant: "destructive" });
      return;
    }
    // Be polite to Nominatim
    const now = Date.now();
    if (now - cooldown.current < 1100) {
      await new Promise((r) => setTimeout(r, 1100 - (now - cooldown.current)));
    }
    cooldown.current = Date.now();

    setGeocoding(idx);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
        parts.join(", ")
      )}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        update(idx, {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        });
        toast({ title: "Coordinates found", description: data[0].display_name });
      } else {
        toast({
          title: "No match",
          description: "Try a more specific address, or paste coords manually.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({ title: "Geocoding failed", description: e?.message, variant: "destructive" });
    } finally {
      setGeocoding(null);
    }
  };

  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/20">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Locations</Label>
          <p className="text-xs text-muted-foreground">
            Add one or more physical locations. Use "Find coordinates" to auto-fill lat/lng for the map.
          </p>
        </div>
        <Button type="button" size="sm" onClick={add} data-testid="add-location-btn">
          <Plus className="h-4 w-4 mr-1" /> Add Location
        </Button>
      </div>

      {value.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No locations. Add at least one before saving.
        </p>
      )}

      {value.map((loc, idx) => (
        <div
          key={idx}
          className="border rounded-md p-3 bg-background space-y-3"
          data-testid={`location-row-${idx}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" />
              Location {idx + 1}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive h-8 w-8"
              onClick={() => remove(idx)}
              data-testid={`remove-location-${idx}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-4">
              <Label className="text-xs">Location Name (optional)</Label>
              <Input
                value={loc.name || ""}
                onChange={(e) => update(idx, { name: e.target.value })}
                placeholder="Downtown Branch"
              />
            </div>
            <div className="sm:col-span-8">
              <Label className="text-xs">Street Address</Label>
              <Input
                value={loc.address}
                onChange={(e) => update(idx, { address: e.target.value })}
                placeholder="1234 Main St, Suite 200"
              />
            </div>
            <div className="sm:col-span-5">
              <Label className="text-xs">City</Label>
              <Input
                value={loc.city}
                onChange={(e) => update(idx, { city: e.target.value })}
                placeholder="Denver"
              />
            </div>
            <div className="sm:col-span-3">
              <Label className="text-xs">State</Label>
              <Input
                value={loc.state}
                onChange={(e) => update(idx, { state: e.target.value })}
                placeholder="CO"
                maxLength={2}
              />
            </div>
            <div className="sm:col-span-4">
              <Label className="text-xs">ZIP</Label>
              <Input
                value={loc.zipCode}
                onChange={(e) => update(idx, { zipCode: e.target.value })}
                placeholder="80202"
              />
            </div>
            <div className="sm:col-span-6">
              <Label className="text-xs">Phone (optional)</Label>
              <Input
                value={loc.phone || ""}
                onChange={(e) => update(idx, { phone: e.target.value })}
                placeholder="(303) 555-1234"
              />
            </div>
            <div className="sm:col-span-6">
              <Label className="text-xs">Hours (optional)</Label>
              <Input
                value={loc.hours || ""}
                onChange={(e) => update(idx, { hours: e.target.value })}
                placeholder="Mon-Fri 9am-7pm"
              />
            </div>

            <div className="sm:col-span-4">
              <Label className="text-xs">Latitude</Label>
              <Input
                type="number"
                step="any"
                value={loc.latitude ?? ""}
                onChange={(e) =>
                  update(idx, {
                    latitude: e.target.value === "" ? null : parseFloat(e.target.value),
                  })
                }
              />
            </div>
            <div className="sm:col-span-4">
              <Label className="text-xs">Longitude</Label>
              <Input
                type="number"
                step="any"
                value={loc.longitude ?? ""}
                onChange={(e) =>
                  update(idx, {
                    longitude: e.target.value === "" ? null : parseFloat(e.target.value),
                  })
                }
              />
            </div>
            <div className="sm:col-span-4 flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => geocode(idx)}
                disabled={geocoding === idx}
                className="w-full"
                data-testid={`geocode-btn-${idx}`}
              >
                {geocoding === idx ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crosshair className="h-4 w-4" />
                )}
                <span className="ml-2">Find coordinates</span>
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
