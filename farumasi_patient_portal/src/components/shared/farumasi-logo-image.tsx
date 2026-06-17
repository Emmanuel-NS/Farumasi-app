import Image from "next/image";
import { cn } from "@/lib/utils";

/** Official FARUMASI leafy-F mark (PNG) — favicon / consult / PWA branding. */
export function FarumasiLogoImage({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/logo-icon.png"
      alt="FARUMASI"
      width={size}
      height={size}
      className={cn("object-contain shrink-0", className)}
      priority={size >= 64}
    />
  );
}
