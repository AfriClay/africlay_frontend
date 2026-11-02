import type { AdminFinanceSummary } from '../../services/adminService';

export type FinanceSeriesKey = 'orderReceipts' | 'walletTopups' | 'b2cPayouts';
type TrendPoint = AdminFinanceSummary['trend'][number];

export const financeSeries: Array<{ key: FinanceSeriesKey; label: string; color: string }> = [
  { key: 'orderReceipts', label: 'Order M-Pesa receipts', color: '#207F20' },
  { key: 'walletTopups', label: 'Wallet top-ups', color: '#247FA6' },
  { key: 'b2cPayouts', label: 'B2C payouts', color: '#AC641A' },
];

export const buildFinanceTrendPaths = (points: TrendPoint[], width: number, height: number) => {
  if (!points.length) return { paths: {} as Record<FinanceSeriesKey, string>, maximum: 0 };
  const maximum = Math.max(0, ...points.flatMap(point => financeSeries.map(item => point[item.key])));
  const paths = Object.fromEntries(financeSeries.map(item => [item.key, points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = maximum ? height - (point[item.key] / maximum) * height : height;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ')])) as Record<FinanceSeriesKey, string>;
  return { paths, maximum };
};
