import { useState } from 'react';

export default function WalletBar({ wallet, onConnect, onDisconnect }) {
  const [connecting, setConnecting] = useState(false);
  const [error,      setError]      = useState(null);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      await onConnect();
    } catch (e) {
      setError(e.reason || e.message);
    } finally {
      setConnecting(false);
    }
  };

  const short = addr => addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—';

  return (
    <>
      <header className="header">
        <div className="header-left">
          <p className="network-tag">Sepolia Testnet</p>
          <h1>Crowdfunding on-chain</h1>
        </div>
        <div className="header-actions">
          {wallet.connected ? (
            <button className="btn-ghost btn-disconnect" onClick={onDisconnect}>
              <i className="ti ti-plug-x" /> Déconnecter
            </button>
          ) : (
            <button className="btn-primary" onClick={handleConnect} disabled={connecting}>
              <i className="ti ti-wallet" />
              {connecting ? 'Connexion…' : 'Connecter MetaMask'}
            </button>
          )}
        </div>
      </header>

      {wallet.connected && (
        <div className="wallet-bar">
          <span className="wallet-dot" />
          <span className="wallet-addr">{short(wallet.address)}</span>
          <span className="wallet-network">{wallet.network}</span>
        </div>
      )}

      {error && <p className="status-msg error">{error}</p>}
    </>
  );
}
