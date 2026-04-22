export interface CreateTrustedContactInput {
  personId: string;
  accessTier: 'INDEX_ONLY' | 'VIEW_GENERAL' | 'EXECUTOR' | 'EMERGENCY';
  triggerType?: 'CHECK_IN_MISSED' | 'DEATH_CERTIFIED' | 'MANUAL_UNLOCK' | 'EMERGENCY_REQUESTED';
  waitingPeriodDays?: number;
  notifyOnTrigger?: boolean;
  letterToContact?: string;
}
