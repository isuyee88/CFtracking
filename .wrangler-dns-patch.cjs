const dns = require('node:dns');

const TARGET = 'api.cloudflare.com';
const IPS = ['104.19.192.29','104.19.192.174','104.19.192.175','104.19.192.176','104.19.192.177','104.19.193.29'];

function isTarget(hostname) {
  return typeof hostname === 'string' && hostname.toLowerCase() === TARGET;
}

function pickIp() {
  return IPS[Math.floor(Math.random() * IPS.length)] || IPS[0];
}

const originalLookup = dns.lookup.bind(dns);
dns.lookup = function patchedLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }

  if (isTarget(hostname)) {
    if (typeof callback === 'function') {
      callback(null, pickIp(), 4);
      return;
    }
    return Promise.resolve({ address: pickIp(), family: 4 });
  }

  return originalLookup(hostname, options, callback);
};

const originalPromisesLookup = dns.promises.lookup.bind(dns.promises);
dns.promises.lookup = async function patchedPromisesLookup(hostname, options) {
  if (isTarget(hostname)) {
    if (options && typeof options === 'object' && options.all) {
      return IPS.map((address) => ({ address, family: 4 }));
    }
    return { address: pickIp(), family: 4 };
  }
  return originalPromisesLookup(hostname, options);
};

const originalResolve4 = dns.resolve4.bind(dns);
dns.resolve4 = function patchedResolve4(hostname, callback) {
  if (isTarget(hostname)) {
    if (typeof callback === 'function') {
      callback(null, IPS.slice());
      return;
    }
    return Promise.resolve(IPS.slice());
  }
  return originalResolve4(hostname, callback);
};
