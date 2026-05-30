const LABELS = {
  active:    'ACTIF',
  success:   'FINANCÉ',
  closed:    'FERMÉ',
  failed:    'ÉCHOUÉ',
  cancelled: 'ANNULÉ',
  pending:   'EN ATTENTE',
};

export default function Badge({ status }) {
  return (
    <span className={`badge ${status}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
