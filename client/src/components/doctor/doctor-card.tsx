import { Link } from "wouter";
import { User } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DoctorCardProps {
  doctor: Omit<User, "password">;
}

export default function DoctorCard({ doctor }: DoctorCardProps) {
  // Create tags from doctor's specialty
  const getSpecialtyTags = () => {
    if (!doctor.doctorSpecialty) return [];
    return doctor.doctorSpecialty.split(',').map(tag => tag.trim());
  };

  return (
    <Card className="bg-primary bg-opacity-5 rounded-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="w-16 h-16 rounded-full overflow-hidden mr-4">
            <img 
              src={doctor.profileImage || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&h=200&q=80"} 
              alt={doctor.fullName} 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="font-montserrat font-bold text-primary text-xl">
              {doctor.doctorTitle ? doctor.doctorTitle : ''} {doctor.fullName}
            </h3>
            <p className="text-secondary text-sm">{doctor.doctorSpecialty}</p>
          </div>
        </div>
        
        <p className="text-secondary mb-4">
          {doctor.doctorBio || "Specializing in recovery and rehabilitation techniques."}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {getSpecialtyTags().map((tag, index) => (
            <span key={index} className="bg-primary bg-opacity-10 text-primary text-xs px-2 py-1 rounded">
              {tag}
            </span>
          ))}
        </div>
        
        <Button 
          asChild
          variant="outline" 
          className="block text-center border border-primary text-primary w-full px-4 py-2 rounded font-montserrat font-semibold hover:bg-primary hover:text-white transition"
        >
          <Link href={`/doctors/${doctor.id}`}>
            Visit Storefront
          </Link>
        </Button>
      </div>
    </Card>
  );
}
