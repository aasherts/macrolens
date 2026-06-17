// Plain-English definitions for the glossary tooltip system.
// Keys are lowercase term names used by <Term name="..."/>.
const GLOSSARY = {
  'p/e ratio': "Price divided by earnings per share. A simple way to see if a stock looks expensive relative to how much profit it makes.",
  'market cap': "The total value of all a company's shares — like its price tag.",
  'eps': "Earnings Per Share — how much profit a company makes for each share that exists. Higher usually means more profitable.",
  'beta': "How much a stock moves compared to the overall market. Above 1 means more volatile than the market; below 1 means calmer.",
  'vix': "The 'fear index' — measures how nervous the market is. Higher means more uncertainty and bigger expected price swings.",
  'stop loss': "The price at which you automatically sell to prevent bigger losses if a stock falls.",
  'rsi': "Relative Strength Index — a 0-100 score showing if a stock has been bought or sold heavily recently. Above 70 often means 'overbought', below 30 'oversold'.",
  'moving average': "The average price over a recent period (e.g. 50 days), smoothed out to show the underlying trend without daily noise.",
  'dividend yield': "The yearly cash a company pays you per share, shown as a percentage of the share price.",
  'short selling': "Borrowing and selling a stock you don't own, betting its price will fall so you can buy it back cheaper later.",
  'etf': "Exchange-Traded Fund — a basket of many stocks bundled into one tradeable security, often tracking an index.",
  'index fund': "A fund that simply holds all (or most) stocks in a market index like the S&P 500, aiming to match the market rather than beat it.",
  'bull market': "A period when prices are generally rising and investor confidence is high.",
  'bear market': "A period when prices are generally falling (typically 20%+ from a recent high) and confidence is low.",
  'volatility': "How much and how quickly a price moves up and down. Higher volatility means bigger, faster swings.",
  'liquidity': "How easily an asset can be bought or sold without affecting its price. Highly liquid assets trade quickly at a fair price.",
  'cpi': "Consumer Price Index — tracks how fast the prices of everyday goods are rising, the standard measure of inflation.",
  'diversification': "Spreading your money across different investments so one bad outcome doesn't sink your whole portfolio.",
  'dollar cost averaging': "Investing a fixed amount on a regular schedule (e.g. monthly) regardless of price, instead of trying to time the market.",
  'brokerage': "A company or app (like Fidelity, Robinhood, or Schwab) that lets you buy and sell stocks.",
};

export function getDefinition(term) {
  return GLOSSARY[term.toLowerCase()] || null;
}

export default GLOSSARY;
