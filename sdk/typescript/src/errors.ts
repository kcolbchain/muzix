/**
 * SDK error hierarchy. Prefer these over raw throws so callers can catch by
 * type without string-matching.
 */

export class MuzixSdkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MuzixSdkError';
  }
}

export class InvalidRoyaltySplitError extends MuzixSdkError {
  constructor(totalBps: number) {
    super(`Royalty split must sum to 10000 bps (100%); got ${totalBps}`);
    this.name = 'InvalidRoyaltySplitError';
  }
}

export class MissingWalletError extends MuzixSdkError {
  constructor() {
    super('This operation requires a wallet client. Pass `walletClient` to createMuzixClient.');
    this.name = 'MissingWalletError';
  }
}

export class MissingOracleError extends MuzixSdkError {
  constructor() {
    super(
      'No oracle address configured. Pass `contracts.oracle` to createMuzixClient() to use oracle methods.',
    );
    this.name = 'MissingOracleError';
  }
}
