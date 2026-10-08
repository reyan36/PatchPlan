import { IdeaEditor } from "@/features/idea-management/IdeaEditor";

export default function IdeaPage({ params }: { params: { id: string } }) {
  return (
    <div className="h-full">
      <IdeaEditor ideaId={params.id} />
    </div>
  );
}
