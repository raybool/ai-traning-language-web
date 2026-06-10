import { VocabularyPageContent } from '@/components/pages/VocabularyPageContent';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const VocabularyPage = async ({ params }: Props) => {
  const { id } = await params;

  return <VocabularyPageContent lessonId={parseInt(id)} />;
};

export default VocabularyPage;
