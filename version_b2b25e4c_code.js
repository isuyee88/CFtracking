/**
 * CFTracking Worker Version: b2b25e4c-0217-4b49-a1e7-59d9aa1365c9
 * Created: 2026-03-19T18:15:04.706345Z
 * Number: 53
 * 
 * 此文件包含完整的 Workers 代码内容
 */

// src/index.ts - Main Application Entry
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// Route imports
import { createCampaignRouter } from "./routes/campaigns";
import { createFlowRouter } from "./routes/flows";
import { createLandingPageRouter } from "./routes/landing-pages";
import { createOfferRouter } from "./routes/offers";
import { createRuleRouter } from "./routes/rules";
import { createPlatformRouter } from "./routes/platforms";
import { createTrackingRouter } from "./services/tracking/tracking.routes";
import { createAggregationRouter } from "./services/analytics/aggregation.routes";

// Services
import { ClickService, ConversionService } from "./services/tracking";
import { createAggregationService } from "./services/analytics";

// Utils
import { success, error } from "./utils/response";
import { HTTP_STATUS, ERROR_CODES } from "./utils/constants";

// Durable Objects
import { CounterDurableObject } from "./durable-objects/counter";
import { QueueDurableObject } from "./durable-objects/queue";
import { SessionDurableObject } from "./durable-objects/session";

// Initialize Hono app
const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"]
}));

// Health check endpoint
app.get("/health", (c) => {
  return c.json(success({ 
    status: "healthy", 
    timestamp: new Date().toISOString() 
  }));
});

// API Routes - Main Router Configuration
app.route("/api/campaigns", createCampaignRouter());
app.route("/api/flows", createFlowRouter());
app.route("/api/landing-pages", createLandingPageRouter());
app.route("/api/offers", createOfferRouter());
app.route("/api/rules", createRuleRouter());
app.route("/api/platforms", createPlatformRouter());
app.route("/api/tracking", createTrackingRouter());
app.route("/api/analytics", createAggregationRouter());

// Error handling
app.onError((err, c) => {
  console.error("Error:", err);
  return c.json(error(err.message, "INTERNAL_ERROR"), HTTP_STATUS.INTERNAL_ERROR);
});

// Main export with fetch and scheduled handlers
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // API routes handling
    if (url.pathname.startsWith("/api/") || url.pathname === "/health") {
      return app.fetch(request, env, ctx);
    }
    
    // Static assets handling (SPA fallback)
    return env.ASSETS.fetch(request);
  },

  /**
   * Scheduled task handler - Cron Trigger
   * Runs daily at 2:00 AM for data aggregation
   */
  async scheduled(event, env, ctx) {
    console.log(`[Cron] Starting scheduled aggregation task at ${new Date().toISOString()}`);
    console.log(`[Cron] Event type: ${event.type}, scheduled time: ${event.scheduledTime}`);
    
    ctx.waitUntil(
      (async () => {
        try {
          const aggregationService = createAggregationService(env);
          const result = await aggregationService.aggregateDailyData();
          
          if (result.success) {
            console.log(`[Cron] Aggregation completed successfully: ${result.message}`);
          } else {
            console.error(`[Cron] Aggregation failed: ${result.message}`);
            console.error(`[Cron] Errors: ${JSON.stringify(result.errors)}`);
          }
        } catch (err) {
          console.error(`[Cron] Unexpected error during aggregation: ${err instanceof Error ? err.message : String(err)}`);
        }
      })()
    );
  }
};

// Export Durable Objects
export { CounterDurableObject, QueueDurableObject, SessionDurableObject };
