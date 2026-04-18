export { createMuzixClient } from './client.js';
export type { MuzixClient, CreateMuzixClientOptions } from './client.js';

export { CatalogModule } from './catalog.js';
export { MusdModule } from './musd.js';
export { OracleModule } from './oracle.js';

export { muzixDevnet } from './chains.js';

export {
  MuzixCatalogAbi,
  MUSDAbi,
  StreamingRevenueOracleAbi,
} from './abis.js';

export type {
  MuzixContracts,
  MusicMetadata,
  RoyaltySplit,
  RoyaltySplitEntry,
  StreamingRevenue,
  WriteResult,
} from './types.js';

export {
  MuzixSdkError,
  InvalidRoyaltySplitError,
  MissingWalletError,
  MissingOracleError,
} from './errors.js';
