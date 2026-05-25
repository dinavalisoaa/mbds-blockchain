export default function Card({ title, icon, className = '', children }) {
  return (
    <div className={`card ${className}`}>
      {title && (
        <p className="card-title">
          {icon && <i className={`ti ${icon}`} />}
          {title}
        </p>
      )}
      {children}
    </div>
  );
}
