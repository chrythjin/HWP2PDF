import AdSenseAd from "@/components/AdSenseAd";
import DropzoneUploader from "@/components/DropzoneUploader";
import PageLayout from "@/components/PageLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HWP2PDF - 한글 문서를 PDF로 무료 변환",
  description:
    "HWP(.hwp) 문서를 설치 없이 웹 브라우저에서 빠르고 안전하게 PDF로 변환하세요. 회원가입 불필요, 30분 후 자동 삭제.",
};

export default function Home() {
  return (
    <PageLayout showBackground={true}>
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>회원가입 없이 즉시 변환</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.15]">
              HWP 문서를 <br />
              <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
                깨끗한 PDF
              </span>
              로 변환하세요.
            </h1>

            <p className="text-lg text-zinc-600 dark:text-zinc-400 font-medium max-w-lg mx-auto lg:mx-0">
              한글(hwp) 문서를 뷰어 설치 없이 쉽고 편리하게 변환하세요. 드래그 앤 드롭 단 3클릭 만에 최고의 레이아웃 품질로 즉시 처리됩니다.
            </p>

            <div className="grid grid-cols-3 gap-4 pt-4 text-center max-w-md mx-auto lg:mx-0">
              <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50">
                <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">3 Click</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-500">초간단 변환</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50">
                <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">100% Free</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-500">무료 서비스</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50">
                <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">30 Min</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-500">안전 자동 삭제</div>
              </div>
            </div>
          </div>

          <div id="upload" className="lg:col-span-6 flex justify-center scroll-mt-28">
            <DropzoneUploader />
          </div>
        </div>

        <section className="mt-20 md:mt-32 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-16">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Sponsored</p>
          </div>
          <div className="flex justify-center">
            <AdSenseAd
              adSlot="hwp2pdf-top-banner"
              adFormat="horizontal"
              style={{ minHeight: 90, width: "100%", maxWidth: 728 }}
            />
          </div>
        </section>

        <section className="mt-20 md:mt-32 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-500 border border-blue-100/30 dark:border-blue-900/30">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">설치 및 가입 불필요</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                번거로운 한글 뷰어나 워드 프로그램을 설치할 필요가 없습니다. 웹 브라우저에서 바로 쉽고 간편하게 PDF 변환 결과를 받아보실 수 있습니다.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 border border-emerald-100/30 dark:border-emerald-900/30">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">철저한 보안 관리</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                모든 업로드된 원본 HWP 파일과 변환 완료된 PDF 결과물은 개인 정보 및 중요 문서의 유출을 방지하기 위해 30분 후 완전히 파기됩니다.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950/30 text-violet-500 border border-violet-100/30 dark:border-violet-900/30">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">정확한 한국어 폰트 렌더링</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                서버사이드 변환 엔진에 네이버 나눔 폰트, 구글 Noto Sans CJK 등 정식 한국어 폰트를 탑재하여 변환 시 텍스트 깨짐이나 레이아웃 뒤틀림을 최소화합니다.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-20 md:mt-32 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-8 text-center">자주 묻는 질문</h2>
            <div className="space-y-6">
              <div className="bg-white/40 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-6">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">HWP2PDF는 무료인가요?</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">네, 별도 회원가입이나 결제 없이 HWP 문서를 PDF로 변환할 수 있습니다.</p>
              </div>
              <div className="bg-white/40 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-6">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">어떤 파일을 변환할 수 있나요?</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">확장자가 .hwp인 한글 문서를 지원합니다. 최대 파일 크기는 20MB이며, 한 번에 하나의 파일만 변환할 수 있습니다.</p>
              </div>
              <div className="bg-white/40 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-6">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">업로드한 파일은 안전한가요?</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">업로드된 파일과 변환 결과는 변환 완료 후 자동으로 삭제됩니다. 비회원 작업은 30분 후 자동 삭제되며, 회원 변환 이력 메타데이터는 30일간 보관 후 파기됩니다.</p>
              </div>
              <div className="bg-white/40 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-6">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">변환된 PDF는 어디에서 다운로드하나요?</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">파일 업로드 후 변환이 완료되면 화면에 ‘PDF 다운로드’ 버튼이 나타납니다. 다운로드 링크는 소유자 검증 후 발급되는 단기 보호 URL로, 일정 시간 후 만료됩니다.</p>
              </div>
              <div className="bg-white/40 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-6">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">변환에 시간이 얼마나 걸리나요?</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">파일 크기와 복잡도에 따라 다르지만, 일반적으로 1~2분 내에 완료됩니다. 첫 요청은 서버 초기화로 약간 더 소요될 수 있습니다.</p>
              </div>
              <div className="bg-white/40 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-6">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">회원가입은 필수인가요?</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">아니요. 로그인 없이 비회원으로도 HWP 문서를 PDF로 변환할 수 있습니다. 회원 로그인 시 변환 이력을 30일간 조회하고 관리할 수 있는 기능이 추가로 제공됩니다.</p>
              </div>
              <div className="bg-white/40 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-6">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">비회원 작업은 어떻게 관리되나요?</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">비회원 변환 시 업로드와 함께 발급되는 X-Job-Access-Token 접근 토큰으로 작업을 식별합니다. 별도 회원 이력은 저장되지 않으며, 직접 삭제 기능 없이 변환 완료 후 30분이 지나면 자동으로 영구 삭제됩니다.</p>
              </div>
              <div className="bg-white/40 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-6">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">회원 변환 이력은 어떻게 삭제되나요?</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">회원은 변환 이력에서 개별 작업을 직접 삭제할 수 있습니다. 삭제 시 해당 메타데이터는 즉시 사라지며, 삭제 사실을 기록하는 tombstone이 30일간 유지된 후 영구 파기됩니다.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20 md:mt-32 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-16">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Sponsored</p>
          </div>
          <div className="flex justify-center">
            <AdSenseAd
              adSlot="hwp2pdf-faq-inline"
              adFormat="rectangle"
              style={{ minHeight: 250, width: "100%", maxWidth: 300 }}
            />
          </div>
        </section>

        <section className="mt-20 md:mt-32 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-16">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">지금 바로 변환해 보세요</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-8">
              복잡한 설정 없이 HWP 파일을 드래그 앤 드롭하면 PDF가 준비됩니다.
            </p>
            <a
              href="#upload"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              변환 시작하기
            </a>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
