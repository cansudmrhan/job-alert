export default function BulletList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-900">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing to show.</p>
      ) : (
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-700">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
