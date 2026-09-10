interface PlaceholderPageProps {
  title: string;
}

/** Just a heading — used for every scaffolded page until real logic is built. */
export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-regantify-text">{title}</h1>
    </div>
  );
}
