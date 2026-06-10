type PageHeaderProps = {
  title: string;
  subtitle?: string;
  emoji?: string;
  right?: React.ReactNode;
};

export function PageHeader({ title, subtitle, emoji, right }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-2 px-4 py-3 md:gap-4 md:px-0 md:py-5 md:pb-4 md:pt-0">
      <div className="min-w-0">
        <h1 className="flex items-center gap-1.5 text-base font-black text-text-primary md:gap-2 md:text-2xl">
          {emoji && <span>{emoji}</span>}
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-[11px] text-text-secondary md:mt-1 md:text-sm">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
