export default function Button({
  variant  = 'ghost',
  size     = 'md',
  block    = false,
  icon     = null,
  loading  = false,
  disabled = false,
  children,
  className = '',
  ...props
}) {
  const classes = [
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : '',
    block         ? 'btn-block' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading
        ? <i className="ti ti-loader-2 spinning" />
        : icon && <i className={`ti ${icon}`} />
      }
      {children}
    </button>
  );
}
