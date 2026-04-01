import Dexie, { type EntityTable } from 'dexie';

export interface ContinuityNotes {
  summary: string;
  characters_present: string[];
  world_state: string;
  open_threads: string[];
  next_chapter_hint: string;
}

export interface Novel {
  id: string; // explicitly a UUID string now
  title: string;
  synopsis: string;
  genre: string;
  genres: string[];
  elements: string[];
  additionalNotes: string[];
  coverUrl?: string;
  covers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  novelId: string;
  chapterNumber: number;
  title: string;
  content: string;
  continuityNotes: ContinuityNotes | string;
  aiAuthor: string;
  aiCreatedDate: string;
  coverPrompt?: string;
  createdAt: string;
}

export interface WorldSetup {
  id: string;
  novelId: string;
  promptBase: string;
  charactersInfo: string;
  worldRules: string;
}

export interface DeletedNovel {
  id: string;
  deletedAt: string;
}

// New DB version to support string Primary Keys cleanly
const db = new Dexie('LightNovelDB_v2') as Dexie & {
  novels: EntityTable<Novel, 'id'>;
  chapters: EntityTable<Chapter, 'id'>;
  worldSetups: EntityTable<WorldSetup, 'id'>;
  deletedNovels: EntityTable<DeletedNovel, 'id'>;
};

// Primary keys without ++ meaning we supply the ID
db.version(1).stores({
  novels: 'id, title, updatedAt',
  chapters: 'id, novelId, chapterNumber',
  worldSetups: 'id, novelId',
  deletedNovels: 'id'
});

export { db };
