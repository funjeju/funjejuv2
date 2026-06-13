/** 사진 카메라 아이콘 (라이브 피드용) — currentColor 상속 */
export function CameraIcon({ size = 24, className }: { size?: number; className?: string }) {
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
        d="M9.2 4h5.6a2 2 0 0 1 1.7 1l.6 1h2.4a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H4.5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2.4l.6-1a2 2 0 0 1 1.7-1Zm2.8 4.8a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 0 0 0-8.4Zm0 2a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Z"
      />
    </svg>
  );
}
