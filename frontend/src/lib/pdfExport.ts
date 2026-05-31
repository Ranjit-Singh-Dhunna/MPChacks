import html2pdf from "html2pdf.js";

export async function exportElementToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return false;
  }

  try {
    element.classList.add("pdf-exporting");

    const opt = {
      margin:       [10, 10, 10, 10] as [number, number, number, number],
      filename:     `${filename}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      },
      jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const, compress: true },
      pagebreak:    { mode: ['css', 'legacy'] as const, avoid: ['.avoid-page-break'] }
    };

    await html2pdf().set(opt).from(element).save();

    element.classList.remove("pdf-exporting");
    return true;
  } catch (error) {
    element.classList.remove("pdf-exporting");
    console.error("Failed to generate PDF", error);
    return false;
  }
}
