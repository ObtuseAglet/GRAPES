import type {
  BusEnvelope,
  ProtectionMode,
  Result,
  SharedReport,
  SitePolicy,
  ThreatEvent,
} from './types';
import type { StorageStateV2 } from '../storage/schema';
import type { EditorRule } from '../../features/editor/rules';

export type CoreRequest =
  | (BusEnvelope & { type: 'CORE_GET_STATE' })
  | (BusEnvelope & { type: 'CORE_SET_MODE'; mode: ProtectionMode })
  | (BusEnvelope & { type: 'CORE_SET_SITE_POLICY'; domain: string; policy: SitePolicy })
  | (BusEnvelope & { type: 'CORE_SET_LOGGING'; enabled: boolean })
  | (BusEnvelope & { type: 'CORE_GET_TAB_THREATS'; tabId: number })
  | (BusEnvelope & { type: 'CORE_GET_LOGS' })
  | (BusEnvelope & { type: 'CORE_CLEAR_LOGS' })
  | (BusEnvelope & { type: 'CORE_SET_EDITOR_RULES'; rules: EditorRule[] })
  | (BusEnvelope & { type: 'CORE_SET_SHARING_CONSENT'; enabled: boolean })
  | (BusEnvelope & { type: 'CORE_FLUSH_SHARING_QUEUE' })
  | (BusEnvelope & { type: 'CORE_GET_SHARING_STATUS' })
  | (BusEnvelope & { type: 'CORE_REPORT_THREAT'; event: ThreatEvent })
  | (BusEnvelope & { type: 'CORE_QUEUE_REPORT'; report: SharedReport });

export type CoreResponse =
  | Result<StorageStateV2>
  | Result<{ success: true }>
  | Result<ThreatEvent[]>
  | Result<SharedReport[]>
  | Result<{ consent: boolean; queueLength: number; lastSyncAt: number | null }>;
