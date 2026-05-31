import html2pdf from "html2pdf.js";

export async function exportElementToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return false;
  }

  try {
    const opt = {
      margin:       0,
      filename:     `${filename}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 794,
        windowWidth: 794,
        onclone: (clonedDoc: Document) => {
          const el = clonedDoc.getElementById(elementId);
          if (el) {
            // Reset the target element itself
            el.style.position = 'static';
            el.style.left = '0';
            el.style.top = '0';
            el.style.width = '794px';

            // Also reset the offscreen parent wrapper so the clone is at origin
            const parent = el.parentElement;
            if (parent) {
              parent.style.position = 'static';
              parent.style.left = '0';
              parent.style.top = '0';
              parent.style.width = '794px';
              parent.style.overflow = 'visible';
              parent.style.height = 'auto';
            }
          }
        }
      },
      jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const, compress: true },
      pagebreak:    { mode: ['css', 'legacy'] as const, avoid: ['.avoid-page-break'] }
    };

    await html2pdf().set(opt).from(element).save();
    return true;
  } catch (error) {
    console.error("Failed to generate PDF", error);
    return false;
  }
}
