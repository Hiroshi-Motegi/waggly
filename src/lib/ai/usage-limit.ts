// 後方互換性のためエクスポートを維持（既存のimportが壊れないように）
export {
  incrementUsageCounter,
  decrementUsageCounter,
  getUsageCounts,
  getUserPlanLimits,
} from "./usage-counter";
