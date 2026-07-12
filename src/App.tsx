import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AdminGate } from "@/pages/admin/AdminGate";

const Landing = lazy(() => import("@/pages/Landing"));
const SignInPage = lazy(() => import("@/pages/SignInPage"));
const SignUpPage = lazy(() => import("@/pages/SignUpPage"));
const SelectTest = lazy(() => import("@/pages/SelectTest"));
const Payment = lazy(() => import("@/pages/Payment"));
const TakeTest = lazy(() => import("@/pages/TakeTest"));
const Results = lazy(() => import("@/pages/Results"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const InvitePartner = lazy(() => import("@/pages/InvitePartner"));
const JoinPartner = lazy(() => import("@/pages/JoinPartner"));
const Compatibility = lazy(() => import("@/pages/Compatibility"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminTestimonials = lazy(() => import("@/pages/admin/Testimonials"));
const AdminFAQs = lazy(() => import("@/pages/admin/FAQs"));
const AdminFeatures = lazy(() => import("@/pages/admin/Features"));
const AdminSessions = lazy(() => import("@/pages/admin/Sessions"));
const AdminUsers = lazy(() => import("@/pages/admin/Users"));
const AdminPasscodes = lazy(() => import("@/pages/admin/Passcodes"));
const AdminSettings = lazy(() => import("@/pages/admin/Settings"));
const CorporateDashboard = lazy(() => import("@/pages/admin/CorporateDashboard"));
const NotFound = lazy(() => import("@/pages/not-found"));

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function Spinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Spinner />}>{children}</Suspense>;
}

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (user) return <Redirect to="/dashboard" />;
  return <Landing />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) setLocation("/sign-in");
  }, [user, isLoading, setLocation]);

  if (isLoading) return <Spinner />;
  if (!user) return null;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in">
            <LazyRoute><SignInPage /></LazyRoute>
          </Route>
          <Route path="/sign-up">
            <LazyRoute><SignUpPage /></LazyRoute>
          </Route>
          <Route path="/terms">
            <LazyRoute><Terms /></LazyRoute>
          </Route>
          <Route path="/privacy">
            <LazyRoute><Privacy /></LazyRoute>
          </Route>
          <Route path="/dashboard">
            <ProtectedRoute><LazyRoute><Dashboard /></LazyRoute></ProtectedRoute>
          </Route>
          <Route path="/select-test">
            <ProtectedRoute><LazyRoute><SelectTest /></LazyRoute></ProtectedRoute>
          </Route>
          <Route path="/payment/:sessionId">
            <ProtectedRoute><LazyRoute><Payment /></LazyRoute></ProtectedRoute>
          </Route>
          <Route path="/test/:sessionId">
            <ProtectedRoute><LazyRoute><TakeTest /></LazyRoute></ProtectedRoute>
          </Route>
          <Route path="/results/:sessionId">
            <ProtectedRoute><LazyRoute><Results /></LazyRoute></ProtectedRoute>
          </Route>
          <Route path="/invite-partner/:sessionId">
            <ProtectedRoute><LazyRoute><InvitePartner /></LazyRoute></ProtectedRoute>
          </Route>
          <Route path="/join-partner/:sessionId">
            <LazyRoute><JoinPartner /></LazyRoute>
          </Route>
          <Route path="/compatibility/:sessionId">
            <ProtectedRoute><LazyRoute><Compatibility /></LazyRoute></ProtectedRoute>
          </Route>
          <Route path="/admin">{() => { window.location.href = "/admin/dashboard"; return null; }}</Route>
          <Route path="/admin/dashboard">
            <AdminGate><LazyRoute><AdminDashboard /></LazyRoute></AdminGate>
          </Route>
          <Route path="/admin/testimonials">
            <AdminGate><LazyRoute><AdminTestimonials /></LazyRoute></AdminGate>
          </Route>
          <Route path="/admin/faqs">
            <AdminGate><LazyRoute><AdminFAQs /></LazyRoute></AdminGate>
          </Route>
          <Route path="/admin/features">
            <AdminGate><LazyRoute><AdminFeatures /></LazyRoute></AdminGate>
          </Route>
          <Route path="/admin/sessions">
            <AdminGate><LazyRoute><AdminSessions /></LazyRoute></AdminGate>
          </Route>
          <Route path="/admin/users">
            <AdminGate><LazyRoute><AdminUsers /></LazyRoute></AdminGate>
          </Route>
          <Route path="/admin/passcodes">
            <AdminGate><LazyRoute><AdminPasscodes /></LazyRoute></AdminGate>
          </Route>
          <Route path="/admin/settings">
            <AdminGate><LazyRoute><AdminSettings /></LazyRoute></AdminGate>
          </Route>
          <Route path="/admin/corporate">
            <AdminGate><LazyRoute><CorporateDashboard /></LazyRoute></AdminGate>
          </Route>
          <Route>
            <LazyRoute><NotFound /></LazyRoute>
          </Route>
        </Switch>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </WouterRouter>
  );
}

export default App;
