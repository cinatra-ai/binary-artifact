// Binary detail renderer (slot `detail`) — THE DOWNLOAD CARD.
//
// Bytes whose form nothing could determine have exactly one honest display:
// name, form, size, and one download action. There is no inline viewer here on
// purpose — the content's form is unknown, so any preview would be a guess, and
// a wrong guess is worse than a download. The v1 renderer snapshot carries only
// host-authorized URLs and never the bytes, so the card also never fetches or
// parses anything.
//
// v1 renderer: requests NO host ports; renders ONLY from the host-supplied
// authorized snapshot (`ArtifactRendererProps`) — `actions.download` /
// `urls.download` are already actor-scoped + access-checked by the host.
//
// NEVER-BLANK, AND NEVER MISLEADING: the card always renders the file's
// identity. When the host authorized a download the card offers exactly one
// download action and says to use it; when it authorized none, the card says so
// instead of inviting a download that is not there. The same card draws on the
// artifact page and on the review card — both resolve this one `detail` entry
// through the same dispatch.

import type { ReactElement } from "react";

import type { ArtifactRendererProps } from "../artifact-renderer-props";

/** Human-readable byte size for the card (pure; exported for tests). */
export function formatBytes(size: number | null | undefined): string | null {
  if (typeof size !== "number" || !Number.isFinite(size) || size < 0) return null;
  if (size < 1024) return `${size} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let n = size / 1024;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}

/** The name line. A title that is absent, empty or only whitespace is no name
 * at all — the card says what it is instead of drawing an empty line. */
export function fileName(title: string | null | undefined): string {
  return typeof title === "string" && title.trim().length > 0 ? title.trim() : "Binary file";
}

/** The form line: the representation's declared media type, then the row's,
 * then the one form this base claims. */
export function formLabel(props: ArtifactRendererProps): string {
  for (const candidate of [props.representation?.mime, props.artifact?.mime]) {
    if (typeof candidate === "string" && candidate.trim().length > 0) return candidate.trim();
  }
  return "application/octet-stream";
}

export default function BinaryArtifactDetail(props: ArtifactRendererProps): ReactElement {
  const downloadHref = props.actions?.download ?? props.urls?.download ?? null;
  const name = fileName(props.artifact?.title);
  const form = formLabel(props);
  const size = formatBytes(props.artifact?.size);

  return (
    <article
      className="soft-panel rounded-card overflow-hidden p-6"
      data-binary-artifact="download-card"
    >
      <p className="text-sm font-medium">{name}</p>
      <p className="text-sm text-muted-foreground">
        {form}
        {size ? ` · ${size}` : ""}
      </p>
      {downloadHref ? (
        <>
          <p className="text-sm text-muted-foreground">
            The form of this file could not be determined. Download it to open it.
          </p>
          <a href={downloadHref} className="text-sm underline" download>
            Download the file
          </a>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          The form of this file could not be determined, and no download is available for it here.
        </p>
      )}
    </article>
  );
}
