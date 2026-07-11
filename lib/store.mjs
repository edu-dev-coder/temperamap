import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

const DATA_DIR = join(process.cwd(), "data");
const DB_FILE = join(DATA_DIR, "db.json");

let db = null;

// ── Seed data ────────────────────────────────────────────────────────────────

const SEED = {
  users: [
    { id: "u-001", email: "alice@example.com", passwordHash: "", firstName: "Alice", lastName: "Park", role: "admin", createdAt: "2026-05-15T08:00:00.000Z", lastLogin: "2026-07-10T10:00:00.000Z" },
    { id: "u-002", email: "bob@example.com", passwordHash: "", firstName: "Bob", lastName: "Reyes", role: "user", createdAt: "2026-06-01T12:00:00.000Z", lastLogin: "2026-07-08T14:30:00.000Z" },
    { id: "u-003", email: "carla@example.com", passwordHash: "", firstName: "Carla", lastName: "Nguyen", role: "user", createdAt: "2026-06-20T09:00:00.000Z", lastLogin: "2026-07-06T09:25:00.000Z" },
    { id: "u-004", email: "derek@example.com", passwordHash: "", firstName: "Derek", lastName: "Wilson", role: "user", createdAt: "2026-07-01T15:00:00.000Z", lastLogin: "2026-07-09T18:00:00.000Z" },
    { id: "u-005", email: "emma@example.com", passwordHash: "", firstName: "Emma", lastName: "Santos", role: "admin", createdAt: "2026-06-10T11:00:00.000Z", lastLogin: "2026-07-10T08:40:00.000Z" },
  ],
  passcodes: [
    { code: "TM-AB12CD", testType: "single_test", status: "active", createdAt: "2026-07-01T10:00:00.000Z", usedAt: null, usedBy: null },
    { code: "TM-EF34GH", testType: "couple_test", status: "used", createdAt: "2026-07-02T14:30:00.000Z", usedAt: "2026-07-03T09:15:00.000Z", usedBy: "user-001" },
    { code: "TM-JK56LM", testType: "single_test", status: "active", createdAt: "2026-07-05T08:00:00.000Z", usedAt: null, usedBy: null },
    { code: "TM-NP78QR", testType: "group_test", status: "active", createdAt: "2026-07-08T16:45:00.000Z", usedAt: null, usedBy: null },
  ],
  testimonials: [
    { id: "t-001", authorName: "Sarah Mitchell", company: "Wellness Co.", text: "TemperaMap gave our team incredible insight into how different temperaments interact.", rating: 5, createdAt: "2026-06-10T12:00:00.000Z" },
    { id: "t-002", authorName: "David Chen", company: "GrowthPath Consulting", text: "The couple assessment was eye-opening.", rating: 5, createdAt: "2026-06-18T09:30:00.000Z" },
    { id: "t-003", authorName: "Amara Johnson", company: "Harmony HR", text: "We use TemperaMap for all new hires.", rating: 4, createdAt: "2026-06-25T15:00:00.000Z" },
    { id: "t-004", authorName: "Luca Fernández", company: "SelfDev Studio", text: "The blend results were surprisingly accurate.", rating: 5, createdAt: "2026-07-02T11:20:00.000Z" },
  ],
  faqs: [
    { id: "f-001", question: "What is TemperaMap?", answer: "A temperament assessment tool.", order: 1, createdAt: "2026-06-01T08:00:00.000Z" },
    { id: "f-002", question: "How long does the assessment take?", answer: "10-15 minutes.", order: 2, createdAt: "2026-06-01T08:05:00.000Z" },
    { id: "f-003", question: "Can I retake the test?", answer: "Each passcode grants one-time access.", order: 3, createdAt: "2026-06-01T08:10:00.000Z" },
    { id: "f-004", question: "What is a temperament blend?", answer: "Dominant and secondary temperaments.", order: 4, createdAt: "2026-06-01T08:15:00.000Z" },
    { id: "f-005", question: "Is my data private?", answer: "Yes, stored securely.", order: 5, createdAt: "2026-06-01T08:20:00.000Z" },
  ],
  features: [
    { id: "feat-001", title: "Single Assessment", description: "Discover your unique temperament profile.", icon: "user", order: 1, createdAt: "2026-06-01T07:00:00.000Z" },
    { id: "feat-002", title: "Couple Compatibility", description: "Understand the dynamic between you and your partner.", icon: "heart", order: 2, createdAt: "2026-06-01T07:05:00.000Z" },
    { id: "feat-003", title: "Blend Analysis", description: "Go beyond single-temperament labels.", icon: "blend", order: 3, createdAt: "2026-06-01T07:10:00.000Z" },
    { id: "feat-004", title: "Detailed Reports", description: "Generate shareable PDF reports.", icon: "file-text", order: 4, createdAt: "2026-06-01T07:15:00.000Z" },
    { id: "feat-005", title: "Group Assessments", description: "Run team-wide assessments.", icon: "users", order: 5, createdAt: "2026-06-01T07:20:00.000Z" },
  ],
  testSessions: [
    { id: "s-001", userId: "u-001", userEmail: "alice@example.com", userName: "Alice Park", testType: "single_test", status: "completed", paid: true, primaryTemp: "Melancholic", secondaryTemp: "Phlegmatic", blend: "Melancholic-Phlegmatic", passcodeUsed: "TM-AB12CD", createdAt: "2026-06-15T10:00:00.000Z", completedAt: "2026-06-15T10:14:32.000Z" },
    { id: "s-002", userId: "u-002", userEmail: "bob@example.com", userName: "Bob Reyes", testType: "couple_test", status: "completed", paid: true, primaryTemp: "Choleric", secondaryTemp: "Sanguine", blend: "Choleric-Sanguine", passcodeUsed: "TM-EF34GH", createdAt: "2026-06-18T14:00:00.000Z", completedAt: "2026-06-18T14:22:10.000Z" },
    { id: "s-003", userId: "u-003", userEmail: "carla@example.com", userName: "Carla Nguyen", testType: "single_test", status: "pending", paid: false, primaryTemp: null, secondaryTemp: null, blend: null, passcodeUsed: "TM-JK56LM", createdAt: "2026-07-06T09:30:00.000Z", completedAt: null },
    { id: "s-004", userId: "u-001", userEmail: "alice@example.com", userName: "Alice Park", testType: "couple_test", status: "in_progress", paid: true, primaryTemp: "Phlegmatic", secondaryTemp: null, blend: null, passcodeUsed: "TM-NP78QR", createdAt: "2026-07-09T11:00:00.000Z", completedAt: null },
    { id: "s-005", userId: "u-004", userEmail: "derek@example.com", userName: "Derek Wilson", testType: "single_test", status: "completed", paid: true, primaryTemp: "Sanguine", secondaryTemp: "Choleric", blend: "Sanguine-Choleric", passcodeUsed: "TM-XX99YY", createdAt: "2026-07-01T16:00:00.000Z", completedAt: "2026-07-01T16:11:45.000Z" },
    { id: "s-006", userId: "u-005", userEmail: "emma@example.com", userName: "Emma Santos", testType: "group_test", status: "paid", paid: true, primaryTemp: "Melancholic", secondaryTemp: "Choleric", blend: "Melancholic-Choleric", passcodeUsed: "TM-AA11BB", createdAt: "2026-07-10T08:45:00.000Z", completedAt: null },
  ],
};

// ── Persistence ──────────────────────────────────────────────────────────────

let saveTimer = null;

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      await writeFile(DB_FILE, JSON.stringify(db, null, 2));
    } catch (err) {
      console.error("[store] failed to save:", err.message);
    }
  }, 500);
}

export async function load(passwordHasher) {
  try {
    const raw = await readFile(DB_FILE, "utf-8");
    db = JSON.parse(raw);
    console.log(`[store] loaded from ${DB_FILE}`);
  } catch {
    db = structuredClone(SEED);
    if (passwordHasher) {
      const defaultPw = process.env.DEFAULT_USER_PASSWORD || "password123";
      for (const user of db.users) {
        user.passwordHash = await passwordHasher(defaultPw);
      }
    }
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DB_FILE, JSON.stringify(db, null, 2));
    console.log(`[store] initialized fresh db at ${DB_FILE}`);
  }
  return db;
}

export function getDb() {
  return db;
}

export function save() {
  scheduleSave();
}

export async function flush() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  await writeFile(DB_FILE, JSON.stringify(db, null, 2));
}
