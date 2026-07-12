# Design Spec: Couples & Corporate Professional Upgrade

**Date**: 2026-07-12
**Status**: Approved
**Scope**: Upgrade couples test results and corporate test to professional-grade features

---

## 1. Couples Test Upgrade

### 1.1 Current State

- 70 questions (60 core + 10 couples bonus)
- Compatibility tab shows a 4x4 matrix with score/label/summary/strengths/challenges/communication/advice
- Partner invitation flow (invite → join → results)
- Results tabs: Overview, Strengths, Compatibility

### 1.2 New Data — `src/lib/couples-data.ts`

**Expanded per-pair data (16 temperament pairings):**

```ts
interface CouplesPairing {
  score: number;           // 1-5 compatibility rating
  label: string;           // "Highly Compatible" / "Needs Work"
  summary: string;
  strengths: string[];
  challenges: string[];
  communication: {
    dos: string[];         // 4-5 do's
    donts: string[];       // 4-5 don'ts
    scripts: {             // 3-4 real conversation scripts
      situation: string;   // "When discussing finances"
      partnerA: string;    // Suggested phrasing for Partner A's temperament
      partnerB: string;    // Suggested phrasing for Partner B's temperament
    }[];
  };
  loveLanguages: {
    partnerA: { gives: string[]; receives: string[] };
    partnerB: { gives: string[]; receives: string[] };
    match: string;         // "You both value quality time, but you give through words"
  };
  lifeAreas: {
    intimacy: { tips: string[]; risk: string };
    finances: { tips: string[]; risk: string };
    parenting: { tips: string[]; risk: string };
    household: { tips: string[]; risk: string };
    decisions: { tips: string[]; risk: string };
    social: { tips: string[]; risk: string };
  };
  conflictPlaybook: {
    triggerA: string;      // What triggers Partner A's temperament
    triggerB: string;
    escalation: string;    // How this pair tends to escalate
    deescalation: string[];// 3-4 de-escalation steps
    repair: string[];      // 3-4 repair strategies after conflict
  };
}
```

**Expanded per-temperament love styles (4 entries):**

```ts
interface LoveStyle {
  expresses: string;       // How they show love
  receives: string;        // How they need to receive love
  bestLanguage: string;    // Primary love language
  needsFromPartner: string;
  dealbreakers: string[];
}
```

### 1.3 New Results Page Tabs

| Tab | Key | Content |
|---|---|---|
| Overview | `overview` | Both partners' primary/secondary temperaments side-by-side, blend description, famous examples |
| Strengths | `strengths` | Combined strengths list, growth areas for each partner |
| Compatibility | `compatibility` | Score out of 5, summary, strengths, challenges, conflict playbook |
| Communication | `communication` | Dos/don'ts, conversation scripts, how each partner processes disagreement |
| Love & Intimacy | `love` | Love language match, emotional needs, how to show love, dealbreakers |
| Life Together | `life` | 6 life areas (intimacy, finances, parenting, household, decisions, social) with tips and risks |
| Download | `download` | PDF report containing all tabs |

### 1.4 Partner Comparison Component

Side-by-side layout at top of Overview tab:

```
┌─────────────────┬───────────┬─────────────────┐
│  Partner A      │  VERSUS   │  Partner B      │
│  🌟 Sanguine    │           │  🔥 Choleric    │
│  Secondary: Phl │  Score:4  │  Secondary: Mel │
│  ████████░░ 80% │  /5       │  ███████░░░ 70% │
│                 │           │                 │
│  "The Optimist" │           │  "The Leader"   │
└─────────────────┴───────────┴─────────────────┘
```

Rendered as a flex row with 3 columns. Middle column shows compatibility score and blend description.

### 1.5 Files to Create/Modify

**Create:**
- `src/lib/couples-data.ts` — All 16 pairing data + love styles
- `src/components/couples/PartnerComparison.tsx` — Side-by-side partner view
- `src/components/couples/LoveLanguageCard.tsx` — Love language matching
- `src/components/couples/CommunicationGuide.tsx` — Dos/don'ts + scripts
- `src/components/couples/LifeAreasCard.tsx` — 6 life area guidance
- `src/components/couples/ConflictPlaybook.tsx` — Conflict resolution guide

