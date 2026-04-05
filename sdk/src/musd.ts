/**
 * MUSD Module - MUSD stablecoin operations
 * 
 * MUSD is the music stablecoin for industry settlement on Muzix chain.
 * It enables instant, transparent, global music payments with real-time
 * royalty splits.
 */

import { Address, parseAbi, formatUnits } from 'viem';
import { MuzixClient } from './client';
import {
  MUSDConfig,
  MintMUSDParams,
  BurnMUSDParams,
  TransactionResult,
  MuzixSDKError,
} from './types';

// MUSD Contract ABI (simplified - replace with actual contract ABI)
const MUSD_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount)',
  'function burn(address from, uint256 amount)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
]);

/**
 * Default MUSD configuration for testnet
 * Replace with actual contract addresses for mainnet
 */
export const DEFAULT_MUSD_CONFIG: MUSDConfig = {
  address: '0x0000000000000000000000000000000000000000', // Replace with actual address
  decimals: 6,
  symbol: 'MUSD',
  name: 'Music USD',
};

/**
 * MUSD stablecoin operations
 */
export class MUSD {
  private client: MuzixClient;
  private config: MUSDConfig;

  constructor(client: MuzixClient, config: MUSDConfig = DEFAULT_MUSD_CONFIG) {
    this.client = client;
    this.config = config;
  }

  /**
   * Get MUSD contract address
   */
  get address(): Address {
    return this.config.address;
  }

  /**
   * Get token symbol
   */
  async getSymbol(): Promise<string> {
    return this.client.publicClient.readContract({
      address: this.config.address,
      abi: MUSD_ABI,
      functionName: 'symbol',
    });
  }

  /**
   * Get token name
   */
  async getName(): Promise<string> {
    return this.client.publicClient.readContract({
      address: this.config.address,
      abi: MUSD_ABI,
      functionName: 'name',
    });
  }

  /**
   * Get token decimals
   */
  async getDecimals(): Promise<number> {
    return this.client.publicClient.readContract({
      address: this.config.address,
      abi: MUSD_ABI,
      functionName: 'decimals',
    });
  }

  /**
   * Get total supply
   */
  async getTotalSupply(): Promise<bigint> {
    return this.client.publicClient.readContract({
      address: this.config.address,
      abi: MUSD_ABI,
      functionName: 'totalSupply',
    });
  }

  /**
   * Get balance of an account
   */
  async getBalance(account: Address): Promise<bigint> {
    return this.client.publicClient.readContract({
      address: this.config.address,
      abi: MUSD_ABI,
      functionName: 'balanceOf',
      args: [account],
    });
  }

  /**
   * Format balance to human-readable string
   */
  async formatBalance(balance: bigint): Promise<string> {
    const decimals = await this.getDecimals();
    return formatUnits(balance, decimals);
  }

  /**
   * Mint MUSD tokens
   * Requires wallet connection and appropriate permissions
   */
  async mint(params: MintMUSDParams): Promise<TransactionResult> {
    if (!this.client.walletClient) {
      throw new MuzixSDKError(
        'Wallet not connected. Connect wallet to mint MUSD.',
        'WALLET_NOT_CONNECTED'
      );
    }

    try {
      const account = await this.client.getWalletAddress();
      if (!account) {
        throw new MuzixSDKError('No wallet account found', 'NO_ACCOUNT');
      }

      const hash = await (this.client.walletClient as any).writeContract({
        address: this.config.address,
        abi: MUSD_ABI,
        functionName: 'mint',
        args: [params.to, params.amount],
        account,
        chain: null,
      });

      return {
        hash,
        wait: async () => {
          const receipt = await this.client.publicClient.waitForTransactionReceipt({ hash });
          return {
            success: receipt.status === 'success',
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed,
          };
        },
      };
    } catch (error) {
      throw new MuzixSDKError(
        'Failed to mint MUSD',
        'MINT_ERROR',
        error
      );
    }
  }

  /**
   * Burn MUSD tokens
   * Requires wallet connection and appropriate permissions
   */
  async burn(params: BurnMUSDParams): Promise<TransactionResult> {
    if (!this.client.walletClient) {
      throw new MuzixSDKError(
        'Wallet not connected. Connect wallet to burn MUSD.',
        'WALLET_NOT_CONNECTED'
      );
    }

    try {
      const account = await this.client.getWalletAddress();
      if (!account) {
        throw new MuzixSDKError('No wallet account found', 'NO_ACCOUNT');
      }

      const hash = await (this.client.walletClient as any).writeContract({
        address: this.config.address,
        abi: MUSD_ABI,
        functionName: 'burn',
        args: [params.from, params.amount],
        account,
        chain: null,
      });

      return {
        hash,
        wait: async () => {
          const receipt = await this.client.publicClient.waitForTransactionReceipt({ hash });
          return {
            success: receipt.status === 'success',
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed,
          };
        },
      };
    } catch (error) {
      throw new MuzixSDKError(
        'Failed to burn MUSD',
        'BURN_ERROR',
        error
      );
    }
  }

  /**
   * Transfer MUSD tokens
   */
  async transfer(to: Address, amount: bigint): Promise<TransactionResult> {
    if (!this.client.walletClient) {
      throw new MuzixSDKError(
        'Wallet not connected. Connect wallet to transfer MUSD.',
        'WALLET_NOT_CONNECTED'
      );
    }

    try {
      const account = await this.client.getWalletAddress();
      if (!account) {
        throw new MuzixSDKError('No wallet account found', 'NO_ACCOUNT');
      }

      const hash = await (this.client.walletClient as any).writeContract({
        address: this.config.address,
        abi: MUSD_ABI,
        functionName: 'transfer',
        args: [to, amount],
        account,
        chain: null,
      });

      return {
        hash,
        wait: async () => {
          const receipt = await this.client.publicClient.waitForTransactionReceipt({ hash });
          return {
            success: receipt.status === 'success',
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed,
          };
        },
      };
    } catch (error) {
      throw new MuzixSDKError(
        'Failed to transfer MUSD',
        'TRANSFER_ERROR',
        error
      );
    }
  }
}
