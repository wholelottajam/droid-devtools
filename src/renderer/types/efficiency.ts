/**
 * Token efficiency suggestion types.
 * Used by the tokenEfficiency analyzer and EfficiencyInsightsPanel component.
 */

export type EfficiencySeverity = 'high' | 'medium' | 'low';
export type EfficiencyCategory = 'model' | 'workflow' | 'project-setup' | 'prompting';

export interface EfficiencySuggestion {
  id: string;
  severity: EfficiencySeverity;
  title: string;
  description: string;
  category: EfficiencyCategory;
  /** e.g. "~40% fewer tokens" */
  estimatedSavings?: string;
}
