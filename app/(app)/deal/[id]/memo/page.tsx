import { use } from 'react';
import { MemoClientPage } from './MemoClientPage';

interface MemoPageProps {
  params: Promise<{ id: string }>;
}

export default function MemoPage({ params }: MemoPageProps) {
  const { id } = use(params);
  return <MemoClientPage dealId={id} />;
}
