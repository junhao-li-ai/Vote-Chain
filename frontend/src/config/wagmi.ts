import { http, createConfig } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { sepolia } from 'wagmi/chains';

export const config = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(),
  },
  ssr: false,
});
