import { HomeScreen } from "@/components/home/HomeScreen";
import { Ambient } from "@/components/ui/Ambient";

export default function Home() {
  return (
    <>
      <Ambient />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[430px] items-center px-5 py-10">
        <HomeScreen />
      </div>
    </>
  );
}
