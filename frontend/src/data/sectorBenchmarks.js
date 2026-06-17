// Approximate long-run S&P 500 sector weights, used only to give portfolio
// commentary a rough point of comparison. These are general reference
// figures, not live data.
const SP500_SECTOR_AVG = {
  Technology: 28,
  'Information Technology': 28,
  Healthcare: 13,
  Financials: 13,
  'Financial Services': 13,
  'Consumer Cyclical': 10,
  'Consumer Discretionary': 10,
  'Communication Services': 9,
  Industrials: 8,
  'Consumer Defensive': 6,
  'Consumer Staples': 6,
  Energy: 4,
  Utilities: 2.5,
  'Real Estate': 2.5,
  'Basic Materials': 2.5,
  Materials: 2.5,
};

export const SECTOR_COLORS = [
  '#a4391c', '#b08a3e', '#2d7a4f', '#6b5e52', '#c94545',
  '#8a6d3b', '#4a7a9e', '#9c8e82', '#7a4a3e', '#5e7a4a',
];

export function getSectorBenchmark(sector) {
  return SP500_SECTOR_AVG[sector] ?? null;
}

export default SP500_SECTOR_AVG;
