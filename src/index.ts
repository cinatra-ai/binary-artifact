// `@cinatra-ai/binary-artifact` — the system base for bytes of no known form. It
// accepts `application/octet-stream` and nothing else, and it draws one thing: a
// download card carrying the file's name, its form, its size and a single
// download action.
//
// A renderer artifact: it declares its accepted upload MIME set, a single
// `detail`-slot v1 renderer, and a dedicated `objectTypes` claim
// (`@cinatra-ai/binary-artifact:artifact`) so the upload pipeline can map the
// accepted MIME to exactly this type (the exactly-one-or-refuse resolver). The
// accepted MIME set is DISJOINT from every other base: this one claims only the
// media type that means "undetermined bytes", so a file whose form IS known
// keeps going to the base that owns that form.
//
// The card never guesses at the content — no inline viewer, no sniffing, no
// fetch of the bytes. Undetectable bytes get an honest home and an honest
// affordance, not a preview that could be wrong.
//
// The AUTHORITATIVE manifest is the `cinatra` block in `package.json` (what the
// host install pipeline + the marketplace publish gate read), and the display is
// published through this package's own `exports` at the key the host's manifest
// generator derives from the renderer entry. This module re-declares the
// `artifact` descriptor as a typed value for programmatic use; the manifest test
// keeps the two in agreement.

export {
  type ArtifactRendererProps,
  ARTIFACT_RENDERER_PROPS_API_VERSION,
} from "./artifact-renderer-props";

/** The closed v1 renderer-slot names — the WHOLE enum the host contract
 * defines, not just the ones this base declares. Mirrored in full so a consumer
 * typing against this module can express any conforming manifest; which slots
 * THIS base ships is said by `renderers` below. */
export type ArtifactUiSlot = "detail" | "preview" | "listRow";

/** A single slot renderer. v1 requests NO host ports — only these three keys. */
export interface ArtifactUiRenderer {
  entry: string;
  propsApiVersion: number;
  representations?: string[];
}

export interface ArtifactUiManifest {
  abiVersion: 1;
  sdkAbiRange: string;
  renderers: Partial<Record<ArtifactUiSlot, ArtifactUiRenderer>>;
}

export interface BinaryArtifactManifest {
  accepts: { file: { mimeTypes: string[] } };
  ui: ArtifactUiManifest;
}

export const binaryArtifactManifest: BinaryArtifactManifest = {
  accepts: {
    file: {
      mimeTypes: ["application/octet-stream"],
    },
  },
  ui: {
    abiVersion: 1,
    sdkAbiRange: "^2.5.0",
    renderers: {
      detail: {
        // The card draws exactly what this base accepts. `representations` (what
        // this pack draws) and `accepts` (what this pack types) are the same
        // single form here — there is nothing else this base could be asked to
        // draw.
        entry: "./src/renderers/detail.tsx",
        propsApiVersion: 1,
        representations: ["application/octet-stream"],
      },
    },
  },
};
