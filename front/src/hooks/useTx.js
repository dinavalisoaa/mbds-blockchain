import { useToast } from '../context/ToastContext.jsx';

export function useTx() {
  const { add, update } = useToast();

  return async function runTx(fn, { pending = 'Transaction en attente…', success = 'Confirmée !' } = {}) {
    const id = add({ type: 'pending', message: pending });
    try {
      const receipt = await fn();
      update(id, { type: 'success', message: success, txHash: receipt?.hash });
      return receipt;
    } catch (e) {
      update(id, { type: 'error', message: e.reason || e.shortMessage || e.message });
      throw e;
    }
  };
}