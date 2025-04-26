import { Testimonial } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Quote } from "lucide-react";

interface TestimonialCardProps {
  testimonial: Testimonial;
}

export default function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <Card className="bg-primary bg-opacity-5 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <div className="text-primary">
          <Quote className="h-8 w-8" />
        </div>
      </div>
      <p className="text-secondary italic mb-4">
        "{testimonial.content}"
      </p>
      <div className="flex items-center">
        <div className="w-12 h-12 rounded-full overflow-hidden mr-3">
          <img 
            src={testimonial.imageUrl || "https://via.placeholder.com/150x150?text=Author"} 
            alt={testimonial.author} 
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h4 className="font-montserrat font-semibold text-primary">{testimonial.author}</h4>
          <p className="text-secondary text-sm">{testimonial.role}</p>
        </div>
      </div>
    </Card>
  );
}
