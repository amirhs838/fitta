"use client";

const MAX_DIMENSION = 1024;

/** Resizes meal photos in the browser before they leave the device. */
export async function compressMealImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("لطفاً یک فایل تصویری انتخاب کن.");

  const imageUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("خواندن فایل عکس ممکن نشد."));
      image.src = imageUrl;
    });

    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("فشرده‌سازی عکس ممکن نشد.");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
