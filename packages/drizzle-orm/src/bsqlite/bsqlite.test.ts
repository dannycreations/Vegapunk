import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { Adapter, BetterSQLite3Database, Database, drizzle } from '.';

const officesTable = sqliteTable('offices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  location: text('location'),
});
type Office = typeof officesTable.$inferSelect;
type InsertOffice = typeof officesTable.$inferInsert;

const usersTable = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').unique(),
  age: integer('age'),
  role: text('role').default('user'),
  officeId: integer('office_id').references(() => officesTable.id, { onDelete: 'cascade' }),
  bio: text('bio'),
});
type User = typeof usersTable.$inferSelect;
type InsertUser = typeof usersTable.$inferInsert;

const postsTable = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content'),
  userId: integer('user_id').references(() => usersTable.id, { onDelete: 'cascade' }),
  views: integer('views').default(0),
});
type Post = typeof postsTable.$inferSelect;
type InsertPost = typeof postsTable.$inferInsert;

const noIdTable = sqliteTable('no_id_table', {
  pk_col: integer('pk_col').primaryKey(),
  data: text('data'),
});

const uniquePairTable = sqliteTable(
  'unique_pair_table',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    valA: text('val_a'),
    valB: text('val_b'),
    valC: text('val_c'),
  },
  (table) => ({
    abUnique: unique('ab_unique_constraint').on(table.valA, table.valB),
  }),
);
type UniquePair = typeof uniquePairTable.$inferSelect;
type InsertUniquePair = typeof uniquePairTable.$inferInsert;

const sampleOffices: Array<Omit<InsertOffice, 'id'>> = [
  { name: 'HQ', location: 'New York' },
  { name: 'Branch West', location: 'San Francisco' },
  { name: 'Branch East', location: 'Boston' },
  { name: 'Remote Hub', location: null },
];

const sampleUsers: Array<Omit<InsertUser, 'id'>> = [
  { name: 'Alice', email: 'alice@example.com', age: 30, role: 'admin', officeId: 1, bio: 'Software Engineer' },
  { name: 'Bob', email: 'bob@example.com', age: 24, role: 'user', officeId: 2, bio: 'Product Manager' },
  { name: 'Charlie', email: 'charlie@example.com', age: 35, role: 'user', officeId: 1, bio: 'Data Scientist' },
  { name: 'David', email: 'david@example.com', age: 28, role: 'user', bio: 'UX Designer', officeId: null },
  { name: 'Eve', email: 'eve@example.com', age: 30, role: 'manager', officeId: 2, bio: null },
  { name: 'Mallory', email: 'mallory@example.com', age: 40, role: 'user', officeId: 3, bio: 'Security Analyst, also a user' },
  { name: 'Trent', email: 'trent@example.com', age: null, role: 'user', officeId: 3, bio: 'Intern' },
  { name: 'Ursula User', email: 'ursula@example.com', age: 29, role: 'user', officeId: 1, bio: 'Another engineer' },
];

const samplePosts: Array<Omit<InsertPost, 'id'>> = [
  { title: 'Hello World', content: 'First post content', userId: 1, views: 100 },
  { title: 'SQLite Tips', content: 'Some tips for SQLite', userId: 1, views: 50 },
  { title: 'Product Updates', content: 'New features launched', userId: 2, views: 200 },
  { title: 'Data Analysis', content: 'Analyzing trends', userId: 3, views: 75 },
  { title: 'Unpublished Draft', content: 'Work in progress', userId: null, views: 0 },
  { title: 'Tech Deep Dive', content: 'Exploring advanced topics', userId: 1, views: 120 },
];

let db: BetterSQLite3Database;
let client: Database.Database;

let officeAdapter: Adapter<typeof officesTable, Office, InsertOffice>;
let userAdapter: Adapter<typeof usersTable, User, InsertUser>;
let postAdapter: Adapter<typeof postsTable, Post, InsertPost>;
let uniquePairAdapter: Adapter<typeof uniquePairTable, UniquePair, InsertUniquePair>;

beforeAll(() => {
  client = new Database(':memory:');
  db = drizzle(client);
});

beforeEach(() => {
  client.exec(`
    DROP TABLE IF EXISTS posts;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS offices;
    DROP TABLE IF EXISTS no_id_table;
    DROP TABLE IF EXISTS unique_pair_table;

    CREATE TABLE offices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      location TEXT
    );
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      age INTEGER,
      role TEXT DEFAULT 'user',
      office_id INTEGER,
      bio TEXT,
      FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
    );
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      user_id INTEGER,
      views INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE no_id_table (pk_col INTEGER PRIMARY KEY, data TEXT);
    CREATE TABLE unique_pair_table (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      val_a TEXT,
      val_b TEXT,
      val_c TEXT,
      UNIQUE(val_a, val_b)
    );
  `);

  officeAdapter = new Adapter(db, officesTable, true);
  userAdapter = new Adapter(db, usersTable, true);
  postAdapter = new Adapter(db, postsTable, true);
  uniquePairAdapter = new Adapter(db, uniquePairTable, true);

  const officeInsertResult = officeAdapter.insert(sampleOffices);
  if (officeInsertResult.isErr()) throw officeInsertResult.unwrapErr();

  const userInsertResult = userAdapter.insert(sampleUsers);
  if (userInsertResult.isErr()) throw userInsertResult.unwrapErr();

  const postInsertResult = postAdapter.insert(samplePosts);
  if (postInsertResult.isErr()) throw postInsertResult.unwrapErr();
});

afterAll(() => {
  client.close();
});

describe('Adapter constructor()', () => {
  test('should instantiate correctly with a valid Drizzle table schema having an "id" column', () => {
    expect(() => new Adapter(db, usersTable)).not.toThrow();
  });

  test('should throw an error if the table schema does not have an "id" column', () => {
    const action = () => new Adapter(db, noIdTable);
    expect(action).toThrow(/^Table "no_id_table" must have a primary key "id"\.?$/);
  });
});

