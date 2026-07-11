import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import FrederaLogo from "@/components/FrederaLogo";

const TESTS = [
  {
    product: "child_3_5",
    testType: "child_3_5",
    title: "Ages 3–5 — Early Childhood",
    emoji: "👶",
    desc: "Parent-guided assessment for young children. Discover temperament, best learning approach, discipline style, and how this child expresses love.",
    highlights: ["Parent answers 60 questions", "Learning style for ages 3–5", "Best discipline approach", "Love expression style", "What hurts this child", "Parenting guide PDF"],
    popular: false,
  },
  {
    product: "child_6_9",
    testType: "child_6_9",
    title: "Ages 6–9 — Children",
    emoji: "📖",
    desc: "For school-age children. Reveals learning preferences, friendship patterns, leadership potential, and the best way to relate with this child.",
    highlights: ["School & friendship profile", "Learning style analysis", "Leadership potential", "Discipline that works", "How to encourage", "Teaching guide PDF"],
    popular: false,
  },
  {
    product: "preteen_10_12",
    testType: "preteen_10_12",
    title: "Ages 10–12 — Pre-Teen",
    emoji: "🌟",
    desc: "Pre-teen temperament mapping. Understand their social world, academic strengths, emotional needs, and how to guide them through this critical stage.",
    highlights: ["Social & academic profile", "Emotional needs guide", "Leadership style", "How to discipline", "How to build confidence", "Parent & teacher guide"],
    popular: false,
  },
  {
    product: "teen_13_17",
    testType: "teen_13_17",
    title: "Ages 13–17 — Teenager",
    emoji: "☀️",
    desc: "Teenager assessment covering identity, relationships, future direction, and how parents can best support their unique temperament.",
    highlights: ["Identity & future direction", "Relationship patterns", "Career inclination", "How to correct & encourage", "Emotional triggers", "Parenting guide PDF"],
    popular: false,
  },
  {
    product: "single_test",
    testType: "single_test",
    title: "Adult Test",
    emoji: "🧠",
    desc: "Full adult temperament assessment. Temperament blend, strengths, careers, relationships, and emotional profile.",
    highlights: ["60 well-crafted questions", "Temperament blend result", "Career suggestions", "Relationship insights", "PDF report download"],
    popular: true,
  },
  {
    product: "couples_test",
    testType: "couples_test",
    title: "Couples Compatibility",
    emoji: "👫",
    desc: "Marriage-focused compatibility analysis: love languages, conflict areas, communication strategy, and temperament blends for both partners.",
    highlights: ["Partner temperament maps", "Compatibility score", "Conflict areas guide", "Love language match", "Communication strategy"],
    popular: false,
  },
  {
    product: "corporate_team",
    testType: "corporate_team",
    title: "Corporate Team",
    emoji: "🏢",
    desc: "World-class workplace temperament profiling for up to 15 team members. Includes leadership profiles, team dynamics report, and executive PDF summaries.",
    highlights: ["Up to 15 team members", "Leadership style profiles", "Team dynamics & role mapping", "Communication style guides", "Career fit recommendations", "Executive PDF for each member"],
    popular: false,
  },
];

