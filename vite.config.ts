import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

interface PasscodeRecord {
  code: string;
  testType: string;
  status: "active" | "used";
  createdAt: string;
  usedAt: string | null;
  usedBy: string | null;
}

interface TestimonialRecord {
  id: string;
  authorName: string;
  company: string;
  text: string;
  rating: number;
  createdAt: string;
}

interface FaqRecord {
  id: string;
  question: string;
  answer: string;
  order: number;
  createdAt: string;
}

interface FeatureRecord {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  createdAt: string;
}

interface TestSessionRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  testType: string;
  status: string;
  paid: boolean;
  primaryTemp: string | null;
  secondaryTemp: string | null;
  blend: string | null;
  passcodeUsed: string;
  createdAt: string;
  completedAt: string | null;
}

interface UserRecord {
  id: string;
  email: string;
  password: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: string;
  lastLogin: string | null;
}

// ── Seed data ────────────────────────────────────────────────────────────────

let passcodes: PasscodeRecord[] = [
  {
    code: "TM-AB12CD",
    testType: "single_test",
    status: "active",
    createdAt: "2026-07-01T10:00:00.000Z",
    usedAt: null,
    usedBy: null,
  },
  {
    code: "TM-EF34GH",
    testType: "couple_test",
    status: "used",
    createdAt: "2026-07-02T14:30:00.000Z",
    usedAt: "2026-07-03T09:15:00.000Z",
    usedBy: "user-001",
  },
  {
    code: "TM-JK56LM",
    testType: "single_test",
    status: "active",
    createdAt: "2026-07-05T08:00:00.000Z",
    usedAt: null,
    usedBy: null,
  },
  {
    code: "TM-NP78QR",
    testType: "group_test",
    status: "active",
    createdAt: "2026-07-08T16:45:00.000Z",
    usedAt: null,
    usedBy: null,
  },
];

let testimonials: TestimonialRecord[] = [
  {
    id: "t-001",
    authorName: "Sarah Mitchell",
    company: "Wellness Co.",
    text: "TemperaMap gave our team incredible insight into how different temperaments interact. Communication improved dramatically after our session.",
    rating: 5,
    createdAt: "2026-06-10T12:00:00.000Z",
  },
  {
    id: "t-002",
    authorName: "David Chen",
    company: "GrowthPath Consulting",
    text: "The couple assessment was eye-opening. My partner and I finally understood why we clash on certain decisions. Highly recommend.",
    rating: 5,
    createdAt: "2026-06-18T09:30:00.000Z",
  },
  {
    id: "t-003",
    authorName: "Amara Johnson",
    company: "Harmony HR",
    text: "We use TemperaMap for all new hires. It helps managers understand how to motivate each individual from day one.",
    rating: 4,
    createdAt: "2026-06-25T15:00:00.000Z",
  },
  {
    id: "t-004",
    authorName: "Luca Fernández",
    company: "SelfDev Studio",
    text: "The blend results were surprisingly accurate. It felt like reading a personalized manual for myself.",
    rating: 5,
    createdAt: "2026-07-02T11:20:00.000Z",
  },
];

let faqs: FaqRecord[] = [
  {
    id: "f-001",
    question: "What is TemperaMap?",
    answer: "TemperaMap is a temperament assessment tool that helps individuals and couples understand their core temperamental traits, blends, and interpersonal dynamics.",
    order: 1,
    createdAt: "2026-06-01T08:00:00.000Z",
  },
  {
    id: "f-002",
    question: "How long does the assessment take?",
    answer: "A single assessment typically takes 10–15 minutes. Couple assessments may take slightly longer as both partners complete their individual sections.",
    order: 2,
    createdAt: "2026-06-01T08:05:00.000Z",
  },
  {
    id: "f-003",
    question: "Can I retake the test?",
    answer: "Each passcode grants one-time access. If you need to retake, you can request a new passcode from your admin or purchase another single test.",
    order: 3,
    createdAt: "2026-06-01T08:10:00.000Z",
  },
  {
    id: "f-004",
    question: "What is a temperament blend?",
    answer: "A blend describes the dominant and secondary temperaments that shape your behavior. For example, a 'Melancholic-Sanguine' blend combines introspective depth with social energy.",
    order: 4,
    createdAt: "2026-06-01T08:15:00.000Z",
  },
  {
    id: "f-005",
    question: "Is my data private?",
    answer: "Yes. All assessment data is stored securely and is only accessible to you and any admins you have explicitly authorized.",
    order: 5,
    createdAt: "2026-06-01T08:20:00.000Z",
  },
];