describe('Adapter find()', () => {
  test('should return all records with all columns if no filter or options are provided', () => {
    const result = userAdapter.find();
    expect(result.isOk()).toBe(true);
    const users = result.unwrap();
    expect(users).toHaveLength(sampleUsers.length);
    const sampleUserKeys = Object.keys(usersTable);
    users.forEach((user) => {
      sampleUserKeys.forEach((key) => expect(user).toHaveProperty(key));
    });
  });

  test('should return empty array when finding on an empty table', () => {
    client.exec('DELETE FROM offices;');
    const result = officeAdapter.find();
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual([]);
  });

  describe('filter options', () => {
    test('equality: should find users by name', () => {
      const aliceResult = userAdapter.findOne({ email: 'alice@example.com' });
      expect(aliceResult.isOk()).toBe(true);
      const alice = aliceResult.unwrap();
      expect(alice).not.toBeNull();
      const result = userAdapter.find({ name: 'Alice' });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual([expect.objectContaining({ id: alice!.id, name: 'Alice' })]);
    });

    test('equality: should find users by age', () => {
      const usersAge30 = sampleUsers.filter((u) => u.age === 30);
      const result = userAdapter.find({ age: 30 });
      expect(result.isOk()).toBe(true);
      const foundUsers = result.unwrap();
      expect(foundUsers).toHaveLength(usersAge30.length);
      foundUsers.forEach((user) => expect(user.age).toBe(30));
    });

    test('equality: should find users with null bio (field IS NULL)', () => {
      const usersNullBio = sampleUsers.filter((u) => u.bio === null);
      const result = userAdapter.find({ bio: null });
      expect(result.isOk()).toBe(true);
      const foundUsers = result.unwrap();
      expect(foundUsers).toHaveLength(usersNullBio.length);
      foundUsers.forEach((user) => expect(user.bio).toBeNull());
    });

    test('comparison ($ne): should find users not named Alice (field <> value)', () => {
      const result = userAdapter.find({ name: { $ne: 'Alice' } });
      expect(result.isOk()).toBe(true);
      const users = result.unwrap();
      expect(users.every((u) => u.name !== 'Alice')).toBe(true);
      expect(users).toHaveLength(sampleUsers.length - 1);
    });

    test('comparison ($ne): should find users with non-null bio (field IS NOT NULL)', () => {
      const usersNonNullBioCount = sampleUsers.filter((u) => u.bio !== null).length;
      const result = userAdapter.find({ bio: { $ne: null } });
      expect(result.isOk()).toBe(true);
      const foundUsers = result.unwrap();
      expect(foundUsers).toHaveLength(usersNonNullBioCount);
      foundUsers.forEach((user) => expect(user.bio).not.toBeNull());
    });

    test('comparison ($gt): should find users older than 30 (field > value)', () => {
      const usersOlderThan30Count = sampleUsers.filter((u) => u.age !== null && u.age! > 30).length;
      const result = userAdapter.find({ age: { $gt: 30 } });
      expect(result.isOk()).toBe(true);
      const foundUsers = result.unwrap();
      expect(foundUsers).toHaveLength(usersOlderThan30Count);
      foundUsers.forEach((user) => expect(user.age).toBeGreaterThan(30));
    });

    test('comparison ($gt): age: {$gt: null} should yield empty (SQLite: field > NULL is UNKNOWN/FALSE)', () => {
      const result = userAdapter.find({ age: { $gt: null } });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(0);
    });

    test('comparison ($gte): should find users age 30 or older (field >= value)', () => {
      const usersGte30Count = sampleUsers.filter((u) => u.age !== null && u.age! >= 30).length;
      const result = userAdapter.find({ age: { $gte: 30 } });
      expect(result.isOk()).toBe(true);
      const foundUsers = result.unwrap();
      expect(foundUsers).toHaveLength(usersGte30Count);
      foundUsers.forEach((user) => expect(user.age).toBeGreaterThanOrEqual(30));
    });

    test('comparison ($lt): should find users younger than 30 (field < value)', () => {
      const usersYoungerThan30Count = sampleUsers.filter((u) => u.age !== null && u.age! < 30).length;
      const result = userAdapter.find({ age: { $lt: 30 } });
      expect(result.isOk()).toBe(true);
      const foundUsers = result.unwrap();
      expect(foundUsers).toHaveLength(usersYoungerThan30Count);
      foundUsers.forEach((user) => expect(user.age).toBeLessThan(30));
    });

    test('comparison ($lte): should find users age 30 or younger (field <= value)', () => {
      const usersLte30Count = sampleUsers.filter((u) => u.age !== null && u.age! <= 30).length;
      const result = userAdapter.find({ age: { $lte: 30 } });
      expect(result.isOk()).toBe(true);
      const foundUsers = result.unwrap();
      expect(foundUsers).toHaveLength(usersLte30Count);
      foundUsers.forEach((user) => expect(user.age).toBeLessThanOrEqual(30));
    });

    test('string ($like): should find users with name starting with A (LIKE pattern)', () => {
      const result = userAdapter.find({ name: { $like: 'A%' } });
      expect(result.isOk()).toBe(true);
      const users = result.unwrap();
      expect(users.every((u) => u.name.startsWith('A'))).toBe(true);
      expect(users).toHaveLength(sampleUsers.filter((u) => u.name.startsWith('A')).length);
    });

    test('string ($nlike): should find users with name not starting with A (NOT LIKE pattern)', () => {
      const result = userAdapter.find({ name: { $nlike: 'A%' } });
      expect(result.isOk()).toBe(true);
      const users = result.unwrap();
      expect(users.every((u) => !u.name.startsWith('A'))).toBe(true);
      expect(users).toHaveLength(sampleUsers.filter((u) => !u.name.startsWith('A')).length);
    });

    test('string ($glob): should find users with name ending with e (GLOB pattern)', () => {
      const result = userAdapter.find({ name: { $glob: '*e' } });
      expect(result.isOk()).toBe(true);
      const names = result.unwrap().map((u) => u.name);
      const expectedNames = sampleUsers.filter((u) => u.name.endsWith('e')).map((u) => u.name);
      expect(names.sort()).toEqual(expect.arrayContaining(expectedNames.sort()));
      expect(names).toHaveLength(expectedNames.length);
    });

    test('string ($nglob): should find users with name not ending with e (NOT GLOB pattern)', () => {
      const result = userAdapter.find({ name: { $nglob: '*e' } });
      expect(result.isOk()).toBe(true);
      const users = result.unwrap();
      expect(users.every((u) => !u.name.endsWith('e'))).toBe(true);
      expect(users).toHaveLength(sampleUsers.filter((u) => !u.name.endsWith('e')).length);
    });

    test('array ($in): should find users with specific roles (field IN (values))', () => {
      const targetRoles = ['admin', 'manager'];
      const expectedUsersCount = sampleUsers.filter((u) => u.role !== null && targetRoles.includes(u.role!)).length;
      const result = userAdapter.find({ role: { $in: targetRoles } });
      expect(result.isOk()).toBe(true);
      const foundUsers = result.unwrap();
      expect(foundUsers).toHaveLength(expectedUsersCount);
      foundUsers.forEach((user) => expect(targetRoles).toContain(user.role));
    });

    test('array ($in): $in with empty array should return no results (SQLite: field IN () is FALSE)', () => {
      const result = userAdapter.find({ role: { $in: [] } });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(0);
    });

    test('array ($nin): should find users not in specific roles (field NOT IN (values))', () => {
      const excludedRoles = ['admin', 'manager'];
      const expectedUsersCount = sampleUsers.filter((u) => u.role !== null && !excludedRoles.includes(u.role!)).length;
      const result = userAdapter.find({ role: { $nin: excludedRoles } });
      expect(result.isOk()).toBe(true);
      const foundUsers = result.unwrap();
      expect(foundUsers).toHaveLength(expectedUsersCount);
      foundUsers.forEach((user) => expect(excludedRoles).not.toContain(user.role));
    });

    test('array ($nin): $nin with empty array should return all results (SQLite: field NOT IN () is TRUE)', () => {
      const result = userAdapter.find({ role: { $nin: [] } });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(sampleUsers.length);
    });

    test('null check ($null: true): should find users with null age (field IS NULL)', () => {
      const usersNullAgeCount = sampleUsers.filter((u) => u.age === null).length;
      const result = userAdapter.find({ age: { $null: true } });
      expect(result.isOk()).toBe(true);
      const foundUsers = result.unwrap();
      expect(foundUsers).toHaveLength(usersNullAgeCount);
      foundUsers.forEach((u) => expect(u.age).toBeNull());
    });

    test('null check ($null: false): should find users with non-null age (field IS NOT NULL)', () => {
      const usersNonNullAgeCount = sampleUsers.filter((u) => u.age !== null).length;
      const result = userAdapter.find({ age: { $null: false } });
      expect(result.isOk()).toBe(true);
      const foundUsers = result.unwrap();
      expect(foundUsers).toHaveLength(usersNonNullAgeCount);
      foundUsers.forEach((u) => expect(u.age).not.toBeNull());
    });

    test('logical ($and): find users with role "user" AND age 24', () => {
      const bob = sampleUsers.find((u) => u.email === 'bob@example.com')!;
      const result = userAdapter.find({ $and: [{ role: 'user' }, { age: 24 }] });
      expect(result.isOk()).toBe(true);
      const foundUsers = result.unwrap();
      expect(foundUsers).toHaveLength(1);
      expect(foundUsers[0]).toEqual(expect.objectContaining({ name: bob.name, email: bob.email }));
    });

    test('logical ($and): with empty array should return all users (evaluates to TRUE)', () => {
      const result = userAdapter.find({ $and: [] });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(sampleUsers.length);
    });

    test('logical ($or): find users with role "admin" OR age < 25', () => {
      const expectedUsersCount = sampleUsers.filter((u) => u.role === 'admin' || (u.age !== null && u.age! < 25)).length;
      const result = userAdapter.find({ $or: [{ role: 'admin' }, { age: { $lt: 25 } }] });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(expectedUsersCount);
    });

    test('logical ($or): with empty array should return no users (evaluates to FALSE)', () => {
      const result = userAdapter.find({ $or: [] });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(0);
    });

    test('logical ($not): find users NOT (role "admin")', () => {
      const expectedUsersCount = sampleUsers.filter((u) => u.role !== 'admin').length;
      const result = userAdapter.find({ $not: { role: 'admin' } });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(expectedUsersCount);
    });

    test('logical ($not { $eq: value }): with nullable column, excludes rows where column is NULL', () => {
      const expectedUsers = sampleUsers.filter((u) => u.age !== null && u.age !== 30);
      const result = userAdapter.find({ age: { $not: { $eq: 30 } } });
      expect(result.isOk()).toBe(true);
      const foundUsers = result.unwrap();
      expect(foundUsers).toHaveLength(expectedUsers.length);
      foundUsers.forEach((u) => {
        expect(u.age).not.toBeNull();
        expect(u.age).not.toBe(30);
      });
    });

    test('logical ($not { $eq: null }): is equivalent to { $ne: null } or { $null: false }', () => {
      const expectedUsers = sampleUsers.filter((u) => u.age !== null);
      const result = userAdapter.find({ age: { $not: { $eq: null } } });
      expect(result.isOk()).toBe(true);
      const foundUsers = result.unwrap();
      expect(foundUsers).toHaveLength(expectedUsers.length);
      foundUsers.forEach((u) => expect(u.age).not.toBeNull());

      const resultNe = userAdapter.find({ age: { $ne: null } });
      expect(resultNe.isOk()).toBe(true);
      expect(
        resultNe
          .unwrap()
          .map((u) => u.id)
          .sort(),
      ).toEqual(foundUsers.map((u) => u.id).sort());
    });

    test('logical ($nand): users NOT (role "user" AND age 30)', () => {
      const expectedUsersCount = sampleUsers.filter((u) => {
        return u.age != null && !(u.role === 'user' && u.age === 30);
      }).length;
      const result = userAdapter.find({ $nand: [{ role: 'user' }, { age: 30 }] });
      expect(result.isOk()).toBe(true);
      const foundUsers = result.unwrap();
      expect(foundUsers).toHaveLength(expectedUsersCount);
      foundUsers.forEach((u) => {
        expect(u.role === 'user' && u.age === 30).toBe(false);
      });
    });

    test('logical ($nand): with empty array should return no users (evaluates to NOT(TRUE) -> FALSE)', () => {
      const result = userAdapter.find({ $nand: [] });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(0);
    });

    test('logical ($nor): users NOT (role "admin" OR age < 25)', () => {
      const expectedUsersCount = sampleUsers.filter((u) => {
        return u.age != null && !(u.role === 'admin' || u.age < 25);
      }).length;

      const result = userAdapter.find({ $nor: [{ role: 'admin' }, { age: { $lt: 25 } }] });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(expectedUsersCount);
    });

    test('logical ($nor): with empty array should return all users (evaluates to NOT(FALSE) -> TRUE)', () => {
      const result = userAdapter.find({ $nor: [] });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(sampleUsers.length);
    });

    test('filter with unknown column should result in SQL condition "false" by Adapter logic, yielding 0 results', () => {
      const result = userAdapter.find({ unknownColumn: 'test' } as unknown as Partial<User>);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(0);
    });
  });

  describe('query options', () => {
    test('select: should return only specified columns (name, email), plus id implicitly', () => {
      const result = userAdapter.find({}, { select: { name: 1, email: 1 } });
      expect(result.isOk()).toBe(true);
      const users = result.unwrap();
      expect(users.length).toBeGreaterThan(0);
      users.forEach((user) => {
        expect(Object.keys(user).sort()).toEqual(['id', 'name', 'email'].sort());
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('email');
      });
    });

    test('select: should exclude specified columns (bio: 0), id still included', () => {
      const result = userAdapter.find({}, { select: { name: 1, email: 1, bio: 0 } });
      expect(result.isOk()).toBe(true);
      const users = result.unwrap();
      expect(users.length).toBeGreaterThan(0);
      users.forEach((user) => {
        expect(Object.keys(user).sort()).toEqual(['id', 'name', 'email'].sort());
        expect(user).not.toHaveProperty('bio');
      });
    });

    test('select: should exclude id if explicitly set to 0', () => {
      const result = userAdapter.find({}, { select: { id: 0, name: 1 } });
      expect(result.isOk()).toBe(true);
      const users = result.unwrap();
      expect(users.length).toBeGreaterThan(0);
      users.forEach((user) => {
        expect(Object.keys(user).sort()).toEqual(['name'].sort());
        expect(user).not.toHaveProperty('id');
      });
    });

    test('select: empty select object should return default columns (all from primary table)', () => {
      const result = userAdapter.find({}, { select: {} });
      expect(result.isOk()).toBe(true);
      const users = result.unwrap();
      expect(users.length).toBeGreaterThan(0);
      const sampleUserKeys = Object.keys(usersTable);
      users.forEach((user) => {
        sampleUserKeys.forEach((key) => expect(user).toHaveProperty(key));
        expect(Object.keys(user).length).toBe(sampleUserKeys.length);
      });
    });

    test('limit: should return only the specified number of records', () => {
      const result = userAdapter.find({}, { limit: 2 });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(2);
    });

    test('limit: limit 0 should return no records', () => {
      const result = userAdapter.find({}, { limit: 0 });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(0);
    });

    test('offset: should skip the specified number of records', () => {
      const allUsersResult = userAdapter.find({}, { order: { id: 'asc' } });
      expect(allUsersResult.isOk()).toBe(true);
      const allUsers = allUsersResult.unwrap();

      const offset = 2;
      const result = userAdapter.find({}, { offset, order: { id: 'asc' } });
      expect(result.isOk()).toBe(true);
      const users = result.unwrap();
      expect(users).toHaveLength(sampleUsers.length - offset);
      if (allUsers.length > offset && users.length > 0) {
        expect(users[0].id).toBe(allUsers[offset].id);
      }
    });

    test('offset: large offset should return empty array', () => {
      const result = userAdapter.find({}, { offset: 1000 });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(0);
    });

    test('limit and offset: should correctly apply both limit and offset', () => {
      const allUsersResult = userAdapter.find({}, { order: { id: 'asc' } });
      expect(allUsersResult.isOk()).toBe(true);
      const allUsers = allUsersResult.unwrap();

      const limit = 2;
      const offset = 1;
      const result = userAdapter.find({}, { limit, offset, order: { id: 'asc' } });
      expect(result.isOk()).toBe(true);
      const users = result.unwrap();
      expect(users).toHaveLength(limit);
      if (allUsers.length >= offset + limit && users.length > 0) {
        expect(users[0].id).toBe(allUsers[offset].id);
        expect(users[users.length - 1].id).toBe(allUsers[offset + limit - 1].id);
      }
    });

    test('order: should sort by name ascending', () => {
      const result = userAdapter.find({}, { order: { name: 'asc' } });
      expect(result.isOk()).toBe(true);
      const users = result.unwrap();
      for (let i = 0; i < users.length - 1; i++) {
        expect(users[i].name.localeCompare(users[i + 1].name)).toBeLessThanOrEqual(0);
      }
    });

    test('order: should sort by age descending (SQLite default: NULLS LAST for DESC)', () => {
      const result = userAdapter.find({}, { order: { age: 'desc' } });
      expect(result.isOk()).toBe(true);
      const users = result.unwrap();
      let nullsStarted = false;
      for (let i = 0; i < users.length; i++) {
        const currentAge = users[i].age;
        if (currentAge === null) {
          nullsStarted = true;
        } else {
          expect(nullsStarted).toBe(false);
          if (i + 1 < users.length) {
            const nextAge = users[i + 1].age;
            if (nextAge !== null) {
              expect(currentAge).toBeGreaterThanOrEqual(nextAge);
            }
          }
        }
      }
    });

    test('order: should sort by age ascending (SQLite default: NULLS FIRST for ASC)', () => {
      const result = userAdapter.find({}, { order: { age: 'asc' } });
      expect(result.isOk()).toBe(true);
      const users = result.unwrap();
      let nonNullsStarted = false;
      for (let i = 0; i < users.length; i++) {
        const currentAge = users[i].age;
        if (currentAge !== null) {
          nonNullsStarted = true;
          if (i + 1 < users.length) {
            const nextAge = users[i + 1].age;
            if (nextAge !== null) {
              expect(currentAge).toBeLessThanOrEqual(nextAge);
            } else {
              expect(false).toBe(true);
            }
          }
        } else {
          expect(nonNullsStarted).toBe(false);
        }
      }
    });

    test('order: multiple columns (role asc, name desc)', () => {
      const result = userAdapter.find({}, { order: { role: 'asc', name: 'desc' } });
      expect(result.isOk()).toBe(true);
      const users = result.unwrap();

      const allUsersFromDBResult = userAdapter.find();
      expect(allUsersFromDBResult.isOk()).toBe(true);
      const allUsersFromDB = allUsersFromDBResult.unwrap();

      const sortedManually = [...allUsersFromDB].sort((a, b) => {
        const roleA = a.role ?? '';
        const roleB = b.role ?? '';
        const roleCompare = roleA.localeCompare(roleB);
        if (roleCompare !== 0) return roleCompare;
        return b.name.localeCompare(a.name);
      });
      expect(users.map((u) => u.id)).toEqual(sortedManually.map((u) => u.id));
    });
  });

  describe('joins', () => {
    test('inner join: users with their offices (users without office should be excluded)', () => {
      const result = userAdapter.find(
        {},
        {
          joins: [{ table: officesTable, on: { officeId: 'id' } }],
        },
      );
      expect(result.isOk()).toBe(true);
      const joinedResult = result.unwrap();
      const usersWithOfficeInSample = sampleUsers.filter((u) => u.officeId !== null);
      expect(joinedResult).toHaveLength(usersWithOfficeInSample.length);
      joinedResult.forEach((item) => {
        expect(item.users).toBeDefined();
        expect(item.offices).toBeDefined();
        expect(item.users.officeId).toBe(item.offices.id);
      });
    });

    test('left join: all users, with their offices if present (users without office should have null for office fields)', () => {
      const result = userAdapter.find(
        {},
        {
          joins: [{ table: officesTable, on: { officeId: 'id' }, type: 'left' }],
        },
      );
      expect(result.isOk()).toBe(true);
      const joinedResult = result.unwrap();
      expect(joinedResult).toHaveLength(sampleUsers.length);

      const davidInResult = joinedResult.find((r) => r.users.email === 'david@example.com');
      expect(davidInResult).toBeDefined();
      expect(davidInResult!.users.officeId).toBeNull();
      expect(davidInResult!.offices).toBeNull();

      const aliceInResult = joinedResult.find((r) => r.users.email === 'alice@example.com');
      expect(aliceInResult).toBeDefined();
      expect(aliceInResult!.offices).not.toBeNull();
      expect(aliceInResult!.users.officeId).toBe(aliceInResult!.offices!.id);
    });

    test('right join: (emulated by Drizzle) all offices, with their users if present', () => {
      const result = userAdapter.find(
        {},
        {
          joins: [{ table: officesTable, on: { officeId: 'id' }, type: 'right' }],
        },
      );
      expect(result.isOk()).toBe(true);

      const joinedResult = result.unwrap();
      const officeIdsInResult = new Set(
        joinedResult.map((item) => item.offices?.id).filter((id?: number | null): id is number => id !== undefined && id !== null),
      );
      expect(officeIdsInResult.size).toBe(sampleOffices.length);

      const hqOfficeId = sampleOffices.findIndex((o) => o.name === 'HQ') + 1;
      const usersInHQCount = sampleUsers.filter((u) => u.officeId === hqOfficeId).length;
      const hqResults = joinedResult.filter((item) => item.offices?.id === hqOfficeId);

      expect(hqResults.length).toBe(usersInHQCount > 0 ? usersInHQCount : 1);

      const remoteHubResult = joinedResult.find((item) => item.offices?.name === 'Remote Hub');
      expect(remoteHubResult).toBeDefined();
      expect(remoteHubResult!.offices.name).toBe('Remote Hub');
      expect(remoteHubResult!.users).toBeNull();
    });

    test('full join: (emulated by Drizzle) all users and all offices', () => {
      const result = userAdapter.find(
        {},
        {
          joins: [{ table: officesTable, on: { officeId: 'id' }, type: 'full' }],
        },
      );
      expect(result.isOk()).toBe(true);

      const joinedResult = result.unwrap();
      const davidInResult = joinedResult.find((r) => r.users?.email === 'david@example.com');
      expect(davidInResult).toBeDefined();
      expect(davidInResult?.users).toBeDefined();
      expect(davidInResult?.offices).toBeNull();

      const remoteHubInResult = joinedResult.find((r) => r.offices?.name === 'Remote Hub');
      expect(remoteHubInResult).toBeDefined();
      expect(remoteHubInResult?.offices).toBeDefined();
      expect(remoteHubInResult?.users).toBeNull();

      const usersCount = sampleUsers.length;
      const officesCount = sampleOffices.length;
      const uniqueUserIds = new Set(joinedResult.map((r) => r.users?.id).filter((id?: number | null): id is number => id != null));
      const uniqueOfficeIds = new Set(joinedResult.map((r) => r.offices?.id).filter((id?: number | null): id is number => id != null));

      expect(uniqueUserIds.size).toBe(usersCount);
      expect(uniqueOfficeIds.size).toBe(officesCount);
      expect(joinedResult.length).toBeGreaterThanOrEqual(Math.max(usersCount, officesCount));
    });

    test('cross join: users and offices', () => {
      const result = userAdapter.find(
        {},
        {
          joins: [{ table: officesTable, on: {}, type: 'cross' }],
          limit: 50,
        },
      );
      expect(result.isOk()).toBe(true);

      const joinedResult = result.unwrap();
      const expectedCrossJoinLength = sampleUsers.length * sampleOffices.length;
      expect(joinedResult.length).toBe(Math.min(expectedCrossJoinLength, 50));

      if (joinedResult.length > 0) {
        expect(joinedResult[0].users).toBeDefined();
        expect(joinedResult[0].offices).toBeDefined();
        expect(joinedResult[0].users).toHaveProperty('id');
        expect(joinedResult[0].offices).toHaveProperty('id');
      }
    });

    test('join with select: select user name and office location', () => {
      const result = userAdapter.find(
        {},
        {
          joins: [{ table: officesTable, on: { officeId: 'id' }, type: 'left' }],
          select: { name: 1, id: 1, location: 1 },
        },
      );
      expect(result.isOk()).toBe(true);
      const items = result.unwrap();
      expect(items.length).toBeGreaterThan(0);
      items.forEach((item) => {
        expect(Object.keys(item).sort()).toEqual(['id', 'location', 'name'].sort());
      });
      expect(items.find((item) => item.name === 'Alice')).toBeDefined();
      expect(items.find((item) => item.name === 'David')).toBeDefined();
    });

    test('join with filter on main table: users in role "admin" and their office', () => {
      const alice = sampleUsers.find((u) => u.email === 'alice@example.com')!;
      const result = userAdapter.find(
        { role: 'admin' },
        {
          joins: [{ table: officesTable, on: { officeId: 'id' } }],
        },
      );
      expect(result.isOk()).toBe(true);
      const joinedResult = result.unwrap();
      expect(joinedResult).toHaveLength(1);
      const aliceFromDbResult = userAdapter.findOne({ email: alice.email });
      expect(aliceFromDbResult.isOk()).toBe(true);
      const aliceFromDb = aliceFromDbResult.unwrap();
      expect(aliceFromDb).not.toBeNull();

      expect(joinedResult[0].users.id).toBe(aliceFromDb!.id);
      expect(joinedResult[0].offices.name).toBe('HQ');
    });

    test('join with filter on main table (FK) that implies a filter on joined table', () => {
      const hqOfficeResult = officeAdapter.findOne({ name: 'HQ' });
      expect(hqOfficeResult.isOk()).toBe(true);
      const hqOffice = hqOfficeResult.unwrap();
      expect(hqOffice).not.toBeNull();

      const usersInHQCount = sampleUsers.filter((u) => u.officeId === hqOffice!.id).length;

      const result = userAdapter.find(
        { officeId: hqOffice!.id },
        {
          joins: [{ table: officesTable, on: { officeId: 'id' } }],
        },
      );
      expect(result.isOk()).toBe(true);
      const joinedResult = result.unwrap();
      expect(joinedResult).toHaveLength(usersInHQCount);
      joinedResult.forEach((item) => {
        expect(item.offices.name).toBe('HQ');
        expect(item.users.officeId).toBe(hqOffice!.id);
      });
    });

    test('join with order by joined table column (location asc, NULLS FIRST for SQLite ASC)', () => {
      const result = userAdapter.find(
        {},
        {
          joins: [{ table: officesTable, on: { officeId: 'id' }, type: 'left' }],
          select: { name: 1, location: 1, id: 1 },
          order: { location: 'asc' },
        },
      );
      expect(result.isOk()).toBe(true);
      const items = result.unwrap();

      let nonNullsStarted = false;
      for (let i = 0; i < items.length; i++) {
        const currentLocation = items[i].location;
        if (currentLocation !== null) {
          nonNullsStarted = true;
          if (i + 1 < items.length) {
            const nextLocation = items[i + 1].location;
            if (nextLocation !== null) {
              expect(currentLocation.localeCompare(nextLocation)).toBeLessThanOrEqual(0);
            } else {
              expect(false).toBe(true);
            }
          }
        } else {
          expect(nonNullsStarted).toBe(false);
        }
      }
    });
  });

  describe('Filter Logic - Advanced', () => {
    test('should handle $eq with case sensitivity for text fields (SQLite default)', () => {
      const resultLower = userAdapter.find({ name: 'alice' });
      expect(resultLower.isOk()).toBe(true);
      expect(resultLower.unwrap().filter((u) => u.name === 'alice')).toHaveLength(0);

      const resultUpper = userAdapter.find({ name: 'Alice' });
      expect(resultUpper.isOk()).toBe(true);
      expect(resultUpper.unwrap().filter((u) => u.name === 'Alice').length).toBeGreaterThan(0);
    });

    test('should handle $like with case insensitivity for text fields (SQLite default for ASCII)', () => {
      const result = userAdapter.find({ name: { $like: 'aliCE%' } });
      expect(result.isOk()).toBe(true);
      const users = result.unwrap();
      expect(users.some((u) => u.name === 'Alice')).toBe(true);
    });

    test('should handle $glob with case sensitivity for text fields (SQLite default)', () => {
      const resultSensitive = userAdapter.find({ name: { $glob: 'A*' } });
      expect(resultSensitive.isOk()).toBe(true);
      expect(resultSensitive.unwrap().some((u) => u.name === 'Alice')).toBe(true);

      const resultSensitiveFail = userAdapter.find({ name: { $glob: 'a*' } });
      expect(resultSensitiveFail.isOk()).toBe(true);
      expect(resultSensitiveFail.unwrap().some((u) => u.name === 'Alice')).toBe(false);
    });

    test('should correctly filter with $lt: null, $lte: null (SQLite: field < NULL is UNKNOWN/FALSE)', () => {
      const resultLt = userAdapter.find({ age: { $lt: null } });
      expect(resultLt.isOk()).toBe(true);
      expect(resultLt.unwrap()).toHaveLength(0);

      const resultLte = userAdapter.find({ age: { $lte: null } });
      expect(resultLte.isOk()).toBe(true);
      expect(resultLte.unwrap()).toHaveLength(0);
    });

    test('should handle complex nested logical operators ($and with $or)', () => {
      const expectedUsers = sampleUsers.filter((u) => (u.role === 'admin' || (u.age != null && u.age < 25)) && u.officeId === 1);

      const result = userAdapter.find({
        $and: [{ $or: [{ role: 'admin' }, { age: { $lt: 25 } }] }, { officeId: 1 }],
      });
      expect(result.isOk()).toBe(true);
      const foundUsers = result.unwrap();
      expect(foundUsers).toHaveLength(expectedUsers.length);
      if (expectedUsers.length > 0) {
        expect(foundUsers.map((u) => u.email).sort()).toEqual(expectedUsers.map((u) => u.email).sort());
      }
    });
  });

  describe('Query Options - Advanced', () => {
    test('select: should allow id: 0 with other fields from joined table', () => {
      const result = userAdapter.find(
        { email: 'alice@example.com' },
        {
          joins: [
            { table: officesTable, on: { officeId: 'id' }, type: 'left' },
            { table: postsTable, on: { id: 'userId' }, type: 'left' },
          ],
          select: { id: 0, name: 1, location: 1 },
        },
      );
      expect(result.isOk()).toBe(true);
      const items = result.unwrap();
      expect(items).toHaveLength(3);
      expect(items[0]).toEqual({ name: 'Alice', location: 'New York' });
      expect(Object.keys(items[0]).sort()).toEqual(['location', 'name'].sort());
    });
  });
});

