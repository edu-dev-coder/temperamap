import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Column mapping helpers ──────────────────────────────────────────────────

const camelToSnake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const snakeToCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

function toSnake(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[camelToSnake(k)] = v;
  }
  return out;
}

function mapRow(row) {
  if (!row) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[snakeToCamel(k)] = v;
  }
  return out;
}

function mapRows(rows) {
  return rows.map(mapRow);
}

// ── Users ───────────────────────────────────────────────────────────────────

export async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data ? mapRow(data) : null;
}

export async function findUserById(id) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data ? mapRow(data) : null;
}

export async function createUser(user) {
  const { error } = await supabase.from("users").insert(toSnake(user));
  if (error) throw error;
  return user;
}

export async function updateUserLastLogin(id) {
  const { error } = await supabase
    .from("users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function listUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, role, created_at, last_login");
  if (error) throw error;
  return mapRows(data);
}

export async function findUserByProvider(provider, providerId) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("provider", provider)
    .eq("provider_id", providerId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data ? mapRow(data) : null;
}

export async function createGoogleUser({ email, firstName, lastName, providerId, avatarUrl }) {
  const id = `u-${crypto.randomUUID().slice(0, 8)}`;
  const user = {
    id,
    email,
    passwordHash: "",
    firstName: firstName || null,
    lastName: lastName || null,
    role: "user",
    provider: "google",
    providerId,
    avatarUrl: avatarUrl || null,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };
  const { error } = await supabase.from("users").insert(toSnake(user));
  if (error) throw error;
  return user;
}

export async function updateUserPassword(id, passwordHash) {
  const { error } = await supabase
    .from("users")
    .update({ password_hash: passwordHash })
    .eq("id", id);
  if (error) throw error;
}

// ── Passcodes ───────────────────────────────────────────────────────────────

const TEST_TYPE_PREFIX = {
  single_test: "ADT",
  couples_test: "CPL",
  corporate_team: "CORP",
  group_test: "GRP",
  child_3_5: "KID",
  child_6_9: "KID",
  preteen_10_12: "PRE",
  teen_13_17: "TEEN",
};

const PASSCODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePasscode(testType) {
  const prefix = TEST_TYPE_PREFIX[testType] || "TM";
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += PASSCODE_CHARS[Math.floor(Math.random() * PASSCODE_CHARS.length)];
  return `${prefix}-${suffix}`;
}

export async function listPasscodes() {
  const { data, error } = await supabase.from("passcodes").select("*");
  if (error) throw error;
  return mapRows(data);
}

export async function findPasscode(code, testType) {
  let query = supabase.from("passcodes").select("*").eq("code", code).eq("status", "active");
  if (testType) query = query.eq("test_type", testType);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = mapRow(data);
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) return null;
  return row;
}

export async function findPasscodeByCode(code) {
  const { data, error } = await supabase
    .from("passcodes")
    .select("*")
    .eq("code", code)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = mapRow(data);
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) return null;
  return row;
}

export async function createPasscode(passcode) {
  const { error } = await supabase.from("passcodes").insert(toSnake(passcode));
  if (error) throw error;
  return passcode;
}

export async function usePasscode(code, usedBy) {
  const { data, error: fetchErr } = await supabase
    .from("passcodes")
    .select("max_uses, current_uses")
    .eq("code", code)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  const newUses = (data?.current_uses || 0) + 1;
  const maxUses = data?.max_uses || 1;
  const newStatus = newUses >= maxUses ? "exhausted" : "active";

  const { error } = await supabase
    .from("passcodes")
    .update({
      current_uses: newUses,
      status: newStatus,
      used_at: newStatus === "exhausted" ? new Date().toISOString() : null,
      used_by: usedBy || "anonymous",
    })
    .eq("code", code);
  if (error) throw error;
}

// ── Testimonials ────────────────────────────────────────────────────────────

