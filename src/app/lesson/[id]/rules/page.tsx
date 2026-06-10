import { RulesPageContent } from '@/components/pages/RulesPageContent';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const RulesPage = async ({ params }: Props) => {
  const { id } = await params;

  return <RulesPageContent lessonId={parseInt(id, 10)} />;
};

export default RulesPage;
