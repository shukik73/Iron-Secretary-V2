// Midas Buy Rules
export const MIDAS_BUY_RULES = {
  macbook_pro_15_2015: { maxBuy: 120, minYield: 280, maxYield: 350, minMargin: 160 },
  macbook_pro_13_2017: { maxBuy: 100, minYield: 220, maxYield: 280, minMargin: 120 },
  macbook_pro_16_2019: { maxBuy: 200, minYield: 400, maxYield: 500, minMargin: 200 },
  macbook_air_m1_2020: { maxBuy: 180, minYield: 350, maxYield: 420, minMargin: 170 },
  imac_27_2017_2019:   { maxBuy: 150, minYield: 300, maxYield: 400, minMargin: 150 },
  imac_21_2017_plus:   { maxBuy: 80,  minYield: 180, maxYield: 250, minMargin: 100 },
};

export const MIDAS_RULES = {
  maxOpenPurchases: 3,
  neverBuyWaterDamage: true,
  noPowerMaxPricePercent: 0.40,
};

// Revenue Bridge V2.2
export const REVENUE_TARGETS = {
  current: { repair: 10000, refurb: 3000, rg: 0, midas: 0, total: 13000 },
  target:  { repair: 12000, refurb: 4500, rg: 1500, midas: 1000, total: 19000 },
  milestones: {
    month2: 13500,
    month4: 15200,
    month6: 16600,
    month9: 18300,
    month12: 19000
  }
};

// Kill Criteria V2.2
export const KILL_CRITERIA = [
  {
    project: 'Emilio',
    signal: '<1% reply rate after 500 emails',
    timeframe: 'Week 4',
    alternative: 'Rewrite pitch. If still dead → Facebook ads',
    status: 'active'
  },
  {
    project: 'ReviewGuard',
    signal: '<5 customers after 20 demo calls',
    timeframe: 'Week 8',
    alternative: 'Drop to $29. If still no → shelf it',
    status: 'pending'
  },
  {
    project: 'Midas',
    signal: '<$200 total margin after 5 purchases',
    timeframe: 'Week 14',
    alternative: 'Tighten rules or refurb-only',
    status: 'pending'
  },
  {
    project: 'Hamoriko',
    signal: '<100 views/episode after 8 episodes',
    timeframe: 'Q4',
    alternative: 'Pause 6 months, revisit format',
    status: 'pending'
  },
];