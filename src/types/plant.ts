import type { HubStatusValue, MeasurementStatusValue, SensorStatusValue, WifiStatusValue } from '../api/schemas'

export type AttentionLevel = 'now' | 'ok' | 'soon'
export type MeasurementStatus = MeasurementStatusValue

const ATTENTION: Record<MeasurementStatus, AttentionLevel> = {
  no_data: 'ok', too_low: 'now', low: 'soon', perfect: 'ok', high: 'soon', too_high: 'now',
}
const ATTENTION_RANK: Record<AttentionLevel, number> = { now: 0, soon: 1, ok: 2 }

export interface Plant {
  attentionLevel: AttentionLevel
  attentionRank: number
  common_name?: null | string
  hubId?: string
  hubLastReached?: null | string
  hubLastSync?: null | string
  hubName?: string
  hubStatus?: HubStatusValue
  id: number | string
  light_status?: MeasurementStatus | null
  moisture_status?: MeasurementStatus | null
  nickname?: null | string
  nutrients_status?: MeasurementStatus | null
  origin_path?: null | string
  plant_thumb_path?: null | string
  salinity_status?: MeasurementStatus | null
  scientific_name?: null | string
  sensorBatteryLevel?: null | number
  sensorBatteryLow?: boolean
  sensorId?: string
  sensorLastSeen?: null | string
  sensorStatus?: SensorStatusValue
  temperature_status?: MeasurementStatus | null
  thumb_path?: null | string
  wifi_status?: WifiStatusValue
}

type PlantInput = Omit<Plant, 'attentionLevel' | 'attentionRank'> & {
  hub?: null | { hub_id?: string; hub_name?: string; reached_hub_at?: null | string; received_data_at?: null | string; status?: HubStatusValue }
  sensor?: null | { id?: string; is_battery_low?: boolean; received_data_at?: null | string; status?: SensorStatusValue }
}

export function createPlant(data: PlantInput): Plant {
  const attentionLevel = ATTENTION[data.moisture_status ?? 'no_data']
  return {
    ...data,
    attentionLevel,
    attentionRank: ATTENTION_RANK[attentionLevel],
    hubId: data.hub?.hub_id ?? undefined,
    hubLastReached: data.hub?.reached_hub_at ?? undefined,
    hubLastSync: data.hub?.received_data_at ?? undefined,
    hubName: data.hub?.hub_name ?? undefined,
    hubStatus: data.hub?.status ?? undefined,
    sensorBatteryLow: data.sensor?.is_battery_low ?? undefined,
    sensorId: data.sensor?.id ?? undefined,
    sensorLastSeen: data.sensor?.received_data_at ?? undefined,
    sensorStatus: data.sensor?.status ?? undefined,
  }
}