**Modify:**
- `src/pages/Results.tsx` — Add new tabs (love, communication, life), wire new components, update tab logic for couples tests
- `src/pages/InvitePartner.tsx` — Minor: update copy to match new professional tone
- `src/pages/JoinPartner.tsx` — Minor: update copy
- `src/pages/Compatibility.tsx` — Keep as-is (serves as pre-results preview while waiting for partner to join). Do not merge into Results.tsx.

---

## 2. Corporate Team Report Upgrade

### 2.1 Current State

- 70 questions (60 core + 10 corporate bonus)
- Results identical to single adult test
- No multi-member features despite "up to 15 team members" in product description
- Admin can view sessions but no team aggregation

### 2.2 Flow

1. Admin creates corporate passcodes (already works)
2. Individual team members take test independently (each gets own passcode)
3. Admin navigates to Corporate Dashboard (`/admin/corporate`)
4. Admin sees all corporate sessions in a table with select checkboxes
5. Admin selects 2-15 members → clicks "Generate Team Report"
6. API aggregates results → generates `TeamReport` object → stored in DB
7. Admin views interactive team report page

### 2.3 New Data — `src/lib/corporate-data.ts`

**Team Composition Analysis:**

```ts
function analyzeTeamComposition(results: Record<string, string>[]): {
  composition: Record<string, number>;  // { Sanguine: 3, Choleric: 5, Melancholic: 2, Phlegmatic: 1 }
  percentages: Record<string, number>;  // { Sanguine: 23, Choleric: 38, ... }
  balanceScore: number;                 // 0-100, higher = more balanced
  balanceGaps: string[];                // ["Missing Phlegmatic — team may lack patience"]
  dominantStyle: string;                // "Choleric-driven team"
}
```

**Role Mapping (4 temperament roles):**

```ts
const TEAM_ROLES: Record<string, {
  role: string;
  icon: string;
  description: string;
  strengths: string[];
  idealResponsibilities: string[];
  watchOutFor: string[];
  motivators: string[];
}> = {
  Sanguine: {
    role: "The Visionary Connector",
    icon: "🌟",
    description: "Brings energy, builds relationships, and inspires the team",
    strengths: ["Team morale", "Client relations", "Brainstorming", "Public speaking"],
    idealResponsibilities: ["Client-facing roles", "Team culture", "Innovation sessions", "Networking"],
    watchOutFor: ["Follow-through on details", "Overcommitting", "Avoiding tough conversations"],
    motivators: ["Recognition", "Social connection", "Variety", "Freedom"],
  },
  Choleric: {
    role: "The Decisive Driver",
    icon: "🔥",
    description: "Takes charge, makes decisions, and pushes results forward",
    strengths: ["Decision-making", "Crisis management", "Goal achievement", "Accountability"],
    idealResponsibilities: ["Project leadership", "Strategic planning", "Closing deals", "Process ownership"],
    watchOutFor: ["Micromanagement", "Impatience", "Steamrolling quieter voices"],
    motivators: ["Results", "Authority", "Competition", "Efficiency"],
  },
  Melancholic: {
    role: "The Quality Analyst",
    icon: "🌊",
    description: "Ensures quality, catches errors, and maintains high standards",
    strengths: ["Quality assurance", "Data analysis", "Process design", "Risk identification"],
    idealResponsibilities: ["Quality control", "Research", "Documentation", "Strategic analysis"],
    watchOutFor: ["Perfectionism delays", "Overthinking", "Sensitivity to criticism"],
    motivators: ["Accuracy", "Mastery", "Structure", "Meaningful work"],
  },
  Phlegmatic: {
    role: "The Steady Mediator",
    icon: "🌿",
    description: "Keeps the peace, supports others, and maintains team stability",
    strengths: ["Conflict resolution", "Team support", "Consistency", "Reliability"],
    idealResponsibilities: ["Team support", "Process maintenance", "Mentoring", "Operations"],
    watchOutFor: ["Avoiding necessary conflict", "Resistance to change", "Low assertiveness"],
    motivators: ["Stability", "Harmony", "Appreciation", "Predictability"],
  },
};
```