describe('Adapter count()', () => {
  test('should return the total number of users without a filter', () => {
    const result = userAdapter.count();
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(sampleUsers.length);
  });

  test('should return the count of users matching the filter', () => {
    const usersAge30Count = sampleUsers.filter((u) => u.age === 30).length;
    const result = userAdapter.count({ age: 30 });
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(usersAge30Count);
  });

  test('should return 0 if no users match the filter', () => {
    const result = userAdapter.count({ name: 'NonExistentName' });
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(0);
  });

  test('should return 0 for count on an empty table', () => {
    client.exec('DELETE FROM users;');
    const result = userAdapter.count();
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(0);
  });

  test('should return count with a complex filter', () => {
    const expectedCount = sampleUsers.filter((u) => u.role === 'user' && u.age != null && u.age < 30).length;
    const result = userAdapter.count({ $and: [{ role: 'user' }, { age: { $lt: 30 } }] });
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(expectedCount);
  });
});

describe('Adapter findOne()', () => {
  test('should find a single user by filter', () => {
    const aliceSample = sampleUsers.find((u) => u.email === 'alice@example.com')!;
    const result = userAdapter.findOne({ email: 'alice@example.com' });
    expect(result.isOk()).toBe(true);
    const foundUser = result.unwrap();
    expect(foundUser).not.toBeNull();
    expect(foundUser).toEqual(expect.objectContaining({ name: aliceSample.name, email: aliceSample.email }));
  });

  test('should return null if no user matches the filter', () => {
    const result = userAdapter.findOne({ email: 'nonexistent@example.com' });
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBeNull();
  });

  test('should return null when finding one on an empty table', () => {
    client.exec('DELETE FROM users;');
    const result = userAdapter.findOne({ name: 'Alice' });
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBeNull();
  });

  test('should use options like select', () => {
    const aliceSample = sampleUsers.find((u) => u.email === 'alice@example.com')!;
    const result = userAdapter.findOne({ email: 'alice@example.com' }, { select: { name: 1 } });
    expect(result.isOk()).toBe(true);
    const user = result.unwrap();
    expect(user).not.toBeNull();
    expect(user).toEqual({ id: expect.any(Number), name: aliceSample.name });
    expect(Object.keys(user!).sort()).toEqual(['id', 'name'].sort());
  });

  test('should respect order option if multiple records match filter (picks first based on order)', () => {
    const usersAge30Result = userAdapter.find({ age: 30 }, { order: { id: 'asc' } });
    expect(usersAge30Result.isOk()).toBe(true);
    const usersAge30 = usersAge30Result.unwrap();
    expect(usersAge30.length).toBeGreaterThan(0);

    const minIdAge30 = usersAge30[0].id;
    const maxIdAge30 = usersAge30[usersAge30.length - 1].id;

    const resultOrderByIdAsc = userAdapter.findOne({ age: 30 }, { order: { id: 'asc' } });
    expect(resultOrderByIdAsc.isOk()).toBe(true);
    const userAsc = resultOrderByIdAsc.unwrap();
    expect(userAsc).not.toBeNull();
    expect(userAsc!.id).toBe(minIdAge30);

    const resultOrderByIdDesc = userAdapter.findOne({ age: 30 }, { order: { id: 'desc' } });
    expect(resultOrderByIdDesc.isOk()).toBe(true);
    const userDesc = resultOrderByIdDesc.unwrap();
    expect(userDesc).not.toBeNull();
    expect(userDesc!.id).toBe(maxIdAge30);
  });

  test('should work with joins', () => {
    const aliceSample = sampleUsers.find((u) => u.email === 'alice@example.com')!;
    const result = userAdapter.findOne(
      { email: aliceSample.email },
      {
        joins: [{ table: officesTable, on: { officeId: 'id' } }],
      },
    );
    expect(result.isOk()).toBe(true);
    const joinedResult = result.unwrap();
    expect(joinedResult).not.toBeNull();
    expect(joinedResult!.users.email).toBe(aliceSample.email);
    expect(joinedResult!.offices.name).toBe(sampleOffices.find((o) => o.name === 'HQ')!.name);
  });
});