export default function SelectTest() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [passcodeDialog, setPasscodeDialog] = useState<{ product: string; testType: string } | null>(null);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [validating, setValidating] = useState(false);

  const createSession = useMutation({
    mutationFn: async ({ testType, passcode }: { testType: string; passcode: string }) => {
      const r = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, testType, passcode }),
      });
      if (!r.ok) throw new Error("Failed to create session");
      return r.json() as Promise<{ id: string }>;
    },
    onSuccess: (session) => {
      setLocation(`/test/${session.id}`);
    },
    onError: () => {
      toast({ title: "Error", description: "Could not create test session. Please try again.", variant: "destructive" });
      setSelectedProduct(null);
    },
  });

  const handleSelect = (product: string, testType: string) => {
    setSelectedProduct(product);
    setPasscodeDialog({ product, testType });
    setPasscodeInput("");
  };

  const handleValidatePasscode = async () => {
    if (!passcodeDialog || !passcodeInput.trim()) return;
    setValidating(true);
    try {
      const r = await fetch("/api/passcodes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: passcodeInput.trim(), testType: passcodeDialog.testType }),
      });
      const data = await r.json() as { valid: boolean; message?: string };
      if (data.valid) {
        setPasscodeDialog(null);
        createSession.mutate({ testType: passcodeDialog.testType, passcode: passcodeInput.trim() });
      } else {
        toast({ title: "Invalid Passcode", description: data.message ?? "Passcode not valid for this test type", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not validate passcode", variant: "destructive" });
    } finally {
      setValidating(false);
    }
  };

  const selectedTest = passcodeDialog
    ? TESTS.find((t) => t.product === passcodeDialog.product)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-white px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => setLocation("/dashboard")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-white/60">←</span>
            <span className="text-white/80 text-sm">Dashboard</span>
          </button>
          <FrederaLogo size="sm" onDark />
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-primary mb-3">Choose Your Test Package</h1>
          <p className="text-muted-foreground text-lg">
            Select your assessment category and enter your passcode to begin.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTS.map(test => (
            <Card
              key={test.product}
              className={`relative overflow-hidden transition-all hover:shadow-lg cursor-pointer border-2 ${
                test.popular ? "border-accent" : "border-border hover:border-primary/40"
              }`}
            >
              {test.popular && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />
              )}
              {test.popular && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-accent text-white border-0 text-xs">POPULAR</Badge>
                </div>
              )}
              <CardContent className="p-6">
                <div className="text-4xl mb-3">{test.emoji}</div>
                <h2 className="text-lg font-bold text-primary mb-1">{test.title}</h2>
                <p className="text-sm text-muted-foreground mb-5">{test.desc}</p>
                <ul className="space-y-2 mb-6">
                  {test.highlights.map(h => (
                    <li key={h} className="text-sm flex items-center gap-2">
                      <span className="text-green-500 font-bold">✓</span>
                      <span className="text-foreground">{h}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full font-semibold bg-primary hover:bg-primary/90 text-white"
                  disabled={createSession.isPending}
                  onClick={() => handleSelect(test.product, test.testType)}
                >
                  {createSession.isPending && selectedProduct === test.product
                    ? "Creating session..."
                    : "Select"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 max-w-lg mx-auto bg-muted/30 border border-border rounded-2xl p-6 text-center">
          <h3 className="font-bold text-primary text-base mb-2">Need a passcode?</h3>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Contact us to purchase access to your preferred assessment.
            Once we confirm your payment, we will send you a one-time passcode via your preferred channel.
          </p>
          <div className="text-sm text-left space-y-2 bg-white border border-border rounded-xl p-4">
            <p className="font-semibold text-primary">📞 Call us:</p>
            <p className="text-foreground">+234 800 000 0000</p>
            <p className="font-semibold text-primary mt-3">📧 Email us:</p>
            <p className="text-foreground">support@fredora.com</p>
            <p className="font-semibold text-primary mt-3">🏦 Bank Transfer:</p>
            <p className="text-foreground">Access Bank — 1487059923 — Fredora Multiconcept</p>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Your data is private and never shared
        </p>
      </div>

      {/* Passcode Dialog */}
      {passcodeDialog && selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">{selectedTest.emoji}</div>
              <h2 className="text-lg font-bold text-primary">{selectedTest.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter your one-time passcode to unlock</p>
            </div>
            <Input
              placeholder="TM-XXXXXX"
              value={passcodeInput}
              onChange={e => setPasscodeInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleValidatePasscode()}
              className="text-center text-lg font-mono uppercase tracking-widest mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setPasscodeDialog(null); setSelectedProduct(null); }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
                onClick={handleValidatePasscode}
                disabled={validating || !passcodeInput.trim()}
              >
                {validating ? "Validating..." : "Unlock"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
