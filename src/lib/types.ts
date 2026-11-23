export interface Edition {
  id: number;
  name: string;
  year: number;
  is_active: number;
  start_date?: string | null;
  lock_date?: string | null;
  max_bets_per_user: number;
}

export interface User {
  id: number;
  username: string;
  display_name: string;
  pin?: string;
  is_admin?: number;
}

export interface Candidate {
  id: number;
  full_name: string;
  birth_date?: string | null;
  estimated_age: number;
  category: string;
  wikipedia_url?: string | null;
  notes?: string | null;
  is_deceased?: number;
  death_date?: string | null;
  age_at_death?: number | null;
  cause_or_source?: string | null;
  bettor_count?: number;
  bettors_list?: string;
}

export interface Bet {
  id: number;
  edition_id: number;
  user_id: number;
  candidate_id: number;
  is_captain: number;
  points_awarded: number;
  is_exclusive: number;
  is_first_blood: number;
  full_name?: string;
  estimated_age?: number;
  category?: string;
  wikipedia_url?: string;
  is_deceased?: number;
  death_date?: string;
  age_at_death?: number;
  cause_or_source?: string;
}

export interface LeaderboardEntry {
  user_id: number;
  display_name: string;
  total_bets: number;
  hits_count: number;
  captain_hits: number;
  total_points: number;
}

export interface DeathRecord {
  candidate_id: number;
  full_name: string;
  category: string;
  death_date: string;
  age_at_death: number;
  cause_or_source?: string;
  bettor_count: number;
  bettors: string;
  total_points_given: number;
  is_first_blood: number;
}

export interface PointsBreakdown {
  age_at_death: number;
  base_points: number;
  is_captain: boolean;
  captain_points: number;
  is_exclusive: boolean;
  bonus_exclusive: number;
  is_first_blood: boolean;
  bonus_first_blood: number;
  bonus_youth: number;
  bonus_centenarian: number;
  total_points: number;
}
