/**
 * Plain-English theme baskets. Used to spot "the whole pizza group is weak,
 * look at burgers instead" style rotations. Client-safe.
 */
export interface Theme {
  id: string;
  label: string;
  tickers: string[];
  /** Related themes to suggest when this one is weak. */
  alternatives: string[];
}

export const THEMES: Theme[] = [
  {
    id: "pizza",
    label: "Pizza chains",
    tickers: ["DPZ", "PZZA", "YUM", "TAST"],
    alternatives: ["burgers", "coffee", "chicken"],
  },
  {
    id: "burgers",
    label: "Burgers & QSR",
    tickers: ["MCD", "WEN", "SHAK", "JACK", "RRGB"],
    alternatives: ["pizza", "chicken", "coffee"],
  },
  {
    id: "chicken",
    label: "Chicken & wings",
    tickers: ["WING", "PLAY", "CMG", "TXRH"],
    alternatives: ["burgers", "casual-dining"],
  },
  {
    id: "coffee",
    label: "Coffee & snacks",
    tickers: ["SBUX", "DNUT", "KDP", "MNST"],
    alternatives: ["burgers", "beverages"],
  },
  {
    id: "casual-dining",
    label: "Casual dining",
    tickers: ["DRI", "EAT", "CAKE", "BLMN", "TXRH"],
    alternatives: ["burgers", "chicken"],
  },
  {
    id: "beverages",
    label: "Beverages",
    tickers: ["KO", "PEP", "STZ", "CELH", "MNST"],
    alternatives: ["staples", "coffee"],
  },
  {
    id: "staples",
    label: "Consumer staples",
    tickers: ["PG", "CL", "KMB", "GIS", "K", "HSY"],
    alternatives: ["beverages", "retail"],
  },
  {
    id: "retail",
    label: "Big-box retail",
    tickers: ["WMT", "TGT", "COST", "DG", "DLTR", "BJ"],
    alternatives: ["ecommerce", "staples"],
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    tickers: ["AMZN", "SHOP", "EBAY", "ETSY", "CHWY"],
    alternatives: ["retail", "software"],
  },
  {
    id: "megacap-tech",
    label: "Mega-cap tech",
    tickers: ["AAPL", "MSFT", "GOOGL", "META", "AMZN", "NVDA"],
    alternatives: ["semis", "software"],
  },
  {
    id: "semis",
    label: "Semiconductors",
    tickers: ["NVDA", "AMD", "AVGO", "MU", "INTC", "TSM", "SMCI"],
    alternatives: ["megacap-tech", "software"],
  },
  {
    id: "software",
    label: "Software & cloud",
    tickers: ["CRM", "NOW", "ORCL", "ADBE", "SNOW", "DDOG"],
    alternatives: ["megacap-tech", "semis"],
  },
  {
    id: "banks",
    label: "Banks",
    tickers: ["JPM", "BAC", "WFC", "C", "GS", "MS"],
    alternatives: ["insurance", "fintech"],
  },
  {
    id: "fintech",
    label: "Fintech & payments",
    tickers: ["V", "MA", "PYPL", "SQ", "COIN", "SOFI"],
    alternatives: ["banks", "software"],
  },
  {
    id: "insurance",
    label: "Insurance",
    tickers: ["PGR", "ALL", "TRV", "CB", "AIG"],
    alternatives: ["banks"],
  },
  {
    id: "energy",
    label: "Oil & gas",
    tickers: ["XOM", "CVX", "COP", "OXY", "SLB", "DVN"],
    alternatives: ["utilities", "industrials"],
  },
  {
    id: "utilities",
    label: "Utilities",
    tickers: ["NEE", "DUK", "SO", "AEP", "D"],
    alternatives: ["energy", "staples"],
  },
  {
    id: "airlines",
    label: "Airlines & travel",
    tickers: ["DAL", "UAL", "AAL", "LUV", "ABNB", "BKNG"],
    alternatives: ["industrials", "casual-dining"],
  },
  {
    id: "industrials",
    label: "Industrials",
    tickers: ["CAT", "DE", "HON", "GE", "UNP", "BA"],
    alternatives: ["energy", "airlines"],
  },
  {
    id: "healthcare",
    label: "Healthcare & pharma",
    tickers: ["JNJ", "LLY", "PFE", "MRK", "ABBV", "UNH"],
    alternatives: ["biotech", "staples"],
  },
  {
    id: "biotech",
    label: "Biotech",
    tickers: ["AMGN", "GILD", "VRTX", "REGN", "BIIB", "MRNA"],
    alternatives: ["healthcare"],
  },
  {
    id: "homebuilders",
    label: "Homebuilders",
    tickers: ["DHI", "LEN", "PHM", "NVR", "TOL"],
    alternatives: ["retail", "industrials"],
  },
  {
    id: "autos",
    label: "Autos & EV",
    tickers: ["TSLA", "GM", "F", "RIVN", "LCID"],
    alternatives: ["industrials", "semis"],
  },
];

export const THEME_BY_ID = new Map(THEMES.map((t) => [t.id, t]));

export const THEME_TICKERS = Array.from(new Set(THEMES.flatMap((t) => t.tickers)));

export function themesForTicker(ticker: string): Theme[] {
  const upper = ticker.toUpperCase();
  return THEMES.filter((t) => t.tickers.includes(upper));
}
