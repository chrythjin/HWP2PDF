import DropzoneUploader from "@/components/DropzoneUploader";

export default function Home() {
  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300 overflow-hidden">
      
      {/* Decorative blurred background shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 dark:bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] rounded-full bg-emerald-400/20 dark:bg-emerald-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[30%] h-[40%] rounded-full bg-indigo-400/10 dark:bg-indigo-600/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/10">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">
              HWP<span className="text-blue-500 font-normal">2</span>PDF
            </span>
          </div>
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Free Online Converter
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center max-w-6xl w-full mx-auto px-6 py-12 md:py-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Hero Text */}
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

          {/* Right Column: Uploader */}
          <div className="lg:col-span-6 flex justify-center">
            <DropzoneUploader />
          </div>

        </div>

        {/* Feature section below */}
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
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-200/50 dark:border-zinc-800/50 py-8 mt-auto bg-white/20 dark:bg-zinc-950/20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-zinc-500 dark:text-zinc-500 gap-4">
          <div>
            © {new Date().getFullYear()} HWP2PDF. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">이용약관</a>
            <a href="#" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">개인정보처리방침</a>
            <a href="#" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">문의하기</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
