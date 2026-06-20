"use client";

import Link from "next/link";

interface PageLayoutProps {
  children: React.ReactNode;
  showBackground?: boolean;
}

export default function PageLayout({ children, showBackground = true }: PageLayoutProps) {
  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300 overflow-hidden">
      {showBackground && (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 dark:bg-blue-600/10 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] rounded-full bg-emerald-400/20 dark:bg-emerald-600/10 blur-[150px] pointer-events-none" />
          <div className="absolute top-[30%] right-[10%] w-[30%] h-[40%] rounded-full bg-indigo-400/10 dark:bg-indigo-600/5 blur-[100px] pointer-events-none" />
        </>
      )}

      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/10">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">
              HWP<span className="text-blue-500 font-normal">2</span>PDF
            </span>
          </Link>
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Free Online Converter
          </div>
        </div>
      </header>

      <main className="flex-1 w-full relative z-10">{children}</main>

      <footer className="w-full border-t border-zinc-200/50 dark:border-zinc-800/50 py-8 mt-auto bg-white/20 dark:bg-zinc-950/20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-zinc-500 dark:text-zinc-500 gap-4">
          <div>
            © {new Date().getFullYear()} HWP2PDF. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <Link href="/terms" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">이용약관</Link>
            <Link href="/privacy" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">개인정보처리방침</Link>
            <Link href="/contact" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">문의하기</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
