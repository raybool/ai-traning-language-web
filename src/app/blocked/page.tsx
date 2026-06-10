import { BlockedPageContent } from '@/components/pages/BlockedPageContent';
import { Suspense } from 'react';

const BlockedPage = () => (
  <Suspense fallback={null}>
    <BlockedPageContent />
  </Suspense>
);

export default BlockedPage;
