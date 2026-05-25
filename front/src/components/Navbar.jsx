import { NavLink, useLocation } from 'react-router-dom';
import { Button } from './ui/index.js';
import { CATEGORIES } from '../constants.js';

const ALL_CATEGORIES = [{ id: null, label: 'Toutes' }, ...CATEGORIES.map((label, i) => ({ id: i, label }))];

export default function Navbar({ wallet, connecting, theme, onToggleTheme, activeCategory, onCategoryChange, onConnect, onDisconnect }) {
  const { pathname } = useLocation();
  const short = addr => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  return (
    <header>
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="network-tag">Sepolia Testnet</span>
          <span className="navbar-title">⛓ Crowdfunding</span>
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

        <div className="navbar-right">
          <button
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
            title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          >
            <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon'}`} />
          </button>

          {wallet.connected ? (
            <div className="wallet-pill">
              <span className="wallet-dot" />
              <span className="wallet-addr">{short(wallet.address)}</span>
              <button className="btn-ghost btn-sm btn-disconnect" onClick={onDisconnect} title="Déconnecter">
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

      {pathname === '/' && (
        <div className="filter-bar" role="navigation" aria-label="Filtrer par catégorie">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat.id ?? 'all'}
              className={`filter-chip${activeCategory === cat.id ? ' active' : ''}`}
              onClick={() => onCategoryChange(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
