// utils/indicators.ts

export const calculateSMA = (data: number[], period: number) => {
  return data.map((_, index, arr) => {
    if (index < period - 1) return null;
    const slice = arr.slice(index - period + 1, index + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / period;
  });
};

export const calculateRSI = (prices: number[], period: number = 14) => {
  let gains = 0;
  let losses = 0;
  const rsi: (number | null)[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      rsi.push(null);
      continue;
    }
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;

    if (i < period) {
      rsi.push(null);
    } else {
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgGain / (avgLoss || 1);
      rsi.push(100 - (100 / (1 + rs)));
      // Reset for next calc (simplification)
      gains -= (prices[i - period + 1] > prices[i - period] ? prices[i - period + 1] - prices[i - period] : 0);
      losses -= (prices[i - period + 1] < prices[i - period] ? prices[i - period] - prices[i - period + 1] : 0);
    }
  }
  return rsi;
};

export const calculateBollingerBands = (data: number[], period: number = 20) => {
  return data.map((_, index, arr) => {
    if (index < period - 1) return { upper: null, lower: null, middle: null };
    const slice = arr.slice(index - period + 1, index + 1);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const stdDev = Math.sqrt(slice.map(x => Math.pow(x - sma, 2)).reduce((a, b) => a + b) / period);
    return { middle: sma, upper: sma + (stdDev * 2), lower: sma - (stdDev * 2) };
  });
};