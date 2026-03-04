import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { User, Product } from "@/types";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductGrid from "@/components/product/product-grid";

export default function DoctorStorefrontPage() {
  const { id } = useParams();
  const doctorId = parseInt(id);
  
  const { data: doctor, isLoading: isLoadingDoctor, error: doctorError } = useQuery<Omit<User, "password">>({
    queryKey: [`/api/doctors/${doctorId}`],
  });

  // Create tags from doctor's specialty
  const getSpecialtyTags = () => {
    if (!doctor?.doctorSpecialty) return [];
    return doctor.doctorSpecialty.split(',').map(tag => tag.trim());
  };

  if (isLoadingDoctor) {
    return (
      <div className="container mx-auto py-20 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (doctorError || !doctor) {
    return (
      <div className="container mx-auto py-20 px-4 text-center">
        <h2 className="text-2xl font-montserrat font-bold text-primary mb-4">Doctor Not Found</h2>
        <p className="text-secondary mb-6">The doctor you're looking for doesn't exist or may have been removed.</p>
        <a href="/doctors" className="text-primary hover:underline">View All Doctors</a>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      {/* Doctor Header */}
      <div className="bg-primary bg-opacity-5 rounded-lg p-6 md:p-8 mb-10">
        <div className="flex flex-col md:flex-row items-start md:items-center">
          <div className="w-24 h-24 rounded-full overflow-hidden mb-4 md:mb-0 md:mr-6 flex-shrink-0">
            <img 
              src={doctor.profileImage || "https://via.placeholder.com/200x200?text=Doctor"} 
              alt={doctor.fullName} 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-grow">
            <h1 className="text-3xl font-montserrat font-bold text-primary mb-1">
              {doctor.doctorTitle} {doctor.fullName}
            </h1>
            <p className="text-lg text-secondary mb-3">{doctor.doctorSpecialty}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {getSpecialtyTags().map((tag, index) => (
                <span key={index} className="bg-primary bg-opacity-10 text-primary text-xs px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-secondary">
              {doctor.doctorBio || "Specializing in recovery and rehabilitation techniques."}
            </p>
          </div>
        </div>
      </div>

      {/* Doctor Products */}
      <div>
        <Tabs defaultValue="all">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-montserrat font-bold text-primary">Doctor's Recommended Products</h2>
            <TabsList>
              <TabsTrigger value="all">All Products</TabsTrigger>
              <TabsTrigger value="featured">Featured</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="all">
            <ProductGrid doctorId={doctorId} />
          </TabsContent>
          
          <TabsContent value="featured">
            <ProductGrid doctorId={doctorId} featured={true} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
