export default function EmptyState({ icon = 'ti-mood-empty', title = 'Rien ici pour le moment', subtitle, action }) {
  return (
    <div className="empty-state">
      <i className={`ti ${icon}`} style={{ fontSize: 32, display: 'block', marginBottom: 10, opacity: 0.4 }} />
      <p style={{ fontWeight: 600, marginBottom: subtitle ? 4 : 0 }}>{title}</p>
      {subtitle && (
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: action ? 14 : 0 }}>
          {subtitle}
        </p>
      )}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}
