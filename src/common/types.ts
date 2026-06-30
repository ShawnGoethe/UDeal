export interface LevelDetail {
  times?: number | string;
  period?: string;
  amount?: string;
  note?: string;
  condition?: string;
  discount?: string;
  scope?: string;
  gift?: string;
  rate?: string;
  exchange?: string;
  quota?: string;
}

export interface Benefit {
  id: string;
  name: string;
  category: string;
  tags: string[];
  type: "free" | "paid";
  description: string;
  level_details: Record<string, LevelDetail>;
  redeem_time: string;
  limit: string | null;
  tips: string;
  active: boolean;
  last_updated: string;
}

export interface Platform {
  platform: string;
  platform_id: string;
  levels: string[];
  benefits: Benefit[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  keywords: string[];
}

export interface Tag {
  id: string;
  name: string;
  icon: string;
}

export interface UserMembership {
  platform_id: string;
  level: string;
  since: string | null;
  expires: string | null;
  notes: string;
}

export interface UserData {
  memberships: UserMembership[];
  preferences: {
    priority_categories: string[];
    notify_expiring: boolean;
  };
}

export interface SearchResult {
  benefit: Benefit;
  platform: string;
  platform_id: string;
  matched_keywords: string[];
}