describe('Adapter insert()', () => {
  test('should insert a single record and return it (with all fields by default)', () => {
    const newUser: Omit<InsertUser, 'id'> = { name: 'Zane', email: 'zane@example.com', age: 22 };
    const result = userAdapter.insert(newUser);
    expect(result.isOk()).toBe(true);
    const insertedUsers = result.unwrap();
    expect(insertedUsers).toHaveLength(1);
    const insertedUser = insertedUsers[0];
    expect(insertedUser).toEqual(
      expect.objectContaining({
        name: 'Zane',
        email: 'zane@example.com',
        age: 22,
        role: 'user',
      }),
    );
    expect(insertedUser.id).toBeTypeOf('number');

    const countResult = userAdapter.count({ email: 'zane@example.com' });
    expect(countResult.isOk()).toBe(true);
    expect(countResult.unwrap()).toBe(1);
  });

  test('should apply default values for omitted fields', () => {
    const newPost: Omit<InsertPost, 'id' | 'views'> = { title: 'Post with default views', userId: 1 };
    const result = postAdapter.insert(newPost);
    expect(result.isOk()).toBe(true);
    const insertedPosts = result.unwrap();
    expect(insertedPosts[0].views).toBe(0);

    const newUser: Omit<InsertUser, 'id' | 'role'> = { name: 'Default Role User', email: 'default@example.com' };
    const userResult = userAdapter.insert(newUser);
    expect(userResult.isOk()).toBe(true);
    const insertedUser = userResult.unwrap();
    expect(insertedUser[0].role).toBe('user');
  });

  test('should insert multiple records and return them', () => {
    const newUsers: Array<Omit<InsertUser, 'id'>> = [
      { name: 'Yara', email: 'yara@example.com', age: 29 },
      { name: 'Xavi', email: 'xavi@example.com', age: 33 },
    ];
    const result = userAdapter.insert(newUsers);
    expect(result.isOk()).toBe(true);
    const insertedUsers = result.unwrap();
    expect(insertedUsers).toHaveLength(2);
    expect(insertedUsers.find((u) => u.name === 'Yara')).toBeDefined();
    expect(insertedUsers.find((u) => u.name === 'Xavi')).toBeDefined();

    const yaraCount = userAdapter.count({ email: 'yara@example.com' });
    expect(yaraCount.isOk()).toBe(true);
    expect(yaraCount.unwrap()).toBe(1);

    const xaviCount = userAdapter.count({ email: 'xavi@example.com' });
    expect(xaviCount.isOk()).toBe(true);
    expect(xaviCount.unwrap()).toBe(1);
  });

  test('should return selected fields if select option is provided', () => {
    const newUser: Omit<InsertUser, 'id'> = { name: 'Wendy', email: 'wendy@example.com', age: 40 };
    const result = userAdapter.insert(newUser, { select: { name: 1, email: 1 } });
    expect(result.isOk()).toBe(true);
    const insertedUsers = result.unwrap();
    expect(insertedUsers[0]).toEqual({ id: expect.any(Number), name: 'Wendy', email: 'wendy@example.com' });
  });

  test('inserting empty array should return empty array and not throw', () => {
    const result = userAdapter.insert([]);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual([]);
  });

  test('should return Err if NOT NULL constraint is violated', () => {
    const newUser = { email: 'nonnull@example.com' } as Omit<InsertUser, 'id' | 'name'>;
    const result = userAdapter.insert(newUser as Omit<InsertUser, 'id'>);
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().message).toMatch(/NOT NULL constraint failed: users.name/i);
  });

  test('should return Err if UNIQUE constraint is violated (without conflict handling)', () => {
    const existingUserEmail = sampleUsers[0].email!;
    const newUser: Omit<InsertUser, 'id'> = { name: 'Conflict User', email: existingUserEmail };
    const result = userAdapter.insert(newUser);
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().message).toMatch(/UNIQUE constraint failed: users.email/i);
  });

  test('should return Err if FOREIGN KEY constraint is violated', () => {
    const newUser: Omit<InsertUser, 'id'> = { name: 'FK User', email: 'fk@example.com', officeId: 9999 };
    const result = userAdapter.insert(newUser);
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().message).toMatch(/FOREIGN KEY constraint failed/i);
  });

  describe('conflict resolution (SQLite ON CONFLICT behavior)', () => {
    beforeEach(() => {
      const aliceResult = userAdapter.findOne({ email: 'alice@example.com' });
      if (aliceResult.isErr()) throw aliceResult.unwrapErr();

      const alice = aliceResult.unwrap();
      if (alice && alice.bio !== null) {
        const updateResult = userAdapter.update({ ...alice, bio: null });
        if (updateResult.isErr()) throw updateResult.unwrapErr();
      }
    });

    test('onConflictDoNothing (ignore): should not insert or update if email conflicts, returns empty for conflicted row', () => {
      const originalAliceResult = userAdapter.findOne({ email: 'alice@example.com' });
      expect(originalAliceResult.isOk()).toBe(true);
      const originalAlice = originalAliceResult.unwrap();
      expect(originalAlice).not.toBeNull();

      const conflictingUser: Omit<InsertUser, 'id'> = { name: 'New Alice', email: 'alice@example.com', age: 31 };

      const result = userAdapter.insert(conflictingUser, {
        conflict: { target: ['email'], resolution: 'ignore' },
      });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual([]);

      const foundResult = userAdapter.findOne({ email: 'alice@example.com' });
      expect(foundResult.isOk()).toBe(true);
      const found = foundResult.unwrap();
      expect(found).not.toBeNull();
      expect(found!.name).toBe(originalAlice!.name);
      expect(found!.age).toBe(originalAlice!.age);
    });

    test('onConflictDoUpdate (update with explicit set): should update specified fields if email conflicts', () => {
      const aliceEmail = 'alice@example.com';
      const conflictingUser: Omit<InsertUser, 'id'> = { name: 'New Alice Name Attempt', email: aliceEmail, age: 100, role: 'attemptedRole' };

      const result = userAdapter.insert(conflictingUser, {
        conflict: {
          target: ['email'],
          resolution: 'update',
          set: { name: 'Updated Alice by Conflict', age: 32 },
        },
      });
      expect(result.isOk()).toBe(true);
      const updated = result.unwrap();
      expect(updated).toHaveLength(1);
      expect(updated[0].name).toBe('Updated Alice by Conflict');
      expect(updated[0].age).toBe(32);
      expect(updated[0].email).toBe(aliceEmail);

      const originalAliceResult = userAdapter.findOne({ email: aliceEmail });
      expect(originalAliceResult.isOk()).toBe(true);
      const originalAlice = originalAliceResult.unwrap();
      expect(originalAlice).not.toBeNull();

      expect(originalAlice!.role).not.toBe('attemptedRole');

      const foundResult = userAdapter.findOne({ email: aliceEmail });
      expect(foundResult.isOk()).toBe(true);
      const found = foundResult.unwrap();
      expect(found).not.toBeNull();

      expect(found!.name).toBe('Updated Alice by Conflict');
      expect(found!.age).toBe(32);
    });

    test('onConflictDoUpdate (update with explicit set using SQL): should update using SQL expression', () => {
      const initialPair: InsertUniquePair = { valA: 'A1', valB: 'B1', valC: 'Initial C' };
      const insertInitial = uniquePairAdapter.insert(initialPair);
      expect(insertInitial.isOk()).toBe(true);
      const insertedInitial = insertInitial.unwrap()[0];

      const conflictingPair: InsertUniquePair = { valA: 'A1', valB: 'B1', valC: 'New C' };
      const conflictResult = uniquePairAdapter.insert(conflictingPair, {
        conflict: {
          target: ['valA', 'valB'],
          resolution: 'update',
          set: { valC: sql`${uniquePairTable.valC} || ' updated by SQL'` },
        },
      });
      expect(conflictResult.isOk()).toBe(true);
      const updatedPair = conflictResult.unwrap();
      expect(updatedPair).toHaveLength(1);
      expect(updatedPair[0].valC).toBe('Initial C updated by SQL');

      const foundPair = uniquePairAdapter.findOne({ id: insertedInitial.id });
      expect(foundPair.isOk()).toBe(true);
      expect(foundPair.unwrap()?.valC).toBe('Initial C updated by SQL');
    });

    test('onConflictDoUpdate (update with implicit set from new values - using excluded): should update with new record values if email conflicts', () => {
      const aliceEmail = 'alice@example.com';
      const conflictingUser: Omit<InsertUser, 'id'> = { name: 'Implicit Update Alice', email: aliceEmail, age: 33, role: 'superadmin' };

      const result = userAdapter.insert(conflictingUser, {
        conflict: {
          target: ['email'],
          resolution: 'update',
          set: {
            name: conflictingUser.name,
            age: conflictingUser.age,
            role: conflictingUser.role,
            email: conflictingUser.email,
          },
        },
      });

      expect(result.isOk()).toBe(true);
      const updated = result.unwrap();
      expect(updated).toHaveLength(1);
      expect(updated[0].name).toBe('Implicit Update Alice');
      expect(updated[0].age).toBe(33);
      expect(updated[0].role).toBe('superadmin');
      expect(updated[0].email).toBe(aliceEmail);

      const foundResult = userAdapter.findOne({ email: aliceEmail });
      expect(foundResult.isOk()).toBe(true);
      const found = foundResult.unwrap();
      expect(found).not.toBeNull();

      expect(found!.name).toBe('Implicit Update Alice');
      expect(found!.age).toBe(33);
      expect(found!.role).toBe('superadmin');
    });

    test('onConflictDoUpdate (merge behavior): should update existing NULL fields with new values, keep existing non-NULL fields', () => {
      const aliceOriginalResult = userAdapter.findOne({ email: 'alice@example.com' });
      expect(aliceOriginalResult.isOk()).toBe(true);
      const aliceOriginal = aliceOriginalResult.unwrap()!;

      userAdapter.update({ ...aliceOriginal, bio: null, age: 30 });
      const aliceAfterBioNull = userAdapter.findOne({ email: 'alice@example.com' }).unwrap()!;
      expect(aliceAfterBioNull.bio).toBeNull();
      expect(aliceAfterBioNull.role).toBe('admin');
      expect(aliceAfterBioNull.age).toBe(30);

      const conflictingUser: Omit<InsertUser, 'id'> = {
        name: 'Merged Alice Name Should Be Ignored',
        email: 'alice@example.com',
        bio: 'Merged Bio From New Value',
        role: 'merged-role-should-be-ignored',
        age: 35,
      };

      const result = userAdapter.insert(conflictingUser, {
        conflict: {
          target: ['email'],
          resolution: 'merge',
          set: {
            name: conflictingUser.name,
            bio: conflictingUser.bio,
            age: conflictingUser.age,
            role: conflictingUser.role,
          },
        },
      });
      expect(result.isOk()).toBe(true);
      const updated = result.unwrap();
      expect(updated).toHaveLength(1);

      expect(updated[0].name).toBe(aliceAfterBioNull.name);
      expect(updated[0].bio).toBe('Merged Bio From New Value');
      expect(updated[0].role).toBe(aliceAfterBioNull.role);
      expect(updated[0].age).toBe(aliceAfterBioNull.age);

      const foundResult = userAdapter.findOne({ email: 'alice@example.com' });
      expect(foundResult.isOk()).toBe(true);
      const found = foundResult.unwrap()!;

      expect(found.name).toBe(aliceAfterBioNull.name);
      expect(found.bio).toBe('Merged Bio From New Value');
      expect(found.role).toBe(aliceAfterBioNull.role);
      expect(found.age).toBe(aliceAfterBioNull.age);
    });

    test('onConflict with composite unique key target', () => {
      const initialRecord: InsertUniquePair = { valA: 'testA', valB: 'testB', valC: 'initialC' };
      const insertResult = uniquePairAdapter.insert(initialRecord);
      expect(insertResult.isOk()).toBe(true);

      const conflictingRecord: InsertUniquePair = { valA: 'testA', valB: 'testB', valC: 'updatedCFromNew' };
      const conflictResult = uniquePairAdapter.insert(conflictingRecord, {
        conflict: {
          target: ['valA', 'valB'],
          resolution: 'update',
          set: { valC: 'explicitlyUpdatedC' },
        },
      });
      expect(conflictResult.isOk()).toBe(true);
      const updatedRecords = conflictResult.unwrap();
      expect(updatedRecords).toHaveLength(1);
      expect(updatedRecords[0].valC).toBe('explicitlyUpdatedC');

      const found = uniquePairAdapter.findOne({ valA: 'testA', valB: 'testB' });
      expect(found.isOk()).toBe(true);
      expect(found.unwrap()?.valC).toBe('explicitlyUpdatedC');
    });
  });

  describe('Conflict Resolution - Advanced', () => {
    test('onConflictDoUpdate (implicit from new values) should update all non-PK, non-conflict-target fields provided in new data', () => {
      const bobEmail = 'bob@example.com';
      const originalBob = userAdapter.findOne({ email: bobEmail }).unwrap()!;

      const conflictingUser: Omit<InsertUser, 'id'> = {
        name: 'Updated Bob Implicitly Full',
        email: bobEmail,
        age: originalBob.age! + 5,
        role: 'super_user_implicit_full',
        officeId: originalBob.officeId === 1 ? 2 : originalBob.officeId === 2 ? 3 : 1,
        bio: 'New bio implicit update full',
      };

      const result = userAdapter.insert(conflictingUser, {
        conflict: {
          target: ['email'],
          resolution: 'update',
          set: {
            name: conflictingUser.name,
            age: conflictingUser.age,
            role: conflictingUser.role,
            officeId: conflictingUser.officeId,
            bio: conflictingUser.bio,
          },
        },
      });

      expect(result.isOk()).toBe(true);
      const updatedBob = result.unwrap()[0];

      expect(updatedBob.name).toBe(conflictingUser.name);
      expect(updatedBob.age).toBe(conflictingUser.age);
      expect(updatedBob.role).toBe(conflictingUser.role);
      expect(updatedBob.officeId).toBe(conflictingUser.officeId);
      expect(updatedBob.bio).toBe(conflictingUser.bio);
      expect(updatedBob.id).toBe(originalBob.id);

      const foundBob = userAdapter.findOne({ id: originalBob.id }).unwrap();
      expect(foundBob).toEqual(updatedBob);
    });

    test('onConflictDoNothing with multiple conflicting records in a batch insert, some non-conflicting', () => {
      const newRecords: Array<Omit<InsertUser, 'id'>> = [
        { name: 'Alice New Data', email: 'alice@example.com', age: 100 },
        { name: 'Bob New Data', email: 'bob@example.com', age: 101 },
        { name: 'New Unique User For Batch', email: 'uniquebatchignore@example.com', age: 25 },
      ];
      const result = userAdapter.insert(newRecords, {
        conflict: { target: ['email'], resolution: 'ignore' },
      });
      expect(result.isOk()).toBe(true);
      const inserted = result.unwrap();
      expect(inserted).toHaveLength(1);
      expect(inserted[0].email).toBe('uniquebatchignore@example.com');

      const alice = userAdapter.findOne({ email: 'alice@example.com' }).unwrap()!;
      const bob = userAdapter.findOne({ email: 'bob@example.com' }).unwrap()!;
      expect(alice.age).not.toBe(100);
      expect(bob.age).not.toBe(101);
    });

    test('onConflictDoUpdate with multiple records in batch: some conflict (update), some new (insert)', () => {
      const newRecords: Array<Omit<InsertUser, 'id'>> = [
        { name: 'Alice Updated Batch', email: 'alice@example.com', age: 100 },
        { name: 'Bob Updated Batch', email: 'bob@example.com', age: 101 },
        { name: 'New User Batch Insert', email: 'uniquebatchupdate@example.com', age: 25 },
      ];

      const result = userAdapter.insert(newRecords, {
        conflict: {
          target: ['email'],
          resolution: 'update',
          set: {
            name: 'multiple conflict',
            age: 1000,
          },
        },
      });

      expect(result.isOk()).toBe(true);
      const processed = result.unwrap();
      expect(processed).toHaveLength(3);

      const alice = processed.find((u) => u.email === 'alice@example.com')!;
      const bob = processed.find((u) => u.email === 'bob@example.com')!;
      const uniqueUser = processed.find((u) => u.email === 'uniquebatchupdate@example.com')!;

      expect(alice.name).toBe('multiple conflict');
      expect(alice.age).toBe(1000);
      expect(bob.name).toBe('multiple conflict');
      expect(bob.age).toBe(1000);
      expect(uniqueUser.name).toBe('New User Batch Insert');
      expect(uniqueUser.age).toBe(25);
    });
  });
});

