import { useTheme } from "../lib/theme";
import { BrandMark } from "./BrandMark";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const support = "mailto:willekb@gmail.com";
export function ServicePolicies({ page }: { page: "privacy" | "terms" }) {
  useTheme();
  const privacy = page === "privacy";
  return (
    <main className="service-policy">
      <header>
        <a href="/" className="wordmark">
          <BrandMark size={34} />
          <span>IfSoul</span>
        </a>
        <Button asChild variant="outline">
          <a href="/app">Open IfSoul App</a>
        </Button>
      </header>
      <Card>
        <CardHeader>
          <p className="text-sm text-muted-foreground">
            Updated 6 November 2026 · Hosted IfSoul App
          </p>
          <CardTitle>
            <h1>{privacy ? "Privacy notice" : "Terms of use"}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="policy-copy">
          {privacy ? (
            <>
              <p>
                This notice describes the hosted IfSoul App at
                ifsoul.h3lpkey.com. A separately operated self-hosted
                installation has its own operator and configuration. For
                questions or a deletion request, contact{" "}
                <a href={support}>willekb@gmail.com</a>.
              </p>
              <h2>Sign-in and account identity</h2>
              <p>
                Cloud sign-in uses Clerk with Google or verified email. Clerk
                processes account and session information, including the email
                address and profile information supplied during sign-in. IfSoul
                verifies a Clerk session and stores its user identifier to
                select a separate application store for that account. Google
                sign-in is used for authentication; this release does not
                request access to your Gmail, Drive or Calendar.
              </p>
              <h2>Characters, conversations and API keys</h2>
              <p>
                The cloud App stores the character profiles you create or
                import, messages you submit, generated replies, selected memory
                and operation records in its server database. Account stores are
                separated by the verified sign-in identity. The service operator
                and hosting infrastructure can process this data to run and
                support the service; conversations are not end-to-end encrypted.
              </p>
              <p>
                If you add an OpenAI API key in Settings, the server stores it
                encrypted with a server-side deployment key, separately from
                character conversation records. The server decrypts it when
                calling the selected provider. Disconnecting the key removes the
                server's stored copy; revoke it with the provider if you want to
                invalidate the credential itself. Do not send API keys in chat.
              </p>
              <h2>Model providers and local mode</h2>
              <p>
                A model request sends your current message or game context and a
                bounded selection of relevant character history to the provider
                selected for that operation. Hosted owner-funded inference uses
                Cloudflare Workers AI; OpenAI is available with your own key. A
                local installation can use Ollama, or a configured remote
                provider. Local mode needs no Clerk account and keeps its
                application store on the computer running that installation;
                choosing a remote model still sends its request to that
                provider.
              </p>
              <p>
                Scenario mode does not call an inference model. It does not
                prevent ordinary App conversations from being saved by the App.
                Provider processing and retention follow the selected provider's
                terms and configuration; IfSoul does not promise that deleting
                its own copy deletes a provider's records. See{" "}
                <a href="https://clerk.com/legal/privacy">
                  Clerk privacy information
                </a>
                ,{" "}
                <a href="https://developers.cloudflare.com/workers-ai/platform/data-usage/">
                  Cloudflare Workers AI data usage
                </a>{" "}
                and{" "}
                <a href="https://developers.openai.com/api/docs/guides/your-data">
                  OpenAI API data controls
                </a>
                .
              </p>
              <h2>Browser storage, demos and operational records</h2>
              <p>
                The browser saves the theme preference, account-scoped unsent
                drafts and a bounded demo history for the current tab. A demo
                sends recent history when you request model mode. The demo
                inference service treats that text as unverified and uses
                request-local memory rather than appending it to your permanent
                App character history. Persistent server quota and replay
                records help limit paid requests. Hosting and authentication
                providers also process technical request and security
                information to operate their services.
              </p>
              <h2>Retention and deletion</h2>
              <p>
                App records currently have no automatic expiration schedule.
                Reset visit clears the selected demo's browser history; it does
                not delete App conversation records, provider records or server
                quota accounting. Signing out is not a server-data deletion
                operation.
              </p>
              <p>
                To request deletion of your hosted App data or help with your
                account, email <a href={support}>willekb@gmail.com</a> and
                identify the account you used. Requests are handled manually and
                may require account verification. There is no instant
                account/history deletion control or guaranteed deletion deadline
                in the current App. Any infrastructure backups, security records
                or provider copies need separate review; no immediate deletion
                from all systems is promised. Do not email API keys, passwords
                or entire private conversation archives.
              </p>
            </>
          ) : (
            <>
              <p>
                IfSoul is an experimental character, conversation and
                game-bridge service. These terms describe use of the hosted App;
                the open-source software has its own{" "}
                <a href="https://github.com/openifsoul/core/blob/main/LICENSE">
                  Apache-2.0 license
                </a>{" "}
                and included third-party notices.
              </p>
              <h2>Your use of the App</h2>
              <p>
                Use an account you control and submit only information you are
                entitled to use. Keep credentials private. Do not attempt to
                access another account's data, bypass request limits or security
                checks, or use the service unlawfully. You are responsible for
                the content you submit and decisions you make from a generated
                reply.
              </p>
              <h2>Experimental behavior and availability</h2>
              <p>
                Generated responses can be inaccurate or unsuitable. A game or
                host decides whether to adopt a proposed action; dialogue is not
                proof an action occurred. The service, supported models and
                limits may change, and uninterrupted access, permanent storage
                or a particular model result is not guaranteed. Your own
                inference provider may charge for requests using your API key,
                including unsuccessful or timed-out work.
              </p>
              <h2>Data and help</h2>
              <p>
                The <a href="/privacy">privacy notice</a> explains account data,
                conversations, provider requests, retention limits and the
                current manual deletion process. For service questions or
                account assistance, contact{" "}
                <a href={support}>willekb@gmail.com</a>.
              </p>
            </>
          )}
        </CardContent>
      </Card>
      <footer>
        <a href="/">Home</a>
        <a href={privacy ? "/terms" : "/privacy"}>
          {privacy ? "Terms of use" : "Privacy notice"}
        </a>
        <a href={support}>Support</a>
      </footer>
    </main>
  );
}
