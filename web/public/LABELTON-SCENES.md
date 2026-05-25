# Labelton — scene contract

`labelton.html` is a single-file lab with no build step. It is the zoom-in companion to `mixdown.html`: where Mixdown walks the full muzix closed loop in six scenes, Labelton zooms into the rights primitive in eight. Add a scene by appending one object to the `SCENES` array.

## Scene shape

```js
SCENES.push({
  name: "Your scene title",
  captions: [
    "Markdown-lite caption for step 0 (intro state)",
    "Caption for step 1 — describe the contract call with <code>functionName(args)</code>",
    "Caption for step 2",
    // ...
  ],
  setup() {
    // Place agents on the canvas. cx, cy = stage center.
    const cx = W / 2, cy = H / 2 - 20;
    agents = {
      sapta:    makeAgent({ id: "sapta", name: "Sapta", role: "artist", type: "artist", x: cx - 300, y: cy }),
      labelton: makeAgent({ id: "labelton", name: "Labelton", role: "rights registry", type: "contract", x: cx, y: cy }),
    };
  },
  steps: [
    () => { /* step 0: idle intro, no animation */ },
    (now) => {
      addTx({ from: "sapta", to: "labelton", color: "accent", label: "registerMaster(...)", dur: 1500 });
      byId("labelton").flash = 1;
      // schedule follow-ups with setTimeout if you need staggered effects
    },
    // ...
  ],
});
```

The number of `captions` should match the number of `steps`. The transport auto-advances every `STEP_INTERVAL` (default 1.8s) while playing; users can also `space` (play/pause), `n` (step), `r` (restart), or `←`/`→` to jump scenes.

## Agent types (color / shape defaults)

| type | shape | color | use for |
|---|---|---|---|
| `artist` | circle | gold (accent) | the human artist driving the story (Sapta) |
| `contract` | hex | cyan (signal) | a deployed contract — Labelton, MuzixAIProvenance |
| `wallet` | circle | white (wallet) | generic cap-table holder, Producer, Buyer, Stranger |
| `label` | circle | pink (label) | label/cap-table member when distinct from a generic wallet |
| `dao` | shield | purple (dao) | Muzix DAO — protocol owner, config endpoints, pause switch |
| `bidder` | square | orange (warn) | (not used in Labelton lab — kept for parity with Mixdown) |
| `dsp` | diamond | purple (dsp) | (not used in Labelton lab — kept for parity with Mixdown) |

The `dao` type is new in the Labelton lab. It uses a shield silhouette to read as "governance authority" rather than "deployed code." The colour is muzix-signal-adjacent but distinct from the `contract` cyan.

Override `r`, `color`, or `shape` directly in `makeAgent({...})` if a scene needs something custom.

## Transaction colors

`addTx({ from, to, color, label, dur, curve, dotSize })`

| color key | use for |
|---|---|
| `accent` | wallet-sovereign tx (registerMaster, mintVariant, safeTransferFrom by an authorized holder) |
| `dao` | DAO-only config call (setVariantKindAllowed, setPaused, setMirVerifier, ...) |
| `warn` | attempt that will revert (mintVariant from a non-member, registerMaster with a duplicate ISRC) |
| `hot` | the revert itself — the bounce-back arrow from contract to caller |
| `signal` | contract → contract reads (catalog handshake, provenance lookups) |
| `ok` | money flow (rare in this lab; Mixdown uses it more) |
| `muted` | low-emphasis tx (cancellations, withdrawals) |

`curve` is a perpendicular offset (px) for parallel paths — use ±20–40 when multiple txs share the same endpoints so they don't overlap.

## Step pacing rules of thumb

- Keep each step's effect under ~2s. The auto-advance interval is 1.8s; if you need longer, increase `STEP_INTERVAL` or split into two steps.
- Use `setTimeout` within a step for staggered fan-outs (e.g. minting to multiple holders) — see scene 1 and scene 4.
- At each step boundary, all agents' `flash` decays by 70% and `glow` by 40%, so use `byId("x").glow = 1` to *sustain* attention across steps.
- For revert scenes, pair a `warn`-coloured outbound tx with a `hot`-coloured return tx fired ~1.1s later — that's the visual idiom for "the contract said no."

## Naming style

Match the existing voice: short verb-led titles ("Master gets minted", "Cut a remix"), captions that read like liner notes plus the concrete Solidity function name in `<code>`. The Labelton lab is honest about the contract's design quirks — scene 6 (membership snapshot) calls out the economic-share-vs-mint-right tension rather than glossing it. Stay in that register.

## The eight scenes (current set)

1. **Master gets minted** — `registerMaster` + root variant mint, 60/20/20 cap-table, 10000 bps fan-out
2. **ISRC stays unique** — `IsrcRootAlreadyRegistered` revert, the reverse-lookup mapping as legal-identifier guard
3. **Cap-table sums or doesn't** — `CapTableSharesDoNotSum(8500)` revert, then a valid 10000 bps retry
4. **Cut a remix** — DAO `setVariantKindAllowed(Remix, true)`, then a cap-table member `mintVariant(Remix, ...)`
5. **Not a member, not your mint** — stranger `mintVariant` → `NotMasterMember` revert
6. **The membership snapshot quirk** — `safeTransferFrom` moves balance but not mint rights; cap-table is frozen at registration
7. **AI provenance binds** — `MuzixAIProvenance.setProvenance(labelton, variantId, ...)` and the public read path
8. **DAO emergency pause** — `setPaused(true)` blocks `registerMaster` with `LabeltonPaused`; unpause restores

## How this lab relates to Mixdown

Mixdown's scene 1 ("Drop the master") is the same `registerMaster` call as Labelton's scene 1, but Mixdown then moves on to the offering / oracle / settlement flow. Labelton holds the camera on the rights primitive: invariants, reverts, governance toggles, and the cap-table-vs-balance distinction. The two labs share the same chrome, the same agent factory, the same `addTx` primitive — the only thing that diverges is `SCENES` and the title.

Add new scenes when a Labelton behaviour deserves its own beat (per-variant cap-table override, verifier signature enforcement, governance-gated cap-table mutation). Mirror to Mixdown only when the new behaviour participates in the full closed loop.
