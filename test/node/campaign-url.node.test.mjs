import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCampaignTrackingUrl,
  isUsableTrackingDomain,
  pickDefaultTrackingDomain,
  sortTrackingDomains,
} from '../../frontend/src/utils/campaignUrl.ts';

test('buildCampaignTrackingUrl keeps macro placeholders unencoded', () => {
  const url = buildCampaignTrackingUrl('go.chuanfly.com', 'dash-cam', [
    { paramName: 'sub1', macro: '{token}' },
    { paramName: 'sub2', macro: '{keywordID}' },
  ]);
  assert.equal(url, 'https://go.chuanfly.com/c/dash-cam?sub1={token}&sub2={keywordID}');
});

test('campaign parameters override traffic-source parameters', () => {
  const url = buildCampaignTrackingUrl(
    'https://go.suyee.org/',
    'alias-1',
    [{ paramName: 'sub1', macro: '{token}' }],
    { sub1: '{click_id}', cost: '0.12' }
  );
  assert.equal(url, 'https://go.suyee.org/c/alias-1?sub1={click_id}&cost=0.12');
});

test('empty domain or alias produces no URL', () => {
  assert.equal(buildCampaignTrackingUrl('', 'a'), '');
  assert.equal(buildCampaignTrackingUrl('go.chuanfly.com', ''), '');
});

test('only active tracking/mixed domains are selectable', () => {
  assert.equal(isUsableTrackingDomain({ usage: 'tracking', status: 'active', sslStatus: 'auto' }), true);
  assert.equal(isUsableTrackingDomain({ usage: 'mixed', status: 'active', sslStatus: 'active' }), true);
  assert.equal(isUsableTrackingDomain({ usage: 'content', status: 'active', sslStatus: 'active' }), false);
  assert.equal(isUsableTrackingDomain({ usage: 'tracking', status: 'paused', sslStatus: 'active' }), false);
  assert.equal(isUsableTrackingDomain({ usage: 'tracking', status: 'active', sslStatus: 'disabled' }), false);
});

test('preferred hosts are ordered first and campaign domain wins the default', () => {
  const domains = [
    { hostname: 'go2.isenmy.com' },
    { hostname: 'go.chuanfly.com' },
    { hostname: 't.isuyee.com' },
  ];
  assert.deepEqual(
    sortTrackingDomains(domains).map((domain) => domain.hostname),
    ['t.isuyee.com', 'go.chuanfly.com', 'go2.isenmy.com']
  );
  assert.equal(pickDefaultTrackingDomain(domains, 'go2.isenmy.com'), 'go2.isenmy.com');
  assert.equal(pickDefaultTrackingDomain(sortTrackingDomains(domains), 'em.isuyee.com'), 't.isuyee.com');
});
