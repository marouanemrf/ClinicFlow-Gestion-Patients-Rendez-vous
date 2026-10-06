export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const MAX_SELECTED_SIZE = 10 * 1024 * 1024;
const MAX_DIMENSION = 512;
const JPEG_QUALITY = 0.85;

export function validatePhotoFile(file) {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) return 'Photo must be a JPEG, PNG or WebP image';
  if (file.size > MAX_SELECTED_SIZE) return 'Photo must not exceed 10 MB';
  return null;
}

/**
 * Downscales the photo in the browser (max 512 px, JPEG) before upload:
 * a phone picture of several MB becomes ~50 KB, well under the 2 MB API limit.
 */
export async function resizePhoto(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('Could not process the image'))), 'image/jpeg', JPEG_QUALITY),
  );
  return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
}
