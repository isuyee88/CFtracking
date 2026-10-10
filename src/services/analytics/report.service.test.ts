import { describe, expect, it } from 'vitest';
import { ReportService } from './report.service';

function createDb() {
  const sql: string[] = [];
  const db = {
    prepare(query: string) {
      sql.push(query);
      return {
        bind(..._values: unknown[]) {
          return {
            async all() {
              return {
                results: query.includes('FROM clicks c')
                  ? [{
                      dim0: 'campaign-1',
                      clicks: 2,
                      uniqueClicks: 2,
                      conversions: 2,
                      confirmedConversions: 1,
                      outboundPostbacksSent: 1,
                      outboundPostbacksPending: 1,
                      outboundPostbacksFailed: 0,
                      revenue: 12,
                      cost: 3,
                    }]
                  : [],
              };
            },
          };
        },
      };
    },
  } as any;
  return { db, sql };
}

describe('ReportService outbound delivery integration', () => {
  it('exposes confirmed conversions and outbound delivery state metrics', async () => {
    const { db, sql } = createDb();
    const service = new ReportService({ DB: db } as any);

    const report = await (service as any).generateStandardReport({
      type: 'conversion',
      startDate: '2026-10-01',
      endDate: '2026-10-02',
      groupBy: ['campaign_id'],
    });

    expect(sql.some((query) => query.includes('postback_idempotency'))).toBe(true);
    expect(report.rows[0].metrics).toMatchObject({
      confirmedConversions: 1,
      outboundPostbacksSent: 1,
      outboundPostbacksPending: 1,
      outboundPostbacksFailed: 0,
    });
    expect(report.metrics).toMatchObject({
      totalConfirmedConversions: 1,
      totalOutboundPostbacksSent: 1,
      totalOutboundPostbacksPending: 1,
      totalOutboundPostbacksFailed: 0,
    });
  });
});
