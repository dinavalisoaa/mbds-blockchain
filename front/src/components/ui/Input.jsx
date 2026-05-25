import { useId } from 'react';

export default function Input({
  label,
  required = false,
  error,
  hint,
  className = '',
  ...props
}) {
  const id = useId();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label htmlFor={id}>
          {label}
          {required && <span className="required"> *</span>}
        </label>
      )}
      <input
        id={id}
        className={className}
        style={error ? { borderColor: 'var(--red)' } : undefined}
        {...props}
      />
      {error && (
        <span style={{ fontSize: 11, color: 'var(--red)' }}>
          <i className="ti ti-alert-circle" /> {error}
        </span>
      )}
      {!error && hint && (
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          {hint}
        </span>
      )}
    </div>
  );
}
