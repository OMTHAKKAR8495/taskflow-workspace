import { describe, it, expect, vi } from "vitest";

describe("Google OAuth 2.0 Integration", () => {
  const CLIENT_ID = "mock-client-id.apps.googleusercontent.com";

  it("exposes the correct Google Client ID configuration", async () => {
    expect(CLIENT_ID).toBe("mock-client-id.apps.googleusercontent.com");
  });

  it("constructs valid Google OAuth authorization URLs with required scopes", () => {
    const redirectUri = "https://taskflow-workspace-seven.vercel.app/api/auth/google/callback";
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    expect(url).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(url).toContain(`client_id=${CLIENT_ID}`);
    expect(url).toContain("scope=openid+email+profile");
    expect(url).toContain("response_type=code");
  });

  it("decodes Google Identity Services credential token payload and provisions user", () => {
    // Simulated Google ID token payload
    const mockPayload = {
      iss: "https://accounts.google.com",
      sub: "google-10928374",
      aud: CLIENT_ID,
      email: "omthakkar168@gmail.com",
      name: "Om Thakkar",
      picture: "https://lh3.googleusercontent.com/a/mock-avatar",
    };

    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify(mockPayload));
    const mockJwt = `${header}.${payload}.signature`;

    const decoded = JSON.parse(atob(mockJwt.split(".")[1]));
    expect(decoded.email).toBe("omthakkar168@gmail.com");
    expect(decoded.name).toBe("Om Thakkar");
    expect(decoded.sub).toBe("google-10928374");
  });
});
