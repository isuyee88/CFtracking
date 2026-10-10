const dns = require('node:dns');
try {
  dns.setServers(['1.1.1.1', '8.8.8.8', '223.5.5.5']);
} catch (_) {}
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (_) {}
