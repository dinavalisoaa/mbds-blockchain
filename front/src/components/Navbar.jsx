import { NavLink } from 'react-router-dom';
import { Button } from './ui/index.js';

export default function Navbar({ wallet, onConnect, onDisconnect, connecting }) {
  const short = addr => addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="network-tag">Sepolia Testnet</span>
        <span className="navbar-title">Crowdfunding on-chain</span>
      </div>

      {wallet.connected && (
        <div className="navbar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <i className="ti ti-home" /> Accueil
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <i className="ti ti-layout-dashboard" /> Dashboard
          </NavLink>
        </div>
      )}

      <div className="navbar-wallet">
        {wallet.connected ? (
          <div className="wallet-pill">
            <span className="wallet-dot" />
            <span className="wallet-addr">{short(wallet.address)}</span>
            <button className="btn-ghost btn-sm btn-disconnect" onClick={onDisconnect}>
              <i className="ti ti-plug-x" />
            </button>
          </div>
        ) : (
          <Button variant="primary" icon="ti-wallet" loading={connecting} onClick={onConnect}>
            Connecter MetaMask
          </Button>
        )}
      </div>
    </nav>
  );
}