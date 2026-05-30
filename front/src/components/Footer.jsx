export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-left">
        <span className="footer-deploy">ETH_SEPOLIA_DEPLOYMENT_V1.0.4</span>
        <span className="footer-status">
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'var(--green)', display: 'inline-block',
            boxShadow: '0 0 6px var(--green)',
          }} />
          STATUT: OPÉRATIONNEL
        </span>
      </div>
      <div className="footer-right">
        <a
          href="https://sepolia.etherscan.io"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >ETHERSCAN</a>
        <a href="#" className="footer-link">CONTRAT</a>
        <a href="#" className="footer-link">CONFIDENTIALITÉ</a>
        <span className="footer-copy">© 2026 ETHERFUND</span>
      </div>
    </footer>
  );
}
