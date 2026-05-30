import { NavLink } from 'react-router-dom';
import { Button } from './ui/index.js';

export default function Navbar({ wallet, connecting, theme, onToggleTheme, onConnect, onDisconnect }) {
  const short = addr => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  return (
    <header>
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="network-tag">SEPOLIA_TESTNET</span>
          <span className="navbar-title">ETHERFUND_SEPOLIA</span>
        </div>

        <div className="navbar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            EXPLORER
          </NavLink>
          {wallet.connected && (
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              TABLEAU DE BORD
            </NavLink>
          )}
          {wallet.connected && (
            <NavLink to="/create" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <i className="ti ti-rocket" /> CRÉER
            </NavLink>
          )}
          <a href="#" className="nav-link">DOCS</a>
        </div>

        <div className="navbar-right">
          <button
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            style={{ display: 'none' }}
          >
            <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon'}`} />
          </button>

          <button className="navbar-bell" aria-label="Notifications">
            <i className="ti ti-bell" />
          </button>

          {wallet.connected ? (
            <div className="wallet-pill">
              <span className="wallet-dot" />
              <span className="wallet-addr">{short(wallet.address)}</span>
              <button className="btn-ghost btn-sm btn-disconnect" onClick={onDisconnect} title="Disconnect">
                <i className="ti ti-plug-x" />
              </button>
            </div>
          ) : (
            <Button variant="primary" icon="ti-wallet" loading={connecting} onClick={onConnect}>
              CONNECTER PORTEFEUILLE
            </Button>
          )}
        </div>
      </nav>

    </header>
  );
}