export async function listTestimonials() {
  const { data, error } = await supabase.from("testimonials").select("*");
  if (error) throw error;
  return mapRows(data).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function findTestimonialById(id) {
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function createTestimonial(data) {
  const { error } = await supabase.from("testimonials").insert(toSnake(data));
  if (error) throw error;
  return data;
}

export async function updateTestimonial(id, data) {
  const { error } = await supabase
    .from("testimonials")
    .update(toSnake(data))
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTestimonial(id) {
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) throw error;
}

// ── FAQs ────────────────────────────────────────────────────────────────────

export async function listFaqs() {
  const { data, error } = await supabase.from("faqs").select("*");
  if (error) throw error;
  return mapRows(data).sort((a, b) => a.order - b.order);
}

export async function findFaqById(id) {
  const { data, error } = await supabase
    .from("faqs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function getMaxFaqOrder() {
  const { data, error } = await supabase.from("faqs").select("order").order("order", { ascending: false }).limit(1);
  if (error) throw error;
  return data.length > 0 ? data[0].order : 0;
}

export async function createFaq(data) {
  const { error } = await supabase.from("faqs").insert(toSnake(data));
  if (error) throw error;
  return data;
}

export async function updateFaq(id, data) {
  const { error } = await supabase
    .from("faqs")
    .update(toSnake(data))
    .eq("id", id);
  if (error) throw error;
}

export async function deleteFaq(id) {
  const { error } = await supabase.from("faqs").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderFaqs(ids) {
  const updates = ids.map((id, i) =>
    supabase.from("faqs").update({ order: i + 1 }).eq("id", id)
  );
  await Promise.all(updates);
}

// ── Features ────────────────────────────────────────────────────────────────

export async function listFeatures() {
  const { data, error } = await supabase.from("features").select("*");
  if (error) throw error;
  return mapRows(data).sort((a, b) => a.order - b.order);
}

export async function findFeatureById(id) {
  const { data, error } = await supabase
    .from("features")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function getMaxFeatureOrder() {
  const { data, error } = await supabase.from("features").select("order").order("order", { ascending: false }).limit(1);
  if (error) throw error;
  return data.length > 0 ? data[0].order : 0;
}

export async function createFeature(data) {
  const { error } = await supabase.from("features").insert(toSnake(data));
  if (error) throw error;
  return data;
}

export async function updateFeature(id, data) {
  const { error } = await supabase
    .from("features")
    .update(toSnake(data))
    .eq("id", id);
  if (error) throw error;
}

export async function deleteFeature(id) {
  const { error } = await supabase.from("features").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderFeatures(ids) {
  const updates = ids.map((id, i) =>
    supabase.from("features").update({ order: i + 1 }).eq("id", id)
  );
  await Promise.all(updates);
}

// ── Test Sessions ───────────────────────────────────────────────────────────

export async function findTestSessionById(id) {
  const { data, error } = await supabase
    .from("test_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = mapRow(data);
  if (typeof row.answers === "string") {
    try { row.answers = JSON.parse(row.answers); } catch { /* keep as-is */ }
  }
  if (typeof row.results === "string") {
    try { row.results = JSON.parse(row.results); } catch { /* keep as-is */ }
  }
  return row;
}

export async function updateTestSession(id, fields) {
  const snake = toSnake(fields);
  if (snake.answers && typeof snake.answers === "object") {
    snake.answers = JSON.stringify(snake.answers);
  }
  if (snake.results && typeof snake.results === "object") {
    snake.results = JSON.stringify(snake.results);
  }
  const { error } = await supabase
    .from("test_sessions")
    .update(snake)
    .eq("id", id);
  if (error) throw error;
}

export async function createTestSession(session) {
  const snake = toSnake(session);
  if (snake.answers && typeof snake.answers === "object") {
    snake.answers = JSON.stringify(snake.answers);
  }
  if (snake.results && typeof snake.results === "object") {
    snake.results = JSON.stringify(snake.results);
  }
  const { error } = await supabase.from("test_sessions").insert(snake);
  if (error) throw error;
  return session;
}

export async function listTestSessions(status) {
  let query = supabase.from("test_sessions").select("*");
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return mapRows(data).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function listTestSessionsByUserId(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("test_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return mapRows(data);
}

export async function getTestSessionStats() {
  const { data: sessions, error: e1 } = await supabase.from("test_sessions").select("*");
  if (e1) throw e1;

  const { data: passcodes, error: e2 } = await supabase.from("passcodes").select("status");
  if (e2) throw e2;

  const total = sessions.length;
  const byStatus = {};
  const byType = {};
  const temperamentDistribution = {};
  const userSet = new Set();

  for (const s of sessions) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    byType[s.test_type] = (byType[s.test_type] || 0) + 1;
    userSet.add(s.user_id);
    if (s.primary_temp) temperamentDistribution[s.primary_temp] = (temperamentDistribution[s.primary_temp] || 0) + 1;
    if (s.secondary_temp) temperamentDistribution[s.secondary_temp] = (temperamentDistribution[s.secondary_temp] || 0) + 1;
  }

  return {
    total,
    byStatus,
    byType,
    temperamentDistribution,
    totalUsers: userSet.size,
    totalPasscodesUsed: passcodes.filter((p) => p.status === "used").length,
    totalPasscodesGenerated: passcodes.length,
  };
}

// ── Corporate Teams ─────────────────────────────────────────────────────

export async function listCorporateTeams(adminId) {
  let query = supabase.from("corporate_teams").select("*");
  if (adminId) query = query.eq("admin_id", adminId);
  const { data, error } = await query;
  if (error) throw error;
  return mapRows(data).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function findCorporateTeamById(id) {
  const { data, error } = await supabase
    .from("corporate_teams")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = mapRow(data);
  if (typeof row.memberSessionIds === "string") {
    try { row.memberSessionIds = JSON.parse(row.memberSessionIds); } catch { /* keep */ }
  }
  if (typeof row.report === "string") {
    try { row.report = JSON.parse(row.report); } catch { /* keep */ }
  }
  return row;
}

export async function createCorporateTeam(team) {
  const snake = toSnake(team);
  if (snake.member_session_ids && typeof snake.member_session_ids === "object") {
    snake.member_session_ids = JSON.stringify(snake.member_session_ids);
  }
  if (snake.report && typeof snake.report === "object") {
    snake.report = JSON.stringify(snake.report);
  }
  const { error } = await supabase.from("corporate_teams").insert(snake);
  if (error) throw error;
  return team;
}

export async function updateCorporateTeam(id, fields) {
  const snake = toSnake(fields);
  if (snake.member_session_ids && typeof snake.member_session_ids === "object") {
    snake.member_session_ids = JSON.stringify(snake.member_session_ids);
  }
  if (snake.report && typeof snake.report === "object") {
    snake.report = JSON.stringify(snake.report);
  }
  const { error } = await supabase
    .from("corporate_teams")
    .update(snake)
    .eq("id", id);
  if (error) throw error;
}

export async function listCorporateSessions() {
  const { data, error } = await supabase
    .from("test_sessions")
    .select("*")
    .eq("test_type", "corporate_team");
  if (error) throw error;
  return mapRows(data);
}

// ── Seed ────────────────────────────────────────────────────────────────────

const SEED_USERS = [
  { id: "u-001", email: "alice@example.com", passwordHash: "", firstName: "Alice", lastName: "Park", role: "admin", createdAt: "2026-05-15T08:00:00.000Z", lastLogin: "2026-07-10T10:00:00.000Z" },
  { id: "u-002", email: "bob@example.com", passwordHash: "", firstName: "Bob", lastName: "Reyes", role: "user", createdAt: "2026-06-01T12:00:00.000Z", lastLogin: "2026-07-08T14:30:00.000Z" },
  { id: "u-003", email: "carla@example.com", passwordHash: "", firstName: "Carla", lastName: "Nguyen", role: "user", createdAt: "2026-06-20T09:00:00.000Z", lastLogin: "2026-07-06T09:25:00.000Z" },
  { id: "u-004", email: "derek@example.com", passwordHash: "", firstName: "Derek", lastName: "Wilson", role: "user", createdAt: "2026-07-01T15:00:00.000Z", lastLogin: "2026-07-09T18:00:00.000Z" },
  { id: "u-005", email: "emma@example.com", passwordHash: "", firstName: "Emma", lastName: "Santos", role: "admin", createdAt: "2026-06-10T11:00:00.000Z", lastLogin: "2026-07-10T08:40:00.000Z" },
];

const SEED_PASSCODES = [
  { code: "TM-AB12CD", testType: "single_test", status: "active", createdAt: "2026-07-01T10:00:00.000Z", usedAt: null, usedBy: null },
  { code: "TM-EF34GH", testType: "couple_test", status: "used", createdAt: "2026-07-02T14:30:00.000Z", usedAt: "2026-07-03T09:15:00.000Z", usedBy: "user-001" },
  { code: "TM-JK56LM", testType: "single_test", status: "active", createdAt: "2026-07-05T08:00:00.000Z", usedAt: null, usedBy: null },
  { code: "TM-NP78QR", testType: "group_test", status: "active", createdAt: "2026-07-08T16:45:00.000Z", usedAt: null, usedBy: null },
];

const SEED_TESTIMONIALS = [
  { id: "t-001", authorName: "Sarah Mitchell", company: "Wellness Co.", text: "TemperaMap gave our team incredible insight into how different temperaments interact.", rating: 5, createdAt: "2026-06-10T12:00:00.000Z" },
  { id: "t-002", authorName: "David Chen", company: "GrowthPath Consulting", text: "The couple assessment was eye-opening.", rating: 5, createdAt: "2026-06-18T09:30:00.000Z" },
  { id: "t-003", authorName: "Amara Johnson", company: "Harmony HR", text: "We use TemperaMap for all new hires.", rating: 4, createdAt: "2026-06-25T15:00:00.000Z" },
  { id: "t-004", authorName: "Luca Fernández", company: "SelfDev Studio", text: "The blend results were surprisingly accurate.", rating: 5, createdAt: "2026-07-02T11:20:00.000Z" },
];

const SEED_FAQS = [
  { id: "f-001", question: "What is TemperaMap?", answer: "A temperament assessment tool.", order: 1, createdAt: "2026-06-01T08:00:00.000Z" },
  { id: "f-002", question: "How long does the assessment take?", answer: "10-15 minutes.", order: 2, createdAt: "2026-06-01T08:05:00.000Z" },
  { id: "f-003", question: "Can I retake the test?", answer: "Each passcode grants one-time access.", order: 3, createdAt: "2026-06-01T08:10:00.000Z" },
  { id: "f-004", question: "What is a temperament blend?", answer: "Dominant and secondary temperaments.", order: 4, createdAt: "2026-06-01T08:15:00.000Z" },
  { id: "f-005", question: "Is my data private?", answer: "Yes, stored securely.", order: 5, createdAt: "2026-06-01T08:20:00.000Z" },
];

const SEED_FEATURES = [
  { id: "feat-001", title: "Single Assessment", description: "Discover your unique temperament profile.", icon: "user", order: 1, createdAt: "2026-06-01T07:00:00.000Z" },
  { id: "feat-002", title: "Couple Compatibility", description: "Understand the dynamic between you and your partner.", icon: "heart", order: 2, createdAt: "2026-06-01T07:05:00.000Z" },
  { id: "feat-003", title: "Blend Analysis", description: "Go beyond single-temperament labels.", icon: "blend", order: 3, createdAt: "2026-06-01T07:10:00.000Z" },
  { id: "feat-004", title: "Detailed Reports", description: "Generate shareable PDF reports.", icon: "file-text", order: 4, createdAt: "2026-06-01T07:15:00.000Z" },
  { id: "feat-005", title: "Group Assessments", description: "Run team-wide assessments.", icon: "users", order: 5, createdAt: "2026-06-01T07:20:00.000Z" },
];

const SEED_TEST_SESSIONS = [
  { id: "s-001", userId: "u-001", userEmail: "alice@example.com", userName: "Alice Park", testType: "single_test", status: "completed", paid: true, primaryTemp: "Melancholic", secondaryTemp: "Phlegmatic", blend: "Melancholic-Phlegmatic", passcodeUsed: "TM-AB12CD", createdAt: "2026-06-15T10:00:00.000Z", completedAt: "2026-06-15T10:14:32.000Z" },
  { id: "s-002", userId: "u-002", userEmail: "bob@example.com", userName: "Bob Reyes", testType: "couple_test", status: "completed", paid: true, primaryTemp: "Choleric", secondaryTemp: "Sanguine", blend: "Choleric-Sanguine", passcodeUsed: "TM-EF34GH", createdAt: "2026-06-18T14:00:00.000Z", completedAt: "2026-06-18T14:22:10.000Z" },
  { id: "s-003", userId: "u-003", userEmail: "carla@example.com", userName: "Carla Nguyen", testType: "single_test", status: "pending", paid: false, primaryTemp: null, secondaryTemp: null, blend: null, passcodeUsed: "TM-JK56LM", createdAt: "2026-07-06T09:30:00.000Z", completedAt: null },
  { id: "s-004", userId: "u-001", userEmail: "alice@example.com", userName: "Alice Park", testType: "couple_test", status: "in_progress", paid: true, primaryTemp: "Phlegmatic", secondaryTemp: null, blend: null, passcodeUsed: "TM-NP78QR", createdAt: "2026-07-09T11:00:00.000Z", completedAt: null },
  { id: "s-005", userId: "u-004", userEmail: "derek@example.com", userName: "Derek Wilson", testType: "single_test", status: "completed", paid: true, primaryTemp: "Sanguine", secondaryTemp: "Choleric", blend: "Sanguine-Choleric", passcodeUsed: "TM-XX99YY", createdAt: "2026-07-01T16:00:00.000Z", completedAt: "2026-07-01T16:11:45.000Z" },
  { id: "s-006", userId: "u-005", userEmail: "emma@example.com", userName: "Emma Santos", testType: "group_test", status: "paid", paid: true, primaryTemp: "Melancholic", secondaryTemp: "Choleric", blend: "Melancholic-Choleric", passcodeUsed: "TM-AA11BB", createdAt: "2026-07-10T08:45:00.000Z", completedAt: null },
];

export async function seedIfNeeded(passwordHasher) {
  const { data: existing, error } = await supabase.from("users").select("id, password_hash").limit(1);
  if (error) throw error;

  if (existing.length === 0) {
    console.log("[db] seeding database...");

    const defaultPw = process.env.DEFAULT_USER_PASSWORD || "password123";
    const usersWithHash = await Promise.all(
      SEED_USERS.map(async (u) => ({
        ...u,
        passwordHash: await passwordHasher(defaultPw),
      }))
    );

    await supabase.from("users").insert(usersWithHash.map(toSnake));
    await supabase.from("passcodes").insert(SEED_PASSCODES.map(toSnake));
    await supabase.from("testimonials").insert(SEED_TESTIMONIALS.map(toSnake));
    await supabase.from("faqs").insert(SEED_FAQS.map(toSnake));
    await supabase.from("features").insert(SEED_FEATURES.map(toSnake));
    await supabase.from("test_sessions").insert(SEED_TEST_SESSIONS.map(toSnake));

    console.log("[db] seed complete");
    return;
  }

  if (passwordHasher && existing[0].password_hash === "") {
    console.log("[db] fixing empty password hashes...");
    const defaultPw = process.env.DEFAULT_USER_PASSWORD || "password123";
    const hash = await passwordHasher(defaultPw);
    await supabase.from("users").update({ password_hash: hash }).eq("password_hash", "");
    console.log("[db] password hashes fixed");
  }
}