describe('Adapter update()', () => {
  test('should update an existing user and return the updated record', () => {
    const aliceResult = userAdapter.findOne({ email: 'alice@example.com' });
    expect(aliceResult.isOk()).toBe(true);
    const alice = aliceResult.unwrap();
    expect(alice).not.toBeNull();

    const updatedData: User = { ...alice!, name: 'Alice Smith', age: 31 };

    const result = userAdapter.update(updatedData);
    expect(result.isOk()).toBe(true);
    const updatedUsers = result.unwrap();
    expect(updatedUsers).toHaveLength(1);
    expect(updatedUsers[0].name).toBe('Alice Smith');
    expect(updatedUsers[0].age).toBe(31);
    expect(updatedUsers[0].id).toBe(alice!.id);

    const foundResult = userAdapter.findOne({ id: alice!.id });
    expect(foundResult.isOk()).toBe(true);
    const found = foundResult.unwrap();
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Alice Smith');
  });

  test('should allow updating a field to null', () => {
    const bobResult = userAdapter.findOne({ email: 'bob@example.com' });
    expect(bobResult.isOk()).toBe(true);
    const bob = bobResult.unwrap();
    expect(bob).not.toBeNull();
    expect(bob!.bio).not.toBeNull();

    const updatedData: User = { ...bob!, bio: null };
    const result = userAdapter.update(updatedData);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()[0].bio).toBeNull();

    const foundResult = userAdapter.findOne({ id: bob!.id });
    expect(foundResult.isOk()).toBe(true);
    expect(foundResult.unwrap()!.bio).toBeNull();
  });

  test('should return selected fields if select option is provided', () => {
    const bobResult = userAdapter.findOne({ email: 'bob@example.com' });
    expect(bobResult.isOk()).toBe(true);
    const bob = bobResult.unwrap();
    expect(bob).not.toBeNull();

    const updatedData: User = { ...bob!, role: 'lead_user' };

    const result = userAdapter.update(updatedData, { select: { id: 1, role: 1 } });
    expect(result.isOk()).toBe(true);
    const updatedUsers = result.unwrap();
    expect(updatedUsers[0]).toEqual({ id: bob!.id, role: 'lead_user' });
  });

  test('should return Err if record.id is null/undefined', () => {
    const invalidUser = { name: 'No ID User', email: 'noid@example.com' } as unknown as User;
    const result = userAdapter.update(invalidUser);
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().message).toMatch(/Missing required "id" for update operation/i);
  });

  test('should return an empty array if id does not exist (updates 0 rows)', () => {
    const nonExistentUser: User = { id: 9999, name: 'Ghost', email: 'ghost@example.com', age: null, role: null, officeId: null, bio: null };
    const result = userAdapter.update(nonExistentUser);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual([]);
  });

  test('should return Err if update violates UNIQUE constraint', () => {
    const alice = userAdapter.findOne({ email: 'alice@example.com' }).unwrap()!;
    const bob = userAdapter.findOne({ email: 'bob@example.com' }).unwrap()!;

    const updatedBob: User = { ...bob, email: alice.email };
    const result = userAdapter.update(updatedBob);
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().message).toMatch(/UNIQUE constraint failed: users.email/i);
  });

  test('should return Err if update violates FOREIGN KEY constraint', () => {
    const charlie = userAdapter.findOne({ email: 'charlie@example.com' }).unwrap()!;
    const updatedCharlie: User = { ...charlie, officeId: 9999 };
    const result = userAdapter.update(updatedCharlie);
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().message).toMatch(/FOREIGN KEY constraint failed/i);
  });

  test('attempting to change PK `id` via update payload should be ignored', () => {
    const charlie = userAdapter.findOne({ email: 'charlie@example.com' }).unwrap()!;
    const updateDataWithChangedIdField: User = {
      ...charlie,
      id: charlie.id + 1000,
      name: 'Charlie Did ID Change?',
    };

    const updateResult = userAdapter.update(updateDataWithChangedIdField);
    const updatedUsers = updateResult.unwrap();
    expect(updatedUsers.length).toBe(0);
  });
});

