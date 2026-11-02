import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { MotiView } from 'moti';
import Svg, { Line, Path } from 'react-native-svg';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import type { AdminFinanceSummary } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatCurrency';
import { operationsColors } from './OperationsScaffold';
import { buildFinanceTrendPaths, financeSeries } from './financeTrend';

export const FinanceTrendChart = ({ summary }: { summary: AdminFinanceSummary }) => {
  const width = useWindowDimensions().width;
  const reducedMotion = useReducedMotionSafe();
  const compact = width < 720;
  const chartWidth = 640;
  const chartHeight = 170;
  const { paths, maximum } = buildFinanceTrendPaths(summary.trend, chartWidth, chartHeight);
  const totals = financeSeries.map(item => ({ ...item, total: summary.trend.reduce((sum, point) => sum + point[item.key], 0) }));
  const hasActivity = maximum > 0;
  const range = `${summary.trendPeriod.dateFrom} to ${summary.trendPeriod.dateTo}`;
  return <MotiView from={{ opacity: reducedMotion ? 1 : 0, translateY: reducedMotion ? 0 : 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: reducedMotion ? 0 : 260 }} style={[styles.panel, styles.chartPanel]}>
    <View style={styles.panelHeading}><View><Text style={styles.title}>Confirmed M-Pesa movement</Text><Text style={styles.caption}>Daily completed provider records · {range}</Text></View><Text style={styles.badge}>KES</Text></View>
    <Text style={styles.caption}>Shows confirmed order receipts and top-ups alongside B2C payouts. Top-ups use their last recorded update date. These are activity records, not a bank balance or net cash position.</Text>
    {hasActivity ? <View accessible accessibilityRole="image" accessibilityLabel={`Daily M-Pesa activity from ${range}. ${totals.map(item => `${item.label}: ${formatCurrency(item.total)}`).join('. ')}`} style={styles.chartWrap}>
      <Text style={styles.axisLabel}>{formatCurrency(maximum)}</Text>
      <Svg width="100%" height={chartHeight + 16} viewBox={`0 0 ${chartWidth} ${chartHeight + 16}`} preserveAspectRatio="none">
        {[0, 0.5, 1].map(level => <Line key={level} x1="0" x2={chartWidth} y1={level * chartHeight + 8} y2={level * chartHeight + 8} stroke={operationsColors.border} strokeWidth="1" strokeDasharray={level === 1 ? undefined : '4 4'} />)}
        {financeSeries.map(item => <Path key={item.key} d={paths[item.key]} fill="none" stroke={item.color} strokeWidth={compact ? 3.5 : 3} strokeLinecap="round" strokeLinejoin="round" translateY={8} />)}
      </Svg>
      <View style={styles.axisDates}><Text style={styles.caption}>{summary.trendPeriod.dateFrom}</Text><Text style={styles.caption}>{summary.trendPeriod.dateTo}</Text></View>
    </View> : <Text style={styles.empty}>No confirmed provider movement in the chart period.</Text>}
    <View style={styles.legend}>{totals.map(item => <View key={item.key} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: item.color }]} /><View><Text style={styles.legendLabel}>{item.label}</Text><Text style={styles.legendAmount}>{formatCurrency(item.total)}</Text></View></View>)}</View>
  </MotiView>;
};

const BalanceRow = ({ label, total, held, color }: { label: string; total: number; held: number; color: string }) => {
  const available = Math.max(0, total - held);
  const availablePercent = total ? (available / total) * 100 : 0;
  return <View style={styles.balanceRow} accessible accessibilityLabel={`${label}: ${formatCurrency(total)} total, ${formatCurrency(available)} available, ${formatCurrency(held)} held`}>
    <View style={styles.balanceHeader}><Text style={styles.legendLabel}>{label}</Text><Text style={styles.legendAmount}>{formatCurrency(total)}</Text></View>
    <View style={styles.balanceTrack}><View style={[styles.balanceFill, { width: `${availablePercent}%`, backgroundColor: color }]} /></View>
    <Text style={styles.caption}>{formatCurrency(available)} available · {formatCurrency(held)} held</Text>
  </View>;
};

