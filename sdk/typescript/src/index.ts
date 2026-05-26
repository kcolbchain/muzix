export { createMuzixClient } from './client.js';
export type { MuzixClient, CreateMuzixClientOptions } from './client.js';

export { CatalogModule } from './catalog.js';
export { MusdModule } from './musd.js';
export { OracleModule } from './oracle.js';
export { ProvenanceModule, computeProvenanceHash } from './provenance.js';
export { RightsModule } from './rights.js';

export { muzixDevnet } from './chains.js';

export {
  MuzixCatalogAbi,
  MUSDAbi,
  StreamingRevenueOracleAbi,
  MuzixAIProvenanceAbi,
  MuzixRightsOfferingAbi,
} from './abis.js';

export type {
  MuzixContracts,
  MusicMetadata,
  RoyaltySplit,
  RoyaltySplitEntry,
  StreamingRevenue,
  AIProvenance,
  WriteResult,
  Offering,
  Counter,
  CounterPayload,
  RightsBundle,
  Economics,
} from './types.js';

export {
  MuzixSdkError,
  InvalidRoyaltySplitError,
  MissingWalletError,
  MissingOracleError,
  MissingProvenanceError,
  HumanOnlyHasModelsError,
} from './errors.js';
