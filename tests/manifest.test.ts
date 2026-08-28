// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { binaryArtifactManifest } from "../src/index";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as {
  name: string;
  files: string[];
  exports: Record<string, unknown>;
  cinatra: {
    apiVersion: string;
    kind: string;
    displayName: string;
    vendor: { key: string; name: string };
    dependencies: unknown[];
    artifact: {
      accepts: { file: { mimeTypes: string[] } };
      ui: {
        abiVersion: number;
        sdkAbiRange: string;
        renderers: Record<string, { entry: string; propsApiVersion: number; representations?: string[] }>;
      };
      objectTypes: Array<{
        type: string;
        claim: string;
        dispositions: Record<string, unknown>;
        schema: Record<string, unknown>;
      }>;
    };
  };
};

const MIMES = ["application/octet-stream"];

const ARTIFACT_ALLOWED_CINATRA_KEYS = new Set([
  "kind",
  "apiVersion",
  "artifact",
  "dependencies",
  "roles",
  "displayName",
  "vendor",
]);
const ARTIFACT_UI_RENDERER_ALLOWED_KEYS = new Set(["entry", "propsApiVersion", "representations"]);

/** The key the host's manifest generator derives from a renderer entry: the
 * entry path minus its source extension. A display is published only at THIS
 * key — the generator refuses to generate when nothing resolves it. */
function generatorExportsKeyForEntry(entry: string): string {
  return `./${entry.replace(/^\.\//, "").replace(/\.(ts|tsx)$/, "")}`;
}

describe("package.json manifest — the system-base binary identity", () => {
  it("names the package per the @cinatra-ai/<slug>-artifact convention", () => {
    expect(pkg.name).toBe("@cinatra-ai/binary-artifact");
  });

  it("declares the first-party artifact identity", () => {
    expect(pkg.cinatra.kind).toBe("artifact");
    expect(pkg.cinatra.apiVersion).toBe("cinatra.ai/v1");
    expect(pkg.cinatra.displayName).toBe("Binary");
    expect(pkg.cinatra.vendor).toEqual({ key: "cinatra-ai", name: "Cinatra" });
  });

  it("omits dependency edges (a system base is platform-guaranteed)", () => {
    expect(pkg.cinatra.dependencies).toEqual([]);
  });

  it("declares only the allowed top-level cinatra.* keys", () => {
    for (const k of Object.keys(pkg.cinatra)) {
      expect(ARTIFACT_ALLOWED_CINATRA_KEYS.has(k)).toBe(true);
    }
    expect("skills" in pkg.cinatra.artifact).toBe(false);
  });

  it("ACCEPTS application/octet-stream ALONE — bytes of no known form, nothing else", () => {
    expect(pkg.cinatra.artifact.accepts.file.mimeTypes).toEqual(MIMES);
    expect(pkg.cinatra.artifact.ui.renderers.detail.representations).toEqual(MIMES);
    for (const m of pkg.cinatra.artifact.accepts.file.mimeTypes) {
      expect(m.includes("*")).toBe(false);
    }
  });

  it("claims no text, image, pdf, archive or media form (the sibling bases own those)", () => {
    const foreign = [
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/pdf",
      "application/zip",
      "image/png",
      "audio/mpeg",
      "video/mp4",
    ];
    for (const m of foreign) {
      expect(pkg.cinatra.artifact.accepts.file.mimeTypes).not.toContain(m);
    }
  });

  it("declares a strict v1 ui block bound to the generated host SDK ABI range", () => {
    const ui = pkg.cinatra.artifact.ui;
    expect(ui.abiVersion).toBe(1);
    expect(ui.sdkAbiRange).toBe("^2.5.0");
    expect(Object.keys(ui.renderers)).toEqual(["detail"]);
  });

  it("the detail renderer requests NO host ports (v1 no-ports contract)", () => {
    const detail = pkg.cinatra.artifact.ui.renderers.detail;
    for (const k of Object.keys(detail)) {
      expect(ARTIFACT_UI_RENDERER_ALLOWED_KEYS.has(k)).toBe(true);
    }
    expect(detail.propsApiVersion).toBe(1);
  });

  it("points the detail entry at a package-contained subpath that exists", () => {
    const entry = pkg.cinatra.artifact.ui.renderers.detail.entry;
    expect(entry).toBe("./src/renderers/detail.tsx");
    expect(entry.startsWith("./")).toBe(true);
    expect(entry.includes("..")).toBe(false);
    const resolved = fileURLToPath(new URL(`../${entry.slice(2)}`, import.meta.url));
    expect(() => readFileSync(resolved, "utf8")).not.toThrow();
  });

  it("declares exactly one dedicated objectTypes claim for the upload type map", () => {
    const claims = pkg.cinatra.artifact.objectTypes;
    expect(Array.isArray(claims)).toBe(true);
    expect(claims).toHaveLength(1);
    const claim = claims[0];
    expect(claim.type).toBe("@cinatra-ai/binary-artifact:artifact");
    expect(claim.claim).toBe("dedicated");
    expect(claim.dispositions).toEqual({
      projection: "artifact-safe",
      pinnable: false,
      snapshotPolicy: "none",
      sensitivity: "normal",
    });
    expect(claim.schema).toEqual({ type: "object" });
  });

  it("keeps the typed src manifest in agreement with package.json", () => {
    expect(binaryArtifactManifest.accepts).toEqual(pkg.cinatra.artifact.accepts);
    expect(binaryArtifactManifest.ui).toEqual(pkg.cinatra.artifact.ui);
  });
});

