const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function parseImageDataUrl(value: unknown) {
  if (typeof value !== "string") throw new Error("Image data is required.");
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=]+)$/i.exec(value);
  if (!match || !allowedImageTypes.has(match[1])) throw new Error("Unsupported image format.");

  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error("Image must be smaller than 2 MB after compression.");
  return { mimeType: match[1], base64: match[2], bytes };
}
