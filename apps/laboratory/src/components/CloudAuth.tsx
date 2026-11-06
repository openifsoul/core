import {
  ClerkProvider,
  SignIn,
  UserAvatar,
  useAuth,
  useClerk,
  useUser,
} from "@clerk/react";
import {
  Component,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ConnectionScreen,
  RuntimeAuthContext,
  type RuntimeConfig,
} from "@/lib/runtime-auth";
import { setAPITokenProvider } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

class ClerkBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <ConnectionScreen
        title="Cloud sign-in could not load"
        retry={() => window.location.reload()}
      >
        <p>
          Check your connection, then try again. The local App does not require
          cloud sign-in.
        </p>
      </ConnectionScreen>
    ) : (
      this.props.children
    );
  }
}
function Session({
  config,
  children,
}: {
  config: RuntimeConfig;
  children: ReactNode;
}) {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const { user } = useUser();
  const { openSignIn } = useClerk();
  const previousUser = useRef<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  function clearAccountStorage(id: string) {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (
          key &&
          (key.startsWith(`ifsoul-app-draft:${id}:`) ||
            key === `ifsoul-demo-history:${id}`)
        )
          sessionStorage.removeItem(key);
      }
    } catch {
      /* In-memory views are separately keyed by account. */
    }
  }
  async function leave() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(false);
    try {
      const departingUser = user?.id;
      await signOut(() => {
        if (departingUser) clearAccountStorage(departingUser);
        window.location.assign("/");
      });
    } catch {
      setSignOutError(true);
      setSigningOut(false);
    }
  }
  useEffect(() => {
    const previous = previousUser.current;
    const next = user?.id ?? null;
    if (previous && previous !== next) {
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (
            key &&
            (key.startsWith(`ifsoul-app-draft:${previous}:`) ||
              key === `ifsoul-demo-history:${previous}`)
          )
            sessionStorage.removeItem(key);
        }
      } catch {
        /* In-memory state is keyed by account regardless of storage availability. */
      }
    }
    previousUser.current = next;
    try {
      sessionStorage.removeItem("ifsoul-demo-history");
    } catch {
      /* Never reuse unscoped legacy history. */
    }
  }, [user?.id]);
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  useLayoutEffect(() => {
    const cleanup = setAPITokenProvider(() => getToken());
    setReady(true);
    return cleanup;
  }, [getToken]);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 15000);
    return () => clearTimeout(timer);
  }, []);
  if (!isLoaded || !ready)
    return (
      <ConnectionScreen
        title={
          slow
            ? "Cloud sign-in is taking longer than expected"
            : "Checking your cloud session"
        }
        pending={!slow}
        retry={slow ? () => window.location.reload() : undefined}
      >
        <p>
          {slow
            ? "Check your connection and try loading this page again."
            : "Your characters will open after your session is checked."}
        </p>
      </ConnectionScreen>
    );
  const returnTo = window.location.pathname === "/demo" ? "/demo" : "/app";
  return (
    <RuntimeAuthContext.Provider
      value={{
        config,
        signedIn: Boolean(isSignedIn),
        userId: user?.id ?? "signed-out",
        userName:
          user?.firstName ??
          user?.primaryEmailAddress?.emailAddress ??
          "Your account",
        signIn() {
          const returnUrl = window.location.pathname + window.location.search;
          openSignIn({
            forceRedirectUrl: returnUrl,
            signUpForceRedirectUrl: returnUrl,
          });
        },
        signOut: leave,
        signInView: (
          <SignIn
            routing="hash"
            withSignUp
            forceRedirectUrl={
              new URLSearchParams(window.location.search).get("returnTo") ===
              "/demo"
                ? "/demo"
                : returnTo
            }
            signUpForceRedirectUrl={returnTo}
          />
        ),
        accountView: (
          <div className="app-cloud-account">
            <UserAvatar />
            <Button
              variant="ghost"
              size="sm"
              className="app-sign-out"
              aria-label="Sign out"
              onClick={() => void leave()}
              disabled={signingOut}
            >
              <LogOut aria-hidden="true" />
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
            {signOutError && (
              <span role="alert">Could not sign out. Try again.</span>
            )}
          </div>
        ),
      }}
    >
      <div key={user?.id ?? "signed-out"}>{children}</div>
    </RuntimeAuthContext.Provider>
  );
}
export default function CloudAuth({
  config,
  children,
}: {
  config: RuntimeConfig;
  children: ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <ClerkBoundary>
      <ClerkProvider
        publishableKey={config.clerkPublishableKey!}
        afterSignOutUrl="/"
        appearance={{
          variables: {
            colorPrimary: theme === "dark" ? "#529cca" : "#2383e2",
            colorBackground: theme === "dark" ? "#202020" : "#ffffff",
            colorForeground: theme === "dark" ? "#e6e6e5" : "#37352f",
            fontFamily: '"IBM Plex Sans Variable", sans-serif',
            borderRadius: "0.375rem",
          },
        }}
      >
        <Session config={config}>{children}</Session>
      </ClerkProvider>
    </ClerkBoundary>
  );
}
