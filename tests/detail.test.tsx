import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import BinaryArtifactDetail, { fileName, formLabel, formatBytes } from "../src/renderers/detail";
import type { ArtifactRendererProps } from "../src/artifact-renderer-props";

afterEach(cleanup);

function props(overrides: {
  download?: string | null;
  title?: string | null;
  size?: number;
  mime?: string;
}): ArtifactRendererProps {
  return {
    propsApiVersion: 1,
    artifact: {
      id: "art_1",
      title: overrides.title === undefined ? "capture.bin" : overrides.title,
      objectType: "@cinatra-ai/binary-artifact:artifact",
      mime: overrides.mime === undefined ? "application/octet-stream" : overrides.mime,
      size: overrides.size === undefined ? 5_242_880 : overrides.size,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ownerLevel: "workspace",
      visibility: "organization",
      sourceUrl: null,
    },
    representation: { revisionId: "rev_1", mime: "application/octet-stream" },
    urls: {
      preview: null,
      download: overrides.download === undefined ? "/api/artifacts/art_1/download" : overrides.download,
    },
    identity: { kind: "no-primary", extension: null },
    actions: {
      download: overrides.download === undefined ? "/api/artifacts/art_1/download" : overrides.download,
      openInSource: null,
    },
  };
}

describe("formatBytes", () => {
  it("formats byte sizes across unit boundaries and rejects invalid input", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(5_242_880)).toBe("5.0 MB");
    expect(formatBytes(null)).toBeNull();
    expect(formatBytes(-1)).toBeNull();
    expect(formatBytes(Number.NaN)).toBeNull();
  });
});

describe("BinaryArtifactDetail — the download card", () => {
  it("draws the four things the card is: name, form, size, the download", () => {
    const { container } = render(<BinaryArtifactDetail {...props({})} />);
    const card = container.querySelector('[data-binary-artifact="download-card"]');
    expect(card?.tagName.toLowerCase()).toBe("article");
    expect(card?.getAttribute("class")).toContain("soft-panel rounded-card");
    const text = card?.textContent ?? "";
    expect(text).toContain("capture.bin");
    expect(text).toContain("application/octet-stream");
    expect(text).toContain("5.0 MB");
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/api/artifacts/art_1/download");
    expect(link?.hasAttribute("download")).toBe(true);
  });

  it("offers exactly ONE download action", () => {
    const { container } = render(<BinaryArtifactDetail {...props({})} />);
    expect(container.querySelectorAll("a")).toHaveLength(1);
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("prefers the sanctioned action handle over the raw url", () => {
    const p = props({});
    p.actions.download = "/api/artifacts/art_1/download?via=action";
    p.urls.download = "/api/artifacts/art_1/download";
    const { container } = render(<BinaryArtifactDetail {...p} />);
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "/api/artifacts/art_1/download?via=action",
    );
  });

  it("falls back to the url when the action handle is absent", () => {
    const p = props({});
    p.actions.download = null;
    p.urls.download = "/api/artifacts/art_1/download";
    const { container } = render(<BinaryArtifactDetail {...p} />);
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/api/artifacts/art_1/download");
  });

  it("uses the artifact title as the name, else a generic label", () => {
    const withTitle = render(<BinaryArtifactDetail {...props({ title: "payload.dat" })} />);
    expect(withTitle.container.textContent).toContain("payload.dat");
    cleanup();
    const noTitle = render(<BinaryArtifactDetail {...props({ title: null })} />);
    expect(noTitle.container.textContent).toContain("Binary file");
  });

  it("renders no inline viewer of ANY kind — undetectable bytes are never guessed at", () => {
    const { container } = render(<BinaryArtifactDetail {...props({})} />);
    for (const viewer of ["iframe", "embed", "img", "object", "video", "audio", "canvas", "svg", "picture", "source"]) {
      expect(container.querySelector(viewer)).toBeNull();
    }
  });

  it("names the form even when the size is unknown", () => {
    const p = props({});
    (p.artifact as { size: number }).size = Number.NaN;
    const { container } = render(<BinaryArtifactDetail {...p} />);
    expect(container.textContent).toContain("application/octet-stream");
    expect(container.querySelector('[data-binary-artifact="download-card"]')).not.toBeNull();
  });

  it("NEVER-BLANK: a null download URL still renders name, form and size", () => {
    const { container } = render(<BinaryArtifactDetail {...props({ download: null })} />);
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector('[data-binary-artifact="download-card"]')).not.toBeNull();
    const text = container.textContent ?? "";
    expect(text).toContain("capture.bin");
    expect(text).toContain("application/octet-stream");
    expect(text).toContain("5.0 MB");
  });

  it("NEVER MISLEADING: with no download authorized it does not invite a download", () => {
    const withLink = render(<BinaryArtifactDetail {...props({})} />);
    expect(withLink.container.textContent).toContain("Download it to open it");
    cleanup();
    const withoutLink = render(<BinaryArtifactDetail {...props({ download: null })} />);
    const text = withoutLink.container.textContent ?? "";
    expect(text).not.toContain("Download it to open it");
    expect(text).toContain("no download is available");
  });

  it("names the form from the REPRESENTATION first, then the row", () => {
    const p = props({});
    p.artifact.mime = "application/x-row-mime";
    (p.representation as { mime: string }).mime = "application/x-representation-mime";
    const withRep = render(<BinaryArtifactDetail {...p} />);
    expect(withRep.container.textContent).toContain("application/x-representation-mime");
    expect(withRep.container.textContent).not.toContain("application/x-row-mime");
    cleanup();
    const q = props({});
    q.artifact.mime = "application/x-row-mime";
    q.representation = null;
    const withoutRep = render(<BinaryArtifactDetail {...q} />);
    expect(withoutRep.container.textContent).toContain("application/x-row-mime");
  });

  it("falls back to the base's own form when the snapshot names none", () => {
    expect(formLabel({} as unknown as ArtifactRendererProps)).toBe("application/octet-stream");
  });

  it("treats an empty or whitespace title as no name at all", () => {
    expect(fileName(null)).toBe("Binary file");
    expect(fileName("")).toBe("Binary file");
    expect(fileName("   ")).toBe("Binary file");
    expect(fileName("  payload.dat  ")).toBe("payload.dat");
    const { container } = render(<BinaryArtifactDetail {...props({ title: "   " })} />);
    expect(container.textContent).toContain("Binary file");
  });

  it("tolerates a malformed snapshot missing urls/actions (never throws, never blank)", () => {
    const malformed = {
      propsApiVersion: 1,
      artifact: { title: null },
    } as unknown as ArtifactRendererProps;
    const { container } = render(<BinaryArtifactDetail {...malformed} />);
    expect(container.querySelector('[data-binary-artifact="download-card"]')).not.toBeNull();
    expect((container.textContent ?? "").trim().length).toBeGreaterThan(0);
  });
});