describe('Adapter delete()', () => {
  test('should delete an existing user and return the deleted record', () => {
    const charlieResult = userAdapter.findOne({ email: 'charlie@example.com' });
    expect(charlieResult.isOk()).toBe(true);
    const charlie = charlieResult.unwrap();
    expect(charlie).not.toBeNull();

    const result = userAdapter.delete(charlie!);
    expect(result.isOk()).toBe(true);
    const deletedUsers = result.unwrap();
    expect(deletedUsers).toHaveLength(1);
    expect(deletedUsers[0].id).toBe(charlie!.id);
    expect(deletedUsers[0].name).toBe(charlie!.name);

    const foundResult = userAdapter.findOne({ id: charlie!.id });
    expect(foundResult.isOk()).toBe(true);
    expect(foundResult.unwrap()).toBeNull();

    const countResult = userAdapter.count();
    expect(countResult.isOk()).toBe(true);
    expect(countResult.unwrap()).toBe(sampleUsers.length - 1);
  });

  test('should return selected fields if select option is provided', () => {
    const davidResult = userAdapter.findOne({ email: 'david@example.com' });
    expect(davidResult.isOk()).toBe(true);
    const david = davidResult.unwrap();
    expect(david).not.toBeNull();

    const result = userAdapter.delete(david!, { select: { name: 1 } });
    expect(result.isOk()).toBe(true);
    const deletedUsers = result.unwrap();

    expect(deletedUsers[0]).toEqual(expect.objectContaining({ id: david!.id, name: 'David' }));
    expect(Object.keys(deletedUsers[0]).sort()).toEqual(['id', 'name'].sort());
  });

  test('should return Err if record.id is null/undefined', () => {
    const invalidUser = { name: 'No ID User To Delete' } as unknown as User;
    const result = userAdapter.delete(invalidUser);
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().message).toMatch(/Missing required "id" for delete operation/i);
  });

  test('should return an empty array if id does not exist (deletes 0 rows)', () => {
    const nonExistentUser: User = { id: 8888, name: 'Phantom', email: 'phantom@example.com', age: null, role: null, officeId: null, bio: null };
    const result = userAdapter.delete(nonExistentUser);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual([]);
  });
});

