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
            HWP2PDF(이하 ‘본 서비스’)는 사용자의 개인정보를 최우선으로 보호하며, 「개인정보 보호법」 등 관련 법령을 준수합니다.
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
            본 서비스는 회원 여부에 따라 보관 및 파기 방식이 다릅니다. 원본 파일과 변환 결과 파일은 모든 경우에 변환 완료 후 자동으로 삭제됩니다.
          </p>

          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mt-6">3.1 회원 변환 이력</h3>
          <p>
            회원으로 로그인하여 변환한 경우, 변환 이력 메타데이터(작업 식별자, 상태, 시간 정보)가 <strong>최대 30일</strong>간 보관됩니다.
            이 메타데이터에는 원본 파일 내용이나 변환 결과 파일 자체는 포함되지 않으며, 회원은 이 기간 내 언제든지 이력을 조회하고 개별 작업을 삭제할 수 있습니다.
          </p>

          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mt-6">3.2 삭제 및 tombstone</h3>
          <p>
            회원이 변환 이력에서 작업을 삭제하면 해당 메타데이터는 즉시 삭제되며, 삭제 사실을 기록하는 tombstone(묘비) 데이터가 <strong>30일</strong>간 보관된 후 영구 파기됩니다.
            tombstone에는 원본 파일이나 결과 파일은 포함되지 않으며, 삭제 이력 추적 목적으로만 사용됩니다.
          </p>

          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mt-6">3.3 비회원 익명 접근 토큰</h3>
          <p>
            비회원(로그인하지 않은 사용자)의 변환 작업은 업로드 시 발급되는 <strong>X-Job-Access-Token</strong> 헤더 기반 접근 토큰으로 식별됩니다.
            비회원은 회원 이력이 저장되지 않으며, 접근 토큰을 통해서만 자신의 작업 상태와 결과를 조회할 수 있습니다.
            비회원 작업은 별도의 직접 삭제 기능 없이 <strong>변환 완료 후 30분</strong>이 지나면 자동으로 영구 삭제됩니다.
          </p>

          <p>
            다운로드 링크는 소유자 검증을 거친 후 발급되는 단기 보호 URL이며, 일정 시간 경과 후 만료됩니다.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-8">4. 개인정보의 제3자 제공</h2>
          <p>
            본 서비스는 사용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
            다만, 서비스 운영에 필요한 클라우드 인프라(Google Cloud, Vercel)에서 파일 저장 및 처리가 이루어지며,
            해당 업체는 본 서비스의 지시에 따라 데이터를 처리합니다.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-8">5. 사용자의 권리</h2>
          <p>
            회원은 변환 이력에서 언제든지 자신의 작업을 삭제할 수 있으며, 삭제 시 3.2에 따른 tombstone이 30일간 유지됩니다.
            비회원은 접근 토큰을 통해 작업을 조회할 수 있으나 직접 삭제는 지원되지 않으며, 30분 TTL 경과 후 자동 삭제됩니다.
            문의사항은 <a href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">문의하기</a>를 통해 연락 주세요.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-8">6. 쿠키 및 광고</h2>
          <p>
            본 서비스는 Google AdSense를 통해 광고를 게재하고 있습니다.
            Google은 방문자의 브라우저에 쿠키를 저장하여 맞춤형 광고를 제공할 수 있으며,
            이 과정에서 IP 주소, 브라우저 정보, 방문한 페이지 등의 비개인 식별 정보가 활용될 수 있습니다.
          </p>
          <p>
            유럽 경제 지역(EEA), 영국, 스위스 사용자를 포함한 모든 방문자에게는
            Google의 동의 관리 플랫폼(CMP)을 통해 광고 및 쿠키 사용에 대한 동의를 요청합니다.
            동의 메시지에서 ‘동의’ 또는 ‘옵션 관리’를 선택하면 맞춤형 광고가 표시될 수 있습니다.
          </p>
          <p>
            사용자는 언제든지 브라우저 설정에서 쿠키를 삭제하거나 차단할 수 있으며,
            <a href="https://adssettings.google.com/authenticated" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Google 광고 설정</a>에서
            맞춤형 광고를 끌 수 있습니다.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-8">7. 정책 변경</h2>
          <p>본 개인정보처리방침은 법령 및 서비스 변경에 따라 수정될 수 있으며, 변경 시 본 페이지를 통해 공지합니다.</p>

          <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-12">최종 수정일: 2026년 6월 20일</p>
        </div>
      </div>
    </PageLayout>
  );
}
