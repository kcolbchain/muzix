# Mixdown — scene contract

`mixdown.html` is a single-file lab with no build step. Add a scene by appending one object to the `SCENES` array.

## Scene shape

```js
SCENES.push({
  name: "Your scene title",
  captions: [
    "Markdown-lite caption for step 0 (intro state)",
    "Caption for step 1 — describe the on-chain action with <code>contractCall</code>",
    "Caption for step 2",
    // ...
  ],
  setup() {
    // Place agents on the canvas. cx, cy = stage center.
    const cx = W / 2, cy = H / 2 - 20;
    agents = {
      sapta:    makeAgent({ id: "sapta", name: "Sapta", role: "artist", type: "artist", x: cx - 300, y: cy }),
      contract: makeAgent({ id: "contract", name: "MyContract", role: "what it does", type: "contract", x: cx, y: cy }),
    };
  },
  steps: [
    () => { /* step 0: idle intro, no animation */ },
    (now) => {
      addTx({ from: "sapta", to: "contract", color: "accent", label: "myCall(...)", dur: 1500 });
      byId("contract").flash = 1;
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
| `artist` | circle | gold (accent) | the human artist driving the story |
| `contract` | hex | cyan (signal) | a deployed contract — Labelton, Oracle, RightsOffering, MUSD |
| `bidder` | square | orange (warn) | labels / IP buyers / distributors / sync agencies |
| `label` | circle | pink (label) | label/cap-table member when distinct from a bidder |
| `dsp` | diamond | purple (dsp) | streaming platforms |
| `wallet` | circle | white (wallet) | generic cap-table holder or producer wallet |

Override `r`, `color`, or `shape` directly in `makeAgent({...})` if a scene needs something custom.

## Transaction colors

`addTx({ from, to, color, label, dur, curve, dotSize })`

| color key | use for |
|---|---|
| `accent` | artist-initiated tx (mint, accept, publish) |
| `warn` | bidder-initiated tx (submitCounter, acceptBaseTerms) |
| `ok` | money flow (bond refund, payout) |
| `signal` | contract → contract reads |
| `dsp` | DSP → oracle revenue submission |
| `muted` | low-emphasis tx (cancellations, withdrawals) |

`curve` is a perpendicular offset (px) for parallel paths — use ±20–40 when multiple txs share the same endpoints so they don't overlap.

## Step pacing rules of thumb

- Keep each step's effect under ~2s. The auto-advance interval is 1.8s; if you need longer, increase `STEP_INTERVAL` or split into two steps.
- Use `setTimeout` within a step for staggered fan-outs (e.g. minting to multiple holders) — see scene 1.
- At each step boundary, all agents' `flash` decays by 70% and `glow` by 40%, so use `byId("x").glow = 1` to *sustain* attention across steps.

## Naming style

Match the existing voice: short verb-led titles ("Drop the master", "Sapta picks"), captions that read like liner notes plus the concrete contract call in `<code>`. The goal is for a label-side reviewer to follow the on-chain flow without prior protocol context.
