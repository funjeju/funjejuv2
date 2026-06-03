type PageHeaderProps = {
  title: string;
  subtitle?: string;
  emoji?: string;
  right?: React.ReactNode;
};

export function PageHeader({ title, subtitle, emoji, right }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-5 md:px-0 md:pb-4 md:pt-0">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-black text-text-primary md:text-2xl">
          {emoji && <span>{emoji}</span>}
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
