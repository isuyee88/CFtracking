-- 更新 flowOffers 表中的 flowId 和 offerId 为短 ID 格式

-- 更新 flowId
UPDATE flowOffers SET flowId = (SELECT displayId FROM flows WHERE flows.id = flowOffers.flowId) 
WHERE EXISTS (SELECT 1 FROM flows WHERE flows.id = flowOffers.flowId AND flows.id != flows.displayId);

-- 更新 offerId  
UPDATE flowOffers SET offerId = (SELECT displayId FROM offers WHERE offers.id = flowOffers.offerId)
WHERE EXISTS (SELECT 1 FROM offers WHERE offers.id = flowOffers.offerId AND offers.id != offers.displayId);

-- 更新 flowLandingPages 表
UPDATE flowLandingPages SET flowId = (SELECT displayId FROM flows WHERE flows.id = flowLandingPages.flowId)
WHERE EXISTS (SELECT 1 FROM flows WHERE flows.id = flowLandingPages.flowId AND flows.id != flows.displayId);

UPDATE flowLandingPages SET landingPageId = (SELECT displayId FROM landingPages WHERE landingPages.id = flowLandingPages.landingPageId)
WHERE EXISTS (SELECT 1 FROM landingPages WHERE landingPages.id = flowLandingPages.landingPageId AND landingPages.id != landingPages.displayId);
