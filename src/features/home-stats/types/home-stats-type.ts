import { HomeStats } from "../schemas/home-stats-schema"

export type { HomeStats }

export interface HomeStatsResponse {
    success: boolean
    data: HomeStats
}
