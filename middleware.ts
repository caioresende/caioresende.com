// Vercel Routing Middleware: password-protects the Rogers and Clio case studies and their media.
// Runs only on Vercel — the Vite dev server serves these paths without a password.

export const config = {
  matcher: [
    "/rogers",
    "/rogers.html",
    "/images/case-studies/rogers/:path*",
    "/images/optimized/case-studies/rogers/:path*",
    "/clio",
    "/clio.html",
    "/images/case-studies/clio/:path*",
    "/images/optimized/case-studies/clio/:path*",
  ],
};

// SHA-256 of the password. The repo is public, so the password itself never lives here.
const PASSWORD_HASH = "e5d31891b8ac9e146e4c28b973f4af4b9d0d8c34af61ea31fcddb1ae5d29803c";
const COOKIE = "case_study_access";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
// Protected pages and the copy shown on their password screen.
const ROGERS = { eyebrow: "UX Case Study · Rogers", title: "The Wireless Dashboard Redesign" };
const CLIO = { eyebrow: "Case Studies · Clio", title: "Making Legal Work Clear at Clio" };
const PAGES: Record<string, { eyebrow: string; title: string }> = {
  "/rogers": ROGERS,
  "/rogers.html": ROGERS,
  "/clio": CLIO,
  "/clio.html": CLIO,
};

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function isValid(password: string | null | undefined): Promise<boolean> {
  if (!password) return false;
  return (await sha256(password)) === PASSWORD_HASH;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function gatePage(page: { eyebrow: string; title: string }, error: boolean): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex" />
  <title>${page.title} — Caio Resende</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Gabarito:wght@400..900&display=swap" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: "Gabarito", system-ui, -apple-system, sans-serif;
      color: #1d1d1f;
      background: #fff;
      -webkit-font-smoothing: antialiased;
    }
    .gate {
      width: 100%;
      max-width: 480px;
      padding: 48px 40px;
      border-radius: 20px;
      background: linear-gradient(180deg, #FCEBEB, #f6f6f6);
    }
    .eyebrow {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #86868b;
      margin-bottom: 0.75rem;
    }
    h1 {
      font-size: clamp(1.75rem, 5vw, 2.25rem);
      font-weight: 500;
      line-height: 1.1;
      letter-spacing: -0.02em;
      margin-bottom: 1rem;
    }
    p { font-size: 1rem; line-height: 1.6; color: #424245; margin-bottom: 1.5rem; }
    form { display: flex; flex-direction: column; gap: 0.75rem; }
    input {
      font: inherit;
      font-size: 1rem;
      padding: 0.85rem 1rem;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 12px;
      background: #fff;
      color: #1d1d1f;
    }
    input:focus { outline: 2px solid #1d1d1f; outline-offset: 1px; }
    button {
      font: inherit;
      font-size: 1rem;
      font-weight: 600;
      padding: 0.85rem 1rem;
      border: 0;
      border-radius: 12px;
      background: #1d1d1f;
      color: #fff;
      cursor: pointer;
    }
    button:hover { background: #3a3a3c; }
    .error { font-size: 0.9rem; color: #c33; margin: 0; }
    .back { display: inline-block; margin-top: 1.5rem; font-size: 0.9rem; color: #86868b; text-decoration: none; }
    .back:hover { color: #1d1d1f; }
  </style>
</head>
<body>
  <main class="gate">
    <p class="eyebrow">${page.eyebrow}</p>
    <h1>${page.title}</h1>
    <p>This case study is password protected. Enter the password to continue.</p>
    <form method="POST">
      <input type="password" name="password" placeholder="Password" aria-label="Password" autocomplete="current-password" required autofocus />
      ${error ? '<p class="error" role="alert">That password didn\'t work. Try again.</p>' : ""}
      <button type="submit">View case study</button>
    </form>
    <a class="back" href="/">← Back to portfolio</a>
  </main>
</body>
</html>`;
  return new Response(html, {
    status: 401,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  const page = PAGES[url.pathname];

  if (page && request.method === "POST") {
    const form = await request.formData();
    const password = String(form.get("password") || "");
    if (!(await isValid(password))) return gatePage(page, true);
    // Secure only over HTTPS, so the cookie also sticks on http://localhost in dev.
    const secure = url.protocol === "https:" ? "; Secure" : "";
    return new Response(null, {
      status: 303,
      headers: {
        location: url.pathname,
        "set-cookie": `${COOKIE}=${encodeURIComponent(password)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly${secure}; SameSite=Lax`,
      },
    });
  }

  // Valid cookie: continue to the static file.
  if (await isValid(readCookie(request, COOKIE))) return undefined;

  if (page) return gatePage(page, false);
  return new Response("Password required", {
    status: 401,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
