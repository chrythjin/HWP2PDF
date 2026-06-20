import PageLayout from "@/components/PageLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 | HWP2PDF",
  description: "HWP2PDF의 개인정보 수집, 이용, 보관, 파기에 대한 정책을 확인하세요.",
};

export default function PrivacyPage() {
  return (
    <PageLayout showBackground={false}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-8">개인정보처리방침</h1>

        <div className="prose dark:prose-invert text-zinc-700 dark:text-zinc-300 space-y-6">
          <p>
            HWP2PDF(이하 "본 서비스")는 사용자의 개인정보를 최우선으로 보호하며, 「개인정보 보호법」 등 관련 법령을 준수합니다.
            본 방침은 본 서비스가 수집하는 정보, 이용 목적, 보관 및 파기 방법을 설명합니다.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-8">1. 수집하는 정보</h2>
          <p>본 서비스는 서비스 제공을 위해 다음 정보를 처리합니다.</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>업로드 파일</strong>: 사용자가 변환을 위해 업로드하는 HWP 문서(PDF 변환 전/후 파일 포함)</li>
            <li><strong>기술 정보</strong>: 변환 작업 식별을 위한 내부 job ID, 파일명, 파일 크기</li>
            <li><strong>로그 정보</strong>: 서비스 안정성 분석을 위한 최소한의 접속 로그(오류 로그, 요청 경로 등)</li>
          </ul>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-8">2. 개인정보의 이용 목적</h2>
          <p>수집된 정보는 다음 목적에만 사용됩니다.</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>HWP 문서의 PDF 변환 서비스 제공</li>
            <li>변환 작업 상태 조회 및 결과 다운로드 기능 제공</li>
            <li>서비스 오류 진단 및 품질 개선</li>
          </ul>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-8">3. 개인정보의 보관 및 파기</h2>
          <p>
            업로드된 원본 파일과 변환 결과 파일은 <strong>변환 완료 후 최대 30분</strong> 동안 임시로 보관되며,
            이후 자동으로 영구 삭제됩니다. 별도의 데이터베이스에 개인정보를 영구 저장하지 않습니다.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-8">4. 개인정보의 제3자 제공</h2>
          <p>
            본 서비스는 사용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
            다만, 서비스 운영에 필요한 클라우드 인프라(Google Cloud, Vercel)에서 파일 저장 및 처리가 이루어지며,
            해당 업체는 본 서비스의 지시에 따라 데이터를 처리합니다.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-8">5. 사용자의 권리</h2>
          <p>사용자는 언제든지 자신의 파일을 삭제하거나 변환 작업을 중단할 수 있습니다. 문의사항은 <a href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">문의하기</a>를 통해 연락 주세요.</p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-8">6. 정책 변경</h2>
          <p>본 개인정보처리방침은 법령 및 서비스 변경에 따라 수정될 수 있으며, 변경 시 본 페이지를 통해 공지합니다.</p>

          <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-12">최종 수정일: 2026년 6월 20일</p>
        </div>
      </div>
    </PageLayout>
  );
}
