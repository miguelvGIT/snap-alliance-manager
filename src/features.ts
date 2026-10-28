// The retained sync prototype is available only in explicitly enabled local development.
// Production sync needs a separate P2 release and server-verified access policy.
export const SYNC_PREVIEW = import.meta.env.DEV && import.meta.env.VITE_SYNC_PREVIEW === 'true';
