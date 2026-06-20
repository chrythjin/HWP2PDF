import PageLayout from "@/components/PageLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 | HWP2PDF",
  description: "HWP2PDF 서비스 이용에 관한 약관과 사용자의 권리 및 의무를 확인하세요.",
};

export default function TermsPage() {
  return (
    <PageLayout showBackground={false}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-8">이용약관</h1>

        <div className="prose dark:prose-invert text-zinc-700 dark:text-zinc-300 space-y-6">
          <p>
            본 이용약관은 HWP2PDF(이하 "본 서비스")를 이용하는 사용자와 운영자 간의 권리, 의무 및 책임 사항을 규정합니다.
            본 서비스를 이용함으로써 사용자는 본 약관에 동의한 것으로 간주됩니다.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-8">1. 서비스 설명</h2>
          <p>본 서비스는 사용자가 업로드한 HWP(한글) 문서를 PDF 파일로 변환하는 무료 온라인 도구입니다. 변환은 Google Cloud 인프라에서 처리됩니다.</p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-8">2. 이용 제한</h2>
          <p>사용자는 다음 행위를 해서는 안 됩니다.</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>타인의 저작권, 개인정보, 영업비밀을 침해하는 문서 업로드</li>
            <li>불법 콘텐츠, 악성코드, 바이러스가 포함된 파일 업로드</li>
            <li>본 서비스의 정상적인 운영을 방해하는 행위(과도한 자동화 요청, DDoS 등)</li>
            <li>변환된 파일을 불법적으로 재배포, 판매하는 행위</li>
          </ul>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-8">3. 책임의 한계</h2>
          <p>
            본 서비스는 "있는 그대로(as-is)" 제공됩니다. 변환 결과물의 정확성, 완전성, 적합성에 대해 보증하지 않습니다.
            변환으로 인해 발생할 수 있는 데이터 손실, 레이아웃 변경, 글꼴 차이 등에 대해 운영자는 책임을 지지 않습니다.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-8">4. 파일 보관 및 삭제</h2>
          <p>
            업로드된 파일과 변환 결과는 <strong>변환 완료 후 최대 30분</strong> 동안 임시 보관되며,
            이후 자동 삭제됩니다. 사용자는 변환 완료 후 즉시 결과를 다운로드할 책임이 있습니다.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-8">5. 지식재산권</h2>
          <p>
            사용자가 업로드한 파일의 저작권 및 기타 권리는 사용자에게 있습니다.
            본 서비스는 변환 처리를 위해 파일에 접근할 필요가 있으며, 이는 사용자가 명시적으로 허락한 것으로 봅니다.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-8">6. 서비스 변경 및 중단</h2>
          <p>운영자는 사전 고지 없이 서비스의 내용을 변경하거나 일시 중단할 수 있으며, 이에 따른 책임은 제한됩니다.</p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-8">7. 문의</h2>
          <p>본 약관에 대한 문의는 <a href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">문의하기</a>를 통해 해주세요.</p>

          <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-12">최종 수정일: 2026년 6월 20일</p>
        </div>
      </div>
    </PageLayout>
  );
}