describe('Adapter findOneAndUpdate()', () => {
  test('should find and update a user if filter matches', () => {
    const eveOriginalResult = userAdapter.findOne({ email: 'eve@example.com' });
    expect(eveOriginalResult.isOk()).toBe(true);
    const eveOriginal = eveOriginalResult.unwrap();
    expect(eveOriginal).not.toBeNull();

    const updatePayload = { age: 31, role: 'senior_manager' };

    const result = userAdapter.findOneAndUpdate({ email: 'eve@example.com' }, updatePayload);

    expect(result.isOk()).toBe(true);
    const updatedUser = result.unwrap();
    expect(updatedUser).toBeDefined();
    expect(updatedUser).not.toBeNull();
    expect(updatedUser!.id).toBe(eveOriginal!.id);
    expect(updatedUser!.age).toBe(updatePayload.age);
    expect(updatedUser!.role).toBe(updatePayload.role);

    const foundResult = userAdapter.findOne({ id: eveOriginal!.id });
    expect(foundResult.isOk()).toBe(true);
    const found = foundResult.unwrap();
    expect(found).not.toBeNull();
    expect(found!.age).toBe(updatePayload.age);
    expect(found!.role).toBe(updatePayload.role);
  });

  test('should insert a new user if filter does not match and upsert is true', () => {
    const newUserEmail = 'newupsert@example.com';

    const filterForUpsert: Partial<User> = { email: newUserEmail };
    const upsertPayload: Partial<Omit<InsertUser, 'id'>> = { name: 'New Upserted', age: 25, role: 'intern' };

    const result = userAdapter.findOneAndUpdate(filterForUpsert, upsertPayload, { upsert: true });

    expect(result.isOk()).toBe(true);
    const upsertedUser = result.unwrap();
    expect(upsertedUser).toBeDefined();
    expect(upsertedUser).not.toBeNull();

    expect(upsertedUser!.email).toBe(newUserEmail);
    expect(upsertedUser!.name).toBe(upsertPayload.name);
    expect(upsertedUser!.age).toBe(upsertPayload.age);
    expect(upsertedUser!.role).toBe(upsertPayload.role);
    expect(upsertedUser!.id).toBeTypeOf('number');

    const foundResult = userAdapter.findOne({ email: newUserEmail });
    expect(foundResult.isOk()).toBe(true);
    const found = foundResult.unwrap();
    expect(found).toBeDefined();
    expect(found).not.toBeNull();
    expect(found!.name).toBe(upsertPayload.name);
  });

  test('should insert a new user using filter data combined with update data (update data overwrites filter for same keys)', () => {
    const newUserEmail = 'newupsertfilter@example.com';
    const filterData: Partial<User> = { email: newUserEmail, role: 'default_role_from_filter', name: 'Name From Filter (will be overwritten)' };
    const updateData: Partial<Omit<InsertUser, 'id'>> = { name: 'New Upserted Filter', age: 26 };

    const result = userAdapter.findOneAndUpdate(filterData, updateData, { upsert: true });

    expect(result.isOk()).toBe(true);
    const upsertedUser = result.unwrap();
    expect(upsertedUser).toBeDefined();
    expect(upsertedUser).not.toBeNull();
    expect(upsertedUser!.email).toBe(newUserEmail);
    expect(upsertedUser!.name).toBe(updateData.name);
    expect(upsertedUser!.age).toBe(updateData.age);
    expect(upsertedUser!.role).toBe(filterData.role);
  });

  test('should return null if filter does not match and upsert is false (or not specified)', () => {
    const result = userAdapter.findOneAndUpdate({ email: 'nosuchuser@example.com' }, { name: 'No Update' });
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBeNull();
  });

  test('should apply select option on returned record (update)', () => {
    const malloryOriginalResult = userAdapter.findOne({ email: 'mallory@example.com' });
    expect(malloryOriginalResult.isOk()).toBe(true);
    const malloryOriginal = malloryOriginalResult.unwrap();
    expect(malloryOriginal).not.toBeNull();

    const updatePayload = { bio: 'Updated Bio via FindOneAndUpdate' };

    const result = userAdapter.findOneAndUpdate({ email: 'mallory@example.com' }, updatePayload, { select: { id: 1, bio: 1 } });
    expect(result.isOk()).toBe(true);
    const selectedUser = result.unwrap();
    expect(selectedUser).not.toBeNull();
    expect(selectedUser).toEqual({ id: malloryOriginal!.id, bio: updatePayload.bio });
  });

  test('should apply select option on returned record (insert with upsert:true)', () => {
    const newUserEmail = 'selectupsert@example.com';
    const filterForUpsert: Partial<User> = { email: newUserEmail };
    const result = userAdapter.findOneAndUpdate(filterForUpsert, { name: 'Select Upsert', age: 22 }, { upsert: true, select: { name: 1, email: 1 } });
    expect(result.isOk()).toBe(true);
    const unwrappedResult = result.unwrap();
    expect(unwrappedResult).not.toBeNull();
    expect(unwrappedResult).toEqual(expect.objectContaining({ id: expect.any(Number), name: 'Select Upsert', email: newUserEmail }));
  });

  test('should return the found record if filter matches but data for update is empty and record is unchanged', () => {
    const aliceResult = userAdapter.findOne({ email: 'alice@example.com' });
    expect(aliceResult.isOk()).toBe(true);
    const alice = aliceResult.unwrap();
    expect(alice).not.toBeNull();

    const result = userAdapter.findOneAndUpdate({ email: 'alice@example.com' }, {});
    expect(result.isOk()).toBe(true);

    const returnedUser = result.unwrap();
    expect(returnedUser).not.toBeNull();
    expect(returnedUser!.id).toBe(alice!.id);
    expect(returnedUser!.name).toBe(alice!.name);

    const aliceAfterResult = userAdapter.findOne({ id: alice!.id });
    expect(aliceAfterResult.isOk()).toBe(true);
    const aliceAfter = aliceAfterResult.unwrap();
    expect(aliceAfter).toEqual({ ...alice! });
  });

  test('should upsert correctly on an empty table with upsert: true', () => {
    client.exec('DELETE FROM users;');
    const newUserEmail = 'emptyupsert@example.com';
    const filterForUpsert: Partial<User> = { email: newUserEmail };
    const payload = { name: 'Empty Upsert', age: 20 };
    const result = userAdapter.findOneAndUpdate(filterForUpsert, payload, { upsert: true });
    expect(result.isOk()).toBe(true);
    const user = result.unwrap();
    expect(user).not.toBeNull();
    expect(user!.email).toBe(newUserEmail);
    expect(user!.name).toBe(payload.name);
    expect(userAdapter.count().unwrap()).toBe(1);
  });

  test('should fail upsert if combined data for insert violates NOT NULL constraint', () => {
    const newUserEmail = 'failupsert@example.com';

    const filterForUpsert: Partial<User> = { email: newUserEmail };
    const payload = { age: 22 };
    const result = userAdapter.findOneAndUpdate(filterForUpsert, payload, { upsert: true });
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().message).toMatch(/NOT NULL constraint failed: users.name/i);
  });

  test('should update only the first matching record if filter matches multiple (respecting implicit/explicit order)', () => {
    const usersAge30 = sampleUsers.filter((u) => u.age === 30);
    expect(usersAge30.length).toBeGreaterThan(1);

    const initialAge30Users = userAdapter.find({ age: 30 }, { order: { id: 'asc' } }).unwrap();
    const firstUserId = initialAge30Users[0].id;

    const result = userAdapter.findOneAndUpdate({ age: 30 }, { bio: 'Updated by findOneAndUpdate for age 30' }, { order: { id: 'asc' } });
    expect(result.isOk()).toBe(true);
    const updatedUser = result.unwrap();
    expect(updatedUser).not.toBeNull();
    expect(updatedUser!.id).toBe(firstUserId);
    expect(updatedUser!.bio).toBe('Updated by findOneAndUpdate for age 30');

    const otherAge30Users = userAdapter.find({ age: 30, id: { $ne: firstUserId } }).unwrap();
    otherAge30Users.forEach((user) => {
      const originalUser = usersAge30.find((u) => u.email === user.email);
      expect(user.bio).toBe(originalUser?.bio);
    });
  });

  describe('Upsert Behavior with Conflicts - Additional', () => {
    test('upsert: true, new record (from filter + data) insert conflicts with an existing different record unique constraint', () => {
      const bobEmail = sampleUsers.find((u) => u.name === 'Bob')!.email!;
      const newNonExistentEmail = 'nonexistentupsertconflict@example.com';

      const result = userAdapter.findOneAndUpdate(
        { email: newNonExistentEmail },
        { name: 'Conflicting Upsert', email: bobEmail, age: 40 },
        { upsert: true },
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.unwrapErr().message).toMatch(/UNIQUE constraint failed: users.email/i);
      }
      expect(userAdapter.findOne({ email: newNonExistentEmail }).unwrap()).toBeNull();
      const bobUser = userAdapter.findOne({ email: bobEmail }).unwrap();
      expect(bobUser!.name).toBe('Bob');
    });

    test('upsert: true, filter matches, but update causes unique constraint violation with another record', () => {
      const aliceEmail = sampleUsers.find((u) => u.name === 'Alice')!.email!;
      const bobEmail = sampleUsers.find((u) => u.name === 'Bob')!.email!;

      const result = userAdapter.findOneAndUpdate({ email: aliceEmail }, { email: bobEmail }, { upsert: true });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.unwrapErr().message).toMatch(/UNIQUE constraint failed: users.email/i);
      }
      const aliceUser = userAdapter.findOne({ name: 'Alice' }).unwrap();
      expect(aliceUser!.email).toBe(aliceEmail);
    });

    test('upsert: true with a complex (non-Partial) filter that does not match, should insert based on `data` payload', () => {
      const complexFilter = { age: { $gt: 200 } };
      const payloadForInsert: Partial<Omit<InsertUser, 'id'>> = {
        name: 'Upserted By Complex Miss',
        email: 'complexmiss@example.com',
        age: 42,
      };

      const result = userAdapter.findOneAndUpdate(complexFilter, payloadForInsert, { upsert: true });
      expect(result.isOk()).toBe(true);
      const user = result.unwrap();

      expect(user).not.toBeNull();
      expect(user!.name).toBe(payloadForInsert.name);
      expect(user!.email).toBe(payloadForInsert.email);
      expect(user!.age).toBe(payloadForInsert.age);

      const dbUser = userAdapter.findOne({ email: payloadForInsert.email }).unwrap();
      expect(dbUser).toEqual(expect.objectContaining(user!));
      expect(dbUser!.age).toBe(payloadForInsert.age);
    });

    test('upsert: true, filter includes null value, no match, should insert with null value from filter merged with payload', () => {
      const filterWithNull: Partial<User> = { email: 'upsertnullbio@example.com', bio: null };
      const payload = { name: 'Upsert Null Bio User', age: 33 };

      const result = userAdapter.findOneAndUpdate(filterWithNull, payload, { upsert: true });
      expect(result.isOk()).toBe(true);
      const user = result.unwrap();

      expect(user).not.toBeNull();
      expect(user!.email).toBe(filterWithNull.email);
      expect(user!.name).toBe(payload.name);
      expect(user!.bio).toBeNull();
      expect(user!.age).toBe(payload.age);

      const dbUser = userAdapter.findOne({ email: filterWithNull.email }).unwrap();
      expect(dbUser!.bio).toBeNull();
    });
  });
});

