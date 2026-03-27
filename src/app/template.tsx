"use client";

import { usePathname, useSearchParams } from "next/navigation";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Create a unique key for each "page" state including search params
  const key = `${pathname}?${searchParams.toString()}`;

  return (
    <div key={key} className="route-transition">
      {children}
    </div>
  );
}
