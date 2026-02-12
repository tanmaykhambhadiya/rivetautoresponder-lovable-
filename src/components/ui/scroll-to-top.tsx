import { useState, useEffect, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScrollToTopProps {
  scrollContainer?: React.RefObject<HTMLElement>;
  threshold?: number;
}

export function ScrollToTop({ scrollContainer, threshold = 300 }: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleScroll = useCallback(() => {
    const container = scrollContainer?.current;
    if (container) {
      setIsVisible(container.scrollTop > threshold);
    }
  }, [scrollContainer, threshold]);

  const scrollToTop = useCallback(() => {
    const container = scrollContainer?.current;
    if (container) {
      container.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [scrollContainer]);

  useEffect(() => {
    const container = scrollContainer?.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [scrollContainer, handleScroll]);

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={cn(
        "fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg",
        "bg-primary hover:bg-primary/90 text-primary-foreground",
        "transition-all duration-300 ease-out",
        isVisible 
          ? "opacity-100 translate-y-0 scale-100" 
          : "opacity-0 translate-y-4 scale-75 pointer-events-none"
      )}
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
}
