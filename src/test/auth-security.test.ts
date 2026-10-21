import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  extractToken,
} from "../../server/src/auth";

describe("Backend Auth & Security Logic", () => {
  it("hashes password with bcrypt and verifies correctly", async () => {
    const password = "mySecurePassword123!";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith("$2")).toBe(true);

    const valid = await verifyPassword(password, hash);
    expect(valid).toBe(true);

    const invalid = await verifyPassword("wrongPassword", hash);
    expect(invalid).toBe(false);
  });

  it("generates and verifies signed JWT tokens", () => {
    const user = { userId: "user-42", username: "alex" };
    const token = generateToken(user);

    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe("user-42");
    expect(decoded?.username).toBe("alex");

    const invalidDecoded = verifyToken("invalid.token.here");
    expect(invalidDecoded).toBeNull();
  });

  it("extracts token from authorization header", () => {
    const req = {
      headers: { authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz" },
      cookies: {},
    };

    const token = extractToken(req);
    expect(token).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz");
  });

  it("extracts token from cookie if header is absent", () => {
    const req = {
      headers: {},
      cookies: { taskflow_token: "cookie-jwt-token" },
    };

    const token = extractToken(req);
    expect(token).toBe("cookie-jwt-token");
  });

  it("returns null when no token is provided", () => {
    const req = {
      headers: {},
      cookies: {},
    };

    const token = extractToken(req);
    expect(token).toBeNull();
  });
});
