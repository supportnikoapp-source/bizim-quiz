import { SharedAnswers } from "@/components/finale/SharedAnswers";
import { Ambient } from "@/components/ui/Ambient";

export default async function SharedAnswersPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <>
      <Ambient />
      <SharedAnswers code={code} />
    </>
  );
}
