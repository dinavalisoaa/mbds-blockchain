import { useToast } from '../context/ToastContext.jsx';

const CONFIG = {
  pending: { icon: 'ti-loader-2', spin: true },
  success: { icon: 'ti-circle-check', spin: false },
  error:   { icon: 'ti-alert-circle', spin: false },
};

export default function ToastContainer() {
  const { toasts, remove } = useToast();
  if (!toasts.length) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map(t => {
        const { icon, spin } = CONFIG[t.type] ?? CONFIG.pending;
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <i className={`ti ${icon} toast-icon${spin ? ' spinning' : ''}`} />
            <div className="toast-body">
              <p className="toast-msg">{t.message}</p>
              {t.txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${t.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="toast-link"
                >
                  Voir sur Etherscan ↗
                </a>
              )}
            </div>
            <button className="toast-close" onClick={() => remove(t.id)} aria-label="Fermer">
              <i className="ti ti-x" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
