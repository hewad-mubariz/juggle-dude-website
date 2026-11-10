import Image from "next/image";

export function AppLogo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/images/juggle-dude-app-icon.webp"
      alt=""
      width={48}
      height={48}
      className={`shrink-0 rounded-[22%] ${className}`}
    />
  );
}
