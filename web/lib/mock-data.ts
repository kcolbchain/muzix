/**
 * Mock catalog used until contracts deploy on a public network.
 * Shape mirrors `@kcolbchain/muzix-sdk` (MusicMetadata, RoyaltySplit, AIProvenance).
 */

export type Track = {
  tokenId: bigint;
  isrc: string;
  artist: string;
  title: string;
  durationSec: number;
  releasedAt: string; // ISO date
  owner: `0x${string}`;
  splits: { recipient: `0x${string}`; role: string; shareBps: number }[];
  streaming: {
    totalStreams: bigint;
    revenueUsd: bigint; // 6 decimals
    confidenceBps: number; // 0-10000
  };
  provenance:
    | {
        humanOnly: true;
      }
    | {
        humanOnly: false;
        aiModelTokens: { contract: `0x${string}`; tokenId: bigint; label: string }[];
        ipLineageURIs: string[];
      };
};

export const TRACKS: Track[] = [
  {
    tokenId: 1n,
    isrc: 'USRC17607839',
    artist: 'Lavender Cassette',
    title: 'Slow Light, Falling Brass',
    durationSec: 213,
    releasedAt: '2026-02-14',
    owner: '0x71a2c0Ab09F8c3F26b2f98d5D6f4a2c8D3aA7B11',
    splits: [
      {
        recipient: '0x71a2c0Ab09F8c3F26b2f98d5D6f4a2c8D3aA7B11',
        role: 'Artist',
        shareBps: 6000,
      },
      {
        recipient: '0x9c4D7e3f4d2C1AaB8e2F7e5B4D3C2a1e9F8E7d6C',
        role: 'Producer',
        shareBps: 2000,
      },
      {
        recipient: '0x33cC9e8B1aD7f6A2b5F4D3c2A1e0B9c8d7E6F5a4',
        role: 'Label',
        shareBps: 1500,
      },
      {
        recipient: '0x4F8e7D6c5B4A3a2b1c0D9e8f7A6b5C4d3E2F1a0B',
        role: 'Publisher',
        shareBps: 500,
      },
    ],
    streaming: {
      totalStreams: 412_938n,
      revenueUsd: 1_487_220_000n,
      confidenceBps: 9420,
    },
    provenance: { humanOnly: true },
  },
  {
    tokenId: 2n,
    isrc: 'GBUM72504231',
    artist: 'Aerie / Null',
    title: 'Pacific Static (AI-stem mix)',
    durationSec: 247,
    releasedAt: '2026-03-08',
    owner: '0xA1B2c3D4e5F6071829304a5B6c7D8e9F0a1B2c3D',
    splits: [
      {
        recipient: '0xA1B2c3D4e5F6071829304a5B6c7D8e9F0a1B2c3D',
        role: 'Artist',
        shareBps: 5000,
      },
      {
        recipient: '0x9bAdC0DeAa1122334455667788990aBbCcDdEeFf',
        role: 'AI model owner',
        shareBps: 2500,
      },
      {
        recipient: '0xB2c3D4e5F60718293a4b5C6d7E8f9a0B1c2D3e4F',
        role: 'Producer',
        shareBps: 1500,
      },
      {
        recipient: '0x33cC9e8B1aD7f6A2b5F4D3c2A1e0B9c8d7E6F5a4',
        role: 'Label',
        shareBps: 1000,
      },
    ],
    streaming: {
      totalStreams: 98_104n,
      revenueUsd: 314_290_000n,
      confidenceBps: 8810,
    },
    provenance: {
      humanOnly: false,
      aiModelTokens: [
        {
          contract: '0xE721a1E721a1E721a1E721a1E721a1E721a1E721',
          tokenId: 47n,
          label: 'Spectro-VAE v3 — vocal-stem',
        },
      ],
      ipLineageURIs: [
        'ipfs://bafybeicpacific-static-lineage.json',
        'ar://aHpL3rTQ8Qr-modelcard',
      ],
    },
  },
  {
    tokenId: 3n,
    isrc: 'JPB602504099',
    artist: 'Kōri Sato',
    title: 'Northbound (Chōji Edit)',
    durationSec: 198,
    releasedAt: '2026-01-02',
    owner: '0xc7B6a5D4e3F2D1c0B9a8C7d6E5f4A3b2C1d0E9f8',
    splits: [
      {
        recipient: '0xc7B6a5D4e3F2D1c0B9a8C7d6E5f4A3b2C1d0E9f8',
        role: 'Artist',
        shareBps: 7500,
      },
      {
        recipient: '0xD4e3F2D1c0B9a8C7d6E5f4A3b2C1d0E9f8c7B6a5',
        role: 'Producer',
        shareBps: 1500,
      },
      {
        recipient: '0x33cC9e8B1aD7f6A2b5F4D3c2A1e0B9c8d7E6F5a4',
        role: 'Label',
        shareBps: 1000,
      },
    ],
    streaming: {
      totalStreams: 1_204_550n,
      revenueUsd: 4_127_500_000n,
      confidenceBps: 9710,
    },
    provenance: { humanOnly: true },
  },
  {
    tokenId: 4n,
    isrc: 'DEUM72601844',
    artist: 'Mira Volk',
    title: 'Ferrofluid Hymn',
    durationSec: 305,
    releasedAt: '2026-04-21',
    owner: '0xF1e2D3c4B5a69788796a5b4c3D2e1F0a9B8C7d6E',
    splits: [
      {
        recipient: '0xF1e2D3c4B5a69788796a5b4c3D2e1F0a9B8C7d6E',
        role: 'Artist',
        shareBps: 5500,
      },
      {
        recipient: '0xa9B8C7d6E5f4A3b2C1d0E9f8a7B6c5D4e3F2D1c0',
        role: 'Co-writer',
        shareBps: 2500,
      },
      {
        recipient: '0xb2C1d0E9f8a7B6c5D4e3F2D1c0B9a8C7d6E5f4A3',
        role: 'Producer',
        shareBps: 1500,
      },
      {
        recipient: '0x33cC9e8B1aD7f6A2b5F4D3c2A1e0B9c8d7E6F5a4',
        role: 'Label',
        shareBps: 500,
      },
    ],
    streaming: {
      totalStreams: 56_801n,
      revenueUsd: 187_440_000n,
      confidenceBps: 8210,
    },
    provenance: { humanOnly: true },
  },
  {
    tokenId: 5n,
    isrc: 'USRC18001212',
    artist: 'Helios Ground',
    title: 'Bandwidth (feat. AGI)',
    durationSec: 174,
    releasedAt: '2026-04-29',
    owner: '0xC0FFee0123456789abCDef0123456789abCDef01',
    splits: [
      {
        recipient: '0xC0FFee0123456789abCDef0123456789abCDef01',
        role: 'Artist',
        shareBps: 4500,
      },
      {
        recipient: '0x9bAdC0DeAa1122334455667788990aBbCcDdEeFf',
        role: 'AI model owner (vocals)',
        shareBps: 2000,
      },
      {
        recipient: '0xDeC0DeAa1122334455667788990aBbCcDdEeFf01',
        role: 'AI model owner (drums)',
        shareBps: 1500,
      },
      {
        recipient: '0xCAFEbabe0123456789abCDef0123456789abCDef',
        role: 'Producer',
        shareBps: 1500,
      },
      {
        recipient: '0x33cC9e8B1aD7f6A2b5F4D3c2A1e0B9c8d7E6F5a4',
        role: 'Label',
        shareBps: 500,
      },
    ],
    streaming: {
      totalStreams: 27_402n,
      revenueUsd: 89_810_000n,
      confidenceBps: 7980,
    },
    provenance: {
      humanOnly: false,
      aiModelTokens: [
        {
          contract: '0xE721a1E721a1E721a1E721a1E721a1E721a1E721',
          tokenId: 12n,
          label: 'VOX-Latent — feat. vocals',
        },
        {
          contract: '0xE721a1E721a1E721a1E721a1E721a1E721a1E721',
          tokenId: 88n,
          label: 'KICK-Diffuser v2',
        },
      ],
      ipLineageURIs: ['ipfs://bafybeibandwidth-feat-agi'],
    },
  },
  {
    tokenId: 6n,
    isrc: 'FRZ102604507',
    artist: 'Étoile du Soir',
    title: 'Petite Constellation',
    durationSec: 162,
    releasedAt: '2026-03-19',
    owner: '0x12aB3c4D5e6F708192a3b4C5d6E7f8091a2B3c4D',
    splits: [
      {
        recipient: '0x12aB3c4D5e6F708192a3b4C5d6E7f8091a2B3c4D',
        role: 'Artist',
        shareBps: 8000,
      },
      {
        recipient: '0x33cC9e8B1aD7f6A2b5F4D3c2A1e0B9c8d7E6F5a4',
        role: 'Label',
        shareBps: 2000,
      },
    ],
    streaming: {
      totalStreams: 81_220n,
      revenueUsd: 269_410_000n,
      confidenceBps: 9301,
    },
    provenance: { humanOnly: true },
  },
];

export const NETWORK = {
  name: 'Muzix Devnet',
  chainId: 1338,
  blockTime: 2,
  status: 'pre-mainnet · testnet candidate',
  explorer: null as string | null,
};

export const PROTOCOL_STATS = {
  catalogTokens: TRACKS.length,
  musdCirculating: 8_731_540_000_000n, // 8.7M MUSD (6 decimals)
  totalStreams: TRACKS.reduce((a, t) => a + t.streaming.totalStreams, 0n),
  totalRevenueUsd: TRACKS.reduce((a, t) => a + t.streaming.revenueUsd, 0n),
};

export function getTrack(tokenId: string | number | bigint): Track | undefined {
  const id = BigInt(tokenId);
  return TRACKS.find((t) => t.tokenId === id);
}
