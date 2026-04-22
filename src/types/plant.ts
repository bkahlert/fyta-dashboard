export interface FytaApiResponse {
  gardens?: { name: string; plants?: Plant[] }[]
  plants?: Plant[]
}

export interface Plant {
  _garden?: string
  common_name?: string
  id: number | string
  light_status?: SensorStatus
  moisture_status?: SensorStatus
  nickname?: string
  nutrients_status?: SensorStatus
  plant_thumb_path?: string
  salinity_status?: SensorStatus
  scientific_name?: string
  temperature_status?: SensorStatus
  thumb_path?: string
}

export type SensorStatus = 0 | 1 | 2 | 3 | 4 | 5
