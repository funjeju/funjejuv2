import Image from "next/image";

type Props = {
  size?: number;
  className?: string;
};

/** 돌AI AI 로봇 아이콘. /public/dolmangyi.png 파일 필요 */
export function DolmangyiIcon({ size = 40, className = "" }: Props) {
  return (
    <Image
      src="/dolmangyi.png"
      alt="돌AI"
      width={size}
      height={size}
      className={`object-contain drop-shadow-sm ${className}`}
      priority
    />
  );
}
