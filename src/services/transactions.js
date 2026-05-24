import { ethers } from 'ethers';
import { getSignedContract } from './wallet.js';

export async function txCreateCampaign(title, desc, goalEth, deadlineDate) {
  const contract = getSignedContract();
  if (!title?.trim())   throw new Error('Titre obligatoire');
  if (!goalEth || +goalEth <= 0) throw new Error('Objectif invalide');
  if (!deadlineDate)    throw new Error('Date de fin obligatoire');

  const endMs    = new Date(deadlineDate).getTime();
  const nowMs    = Date.now();
  const duration = Math.floor((endMs - nowMs) / 1000);

  if (duration < 3600) throw new Error('La date de fin doit être au moins 1 heure dans le futur');

  const goalWei = ethers.parseEther(String(goalEth));

  const tx = await contract.createCampaign(title.trim(), (desc || '').trim(), goalWei, BigInt(duration));
  return tx.wait();
}

export async function txContribute(id, ethAmount) {
  const contract = getSignedContract();
  if (!ethAmount || +ethAmount <= 0) throw new Error('Montant invalide');
  const tx = await contract.contribute(id, { value: ethers.parseEther(String(ethAmount)) });
  return tx.wait();
}

export async function txWithdraw(id) {
  const tx = await getSignedContract().withdraw(id);
  return tx.wait();
}

export async function txRefund(id) {
  const tx = await getSignedContract().refund(id);
  return tx.wait();
}

export async function txCancelCampaign(id) {
  const tx = await getSignedContract().cancelCampaign(id);
  return tx.wait();
}
