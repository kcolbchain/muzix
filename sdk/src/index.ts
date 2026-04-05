/**
 * Muzix SDK - TypeScript SDK for Muzix chain integration
 * 
 * This SDK provides a simple interface for music apps to interact with Muzix chain:
 * - Mint MUSD stablecoin
 * - Create and manage catalog tokens
 * - Query royalty splits
 * - Submit streaming data
 * 
 * Built on top of viem for Ethereum interaction
 */

export { MuzixClient } from './client';
export { MUSD } from './musd';
export { Catalog } from './catalog';
export { Royalty } from './royalty';
export { Streaming } from './streaming';

// Re-export types
export * from './types';

// Version
export const VERSION = '0.1.0';
