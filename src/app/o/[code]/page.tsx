import { RoomClient } from "@/components/game/RoomClient";
import { Ambient } from "@/components/ui/Ambient";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <>
      <Ambient />
      <RoomClient code={code} />
    </>
  );
}
