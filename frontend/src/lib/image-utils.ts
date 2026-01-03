/**
 * Resizes an image file to a specified maximum width/height while maintaining aspect ratio.
 * Returns a Blob of the resized image.
 */
export async function resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Convert based on original type if possible, defaulting to jpeg for better compression on thumbs
                const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create blob from canvas'));
                    }
                }, type, 0.9);
            };

            img.onerror = (err) => reject(err);
            img.src = e.target?.result as string;
        };

        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
}
