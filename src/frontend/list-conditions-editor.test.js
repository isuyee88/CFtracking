import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ListConditionsEditor } from '../../frontend/src/components/ListConditionsEditor';

describe('ListConditionsEditor supported condition fields', () => {
  it('renders the newly supported governance and repeat-window fields', () => {
    const html = renderToStaticMarkup(
      React.createElement(ListConditionsEditor, {
        matchMode: 'all',
        conditions: [{ field: 'ip', operator: 'equals', value: '' }],
        onMatchModeChange: () => {},
        onConditionsChange: () => {},
      })
    );

    expect(html).toContain('Visitor ID');
    expect(html).toContain('ISP Type');
    expect(html).toContain('Org Name');
    expect(html).toContain('Verified Bot');
    expect(html).toContain('Bot Score');
    expect(html).toContain('JA3');
    expect(html).toContain('JA4');
    expect(html).toContain('JS Detection');
    expect(html).toContain('Challenge State');
    expect(html).toContain('Token Replay State');
    expect(html).toContain('Campaign Count (7d)');
    expect(html).toContain('Visitor Repeat (7d)');
    expect(html).toContain('IP Repeat (7d)');
    expect(html).toContain('Suspicious Signal');
  });

  it('shows field-specific guidance for boolean and repeat-window conditions', () => {
    const html = renderToStaticMarkup(
      React.createElement(ListConditionsEditor, {
        matchMode: 'all',
        conditions: [
          { field: 'verifiedBot', operator: 'equals', value: '' },
          { field: 'campaignCount7d', operator: 'equals', value: '' },
        ],
        onMatchModeChange: () => {},
        onConditionsChange: () => {},
      })
    );

    expect(html).toContain('true or false');
    expect(html).toContain('Examples: 3, 8, 20');
  });

  it('surfaces operator logic copy and larger list-entry guidance', () => {
    const html = renderToStaticMarkup(
      React.createElement(ListConditionsEditor, {
        matchMode: 'any',
        conditions: [{ field: 'suspiciousSignal', operator: 'in', value: ['no_js_data'] }],
        onMatchModeChange: () => {},
        onConditionsChange: () => {},
      })
    );

    expect(html).toContain('Operator Logic');
    expect(html).toContain('Match ANY condition');
    expect(html).toContain('Enter multiple values separated by commas or new lines.');
    expect(html).toContain('rows=\"4\"');
  });
});
