export type TierRule = {
  when: (value: number) => boolean;
  points: number;
};

/**
 * Returns the `points` of the first rule whose predicate matches, or 0.
 * Used by scoring functions to express threshold-based bonuses as a
 * declarative table instead of nested ternaries.
 */
export const tier = (value: number, rules: readonly TierRule[]): number =>
  rules.find((rule) => rule.when(value))?.points ?? 0;
