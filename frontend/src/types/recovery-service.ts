// Shared types for Recovery Services feature
export interface RecoveryServiceLocation {
  name?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string | null;
  hours?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface RecoveryServiceDiscount {
  text?: string;
  type?: "percentage" | "fixed" | "custom";
  value?: number;
  // When non-member views, server returns {locked: true, hasDiscount: bool}
  locked?: boolean;
  hasDiscount?: boolean;
}

export interface RecoveryService {
  id: string;
  name: string;
  category: string;
  description: string;
  logoUrl?: string | null;
  photoUrl?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  memberDiscount: RecoveryServiceDiscount;
  locations: RecoveryServiceLocation[];
  status: "draft" | "published";
  createdAt?: string;
  approvedAt?: string;
}

export const RECOVERY_CATEGORIES = [
  "Cryotherapy",
  "Float Tank / Sensory Deprivation",
  "Infrared Sauna",
  "IV Therapy",
  "Massage Therapy",
  "Physical Therapy",
  "Chiropractic",
  "Acupuncture",
  "Stretching / Mobility",
  "Recovery Lounge",
  "Compression Therapy",
  "Other",
] as const;
