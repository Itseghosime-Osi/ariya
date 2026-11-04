import type { MDXComponents } from "mdx/types";

// The guides page styles plain markdown with its own stylesheet, so the
// default element mapping is all it needs.
const components: MDXComponents = {};

export function useMDXComponents(): MDXComponents {
  return components;
}
