import Image from "next/image";
import type { ReactNode } from "react";

export function EmptyState({ image, title, children }: { image: string; title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-12 text-center">
      <Image src={image} alt="" width={200} height={200} className="h-44 w-44" />
      <h2 className="mt-4 text-2xl">{title}</h2>
      <div className="mt-2 text-stone">{children}</div>
    </div>
  );
}
