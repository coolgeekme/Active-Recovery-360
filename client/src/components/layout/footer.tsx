import { Link } from "wouter";
import { ERALogo } from "@/lib/era-logo";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white pt-12 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center mr-2">
                <ERALogo className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-white font-montserrat font-bold text-lg leading-none">EXERCISE RECOVERY</div>
                <div className="text-gray-400 font-montserrat text-sm leading-none">ALLIANCE</div>
              </div>
            </div>
            <p className="text-gray-400 mb-4">
              Professional-grade recovery products for healthcare providers and patients.
            </p>
            <div className="flex space-x-4">
              <a 
                href="#" 
                className="text-gray-400 hover:text-white transition"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="text-gray-400 hover:text-white transition"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="text-gray-400 hover:text-white transition"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="text-gray-400 hover:text-white transition"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-montserrat font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-gray-400 hover:text-white transition">Home</Link></li>
              <li><Link href="/shop" className="text-gray-400 hover:text-white transition">Shop Products</Link></li>
              <li><Link href="/membership" className="text-gray-400 hover:text-white transition">Membership</Link></li>
              <li><Link href="/doctors" className="text-gray-400 hover:text-white transition">Doctor Storefronts</Link></li>
              <li><Link href="/about" className="text-gray-400 hover:text-white transition">About Us</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-white transition">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-montserrat font-bold text-lg mb-4">Product Categories</h3>
            <ul className="space-y-2">
              <li><Link href="/category/1" className="text-gray-400 hover:text-white transition">Joint & Muscle</Link></li>
              <li><Link href="/category/2" className="text-gray-400 hover:text-white transition">Spine & Back</Link></li>
              <li><Link href="/category/3" className="text-gray-400 hover:text-white transition">Compression Therapy</Link></li>
              <li><Link href="/category/4" className="text-gray-400 hover:text-white transition">Heat & Cold Therapy</Link></li>
              <li><Link href="/shop" className="text-gray-400 hover:text-white transition">Mobility Aids</Link></li>
              <li><Link href="/shop" className="text-gray-400 hover:text-white transition">Clinical Tools</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-montserrat font-bold text-lg mb-4">Subscribe</h3>
            <p className="text-gray-400 mb-4">
              Join our newsletter for updates on new recovery products and resources.
            </p>
            <form className="mb-4" onSubmit={(e) => e.preventDefault()}>
              <div className="flex">
                <Input 
                  type="email" 
                  placeholder="Your email" 
                  className="bg-gray-800 text-white border-gray-700 rounded-r-none focus:border-primary"
                />
                <Button 
                  type="submit" 
                  className="bg-primary text-white rounded-l-none font-montserrat font-semibold hover:bg-opacity-90 transition"
                >
                  Subscribe
                </Button>
              </div>
            </form>
            <p className="text-gray-400 text-sm">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} Exercise Recovery Alliance. All rights reserved.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition text-sm">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white transition text-sm">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-white transition text-sm">Shipping Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
