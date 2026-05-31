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
      margin:       [15, 0], // 15mm top/bottom margin, 0 left/right
      filename:     `${filename}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'] }
    };

    // html2pdf automatically handles full-height capture internally
    await html2pdf().set(opt).from(element).save();

    element.classList.remove("pdf-exporting");
    return true;
  } catch (error) {
    element.classList.remove("pdf-exporting");
    console.error("Failed to generate PDF", error);
    return false;
  }
}
