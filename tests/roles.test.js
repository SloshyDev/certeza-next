import { describe, it, expect } from "vitest";
import { hasRole } from "../src/lib/roles.js";

describe("hasRole", () => {
  it("permite acceso si el usuario tiene alguno de los roles requeridos", () => {
    const session = { user: { roles: ["editor"] } };
    expect(hasRole(session, ["admin", "editor"])).toBe(true);
  });
  it("deniega acceso si el usuario no tiene roles requeridos", () => {
    const session = { user: { roles: ["viewer"] } };
    expect(hasRole(session, ["admin"])).toBe(false);
  });
  it("maneja ausencia de roles", () => {
    const session = { user: {} };
    expect(hasRole(session, ["viewer"])).toBe(false);
  });
});

