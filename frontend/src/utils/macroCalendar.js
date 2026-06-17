// Generates the next 30 days of recurring macro events from well-known
// public schedules (jobs report, CPI release window, FOMC cadence).
// Exact FOMC dates are set by the Fed and announced months ahead — since
// we can't verify them live here, we show the typical cadence rather than
// inventing a specific date and presenting it as confirmed fact.

function firstFridayOfMonth(year, month) {
  const d = new Date(year, month, 1);
  const day = d.getDay();
  const offset = (5 - day + 7) % 7;
  d.setDate(1 + offset);
  return d;
}

function fmt(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getUpcomingMacroEvents() {
  const today = new Date();
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 30);
  const events = [];

  for (let m = 0; m < 2; m++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + m, 1);
    const jobsDay = firstFridayOfMonth(monthDate.getFullYear(), monthDate.getMonth());
    if (jobsDay >= today && jobsDay <= horizon) {
      events.push({
        date: jobsDay,
        name: 'Jobs Report (Non-Farm Payrolls)',
        why: "Shows how many jobs the US economy added — strong jobs growth can push the Fed to keep rates higher for longer.",
      });
    }

    const cpiDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 11);
    if (cpiDay >= today && cpiDay <= horizon) {
      events.push({
        date: cpiDay,
        name: 'CPI Inflation Release (approx.)',
        why: "Measures how fast prices are rising — hotter-than-expected inflation often spooks markets and bond yields.",
      });
    }
  }

  // FOMC meets roughly every 6 weeks — flag the cadence rather than a guessed exact date.
  events.push({
    date: null,
    name: 'Next Fed (FOMC) Meeting',
    why: "The Fed sets interest rates at these meetings — rate decisions move every corner of the market. Meets roughly every 6 weeks; check the official Fed calendar for the exact date.",
  });

  events.push({
    date: null,
    name: 'Major Earnings Season',
    why: "Big companies like Apple, Microsoft, and Amazon report quarterly results roughly every 3 months — these can move the whole market, not just the stock.",
  });

  return events.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date - b.date;
  }).map(e => ({ ...e, dateLabel: e.date ? fmt(e.date) : 'Ongoing', isThisWeek: e.date ? (e.date - today) / 86400000 <= 7 : false }));
}

export default getUpcomingMacroEvents;
