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

export const db = new LevelUpDB();