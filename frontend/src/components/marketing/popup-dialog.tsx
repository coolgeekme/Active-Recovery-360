import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

// Cookie utility functions
const setCookie = (name: string, value: string, days: number) => {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `; expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value}${expires}; path=/`;
};

const getCookie = (name: string): string | null => {
  const nameLenPlus = name.length + 1;
  return document.cookie
    .split(';')
    .map(c => c.trim())
    .filter(cookie => cookie.substring(0, nameLenPlus) === `${name}=`)
    .map(cookie => decodeURIComponent(cookie.substring(nameLenPlus)))[0] || null;
};

export default function PopupDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const calendlyUrl = 'https://calendly.com/reggiealcos';
  const fastTrackUrl = 'https://fasttrackbuilds.coolgeek.me';

  useEffect(() => {
    // Check if we should show popup based on cookie
    const dialogCookie = getCookie('cookieDialogShown');
    
    if (dialogCookie) {
      // If cookie exists, start in minimized state
      setIsMinimized(true);
      setIsOpen(false);
    } else {
      // If no cookie, show the popup
      setIsOpen(true);
      setIsMinimized(false);
    }
    
    setIsInitialLoad(false);
  }, []);

  useEffect(() => {
    // Prevent scrolling when dialog is open
    if (isOpen && !isInitialLoad) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isInitialLoad]);

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(true);
    
    // Set cookie to expire in one year
    setCookie('cookieDialogShown', 'true', 365);
  };

  const handleScheduleCall = () => {
    // Open Calendly in a new tab
    window.open(calendlyUrl, '_blank');
  };

  const handleLearnMore = () => {
    setIsMinimized(false);
    setIsOpen(true);
  };

  const handleFastTrackVisit = () => {
    // Open FastTrack builds site in a new tab
    window.open(fastTrackUrl, '_blank');
  };

  return (
    <>
      {/* Full-screen popup */}
      {!isInitialLoad && (
        <Dialog 
          open={isOpen} 
          onOpenChange={(open) => {
            setIsOpen(open);
            // If dialog is being closed, also handle the minimization and cookie setting
            if (!open) {
              handleClose();
            }
          }}
        >
          <DialogContent className="sm:max-w-[500px] p-6 animate-in fade-in-0 zoom-in-95 data-[state=open]:animate-in data-[state=closed]:animate-out">
            <button 
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
            
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Like what you see?</DialogTitle>
              <DialogDescription className="text-lg mt-2">
                This new site could be yours! Let's talk about it. Schedule a 30 minute call today before the site expires.
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4">
              <a 
                href={fastTrackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary flex items-center hover:underline mb-5"
              >
                Visit FastTrack Builds <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <Button 
                className="w-full" 
                onClick={handleScheduleCall}
              >
                Schedule a Call
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleClose}
              >
                No Thanks
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Minimized banner */}
      {isMinimized && !isInitialLoad && (
        <div 
          className={cn(
            "fixed bottom-4 right-4 z-50 bg-white p-4 rounded-lg shadow-lg",
            "max-w-[300px] border-l-4 border-primary",
            "animate-in fade-in-0 slide-in-from-right-5",
            "transition-all duration-300"
          )}
        >
          <div className="flex flex-col">
            <h3 className="font-bold text-lg mb-2">Want to claim this site?</h3>
            
            <a 
              href={fastTrackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary flex items-center hover:underline mb-3 text-sm"
            >
              Visit FastTrack Builds <ExternalLink className="h-3 w-3 ml-1" />
            </a>
            
            <div className="flex flex-col gap-2 mt-1">
              <Button 
                size="sm" 
                className="w-full" 
                onClick={handleScheduleCall}
              >
                Schedule Call
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full" 
                onClick={handleLearnMore}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}