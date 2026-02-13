import { FEAR_GREED, getFearGreedLabel } from '../constants';
import { logger } from '../logger';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertCategory = 'fear_greed' | 'holdings' | 'smart_money' | 'new_entrant';

export interface Alert {
  id: string;
  timestamp: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  check: (context: AlertContext) => Alert | null;
}

export interface FearGreedState {
  current: number;
  previous: number;
  label: string;
}

export interface HoldingState {
  instrumentId: number;
  symbol: string;
  currentHolders: number;
  previousHolders: number;
  currentRank: number;
  previousRank: number;
}

export interface AlertContext {
  fearGreed: FearGreedState;
  topHoldings: HoldingState[];
  previousTopHoldings: HoldingState[];
}

export class AlertService {
  private rules: AlertRule[] = [];
  private alertHistory: Alert[] = [];
  private maxHistorySize = 100;

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    this.rules = [
      this.createFearGreedThresholdRule(),
      this.createFearGreedZoneChangeRule(),
      this.createTopHoldingChangeRule(),
      this.createNewTop10EntrantRule(),
    ];
  }

  private createFearGreedThresholdRule(): AlertRule {
    return {
      id: 'fear_greed_threshold',
      name: 'Fear & Greed Threshold Crossing',
      enabled: true,
      check: (context: AlertContext): Alert | null => {
        const { current, previous } = context.fearGreed;
        const thresholds = [25, 50, 75];

        for (const threshold of thresholds) {
          const crossedUp = previous < threshold && current >= threshold;
          const crossedDown = previous >= threshold && current < threshold;

          if (crossedUp || crossedDown) {
            const direction = crossedUp ? 'above' : 'below';
            const severity: AlertSeverity =
              threshold === 25 || threshold === 75 ? 'warning' : 'info';

            return {
              id: `fg_threshold_${Date.now()}`,
              timestamp: new Date().toISOString(),
              category: 'fear_greed',
              severity,
              title: `Fear & Greed crossed ${direction} ${threshold}`,
              message: `Index moved from ${previous.toFixed(1)} to ${current.toFixed(1)}, crossing the ${threshold} threshold ${direction}.`,
              data: { current, previous, threshold, direction },
            };
          }
        }

        return null;
      },
    };
  }

  private createFearGreedZoneChangeRule(): AlertRule {
    return {
      id: 'fear_greed_zone',
      name: 'Fear & Greed Zone Change',
      enabled: true,
      check: (context: AlertContext): Alert | null => {
        const { current, previous } = context.fearGreed;
        const currentLabel = getFearGreedLabel(current);
        const previousLabel = getFearGreedLabel(previous);

        if (currentLabel !== previousLabel) {
          const isExtreme = currentLabel.includes('Extreme');
          const severity: AlertSeverity = isExtreme ? 'critical' : 'warning';

          return {
            id: `fg_zone_${Date.now()}`,
            timestamp: new Date().toISOString(),
            category: 'fear_greed',
            severity,
            title: `Market sentiment shifted to ${currentLabel}`,
            message: `Fear & Greed Index changed from ${previousLabel} (${previous.toFixed(1)}) to ${currentLabel} (${current.toFixed(1)}).`,
            data: { current, previous, currentLabel, previousLabel },
          };
        }

        return null;
      },
    };
  }

  private createTopHoldingChangeRule(): AlertRule {
    return {
      id: 'top_holding_change',
      name: 'Significant Holding Change',
      enabled: true,
      check: (context: AlertContext): Alert | null => {
        const significantChangeThreshold = 10; // 10% change
        const alerts: Alert[] = [];

        for (const holding of context.topHoldings) {
          if (holding.previousHolders === 0) continue;

          const changePercent =
            ((holding.currentHolders - holding.previousHolders) / holding.previousHolders) * 100;

          if (Math.abs(changePercent) >= significantChangeThreshold) {
            const direction = changePercent > 0 ? 'increased' : 'decreased';
            const severity: AlertSeverity = Math.abs(changePercent) >= 20 ? 'warning' : 'info';

            return {
              id: `holding_change_${holding.instrumentId}_${Date.now()}`,
              timestamp: new Date().toISOString(),
              category: 'holdings',
              severity,
              title: `${holding.symbol} holders ${direction} by ${Math.abs(changePercent).toFixed(1)}%`,
              message: `Holders of ${holding.symbol} changed from ${holding.previousHolders} to ${holding.currentHolders} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%).`,
              data: {
                symbol: holding.symbol,
                instrumentId: holding.instrumentId,
                currentHolders: holding.currentHolders,
                previousHolders: holding.previousHolders,
                changePercent,
              },
            };
          }
        }

        return null;
      },
    };
  }

  private createNewTop10EntrantRule(): AlertRule {
    return {
      id: 'new_top10_entrant',
      name: 'New Top 10 Holding',
      enabled: true,
      check: (context: AlertContext): Alert | null => {
        const previousTop10Ids = new Set(
          context.previousTopHoldings
            .filter(h => h.previousRank <= 10)
            .map(h => h.instrumentId)
        );

        for (const holding of context.topHoldings) {
          if (holding.currentRank <= 10 && !previousTop10Ids.has(holding.instrumentId)) {
            return {
              id: `new_top10_${holding.instrumentId}_${Date.now()}`,
              timestamp: new Date().toISOString(),
              category: 'new_entrant',
              severity: 'info',
              title: `${holding.symbol} entered top 10 holdings`,
              message: `${holding.symbol} is now ranked #${holding.currentRank} among popular investor holdings with ${holding.currentHolders} holders.`,
              data: {
                symbol: holding.symbol,
                instrumentId: holding.instrumentId,
                rank: holding.currentRank,
                holders: holding.currentHolders,
              },
            };
          }
        }

        return null;
      },
    };
  }

  checkAlerts(context: AlertContext): Alert[] {
    const newAlerts: Alert[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      try {
        const alert = rule.check(context);
        if (alert) {
          newAlerts.push(alert);
          this.addToHistory(alert);
          logger.info('Alert triggered', {
            ruleId: rule.id,
            alertId: alert.id,
            severity: alert.severity,
          });
        }
      } catch (err) {
        logger.error('Error checking alert rule', {
          ruleId: rule.id,
          error: String(err),
        });
      }
    }

    return newAlerts;
  }

  private addToHistory(alert: Alert): void {
    this.alertHistory.unshift(alert);
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.pop();
    }
  }

  getAlertHistory(limit: number = 20): Alert[] {
    return this.alertHistory.slice(0, limit);
  }

  getAlertsByCategory(category: AlertCategory, limit: number = 10): Alert[] {
    return this.alertHistory
      .filter(a => a.category === category)
      .slice(0, limit);
  }

  getAlertsBySeverity(severity: AlertSeverity, limit: number = 10): Alert[] {
    return this.alertHistory
      .filter(a => a.severity === severity)
      .slice(0, limit);
  }

  enableRule(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = true;
    }
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = false;
    }
  }

  getRules(): AlertRule[] {
    return this.rules.map(r => ({
      id: r.id,
      name: r.name,
      enabled: r.enabled,
      check: r.check,
    }));
  }

  addCustomRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  clearHistory(): void {
    this.alertHistory = [];
  }
}

export const alertService = new AlertService();
