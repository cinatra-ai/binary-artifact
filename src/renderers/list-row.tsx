// The row icon of a binary file in the Artifacts list: the type's own icon,
// drawn at 17 pixels inside the application's row cell, whose size and tint
// stay the application's. It reads nothing but its props, requests no host
// port, fetches nothing, and draws the same icon for every object type.

import { Binary } from "lucide-react";

import type { ArtifactRendererProps } from "../artifact-renderer-props";

export interface ListRowProps {
  artifact: Pick<ArtifactRendererProps["artifact"], "objectType">;
}

export default function ListRow(_props: ListRowProps) {
  return <Binary aria-hidden size={17} strokeWidth={2} data-row-glyph="binary" />;
}
