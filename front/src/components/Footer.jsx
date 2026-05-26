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
          STATUS: OPERATIONAL
        </span>
      </div>
      <div className="footer-right">
        <a
          href="https://sepolia.etherscan.io"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >ETHERSCAN</a>
        <a href="#" className="footer-link">SMART_CONTRACT</a>
        <a href="#" className="footer-link">PRIVACY</a>
        <span className="footer-copy">© 2024 ETHERFUND</span>
      </div>
    </footer>
  );
}
