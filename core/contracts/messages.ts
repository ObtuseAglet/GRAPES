import type { StorageState } from '../storage/schema';
import type {
  BusEnvelope,
  ContributionReport,
  ContributionStatus,
  ProtectionMode,
  Result,
  SitePolicy,
  ThreatEvent,
} from './types';

export type CoreRequest =
  | (BusEnvelope & { type: 'CORE_GET_STATE' })
  | (BusEnvelope & { type: 'CORE_SET_MODE'; mode: ProtectionMode })
  | (BusEnvelope & { type: 'CORE_SET_SITE_POLICY'; domain: string; policy: SitePolicy })
  | (BusEnvelope & { type: 'CORE_SET_LOGGING'; enabled: boolean })
  | (BusEnvelope & { type: 'CORE_GET_TAB_THREATS'; tabId: number })
  | (BusEnvelope & { type: 'CORE_GET_LOGS' })
  | (BusEnvelope & { type: 'CORE_CLEAR_LOGS' })
  | (BusEnvelope & { type: 'CORE_REPORT_THREAT'; event: ThreatEvent })
  | (BusEnvelope & { type: 'CORE_QUEUE_CONTRIBUTION'; report: ContributionReport })
  | (BusEnvelope & { type: 'CORE_SET_CONTRIBUTION_CONSENT'; enabled: boolean })
  | (BusEnvelope & { type: 'CORE_FLUSH_CONTRIBUTION_QUEUE' })
  | (BusEnvelope & { type: 'CORE_GET_CONTRIBUTION_STATUS' })
  | (BusEnvelope & { type: 'CORE_SET_CONTRIBUTION_ENDPOINT'; endpoint: string });

export type CoreResponse =
  | Result<StorageState>
  | Result<{ success: true }>
  | Result<ThreatEvent[]>
  | Result<ContributionReport[]>
  | Result<ContributionStatus>;
