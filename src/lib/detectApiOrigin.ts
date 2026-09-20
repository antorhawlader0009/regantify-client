// Auto-detect: "is the local NestJS API actually up?" — used to pick
// between your own local server (localhost:4000-on-whatever-host) and
// the real VPS (api.gadgetdepobd.com) with zero .env editing, so the
// SAME running `npm run dev` always talks to whichever one is actually
// available. Only kicks in when neither VITE_API_URL nor
// VITE_ROOT_DOMAIN/VITE_STOREFRONT_URL is explicitly set — an explicit
// .env value always wins outright, same as before this existed (see
// api.ts/storefrontUrl.ts's own comments).
//
// The VPS is this project's one real deployment target today (see
// CLAUDE.md's Deployment section + ~/regantify/docker-compose.yml) —
// hardcoded here rather than another env var, since the whole point is
// "works with zero config".
export const VPS_API_URL = 'https://api.gadgetdepobd.com';
export const VPS_ROOT_DOMAIN = 'gadgetdepobd.com';

const PROBE_TIMEOUT_MS = 800;
// Any cheap, unauthenticated, always-200 route works as a liveness probe
// — GET /v1/plans is public (see server/src/plans/plans.controller.ts)
// and doesn't touch the database in a way that could itself be slow.
const PROBE_PATH = '/v1/plans';

async function probeLocalApi(candidate: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${candidate}${PROBE_PATH}`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false; // connection refused, DNS failure, timeout — local isn't up
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolved once per page load (module-level cache — a fresh tab reload
 * re-checks, nothing inside one running session ever checks twice), per
 * the "check once at load" decision. `api.ts`'s request interceptor
 * awaits this directly for the API baseURL; `storefrontUrl.ts` instead
 * reads the synchronous `isLocalApiUp()` below, since its own functions
 * are called synchronously from render (see that file's own comment)
 * and can't await a promise. Both are driven by the exact same single
 * probe — there's only ever one network check, not two independent
 * ones racing each other.
 */
let cachedPromise: Promise<string> | null = null;
let localIsUpState = true; // optimistic default: matches pre-auto-detect behavior (always assumed local) until the probe actually finishes

/** Resolves to the local API origin if it's actually reachable, otherwise the VPS's. Kicked off eagerly at module load (see bottom of this file), not lazily on first request, so it's already resolved (or resolving) before the app's first real render in the common case. */
export function detectApiOrigin(inferredLocalUrl: string): Promise<string> {
  if (!cachedPromise) {
    cachedPromise = probeLocalApi(inferredLocalUrl).then((localIsUp) => {
      localIsUpState = localIsUp;
      return localIsUp ? inferredLocalUrl : VPS_API_URL;
    });
  }
  return cachedPromise;
}

/**
 * Synchronous current best guess — optimistically `true` until the
 * probe resolves. In practice every real page is a descendant of
 * AuthBootstrap (see that component), which blocks rendering `children`
 * until its own silent-login check — itself an api.ts request, so it
 * awaits this exact probe — has settled. That means by the time any
 * page that calls storefrontStoreUrl()/storefrontProductUrl() actually
 * mounts, this already reflects the real result; the optimistic default
 * only matters for code that runs outside that gate.
 */
export function isLocalApiUp(): boolean {
  return localIsUpState;
}

// Eagerly kick off the probe at module load (this module is imported by
// api.ts, which every page loads), rather than only lazily on the first
// axios request, so it's already in flight before AuthBootstrap's own
// request even starts.
const inferredLocalUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : '';
if (inferredLocalUrl && !import.meta.env.VITE_API_URL) {
  detectApiOrigin(inferredLocalUrl);
}
