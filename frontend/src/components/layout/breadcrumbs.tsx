import { Link } from "wouter";
import { ChevronRight, Home } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

/**
 * Compact breadcrumb trail with Home icon root. The last item is rendered
 * as plain text (current page); earlier items are links if `href` is set.
 */
export default function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center text-sm text-muted-foreground mb-6 flex-wrap ${className}`}
      data-testid="breadcrumbs"
    >
      <Link
        href="/"
        className="inline-flex items-center hover:text-primary transition-colors"
        data-testid="breadcrumb-home"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx} className="inline-flex items-center">
            <ChevronRight className="h-3.5 w-3.5 mx-1.5 text-muted-foreground/60" />
            {isLast || !item.href ? (
              <span
                className={`truncate max-w-[260px] ${
                  isLast ? "text-foreground font-medium" : ""
                }`}
                title={item.label}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-primary transition-colors truncate max-w-[200px]"
                title={item.label}
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
