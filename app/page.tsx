import Image from "next/image";
import { BubbleBackground } from "@/components/animate-ui/backgrounds/bubble";

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <BubbleBackground className="absolute inset-0 flex items-center justify-center rounded-xl" />
    </div>
  );
}
