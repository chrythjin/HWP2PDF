export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">📄</div>
            <h1 className="text-xl font-bold text-slate-900">HWP2PDF</h1>
          </div>
          <nav className="flex items-center gap-4 text-sm text-slate-500">
            <span className="hover:text-slate-700 cursor-pointer">사용법</span>
            <span className="hover:text-slate-700 cursor-pointer">정보</span>
          </nav>
        </div>
      </div>
    </header>
  );
}
