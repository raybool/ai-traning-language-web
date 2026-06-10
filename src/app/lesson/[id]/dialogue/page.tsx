import { DialoguePageContent } from '@/components/pages/DialoguePageContent';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const DialoguePage = async ({ params }: Props) => {
  const { id } = await params;

  return <DialoguePageContent lessonId={parseInt(id, 10)} />;
};

export default DialoguePage;
