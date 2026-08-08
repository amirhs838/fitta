import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

/** Returns true only inside an Android or iOS Capacitor shell. */
export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

/**
 * Captures an already-resized image. A data URL keeps the existing API and
 * preview flow unchanged while avoiding an extra file conversion on-device.
 */
export async function captureMealPhoto(): Promise<string> {
  const photo = await Camera.getPhoto({
    source: CameraSource.Camera,
    resultType: CameraResultType.DataUrl,
    quality: 82,
    width: 1024,
    height: 1024,
    correctOrientation: true,
    allowEditing: false,
    promptLabelHeader: "افزودن عکس غذا",
    promptLabelPhoto: "انتخاب از گالری",
    promptLabelPicture: "عکس گرفتن",
  });

  if (!photo.dataUrl) {
    throw new Error("دریافت عکس از دوربین انجام نشد؛ دوباره تلاش کن.");
  }

  return photo.dataUrl;
}
