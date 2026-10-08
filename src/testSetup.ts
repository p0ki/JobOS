import { Storage as TestStorage } from 'happy-dom';

// Node 26 exposes an unavailable native localStorage getter. Tests use an
// isolated in-memory DOM Storage implementation, never a host storage file.
Object.defineProperty(globalThis, 'localStorage', {
    value: new TestStorage(),
    configurable: true,
});