let features: FeatureRecord[] = [
  {
    id: "feat-001",
    title: "Single Assessment",
    description: "Discover your unique temperament profile with our scientifically-grounded single-person assessment.",
    icon: "user",
    order: 1,
    createdAt: "2026-06-01T07:00:00.000Z",
  },
  {
    id: "feat-002",
    title: "Couple Compatibility",
    description: "Understand the dynamic between you and your partner. See where temperaments align and where friction arises.",
    icon: "heart",
    order: 2,
    createdAt: "2026-06-01T07:05:00.000Z",
  },
  {
    id: "feat-003",
    title: "Blend Analysis",
    description: "Go beyond single-temperament labels. TemperaMap reveals your blended temperament for a richer self-portrait.",
    icon: "blend",
    order: 3,
    createdAt: "2026-06-01T07:10:00.000Z",
  },
  {
    id: "feat-004",
    title: "Detailed Reports",
    description: "Generate shareable PDF reports with actionable insights for personal growth, therapy, or team building.",
    icon: "file-text",
    order: 4,
    createdAt: "2026-06-01T07:15:00.000Z",
  },
  {
    id: "feat-005",
    title: "Group Assessments",
    description: "Run team-wide assessments and get aggregate temperament maps to improve collaboration and reduce conflict.",
    icon: "users",
    order: 5,
    createdAt: "2026-06-01T07:20:00.000Z",
  },
];

let testSessions: TestSessionRecord[] = [
  {
    id: "s-001",
    userId: "u-001",
    userEmail: "alice@example.com",
    userName: "Alice Park",
    testType: "single_test",
    status: "completed",
    paid: true,
    primaryTemp: "Melancholic",
    secondaryTemp: "Phlegmatic",
    blend: "Melancholic-Phlegmatic",
    passcodeUsed: "TM-AB12CD",
    createdAt: "2026-06-15T10:00:00.000Z",
    completedAt: "2026-06-15T10:14:32.000Z",
  },
  {
    id: "s-002",
    userId: "u-002",
    userEmail: "bob@example.com",
    userName: "Bob Reyes",
    testType: "couple_test",
    status: "completed",
    paid: true,
    primaryTemp: "Choleric",
    secondaryTemp: "Sanguine",
    blend: "Choleric-Sanguine",
    passcodeUsed: "TM-EF34GH",
    createdAt: "2026-06-18T14:00:00.000Z",
    completedAt: "2026-06-18T14:22:10.000Z",
  },
  {
    id: "s-003",
    userId: "u-003",
    userEmail: "carla@example.com",
    userName: "Carla Nguyen",
    testType: "single_test",
    status: "pending",
    paid: false,
    primaryTemp: null,
    secondaryTemp: null,
    blend: null,
    passcodeUsed: "TM-JK56LM",
    createdAt: "2026-07-06T09:30:00.000Z",
    completedAt: null,
  },
  {
    id: "s-004",
    userId: "u-001",
    userEmail: "alice@example.com",
    userName: "Alice Park",
    testType: "couple_test",
    status: "in_progress",
    paid: true,
    primaryTemp: "Phlegmatic",
    secondaryTemp: null,
    blend: null,
    passcodeUsed: "TM-NP78QR",
    createdAt: "2026-07-09T11:00:00.000Z",
    completedAt: null,
  },
  {
    id: "s-005",
    userId: "u-004",
    userEmail: "derek@example.com",
    userName: "Derek Wilson",
    testType: "single_test",
    status: "completed",
    paid: true,
    primaryTemp: "Sanguine",
    secondaryTemp: "Choleric",
    blend: "Sanguine-Choleric",
    passcodeUsed: "TM-XX99YY",
    createdAt: "2026-07-01T16:00:00.000Z",
    completedAt: "2026-07-01T16:11:45.000Z",
  },
  {
    id: "s-006",
    userId: "u-005",
    userEmail: "emma@example.com",
    userName: "Emma Santos",
    testType: "group_test",
    status: "paid",
    paid: true,
    primaryTemp: "Melancholic",
    secondaryTemp: "Choleric",
    blend: "Melancholic-Choleric",
    passcodeUsed: "TM-AA11BB",
    createdAt: "2026-07-10T08:45:00.000Z",
    completedAt: null,
  },
];