**Communication Matrix (4x4):**

```ts
interface CommStyle {
  bestApproach: string;
  meetingStyle: string;
  feedbackStyle: string;
  frictionPoint: string;
  tip: string;
}

const COMMUNICATION_MATRIX: Record<string, Record<string, CommStyle>>;
```

**Conflict Risk Map:**

```ts
interface ConflictRisk {
  risk: "low" | "medium" | "high";
  description: string;
  triggers: string[];
  mitigation: string[];
}

// Pre-computed for all 16 pairs
const CONFLICT_RISKS: Record<string, Record<string, ConflictRisk>>;
```

### 2.4 Team Report Data Structure

```ts
interface TeamReport {
  id: string;
  teamId: string;
  adminId: string;
  name: string;
  memberCount: number;
  memberIds: string[];                     // session IDs
  composition: Record<string, number>;
  percentages: Record<string, number>;
  balanceScore: number;
  balanceGaps: string[];
  dominantStyle: string;
  roles: { memberId: string; memberName: string; role: string; temperament: string; icon: string }[];
  communicationMatrix: Record<string, Record<string, CommStyle>>;
  conflictRisks: { pair: [string, string]; risk: string; description: string; mitigation: string[] }[];
  recommendations: string[];
  executiveSummary: string;
  createdAt: string;
}
```

### 2.5 Corporate Dashboard — `/admin/corporate`

**Page layout:**

```
┌────────────────────────────────────────────────────┐
│  Corporate Dashboard                    [New Team] │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌─ Team Cards ──────────────────────────────────┐ │
│  │ Team A (8 members)  │ Team B (4 members)  ... │ │
│  └───────────────────────────────────────────────┘ │
│                                                    │
│  ── OR if viewing a team report: ──                │
│                                                    │
│  ┌─ Team DNA ────────────────────────────────────┐ │
│  │ [Donut chart]  Balance: 72/100                │ │
│  │ Sanguine: 23%  Choleric: 38%                 │ │
│  │ Melancholic: 27%  Phlegmatic: 12%            │ │
│  │ ⚠ Low Phlegmatic — may lack patience         │ │
│  └───────────────────────────────────────────────┘ │
│                                                    │
│  ┌─ Tabs ────────────────────────────────────────┐ │
│  │ Roles │ Communication │ Conflict │ Members │   │ │
│  └───────────────────────────────────────────────┘ │
│                                                    │
│  ┌─ Role Mapping ────────────────────────────────┐ │
│  │ 🌟 Sarah — Visionary Connector (Sanguine)     │ │
│  │ 🔥 James — Decisive Driver (Choleric)         │ │
│  │ 🌊 Priya — Quality Analyst (Melancholic)      │ │
│  │ 🌿 Tom  — Steady Mediator (Phlegmatic)        │ │
│  └───────────────────────────────────────────────┘ │
│                                                    │
│  ┌─ Executive Summary ───────────────────────────┐ │
│  │ Print-ready overview with recommendations     │ │
│  └───────────────────────────────────────────────┘ │
│                                                    │
│  [Download Team PDF]  [Download Individual PDFs]   │
└────────────────────────────────────────────────────┘
```

**Dashboard Tabs:**

| Tab | Key | Content |
|---|---|---|
| Roles | `roles` | Role mapping grid — each member with assigned role, temperament, strengths, responsibilities |
| Communication | `communication` | 4x4 communication matrix heat map |
| Conflict | `conflict` | Risk pairs ranked by risk level, with mitigation strategies |
| Members | `members` | Individual member cards (expandable): full temperament breakdown, strengths, growth areas |
| Summary | `summary` | Executive summary text + recommendations + print button |

### 2.6 New API Endpoints

```
GET  /api/corporate/sessions          — List all corporate test sessions for admin
POST /api/corporate/teams             — Create team (name + member session IDs)
GET  /api/corporate/teams             — List teams for admin
GET  /api/corporate/teams/:id         — Get team with members
POST /api/corporate/teams/:id/report  — Generate team report from member results
GET  /api/corporate/teams/:id/report  — Get generated report
```

