import { ethers } from 'ethers';
import { getSignedContract, } from './wallet.js';
import { ABI } from './contract.js';

export async function txCreateCampaign(title, desc, imageIPFS, category, goalEth, deadlineDate) {
  const contract = getSignedContract();
  if (!title?.trim())             throw new Error('Titre obligatoire');
  if (!goalEth || +goalEth <= 0)  throw new Error('Objectif invalide');
  if (!deadlineDate)              throw new Error('Date de fin obligatoire');

  const endMs    = new Date(deadlineDate).getTime();
  const nowMs    = Date.now();
  const duration = Math.floor((endMs - nowMs) / 1000);

  if (duration < 3600) throw new Error('La date de fin doit être au moins 1 heure dans le futur');

  const goalWei = ethers.parseEther(String(goalEth));
  const cat     = Number(category ?? 0);

  const tx = await contract.createCampaign(
    title.trim(),
    (desc || '').trim(),
    (imageIPFS || '').trim(),
    cat,
    goalWei,
    BigInt(duration),
  );
  const receipt = await tx.wait();

  // Parse CampaignCreated event → get new campaign ID
  const iface  = new ethers.Interface(ABI);
  const parsed = receipt.logs
    .map(log => { try { return iface.parseLog(log); } catch { return null; } })
    .find(e => e?.name === 'CampaignCreated');
  const campaignId = parsed ? Number(parsed.args.id) : null;

  return Object.assign(receipt, { campaignId });
}

export async function txPostUpdate(id, message) {
  if (!message?.trim()) throw new Error('Message obligatoire');
  const tx = await getSignedContract().postUpdate(id, message.trim());
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

export async function txRefundAll(id) {
  const tx = await getSignedContract().refundAll(id);
  return tx.wait();
}
