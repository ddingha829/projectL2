import { AUTHORS } from "@/lib/constants/authors";
import RequestBoard from "./RequestBoard";
import { notFound } from "next/navigation";

export default async function RequestPage({
  params,
}: {
  params: Promise<{ writerId: string }>
}) {
  const resolvedParams = await params;
  const author = AUTHORS.find(a => a.id === resolvedParams.writerId);

  if (!author) {
    return notFound();
  }

  return (
    <RequestBoard 
      writerId={author.id} 
      writerName={author.name} 
      color={author.color} 
    />
  );
}
