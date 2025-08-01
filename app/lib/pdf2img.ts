// pdf-utils.ts
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export interface PdfConversionResult {
  imageUrl: string;
  file: File | null;
  error?: string;
}

let pdfjsLib: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  if (loadPromise) return loadPromise;

  isLoading = true;
  loadPromise = import('pdfjs-dist').then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = workerSrc;
    pdfjsLib = lib;
    isLoading = false;
    return lib;
  });

  return loadPromise;
}

export async function convertPdfToImage(file: File): Promise<PdfConversionResult> {
  try {
    const lib = await loadPdfJs();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 4 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    if (context) {
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
    }

    await page.render({ canvasContext: context!, viewport }).promise;

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const originalName = file.name.replace(/\.pdf$/i, '');
            const imageFile = new File([blob], `${originalName}.png`, {
              type: 'image/png',
            });

            resolve({
              imageUrl: URL.createObjectURL(blob),
              file: imageFile,
            });
          } else {
            resolve({
              imageUrl: '',
              file: null,
              error: 'Failed to create image blob',
            });
          }
        },
        'image/png',
        1.0
      );
    });
  } catch (err) {
    return {
      imageUrl: '',
      file: null,
      error: `Failed to convert PDF: ${err}`,
    };
  }
}
