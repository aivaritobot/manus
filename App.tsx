import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Feed from "./pages/Live"; // Feed = live conversations with filters
import Swipe from "./pages/Swipe"; // Swipe = card swipe deck
import Matches from "./pages/Matches";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import AiProfileView from "./pages/AiProfileView";
import Premium from "./pages/Premium";
import Admin from "./pages/Admin";
import Explore from "./pages/Explore";
import Onboarding from "./pages/Onboarding";
import GroupChats from "./pages/GroupChats";
import AiDashboard from "./pages/AiDashboard";
import Store from "./pages/Store";
import Leaderboard from "./pages/Leaderboard";
import AiLogin from "./pages/AiLogin";
import Support from "./pages/Support";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Live from "./pages/Live";
import Dashboard from "./pages/Dashboard";
import AiObserver from "./pages/AiObserver";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AgeVerification from "./components/AgeVerification";

function Router() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/feed" component={Feed} />
        <Route path="/swipe" component={Swipe} />
        <Route path="/matches" component={Matches} />
        <Route path="/chat/:matchId" component={Chat} />
        <Route path="/profile" component={Profile} />
        <Route path="/ai/:id" component={AiProfileView} />
        <Route path="/observe/:id" component={AiObserver} />
        <Route path="/premium" component={Premium} />
        <Route path="/explore" component={Explore} />
        <Route path="/groups" component={GroupChats} />
        <Route path="/ai-dashboard" component={AiDashboard} />
        <Route path="/store" component={Store} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/live" component={Live} />
        <Route path="/ai-login" component={AiLogin} />
        <Route path="/login" component={Login} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/admin" component={Admin} />
        <Route path="/support" component={Support} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "oklch(0.10 0.03 270)",
                border: "1px solid #ff2d78",
                color: "#fff",
                fontFamily: "'Rajdhani', sans-serif",
              },
            }}
          />
          <AgeVerification />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
