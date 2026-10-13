import type Anthropic from "@anthropic-ai/sdk";

type MediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

/** Turns a validated `data:image/...;base64,...` URL into an image content block. */
export function imageBlock(dataUrl: string): Anthropic.ImageBlockParam {
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid image data URL");
  return {
    type: "image",
    source: { type: "base64", media_type: match[1] as MediaType, data: match[2] },
  };
}
