import Image from "next/image";

import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  alt?: string;
};

export function Logo({ className, alt = "סמל נחלה" }: LogoProps) {
  return (
    <>
      <Image
        src="/brand/logo-mark.svg"
        alt={alt}
        width={120}
        height={120}
        priority
        unoptimized
        className={cn("size-24 dark:hidden", className)}
      />
      <Image
        src="/brand/logo-mark-dark.svg"
        alt={alt}
        width={120}
        height={120}
        priority
        unoptimized
        className={cn("hidden size-24 dark:block", className)}
      />
    </>
  );
}