### 2.7 New Database Table

```sql
CREATE TABLE corporate_teams (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  name TEXT NOT NULL,
  member_session_ids JSONB NOT NULL DEFAULT '[]',
  report JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.8 New Files

**Create:**
- `src/lib/corporate-data.ts` — Team roles, communication matrix, conflict risks, composition analysis
- `src/pages/admin/CorporateDashboard.tsx` — Main corporate dashboard page
- `src/components/corporate/TeamDNACard.tsx` — Donut chart + balance score (CSS-only chart)
- `src/components/corporate/RoleMappingGrid.tsx` — Role assignment display
- `src/components/corporate/CommunicationMatrix.tsx` — 4x4 heat map
- `src/components/corporate/ConflictRiskList.tsx` — Risk pairs with mitigation
- `src/components/corporate/MemberCard.tsx` — Expandable individual member view
- `src/components/corporate/ExecutiveSummary.tsx` — Print-ready summary
- `src/components/corporate/CreateTeamDialog.tsx` — Dialog to name team and select members

**Modify:**
- `server.mjs` — Add corporate team CRUD endpoints
- `lib/db.mjs` — Add corporate_teams table operations
- `src/App.tsx` — Add `/admin/corporate` route
- `src/pages/admin/AdminLayout.tsx` — Add "Corporate" nav item
- `src/pages/admin/Sessions.tsx` — Add "Generate Team Report" button for corporate sessions

### 2.9 PDF Generation

**Approach**: Client-side PDF using `html2canvas` + `jspdf` (no server-side PDF dependency).

**Individual member PDF:**
- Same as current single-test results PDF (temperament card, strengths, growth areas)

**Team PDF:**
- Cover page: Team name, date, member count, balance score
- Team DNA section: Composition breakdown
- Role Mapping: Grid of members with roles
- Communication Matrix: Simplified table
- Conflict Risks: Top risk pairs
- Executive Summary: Key findings and recommendations

**Implementation:**
- `src/lib/pdf-generation.ts` — Shared PDF generation utilities
- Reuse existing `handleDownloadPdf` pattern from Results.tsx
- Add `generateTeamReportPdf(teamReport)` function

---

## 3. Shared Concerns

### 3.1 CSS Charts (No External Chart Library)

All charts built with CSS (no Chart.js, D3, or similar):
- **Donut chart** for team composition: CSS `conic-gradient`
- **Bar charts** for score breakdowns: CSS width percentages
- **Heat map** for communication/conflict: CSS grid with background colors

### 3.2 Responsive Design

Both upgrades use existing Tailwind responsive patterns:
- Mobile: single column, stacked cards
- Desktop: side-by-side layouts, multi-column grids

### 3.3 Backward Compatibility

- Existing completed test sessions remain valid
- Old results pages still work (tabs just gain new sections)
- No data migration needed — new features use new tables

### 3.4 Data Volume

- 16 couples pairings × ~200 words each = ~3,200 words of static content
- 4 team roles × ~100 words each = ~400 words
- 16 communication pairs × ~80 words each = ~1,280 words
- 16 conflict risk pairs × ~60 words each = ~960 words
- Total new static data: ~5,800 words — all bundled client-side, no API calls needed for content

---

## 4. Implementation Order

1. **Couples data** — Write `couples-data.ts` with all 16 pairings
2. **Couples components** — Build partner comparison, love language, communication, life areas, conflict playbook components
3. **Couples Results page** — Wire new tabs and components into Results.tsx
4. **Corporate data** — Write `corporate-data.ts` with roles, comm matrix, conflict risks
5. **Corporate DB** — Add `corporate_teams` table, db.mjs operations, server.mjs endpoints
6. **Corporate dashboard** — Build dashboard page with all sub-components
7. **PDF generation** — Individual and team PDF exports
8. **Route + nav wiring** — Add routes, admin nav items, passcode type updates
9. **Build + deploy** — Test all flows end-to-end
