type Props = {
  youtubeId: string;
  title: string;
};

export function YoutubePlayer({ youtubeId, title }: Props) {
  return (
    <div className="relative w-full overflow-hidden bg-gray-950 aspect-video md:rounded-2xl">
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&modestbranding=1&rel=0`}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white shadow">
        ▶ YouTube LIVE
      </span>
    </div>
  );
}
