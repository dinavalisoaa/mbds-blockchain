import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, ABI } from './contract.js';

const SEPOLIA_CHAIN_ID = 11155111n;

let _provider    = null;
let _signer      = null;
let _contract    = null;
let _userAddress = null;

export async function connectWallet() {
  if (!window.ethereum) throw new Error('MetaMask non détecté');

  _provider    = new ethers.BrowserProvider(window.ethereum);
  await _provider.send('eth_requestAccounts', []);
  _signer      = await _provider.getSigner();
  _userAddress = await _signer.getAddress();
  _contract    = new ethers.Contract(CONTRACT_ADDRESS, ABI, _signer);

  const net = await _provider.getNetwork();
  if (net.chainId !== SEPOLIA_CHAIN_ID) {
    try { await _provider.send('wallet_switchEthereumChain', [{ chainId: '0xaa36a7' }]); }
    catch (_) {}
    throw new Error(`Mauvais réseau (chainId ${net.chainId}) — passe sur Sepolia`);
  }

  return { address: _userAddress, network: 'Sepolia' };
}

export function disconnectWallet() {
  _provider = _signer = _contract = _userAddress = null;
}

export function getSignedContract() {
  if (!_contract) throw new Error("Connectez MetaMask d'abord");
  return _contract;
}

export function getAddress()  { return _userAddress; }
export function isConnected() { return !!_userAddress; }
