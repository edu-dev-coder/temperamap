import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import FrederaLogo from "@/components/FrederaLogo";
import { Lock } from "lucide-react";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

export function AdminGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem("admin_auth") === "true",
  );
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState(false);

  if (authenticated) return <>{children}</>;

  const handleLogin = () => {
    if (ADMIN_PASSWORD && passwordInput === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_auth", "true");
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-8 text-center space-y-6">
          <FrederaLogo size="md" />
          <div className="space-y-2">
            <Lock className="h-10 w-10 text-primary mx-auto" />
            <h2 className="text-xl font-bold">Admin Access</h2>
            <p className="text-sm text-muted-foreground">
              Enter the admin password to continue.
            </p>
          </div>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Admin password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className={error ? "border-destructive" : ""}
            />
            {error && <p className="text-sm text-destructive">Incorrect password</p>}
            <Button onClick={handleLogin} className="w-full">
              Enter Admin Panel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
