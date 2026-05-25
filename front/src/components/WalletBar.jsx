import { useState } from 'react';
import { Button, Alert } from './ui/index.js';

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
            <Button variant="ghost" icon="ti-plug-x" className="btn-disconnect" onClick={onDisconnect}>
              Déconnecter
            </Button>
          ) : (
            <Button variant="primary" icon="ti-wallet" loading={connecting} onClick={handleConnect}>
              Connecter MetaMask
            </Button>
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

      <Alert type="error" onClose={() => setError(null)}>{error}</Alert>
    </>
  );
}
