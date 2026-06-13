/** 제주tube(영상) 아이콘 — 유튜브풍 둥근 사각형 + 재생. currentColor 상속 */
export function TubeIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 6.5h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Zm6 2.8v5.4a.5.5 0 0 0 .76.43l4.5-2.7a.5.5 0 0 0 0-.86l-4.5-2.7A.5.5 0 0 0 10 9.3Z"
      />
    </svg>
  );
}
