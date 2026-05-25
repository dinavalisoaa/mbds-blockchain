const LABELS = {
  active:    'Active',
  success:   'Succès',
  failed:    'Échouée',
  cancelled: 'Annulée',
};

const ICONS = {
  active:    'ti-clock',
  success:   'ti-circle-check',
  failed:    'ti-circle-x',
  cancelled: 'ti-ban',
};

export default function Badge({ status }) {
  return (
    <span className={`badge ${status}`}>
      <i className={`ti ${ICONS[status] ?? 'ti-help-circle'}`} />
      {' '}{LABELS[status] ?? status}
    </span>
  );
}