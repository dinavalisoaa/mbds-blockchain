import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback(({ type = 'info', message, txHash } = {}) => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, type, message, txHash }]);
    if (type === 'success') setTimeout(() => remove(id), 4000);
    if (type === 'error')   setTimeout(() => remove(id), 7000);
    return id;
  }, [remove]);

  const update = useCallback((id, patch) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    if (patch.type === 'success') setTimeout(() => remove(id), 4000);
    if (patch.type === 'error')   setTimeout(() => remove(id), 7000);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ toasts, add, update, remove }}>
      {children}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast requires <ToastProvider>');
  return ctx;
};