describe('Adapter findOneAndDelete()', () => {
  test('should find and delete a user if filter matches, returning the deleted record', () => {
    const trentResult = userAdapter.findOne({ email: 'trent@example.com' });
    expect(trentResult.isOk()).toBe(true);
    const trent = trentResult.unwrap();
    expect(trent).not.toBeNull();

    const initialCountResult = userAdapter.count();
    expect(initialCountResult.isOk()).toBe(true);
    const initialCount = initialCountResult.unwrap();

    const result = userAdapter.findOneAndDelete({ email: 'trent@example.com' });
    expect(result.isOk()).toBe(true);
    const deletedUser = result.unwrap();
    expect(deletedUser).toBeDefined();
    expect(deletedUser).not.toBeNull();
    expect(deletedUser!.id).toBe(trent!.id);
    expect(deletedUser!.name).toBe(trent!.name);

    expect(userAdapter.findOne({ id: trent!.id }).unwrap()).toBeNull();
    const currentCountResult = userAdapter.count();
    expect(currentCountResult.isOk()).toBe(true);
    expect(currentCountResult.unwrap()).toBe(initialCount - 1);
  });

  test('should return null if no user matches filter', () => {
    const result = userAdapter.findOneAndDelete({ email: 'ghost@example.com' });
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBeNull();
  });

  test('should return null when trying to delete on an empty table', () => {
    client.exec('DELETE FROM users;');
    const result = userAdapter.findOneAndDelete({ name: 'AnyName' });
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBeNull();
  });

  test('should apply select option on returned (deleted) record', () => {
    const ursulaResult = userAdapter.findOne({ email: 'ursula@example.com' });
    expect(ursulaResult.isOk()).toBe(true);
    const ursula = ursulaResult.unwrap();
    expect(ursula).not.toBeNull();

    const result = userAdapter.findOneAndDelete({ email: 'ursula@example.com' }, { select: { id: 1, name: 1, email: 1 } });
    expect(result.isOk()).toBe(true);
    const deletedUser = result.unwrap();
    expect(deletedUser).not.toBeNull();
    expect(deletedUser).toEqual({ id: ursula!.id, name: 'Ursula User', email: 'ursula@example.com' });
  });

  test('should delete only the first matching record if filter matches multiple (respecting order)', () => {
    const usersAge30 = sampleUsers.filter((u) => u.age === 30);
    expect(usersAge30.length).toBeGreaterThan(1);

    const initialAge30Users = userAdapter.find({ age: 30 }, { order: { id: 'asc' } }).unwrap();
    const firstUserId = initialAge30Users[0].id;
    const firstUserName = initialAge30Users[0].name;

    const result = userAdapter.findOneAndDelete({ age: 30 }, { order: { id: 'asc' } });
    expect(result.isOk()).toBe(true);
    const deletedUser = result.unwrap();
    expect(deletedUser).not.toBeNull();
    expect(deletedUser!.id).toBe(firstUserId);
    expect(deletedUser!.name).toBe(firstUserName);

    expect(userAdapter.findOne({ id: firstUserId }).unwrap()).toBeNull();
    expect(userAdapter.count({ age: 30 }).unwrap()).toBe(initialAge30Users.length - 1);
  });
});

describe('Foreign Key Cascades (SQLite ON DELETE CASCADE Behavior Verification)', () => {
  test('deleting a user should cascade delete their posts', () => {
    const aliceResult = userAdapter.findOne({ email: 'alice@example.com' });
    expect(aliceResult.isOk()).toBe(true);
    const alice = aliceResult.unwrap();
    expect(alice).not.toBeNull();

    const alicePostsBeforeResult = postAdapter.find({ userId: alice!.id });
    expect(alicePostsBeforeResult.isOk()).toBe(true);
    const alicePostsBefore = alicePostsBeforeResult.unwrap();
    expect(alicePostsBefore.length).toBeGreaterThan(0);

    const deleteResult = userAdapter.delete(alice!);
    expect(deleteResult.isOk()).toBe(true);

    const alicePostsAfterResult = postAdapter.find({ userId: alice!.id });
    expect(alicePostsAfterResult.isOk()).toBe(true);
    const alicePostsAfter = alicePostsAfterResult.unwrap();
    expect(alicePostsAfter).toHaveLength(0);
  });

  test('deleting an office should cascade delete users in that office, and their posts indirectly', () => {
    const hqOfficeResult = officeAdapter.findOne({ name: 'HQ' });
    expect(hqOfficeResult.isOk()).toBe(true);
    const hqOffice = hqOfficeResult.unwrap();
    expect(hqOffice).not.toBeNull();

    const usersInHQBeforeResult = userAdapter.find({ officeId: hqOffice!.id });
    expect(usersInHQBeforeResult.isOk()).toBe(true);
    const usersInHQBefore = usersInHQBeforeResult.unwrap();
    expect(usersInHQBefore.length).toBeGreaterThan(0);

    const userIdsInHQ = usersInHQBefore.map((u) => u.id);
    const postsOfUsersInHQBeforeResult = postAdapter.find({ userId: { $in: userIdsInHQ } });
    expect(postsOfUsersInHQBeforeResult.isOk()).toBe(true);
    const postsOfUsersInHQBefore = postsOfUsersInHQBeforeResult.unwrap();
    expect(postsOfUsersInHQBefore.length).toBeGreaterThan(0);

    const deleteResult = officeAdapter.delete(hqOffice!);
    expect(deleteResult.isOk()).toBe(true);

    const usersInHQAfterResult = userAdapter.find({ officeId: hqOffice!.id });
    expect(usersInHQAfterResult.isOk()).toBe(true);
    const usersInHQAfter = usersInHQAfterResult.unwrap();
    expect(usersInHQAfter).toHaveLength(0);

    const postsOfUsersInHQAfterResult = postAdapter.find({ userId: { $in: userIdsInHQ } });
    expect(postsOfUsersInHQAfterResult.isOk()).toBe(true);
    const postsOfUsersInHQAfter = postsOfUsersInHQAfterResult.unwrap();
    expect(postsOfUsersInHQAfter).toHaveLength(0);
  });
});
