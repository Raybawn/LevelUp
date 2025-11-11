import Dexie, { Table } from "dexie";

export interface User {
  id: string;
  gold: number;
}

export class LevelUpDB extends Dexie {
  users!: Table<User>;

  constructor() {
    super("levelup-db");
    this.version(1).stores({ users: "id" });
  }
}

export interface Quest {
  id: number;
  title: string;
  description: string;
  type: "Daily" | "Weekly";
  class: string; // Made class non-optional to align with usage
  baseXP: number;
  baseGold: number;
  enabled: boolean;
  scaling: boolean;
  level1Requirements?: string;
  level100Requirements?: string;
  requirement?: string;
}

class QuestDatabase extends Dexie {
  quests: Dexie.Table<Quest, number>;

  constructor() {
    super("QuestDatabase");
    this.version(1).stores({
      quests: "++id,title,type,class,enabled,scaling", // Indexed fields
    });
    this.quests = this.table("quests");
  }
}

export const db = new QuestDatabase();