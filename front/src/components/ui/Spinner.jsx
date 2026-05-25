const SIZE_MAP = { sm: 14, md: 18, lg: 26 };

export default function Spinner({ label = 'Chargement…', center = true, size = 'md' }) {
  const px = SIZE_MAP[size] ?? SIZE_MAP.md;

  const inner = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
                   color: 'var(--text-dim)', fontSize: 12 }}>
      <i className="ti ti-loader-2 spinning" style={{ fontSize: px }} />
      {label && <span>{label}</span>}
    </span>
  );

  return center ? <div className="loading">{inner}</div> : inner;
}
