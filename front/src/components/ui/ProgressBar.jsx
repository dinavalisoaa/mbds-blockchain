export default function ProgressBar({
  value,
  goal,
  percent,
  status = 'active',
  showLabels = true,
}) {
  const pct = percent !== undefined
    ? Math.min(100, Math.max(0, Number(percent)))
    : goal > 0
      ? Math.min(100, Math.round((Number(value) / Number(goal)) * 100))
      : 0;

  return (
    <div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${status}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabels && value !== undefined && goal !== undefined && (
        <div className="progress-labels">
          <span>{Number(value).toFixed(4)} ETH RAISED</span>
          <span>{pct}% · GOAL {Number(goal).toFixed(4)} ETH</span>
        </div>
      )}
    </div>
  );
}