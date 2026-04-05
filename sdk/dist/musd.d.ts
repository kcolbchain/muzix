/**
 * MUSD Module - MUSD stablecoin operations
 *
 * MUSD is the music stablecoin for industry settlement on Muzix chain.
 * It enables instant, transparent, global music payments with real-time
 * royalty splits.
 */
import { Address } from 'viem';
import { MuzixClient } from './client';
import { MUSDConfig, MintMUSDParams, BurnMUSDParams, TransactionResult } from './types';
/**
 * Default MUSD configuration for testnet
 * Replace with actual contract addresses for mainnet
 */
export declare const DEFAULT_MUSD_CONFIG: MUSDConfig;
/**
 * MUSD stablecoin operations
 */
export declare class MUSD {
    private client;
    private config;
    constructor(client: MuzixClient, config?: MUSDConfig);
    /**
     * Get MUSD contract address
     */
    get address(): Address;
    /**
     * Get token symbol
     */
    getSymbol(): Promise<string>;
    /**
     * Get token name
     */
    getName(): Promise<string>;
    /**
     * Get token decimals
     */
    getDecimals(): Promise<number>;
    /**
     * Get total supply
     */
    getTotalSupply(): Promise<bigint>;
    /**
     * Get balance of an account
     */
    getBalance(account: Address): Promise<bigint>;
    /**
     * Format balance to human-readable string
     */
    formatBalance(balance: bigint): Promise<string>;
    /**
     * Mint MUSD tokens
     * Requires wallet connection and appropriate permissions
     */
    mint(params: MintMUSDParams): Promise<TransactionResult>;
    /**
     * Burn MUSD tokens
     * Requires wallet connection and appropriate permissions
     */
    burn(params: BurnMUSDParams): Promise<TransactionResult>;
    /**
     * Transfer MUSD tokens
     */
    transfer(to: Address, amount: bigint): Promise<TransactionResult>;
}
