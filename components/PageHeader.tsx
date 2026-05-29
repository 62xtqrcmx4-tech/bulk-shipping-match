type PageHeaderProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionText?: string;
};

export default function PageHeader({
  title,
  description,
  actionHref,
  actionText,
}: PageHeaderProps) {
  return (
    <div className="mb-8">
      <a
        href="/"
        className="mb-6 inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        ← 返回首页
      </a>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {description ? (
            <p className="mt-2 text-slate-500">{description}</p>
          ) : null}
        </div>

        {actionHref && actionText ? (
          <a
            href={actionHref}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            {actionText}
          </a>
        ) : null}
      </div>
    </div>
  );
}