let users: UserRecord[] = [
  {
    id: "u-001",
    email: "alice@example.com",
    password: "password123",
    firstName: "Alice",
    lastName: "Park",
    role: "admin",
    createdAt: "2026-05-15T08:00:00.000Z",
    lastLogin: "2026-07-10T10:00:00.000Z",
  },
  {
    id: "u-002",
    email: "bob@example.com",
    password: "password123",
    firstName: "Bob",
    lastName: "Reyes",
    role: "user",
    createdAt: "2026-06-01T12:00:00.000Z",
    lastLogin: "2026-07-08T14:30:00.000Z",
  },
  {
    id: "u-003",
    email: "carla@example.com",
    password: "password123",
    firstName: "Carla",
    lastName: "Nguyen",
    role: "user",
    createdAt: "2026-06-20T09:00:00.000Z",
    lastLogin: "2026-07-06T09:25:00.000Z",
  },
  {
    id: "u-004",
    email: "derek@example.com",
    password: "password123",
    firstName: "Derek",
    lastName: "Wilson",
    role: "user",
    createdAt: "2026-07-01T15:00:00.000Z",
    lastLogin: "2026-07-09T18:00:00.000Z",
  },
  {
    id: "u-005",
    email: "emma@example.com",
    password: "password123",
    firstName: "Emma",
    lastName: "Santos",
    role: "admin",
    createdAt: "2026-06-10T11:00:00.000Z",
    lastLogin: "2026-07-10T08:40:00.000Z",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

// ── Sessions (in-memory token → userId) ──────────────────────────────────────

const sessions = new Map<string, string>();

function createSession(userId: string): string {
  const token = crypto.randomUUID();
  sessions.set(token, userId);
  return token;
}

function destroySession(token: string) {
  sessions.delete(token);
}

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const pair of header.split(";")) {
    const [k, ...v] = pair.split("=");
    if (k) cookies[k.trim()] = decodeURIComponent(v.join("="));
  }
  return cookies;
}

function generatePasscode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "TM-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function parseQuery(raw: string): Record<string, string> {
  const qs = raw.includes("?") ? raw.split("?")[1] : "";
  const params: Record<string, string> = {};
  if (!qs) return params;
  for (const pair of qs.split("&")) {
    const [k, v] = pair.split("=");
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  return params;
}

async function readBody(req: any): Promise<any> {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
}

// ── Plugin ───────────────────────────────────────────────────────────────────