describe("package.json exports — the display is published by the package itself", () => {
  it("declares an exports subpath map (never a bare sugar target)", () => {
    expect(typeof pkg.exports).toBe("object");
    expect(Array.isArray(pkg.exports)).toBe(false);
    for (const key of Object.keys(pkg.exports)) {
      expect(key.startsWith(".")).toBe(true);
    }
  });

  it("publishes EVERY declared renderer at the generator's key", () => {
    for (const renderer of Object.values(pkg.cinatra.artifact.ui.renderers)) {
      const key = generatorExportsKeyForEntry(renderer.entry);
      expect(Object.keys(pkg.exports)).toContain(key);
      expect(pkg.exports[key]).toBe(renderer.entry);
    }
  });

  it("names no PATTERN subpath — the imported specifier is never a function of an internal path", () => {
    for (const key of Object.keys(pkg.exports)) {
      expect(key.includes("*")).toBe(false);
    }
  });

  it("resolves the display through a PORTABLE target, never behind a node-only condition", () => {
    const key = generatorExportsKeyForEntry(pkg.cinatra.artifact.ui.renderers.detail.entry);
    const target = pkg.exports[key];
    // A plain string target is unconditional; a conditions object would have to
    // carry `import` or `default` to resolve for every consumer of the map.
    if (typeof target === "string") {
      expect(target.startsWith("./")).toBe(true);
    } else {
      const conditions = Object.keys(target as Record<string, unknown>);
      expect(conditions.some((c) => c === "import" || c === "default")).toBe(true);
    }
  });

  it("keeps the package ROOT importable — an exports map closes every undeclared path", () => {
    // Introducing `exports` makes the map the WHOLE public surface: any subpath
    // it does not name stops resolving. "." is declared deliberately so the
    // root keeps resolving to the same module `main`/`types` name.
    expect(pkg.exports["."]).toBe("./src/index.ts");
    expect(pkg.exports["."]).toBe((pkg as unknown as { main: string }).main);
  });

  it("keeps every exports target inside the published files allowlist", () => {
    expect(pkg.files).toContain("src");
    for (const target of Object.values(pkg.exports)) {
      expect(typeof target).toBe("string");
      expect((target as string).startsWith("./src/")).toBe(true);
      const resolved = fileURLToPath(new URL(`../${(target as string).slice(2)}`, import.meta.url));
      expect(() => readFileSync(resolved, "utf8")).not.toThrow();
    }
  });
});
