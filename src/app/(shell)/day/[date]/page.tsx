import { DayDetailView } from "@/components/day-detail-view";

interface PageProps {
  params: Promise<{ date: string }>;
}

export default async function DayDetailPage({ params }: PageProps) {
  const { date } = await params;
  return <DayDetailView date={date} />;
}