function mockApiPlugin(): Plugin {
  return {
    name: "mock-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        if (!url.startsWith("/api")) return next();
        res.setHeader("Content-Type", "application/json");

        // ── Health ──────────────────────────────────────────────────────────
        if (req.method === "GET" && url === "/api/health") {
          return res.end(JSON.stringify({ status: "ok" }));
        }

        // ── Auth ───────────────────────────────────────────────────────────
        const cookies = parseCookies(req.headers.cookie);
        const sessionToken = cookies.tm_session;
        const sessionUserId = sessionToken ? sessions.get(sessionToken) : undefined;

        if (req.method === "GET" && url === "/api/tm/auth/me") {
          if (!sessionUserId) return res.end(JSON.stringify(null));
          const user = users.find((u) => u.id === sessionUserId);
          if (!user) return res.end(JSON.stringify(null));
          return res.end(JSON.stringify({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, createdAt: user.createdAt, updatedAt: user.createdAt }));
        }

        if (req.method === "POST" && url === "/api/tm/auth/login") {
          const body = await readBody(req);
          const user = users.find((u) => u.email === body.email && u.password === body.password);
          if (!user) { res.statusCode = 401; return res.end(JSON.stringify({ error: "Invalid email or password" })); }
          const token = createSession(user.id);
          res.setHeader("Set-Cookie", `tm_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
          return res.end(JSON.stringify({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, createdAt: user.createdAt, updatedAt: user.createdAt }));
        }

        if (req.method === "POST" && url === "/api/tm/auth/register") {
          const body = await readBody(req);
          if (users.find((u) => u.email === body.email)) { res.statusCode = 409; return res.end(JSON.stringify({ error: "Email already registered" })); }
          const newUser = { id: `u-${crypto.randomUUID().slice(0, 8)}`, email: body.email, password: body.password, firstName: body.firstName || null, lastName: body.lastName || null, role: "user" as const, createdAt: new Date().toISOString(), lastLogin: null };
          users.push(newUser);
          const token = createSession(newUser.id);
          res.setHeader("Set-Cookie", `tm_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
          return res.end(JSON.stringify({ id: newUser.id, email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName, role: newUser.role, createdAt: newUser.createdAt, updatedAt: newUser.createdAt }));
        }

        if (req.method === "POST" && url === "/api/tm/auth/logout") {
          if (sessionToken) destroySession(sessionToken);
          res.setHeader("Set-Cookie", "tm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
          return res.end(JSON.stringify({ ok: true }));
        }

        // ── Passcodes CRUD ─────────────────────────────────────────────────
        if (req.method === "GET" && url === "/api/passcodes") {
          return res.end(JSON.stringify(passcodes));
        }

        if (req.method === "POST" && url === "/api/passcodes") {
          const body = await readBody(req);
          const { testType } = body;
          const code = generatePasscode();
          const record: PasscodeRecord = {
            code,
            testType,
            status: "active",
            createdAt: new Date().toISOString(),
            usedAt: null,
            usedBy: null,
          };
          passcodes.push(record);
          return res.end(JSON.stringify(record));
        }

        if (req.method === "POST" && url === "/api/passcodes/validate") {
          const body = await readBody(req);
          const { code, testType } = body;
          const match = passcodes.find(
            (p) => p.code === code && p.status === "active" && p.testType === testType,
          );
          if (match) {
            return res.end(JSON.stringify({ valid: true, passcode: match }));
          }
          return res.end(JSON.stringify({ valid: false, message: "Invalid or expired passcode for this test type" }));
        }

        // ── Tests ──────────────────────────────────────────────────────────
        if (req.method === "GET" && url === "/api/tests") {
          return res.end(JSON.stringify([]));
        }

        if (req.method === "POST" && url === "/api/tests") {
          const body = await readBody(req);
          const { passcode: passcodeVal } = body;
          const match = passcodes.find((p) => p.code === passcodeVal && p.status === "active");
          if (match) {
            match.status = "used";
            match.usedAt = new Date().toISOString();
            match.usedBy = "mock-user";
          }
          const id = crypto.randomUUID();
          return res.end(JSON.stringify({ id }));
        }

        if (req.method === "GET" && url.startsWith("/api/tests/")) {
          return res.end(JSON.stringify({
            id: url.split("/").pop(),
            testType: "single_test",
            status: "paid",
            paid: true,
            results: null,
            primaryTemp: null,
            secondaryTemp: null,
            blend: null,
            completedAt: null,
          }));
        }

        if (req.method === "PATCH" && url.startsWith("/api/tests/")) {
          return res.end(JSON.stringify({ ok: true }));
        }

        // ── Reports ────────────────────────────────────────────────────────
        if (req.method === "POST" && url.startsWith("/api/reports/generate/")) {
          return res.end(JSON.stringify({ reportUrl: null }));
        }

        // ════════════════════════════════════════════════════════════════════
        // ADMIN ENDPOINTS
        // ════════════════════════════════════════════════════════════════════

        // ── Testimonials CRUD ──────────────────────────────────────────────

        if (req.method === "GET" && url === "/api/admin/testimonials") {
          const sorted = [...testimonials].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          return res.end(JSON.stringify(sorted));
        }

        if (req.method === "POST" && url === "/api/admin/testimonials") {
          const body = await readBody(req);
          const record: TestimonialRecord = {
            id: `t-${crypto.randomUUID().slice(0, 8)}`,
            authorName: body.authorName,
            company: body.company,
            text: body.text,
            rating: body.rating,
            createdAt: new Date().toISOString(),
          };
          testimonials.push(record);
          return res.end(JSON.stringify(record));
        }

        if (req.method === "PUT" && url.match(/^\/api\/admin\/testimonials\/.+$/)) {
          const id = url.split("/").pop()!;
          const body = await readBody(req);
          const idx = testimonials.findIndex((t) => t.id === id);
          if (idx === -1) {
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: "Testimonial not found" }));
          }
          testimonials[idx] = { ...testimonials[idx], ...body, id };
          return res.end(JSON.stringify(testimonials[idx]));
        }

        if (req.method === "DELETE" && url.match(/^\/api\/admin\/testimonials\/.+$/)) {
          const id = url.split("/").pop()!;
          const idx = testimonials.findIndex((t) => t.id === id);
          if (idx === -1) {
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: "Testimonial not found" }));
          }
          testimonials.splice(idx, 1);
          return res.end(JSON.stringify({ deleted: true }));
        }

        // ── FAQs CRUD ──────────────────────────────────────────────────────

        if (req.method === "GET" && url === "/api/admin/faqs") {
          const sorted = [...faqs].sort((a, b) => a.order - b.order);
          return res.end(JSON.stringify(sorted));
        }

        if (req.method === "POST" && url === "/api/admin/faqs") {
          const body = await readBody(req);
          const maxOrder = faqs.reduce((max, f) => Math.max(max, f.order), 0);
          const record: FaqRecord = {
            id: `f-${crypto.randomUUID().slice(0, 8)}`,
            question: body.question,
            answer: body.answer,
            order: maxOrder + 1,
            createdAt: new Date().toISOString(),
          };
          faqs.push(record);
          return res.end(JSON.stringify(record));
        }

        if (req.method === "PUT" && url.match(/^\/api\/admin\/faqs\/.+$/)) {
          const id = url.split("/").pop()!;
          const body = await readBody(req);
          const idx = faqs.findIndex((f) => f.id === id);
          if (idx === -1) {
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: "FAQ not found" }));
          }
          faqs[idx] = { ...faqs[idx], ...body, id };
          return res.end(JSON.stringify(faqs[idx]));
        }

        if (req.method === "DELETE" && url.match(/^\/api\/admin\/faqs\/.+$/)) {
          const id = url.split("/").pop()!;
          const idx = faqs.findIndex((f) => f.id === id);
          if (idx === -1) {
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: "FAQ not found" }));
          }
          faqs.splice(idx, 1);
          return res.end(JSON.stringify({ deleted: true }));
        }

        if (req.method === "PATCH" && url === "/api/admin/faqs/reorder") {
          const body = await readBody(req);
          const { ids } = body as { ids: string[] };
          ids.forEach((id, i) => {
            const faq = faqs.find((f) => f.id === id);
            if (faq) faq.order = i + 1;
          });
          const sorted = [...faqs].sort((a, b) => a.order - b.order);
          return res.end(JSON.stringify(sorted));
        }

        // ── Features CRUD ──────────────────────────────────────────────────

        if (req.method === "GET" && url === "/api/admin/features") {
          const sorted = [...features].sort((a, b) => a.order - b.order);
          return res.end(JSON.stringify(sorted));
        }

        if (req.method === "POST" && url === "/api/admin/features") {
          const body = await readBody(req);
          const maxOrder = features.reduce((max, f) => Math.max(max, f.order), 0);
          const record: FeatureRecord = {
            id: `feat-${crypto.randomUUID().slice(0, 8)}`,
            title: body.title,
            description: body.description,
            icon: body.icon,
            order: maxOrder + 1,
            createdAt: new Date().toISOString(),
          };
          features.push(record);
          return res.end(JSON.stringify(record));
        }

        if (req.method === "PUT" && url.match(/^\/api\/admin\/features\/.+$/)) {
          const id = url.split("/").pop()!;
          const body = await readBody(req);
          const idx = features.findIndex((f) => f.id === id);
          if (idx === -1) {
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: "Feature not found" }));
          }
          features[idx] = { ...features[idx], ...body, id };
          return res.end(JSON.stringify(features[idx]));
        }

        if (req.method === "DELETE" && url.match(/^\/api\/admin\/features\/.+$/)) {
          const id = url.split("/").pop()!;
          const idx = features.findIndex((f) => f.id === id);
          if (idx === -1) {
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: "Feature not found" }));
          }
          features.splice(idx, 1);
          return res.end(JSON.stringify({ deleted: true }));
        }

        if (req.method === "PATCH" && url === "/api/admin/features/reorder") {
          const body = await readBody(req);
          const { ids } = body as { ids: string[] };
          ids.forEach((id, i) => {
            const feat = features.find((f) => f.id === id);
            if (feat) feat.order = i + 1;
          });
          const sorted = [...features].sort((a, b) => a.order - b.order);
          return res.end(JSON.stringify(sorted));
        }

        // ── Sessions (admin) ───────────────────────────────────────────────

        if (req.method === "GET" && url === "/api/admin/sessions/stats") {
          const total = testSessions.length;
          const byStatus: Record<string, number> = {};
          const byType: Record<string, number> = {};
          const temperamentDistribution: Record<string, number> = {};
          const userSet = new Set<string>();

          for (const s of testSessions) {
            byStatus[s.status] = (byStatus[s.status] || 0) + 1;
            byType[s.testType] = (byType[s.testType] || 0) + 1;
            userSet.add(s.userId);
            if (s.primaryTemp) {
              temperamentDistribution[s.primaryTemp] = (temperamentDistribution[s.primaryTemp] || 0) + 1;
            }
            if (s.secondaryTemp) {
              temperamentDistribution[s.secondaryTemp] = (temperamentDistribution[s.secondaryTemp] || 0) + 1;
            }
          }

          const totalPasscodesGenerated = passcodes.length;
          const totalPasscodesUsed = passcodes.filter((p) => p.status === "used").length;

          return res.end(JSON.stringify({
            total,
            byStatus,
            byType,
            temperamentDistribution,
            totalUsers: userSet.size,
            totalPasscodesUsed,
            totalPasscodesGenerated,
          }));
        }

        if (req.method === "GET" && url === "/api/admin/sessions") {
          const params = parseQuery(req.url ?? "");
          let result = [...testSessions];
          if (params.status) {
            result = result.filter((s) => s.status === params.status);
          }
          result.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          return res.end(JSON.stringify(result));
        }

        // ── Users (admin) ──────────────────────────────────────────────────

        if (req.method === "GET" && url === "/api/admin/users") {
          const sorted = [...users].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ).map(({ password: _, ...u }) => u);
          return res.end(JSON.stringify(sorted));
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    mockApiPlugin(),
    react(),
    tailwindcss({ optimize: false }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
  },
  preview: {
    port: 4173,
    host: true,
    allowedHosts: true,
  },
});
