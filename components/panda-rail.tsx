'use client';

import { useState } from 'react';

type Side = 'left' | 'right';

function PandaBuddy({ side }: { side: Side }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`fixed top-1/2 z-20 hidden -translate-y-1/2 lg:block ${side === 'left' ? 'left-3' : 'right-3'}`}>
      <button
        type="button"
        aria-label={`${side} panda assistant`}
        onClick={() => setOpen((value) => !value)}
        className="group flex h-28 w-20 items-center justify-center rounded-2xl border border-zinc-300 bg-white/95 shadow-md transition hover:scale-105"
      >
        <span className="text-4xl" role="img" aria-hidden>
          🐼
        </span>
      </button>

      {open ? (
        <div
          className={`absolute top-1/2 w-60 -translate-y-1/2 rounded-xl border border-zinc-300 bg-white p-3 text-sm shadow-lg ${
            side === 'left' ? 'left-24' : 'right-24'
          }`}
        >
          <p className="font-semibold">Panda placeholder</p>
          <p className="mt-1 text-zinc-600">
            这里是吉祥物素材预留位。后续可替换为真实熊猫动效（Lottie / Rive / SVG）。
          </p>
          <p className="mt-2 text-zinc-700">🎋 Tip: Use Submit Work to start the workflow.</p>
        </div>
      ) : null}
    </div>
  );
}

export function PandaRail() {
  return (
    <>
      <PandaBuddy side="left" />
      <PandaBuddy side="right" />
    </>
  );
}
