import { getAllMagazineIssues } from "@/app/actions/magazine";
import MagazineArchiveClient from "./MagazineArchiveClient";

export const metadata = {
  title: "매거진 아카이브 | 티끌 ticgle",
  description: "티끌 매거진의 지난 호를 한눈에 모아보세요.",
};

export default async function MagazineArchivePage() {
  const { data: issues, error } = await getAllMagazineIssues();

  if (error || !issues) {
    return (
      <div style={{ padding: "100px", textAlign: "center" }}>
        <h1>데이터를 불러오는 중 오류가 발생했습니다.</h1>
        <p>{error}</p>
      </div>
    );
  }

  return <MagazineArchiveClient initialIssues={issues} />;
}
