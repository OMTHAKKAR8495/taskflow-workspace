import { useState } from "react";
import { Sparkles, Lock, User, Mail, KeyRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { GoogleSignInButton } from "@/components/common/GoogleSignInButton";

export function AuthModal() {
  const { login, register, getRegisteredAccounts } = useAuth();
  const registeredAccounts = getRegisteredAccounts();
  const [isRegister, setIsRegister] = useState(() => registeredAccounts.length === 0);

  // Login form state
  const [username, setUsername] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("taskflow:last_username") || "omthakkar";
    }
    return "omthakkar";
  });
  const [password, setPassword] = useState("");

  // Register form state
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const handleLogin = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!username.trim() || !password.trim()) {
      toast.error("Please enter both User ID and Password.");
      return;
    }
    const success = await login(username, password);
    if (success) {
      toast.success("Welcome back to TaskFlow!");
    } else {
      toast.error("Invalid ID or Password. Please try again.");
    }
  };

  const handleRegister = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!regFullName.trim() || !regEmail.trim() || !regUsername.trim() || !regPassword.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    const success = await register(regFullName, regEmail, regUsername, regPassword);
    if (success) {
      toast.success("Account created successfully! Welcome to TaskFlow.");
    } else {
      toast.error("That username is already taken. Please choose another.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-3 sm:p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 sm:p-8 shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
            <Sparkles className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isRegister ? "Create TaskFlow Account" : "Welcome to TaskFlow"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {isRegister
              ? "Sign up with your name and email to access your workspace"
              : "Sign in with your workspace ID and password"}
          </p>
        </div>

        {!isRegister ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-id">User ID</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="login-id"
                  placeholder="Enter User ID"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9 h-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-pass">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="login-pass"
                  type="password"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-10 font-semibold shadow-sm shadow-primary/25">
              Sign In <ArrowRight className="size-4 ml-1.5" />
            </Button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-medium">Or continue with</span>
              </div>
            </div>

            <GoogleSignInButton label="Sign in with Google" />

            <div className="rounded-lg bg-muted/60 p-2.5 text-center text-xs text-muted-foreground border">
              Default access: <span className="font-medium text-foreground">omthakkar</span> /{" "}
              <span className="font-medium text-foreground">thakkar2912</span>
              <button
                type="button"
                onClick={() => {
                  setUsername("omthakkar");
                  setPassword("thakkar2912");
                }}
                className="ml-2 underline text-primary cursor-pointer hover:text-primary/80"
              >
                Auto-fill
              </button>
            </div>

            <div className="pt-2 text-center text-xs text-muted-foreground">
              Not registered yet?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className="font-semibold text-primary hover:underline"
              >
                Create an account
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reg-name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="reg-name"
                  placeholder="e.g. Alex Morgan"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="pl-9 h-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="e.g. alex@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="pl-9 h-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-id">Desired User ID</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="reg-id"
                  placeholder="e.g. alexmorgan"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="pl-9 h-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-pass">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="reg-pass"
                  type="password"
                  placeholder="Choose a password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="pl-9 h-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-10 font-semibold shadow-sm shadow-primary/25">
              Complete Registration <ArrowRight className="size-4 ml-1.5" />
            </Button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-medium">Or sign up with</span>
              </div>
            </div>

            <GoogleSignInButton label="Sign up with Google" />

            <div className="pt-2 text-center text-xs text-muted-foreground">
              Already have an ID?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="font-semibold text-primary hover:underline"
              >
                Sign in with existing ID
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
