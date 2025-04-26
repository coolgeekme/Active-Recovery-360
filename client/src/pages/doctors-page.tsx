import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Loader2 } from "lucide-react";
import DoctorCard from "@/components/doctor/doctor-card";

export default function DoctorsPage() {
  const { data: doctors = [], isLoading, error } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/doctors"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-20 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-20 px-4 text-center">
        <h2 className="text-2xl font-montserrat font-bold text-primary mb-4">Error Loading Doctors</h2>
        <p className="text-secondary">There was a problem loading the doctor information. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-montserrat font-bold text-primary mb-4">Doctor Storefronts</h1>
        <p className="text-xl text-secondary max-w-3xl mx-auto">
          Explore specialized shops curated by medical professionals with products tailored to specific recovery needs.
        </p>
      </div>

      {doctors.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-secondary">No doctor storefronts available at this time. Please check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {doctors.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
        </div>
      )}

      <div className="mt-16 bg-primary bg-opacity-5 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-montserrat font-bold text-primary mb-4">Are You a Healthcare Professional?</h2>
        <p className="text-lg text-secondary mb-6 max-w-2xl mx-auto">
          Join the Exercise Recovery Alliance as a healthcare provider and create your own specialized storefront with curated product recommendations.
        </p>
        <a 
          href="/auth?tab=register" 
          className="inline-block bg-primary text-white px-6 py-3 rounded font-montserrat font-semibold hover:bg-opacity-90 transition"
        >
          Register as a Healthcare Professional
        </a>
      </div>
    </div>
  );
}
