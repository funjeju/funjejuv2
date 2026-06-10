type Props = {
  youtubeId: string;
  title: string;
};

export function YoutubePlayer({ youtubeId, title }: Props) {
  return (
    <div className="relative w-full overflow-hidden bg-gray-950 aspect-video md:rounded-2xl">
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&modestbranding=1&rel=0&controls=0&showinfo=0&iv_load_policy=3&disablekb=1`}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <span className="absolute left-2 top-2 z-10 flex items-center gap-0.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow md:left-3 md:top-3 md:gap-1 md:px-2.5 md:py-1 md:text-[11px]">
        ▶ <span className="hidden md:inline">YouTube</span> LIVE
      </span>
    </div>
  );
}
