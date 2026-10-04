import { HistoricalWorkbookPage, type HistoricalWorkbookParams } from "@/features/reporting/history/HistoricalWorkbookPage";
export default async function WorkbookPrintPage({ searchParams }: { searchParams: Promise<HistoricalWorkbookParams> }) {
  return <HistoricalWorkbookPage params={await searchParams} print />;
}
