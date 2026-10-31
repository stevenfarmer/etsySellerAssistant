import { URL } from 'node:url';

const nativeFetch = globalThis.fetch;

function isAllowedLoopbackRequest(input) {
  let url;
  try {
    if (input instanceof URL) {
      url = input;
    } else if (typeof globalThis.Request !== 'undefined' && input instanceof globalThis.Request) {
      url = new URL(input.url);
    } else {
      url = new URL(String(input));
    }
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' || url.username !== '' || url.password !== '') return false;
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
}

globalThis.fetch = async function offlineGuardedFetch(input, init) {
  if (!isAllowedLoopbackRequest(input)) {
    throw new Error('Offline test guard blocked a non-loopback network request.');
  }
  // Never let an allowed loopback server redirect a test to an external host.
  return nativeFetch(input, {
    ...init,
    redirect: init?.redirect === 'manual' ? 'manual' : 'error',
  });
};
