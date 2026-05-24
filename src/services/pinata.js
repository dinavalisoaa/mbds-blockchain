const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const GATEWAY    = 'https://ipfs.io/ipfs';

/**
 * Upload a File object to Pinata and return the IPFS CID.
 * @param {File} file
 * @returns {Promise<string>} CID ex: "QmXyz..."
 */
export async function uploadToPinata(file) {
  if (!PINATA_JWT) throw new Error('VITE_PINATA_JWT manquant dans .env');

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Pinata error ${res.status}: ${txt}`);
  }

  const { IpfsHash } = await res.json();
  return IpfsHash; // ex: "QmXyz..."
}

/**
 * Build a public HTTP URL from a CID (or empty string → null).
 * @param {string} cid
 * @returns {string|null}
 */
export function ipfsUrl(cid) {
  if (!cid) return null;
  // already a full URL (http/https)
  if (cid.startsWith('http')) return cid;
  // strip ipfs:// prefix if present
  const hash = cid.replace(/^ipfs:\/\//, '');
  return `${GATEWAY}/${hash}`;
}
