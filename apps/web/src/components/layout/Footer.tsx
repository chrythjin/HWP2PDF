export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-auto">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-slate-500">
            📄 HWP2PDF — 한능rote와 함께하는 문서 변환 서비스
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>🔒 파일은 변환 후 30분 내에 자동 삭제됩니다</span>
            <span>•</span>
            <span>☁️ 서버리스 기반 안정적 처리</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
