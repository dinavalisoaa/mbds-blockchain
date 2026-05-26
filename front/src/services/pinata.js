const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const GATEWAY = "https://ipfs.io/ipfs";

export async function uploadToPinata(file) {
  console.log("[PINATA] JWT present:", !!PINATA_JWT);
  if (!PINATA_JWT) throw new Error("VITE_PINATA_JWT manquant dans .env");

  const formData = new FormData();
  formData.append("file", file);

  console.log("[PINATA] POST → pinFileToIPFS", file.name, file.size, "bytes");
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData,
  });

  console.log("[PINATA] Response status:", res.status);
  if (!res.ok) {
    const txt = await res.text();
    console.error("[PINATA] Error body:", txt);
    throw new Error(`Pinata error ${res.status}: ${txt}`);
  }

  const json = await res.json();
  console.log("[PINATA] Success — CID:", json.IpfsHash);
  return json.IpfsHash;
}

export function ipfsUrl(cid) {
  if (!cid) return null;
  if (cid.startsWith("http")) return cid;
  const hash = cid.replace(/^ipfs:\/\//, "");
  return `${GATEWAY}/${hash}`;
}
