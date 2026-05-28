const LABELS = {
  active:    'ACTIVE',
  success:   'SUCCESS',
  failed:    'FAILED',
  cancelled: 'CANCELLED',
  pending:   'PENDING_FINAL',
};

export default function Badge({ status }) {
  return (
    <span className={`badge ${status}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
