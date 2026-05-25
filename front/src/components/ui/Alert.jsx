const ICONS = {
  info:    'ti-info-circle',
  success: 'ti-circle-check',
  error:   'ti-alert-circle',
};

export default function Alert({ type = 'info', onClose, children }) {
  if (!children) return null;

  return (
    <div className={`status-msg ${type}`} role="alert">
      <i className={`ti ${ICONS[type]}`} />
      {' '}{children}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 2px',
            color: 'inherit',
            opacity: 0.7,
          }}
        >
          <i className="ti ti-x" />
        </button>
      )}
    </div>
  );
}
