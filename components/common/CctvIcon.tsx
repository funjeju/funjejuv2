/** 박스형 감시(CCTV) 카메라 아이콘 — currentColor 상속 */
export function CctvIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {/* 마운트 브래킷 (벽 → 카메라) */}
      <path d="M12.4 11.2l-1.1 2.3 1 1.9-1.6.5-1.2-2.3a1 1 0 0 1 0-.9l1.1-2.3 1.8.8Z" />
      <path d="M7.8 16.6a1 1 0 0 1 1-1h.4a1 1 0 0 1 0 2h-.4a1 1 0 0 1-1-1Z" />
      {/* 카메라 본체 (앞으로 약간 기운 박스) */}
      <path d="M4.6 8.1l12.5-3a1.3 1.3 0 0 1 1.6 1l.5 2.1a1.3 1.3 0 0 1-1 1.5l-12.5 3a1.3 1.3 0 0 1-1.6-1L3.6 9.6a1.3 1.3 0 0 1 1-1.5Z" />
      {/* 상단 후드 */}
      <path d="M6.2 6.9l11-2.6a1 1 0 0 1 1.2.7l.2.9-12.8 3-.2-.8a1 1 0 0 1 .6-1.2Z" opacity="0.55" />
      {/* 렌즈 */}
      <circle cx="6.7" cy="9.4" r="1.5" fill="#fff" opacity="0.9" />
    </svg>
  );
}