export const FinanceInsights = ({ summary }: { summary: AdminFinanceSummary }) => {
  const compact = useWindowDimensions().width < 720;
  const { walletBreakdown, payoutAging, paymentStatusCounts, payoutStatusCounts, topupStatusCounts } = summary;
  const paymentTotal = Object.values(paymentStatusCounts).reduce((sum, count) => sum + count, 0);
  const payoutTotal = Object.values(payoutStatusCounts).reduce((sum, count) => sum + count, 0);
  const paymentSegments = [
    { label: 'Succeeded', count: paymentStatusCounts.succeeded ?? 0, color: '#207F20' },
    { label: 'Awaiting confirmation', count: (paymentStatusCounts.initiated ?? 0) + (paymentStatusCounts.pending ?? 0), color: '#AC641A' },
    { label: 'Failed', count: paymentStatusCounts.failed ?? 0, color: '#B42318' },
    { label: 'Cancelled', count: paymentStatusCounts.cancelled ?? 0, color: '#66726B' },
  ];
  return <>
    <View style={[styles.insightGrid, compact && styles.insightGridCompact]}>
      <View style={styles.panel}><Text style={styles.title}>Current wallet position</Text><Text style={styles.caption}>Held funds are part of each total and cannot be withdrawn.</Text>
        <BalanceRow label="Shopping funds" total={walletBreakdown.shopping} held={walletBreakdown.shoppingHeld} color="#247FA6" />
        <BalanceRow label="Seller earnings" total={walletBreakdown.earnings} held={walletBreakdown.earningsHeld} color="#207F20" />
      </View>
      <View style={styles.panel}><Text style={styles.title}>Payout queue age</Text><Text style={styles.caption}>All current requested, processing and unknown B2C payouts.</Text>
        <View style={styles.ageGrid}>{[
          { label: 'Under 24 hours', value: payoutAging.under24h },
          { label: '24 to 72 hours', value: payoutAging.hours24To72 },
          { label: 'Over 72 hours', value: payoutAging.over72h },
        ].map(item => <View key={item.label} style={styles.ageCell}><Text style={styles.ageValue}>{item.value}</Text><Text style={styles.caption}>{item.label}</Text></View>)}</View>
        <Text style={styles.caption}>Unknown results remain reserved until verified.</Text>
      </View>
    </View>
    <View style={[styles.insightGrid, compact && styles.insightGridCompact]}>
      <View style={styles.panel}><Text style={styles.title}>Order payment outcomes</Text><Text style={styles.caption}>{paymentTotal} payments created in the selected period · current status</Text><View style={styles.segmentBar}>{paymentTotal ? paymentSegments.filter(item => item.count).map(item => <View key={item.label} style={{ flex: item.count, backgroundColor: item.color }} />) : null}</View><View style={styles.statusLegend}>{paymentSegments.map(item => <View key={item.label} style={styles.statusItem}><View style={[styles.legendDot, { backgroundColor: item.color }]} /><Text style={styles.caption}>{item.label} {item.count}</Text></View>)}</View></View>
      <View style={styles.panel}><Text style={styles.title}>Payout outcomes</Text><Text style={styles.caption}>{payoutTotal} payout requests across all dates · current status</Text><View style={styles.statusLegend}>{[
        { label: 'Requested', value: payoutStatusCounts.requested ?? 0 }, { label: 'Processing', value: payoutStatusCounts.processing ?? 0 },
        { label: 'Unknown', value: payoutStatusCounts.unknown ?? 0 }, { label: 'Succeeded', value: payoutStatusCounts.succeeded ?? 0 },
        { label: 'Failed', value: payoutStatusCounts.failed ?? 0 },
      ].map(item => <View key={item.label} style={styles.statusCell}><Text style={styles.ageValue}>{item.value}</Text><Text style={styles.caption}>{item.label}</Text></View>)}</View></View>
      <View style={styles.panel}><Text style={styles.title}>Top-up outcomes</Text><Text style={styles.caption}>Requests created in the selected period · current status</Text><View style={styles.statusLegend}>{[
        { label: 'Succeeded', value: topupStatusCounts.succeeded ?? 0 }, { label: 'Pending', value: topupStatusCounts.pending ?? 0 },
        { label: 'Unknown', value: topupStatusCounts.unknown ?? 0 }, { label: 'Failed', value: topupStatusCounts.failed ?? 0 },
      ].map(item => <View key={item.label} style={styles.statusCell}><Text style={styles.ageValue}>{item.value}</Text><Text style={styles.caption}>{item.label}</Text></View>)}</View></View>
    </View>
  </>;
};

const styles = StyleSheet.create({
  panel: { flex: 1, minWidth: 0, padding: 16, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 12, backgroundColor: operationsColors.panel, gap: 9 }, chartPanel: { marginBottom: 16 },
  panelHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  title: { color: operationsColors.ink, fontSize: 15, fontWeight: '800' }, caption: { color: operationsColors.muted, fontSize: 11, lineHeight: 17 },
  badge: { color: operationsColors.green, backgroundColor: operationsColors.greenSoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6, fontSize: 10, fontWeight: '800' },
  chartWrap: { paddingTop: 5 }, axisLabel: { color: operationsColors.muted, fontSize: 10, marginBottom: 4 }, axisDates: { flexDirection: 'row', justifyContent: 'space-between' },
  empty: { color: operationsColors.muted, paddingVertical: 35, textAlign: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginTop: 5 }, legendItem: { flexDirection: 'row', gap: 7, alignItems: 'center' }, legendDot: { width: 9, height: 9, borderRadius: 5 }, legendLabel: { color: operationsColors.ink, fontSize: 11, fontWeight: '700' }, legendAmount: { color: operationsColors.ink, fontSize: 13, fontWeight: '800' },
  insightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 }, insightGridCompact: { flexDirection: 'column' }, balanceRow: { marginTop: 8, gap: 5 }, balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, balanceTrack: { height: 9, borderRadius: 5, overflow: 'hidden', backgroundColor: operationsColors.border }, balanceFill: { height: '100%', borderRadius: 5 },
  ageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 7 }, ageCell: { flex: 1, minWidth: 90, padding: 10, borderRadius: 8, backgroundColor: operationsColors.canvas }, ageValue: { color: operationsColors.ink, fontSize: 20, fontWeight: '800' },
  segmentBar: { height: 11, borderRadius: 6, overflow: 'hidden', backgroundColor: operationsColors.border, flexDirection: 'row', marginTop: 5 }, statusLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5 }, statusItem: { flexDirection: 'row', alignItems: 'center', gap: 5 }, statusCell: { minWidth: 83, padding: 9, borderRadius: 8, backgroundColor: operationsColors.canvas },
});
