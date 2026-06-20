import PageLayout from "@/components/PageLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "문의하기 | HWP2PDF",
  description: "HWP2PDF 서비스 이용 중 궁금한 점이나 문제가 있으면 문의해 주세요.",
};

export default function ContactPage() {
  return (
    <PageLayout showBackground={false}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-8">문의하기</h1>

        <div className="prose dark:prose-invert text-zinc-700 dark:text-zinc-300 space-y-6">
          <p>HWP2PDF 이용 중 불편 사항, 버그 제보, 개선 제안, 제휴 문의 등이 있으시면 아래 채널로 연락 주세요.</p>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">이메일</h2>
              <p className="text-zinc-600 dark:text-zinc-400">support@hwp2pdf.app</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">답변 시간</h2>
              <p className="text-zinc-600 dark:text-zinc-400">영업일 기준 2~3일 이내에 답변 드립니다.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">자주 묻는 내용</h2>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>변환된 파일은 30분 후 자동 삭제됩니다.</li>
                <li>업로드 가능한 파일 형식은 .hwp입니다.</li>
                <li>최대 파일 크기는 20MB입니다.</li>
                <li>변환 완료 후 다운로드 링크는 짧은 시간 동안 유효합니다.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
