import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { SettlementBatch, Vendor, PlatformSettings } from '@prisma/client'

/**
 * Invoice Generator Service
 * Generates specific Commission Tax Invoices for Settlements
 */
export class InvoiceGenerator {
  
  /**
   * Generates a PDF Invoice returning it as a Uint8Array buffer
   */
  static async generateInvoice(
    batch: SettlementBatch & { vendor: Vendor }, 
    settings: PlatformSettings | null
  ): Promise<Uint8Array> {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    
    // --- Configuration ---
    // Fallback values since schema doesn't have siteName/phone yet
    const platformName = 'SkipQ Platform' 
    const platformAddress = 'Contact Support'
    const platformGst = settings?.platformGstRate ? 'APPLIED' : 'N/A' 
    // Since user said "no GST number yet", we'll use a placeholder or empty
    const platformGstin = 'N/A' 
    
    const invoiceNo = `INV-${batch.id.substring(0, 8).toUpperCase()}`
    const invoiceDate = new Date().toLocaleDateString()
    
    // --- Header ---
    doc.setFontSize(20)
    doc.text('TAX INVOICE', pageWidth - 20, 20, { align: 'right' })
    
    doc.setFontSize(10)
    doc.text('Original for Recipient', pageWidth - 20, 26, { align: 'right' })

    // --- Supplier Details (Platform) ---
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(platformName, 14, 20)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(platformAddress, 14, 26)
    doc.text(`GSTIN: ${platformGstin}`, 14, 32)
    
    // --- Recipient Details (Vendor) ---
    doc.line(14, 38, pageWidth - 14, 38)
    
    doc.setFontSize(10)
    doc.text('Billed To:', 14, 45)
    doc.setFont('helvetica', 'bold')
    doc.text(batch.vendor.name, 14, 50)
    doc.setFont('helvetica', 'normal')
    // Ideally we'd have vendor address/GST here from the Vendor model
    doc.text(`Vendor ID: ${batch.vendor.id}`, 14, 55)

    // --- Invoice Meta ---
    doc.text(`Invoice No: ${invoiceNo}`, pageWidth - 80, 50)
    doc.text(`Date: ${invoiceDate}`, pageWidth - 80, 55)
    doc.text(`Settlement Ref: ${batch.id}`, pageWidth - 80, 60)
    doc.text(`Period: ${batch.periodStartDate.toLocaleDateString()} to ${batch.periodEndDate.toLocaleDateString()}`, pageWidth - 80, 65)

    // --- Calculations ---
    const totalPlatformFee = batch.totalPlatformFee / 100
    
    // Logic: Is the fee inclusive or exclusive? 
    // Usually deducted fee is the Gross Revenue for platform. 
    // If we have GST, we might say Fee = Base + Tax.
    // For now, assume "No GST yet" means Fee is just Fee (Tax 0).
    const gstRate = settings?.platformGstRate || 18
    let taxableValue = totalPlatformFee
    let cgstAmount = 0
    let sgstAmount = 0
    let totalLinkAmount = totalPlatformFee

    // If GST number existed, we would do:
    // taxableValue = totalPlatformFee / (1 + gstRate/100)
    // cgstAmount = taxableValue * (gstRate/2)/100
    // sgstAmount = taxableValue * (gstRate/2)/100
    // But since "No GST", we treat standard 0 tax Invoice for now.
    
    // Table Data
    const items = [
      ['Platform Service Commission', '1', `Rs. ${totalPlatformFee.toFixed(2)}`, `Rs. ${totalPlatformFee.toFixed(2)}`]
    ]
    
    // --- Table ---
    const headers = [['Description', 'Qty', 'Unit Price', 'Total']]
    
    autoTable(doc, {
      head: headers,
      body: items,
      startY: 75,
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] }
    })
    
    // --- Totals ---
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY + 10
    
    doc.setFontSize(10)
    doc.text(`Taxable Amount: Rs. ${taxableValue.toFixed(2)}`, pageWidth - 20, finalY, { align: 'right' })
    if (platformGstin !== 'N/A') {
        doc.text(`CGST (${gstRate/2}%): Rs. ${cgstAmount.toFixed(2)}`, pageWidth - 20, finalY + 5, { align: 'right' })
        doc.text(`SGST (${gstRate/2}%): Rs. ${sgstAmount.toFixed(2)}`, pageWidth - 20, finalY + 10, { align: 'right' })
    } else {
        doc.text('GST (0% - Not Registered): Rs. 0.00', pageWidth - 20, finalY + 5, { align: 'right' })
    }
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    const totalLabelY = platformGstin !== 'N/A' ? finalY + 20 : finalY + 15
    doc.text(`Total Payable: Rs. ${totalLinkAmount.toFixed(2)}`, pageWidth - 20, totalLabelY, { align: 'right' })

    // --- Footer ---
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text('This is a computer generated invoice and does not require physical signature.', 14, 280)
    
    // Return Buffer
    return  new Uint8Array(doc.output('arraybuffer'))
  }
}
