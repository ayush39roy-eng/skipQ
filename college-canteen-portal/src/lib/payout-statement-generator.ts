import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SettlementBatch, Vendor, LedgerEntry, Prisma } from '@prisma/client';
import { format } from 'date-fns';

type SettlementWithRelations = SettlementBatch & {
    vendor: Vendor;
    ledgerEntries: LedgerEntry[];
};

export class PayoutStatementGenerator {
    /**
     * Generate PDF Payout Statement
     * Strictly hides platform fees.
     */
    static generatePDF(settlement: SettlementWithRelations): Uint8Array {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        
        // --- 1. Header ---
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('VENDOR PAYOUT STATEMENT', 15, 20);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, 15, 28);
        doc.text(`Settlement ID: #${settlement.id.substring(0, 8).toUpperCase()}`, 15, 33);
        doc.text(`Period: ${format(settlement.periodStartDate, 'dd MMM yyyy')} to ${format(settlement.periodEndDate, 'dd MMM yyyy')}`, 15, 38);

        // Brand + Vendor Info
        doc.setTextColor(0);
        doc.setFontSize(14);
        doc.text('SKIPQ', pageWidth - 15, 20, { align: 'right' });
        
        doc.setFontSize(11);
        doc.text(`Vendor: ${settlement.vendor.name}`, pageWidth - 15, 30, { align: 'right' });
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`ID: ${settlement.vendorId}`, pageWidth - 15, 35, { align: 'right' });

        // --- 2. Payout Summary (Hero) ---
        const startY = 45;
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(230, 230, 230);
        doc.roundedRect(15, startY, pageWidth - 30, 45, 3, 3, 'FD');

        doc.setFontSize(12);
        doc.setTextColor(50);
        doc.text('TOTAL PAYOUT AMOUNT', 25, startY + 15);
        
        doc.setFontSize(24);
        doc.setTextColor(0, 150, 0); // Green
        doc.setFont('helvetica', 'bold');
        doc.text(`Rs. ${(settlement.totalVendorPayable / 100).toFixed(2)}`, 25, startY + 28);

        // Secondary Metrics
        doc.setFontSize(10);
        doc.setTextColor(80);
        doc.setFont('helvetica', 'normal');
        
        const metricsX = 120;
        doc.text(`Period Food Sales: Rs. ${(settlement.totalFoodAmount / 100).toFixed(2)}`, metricsX, startY + 12);
        doc.text(`Total Orders: ${settlement.totalOrders}`, metricsX, startY + 20);
        doc.setTextColor(150);
        doc.text('Platform Fees Deducted: Rs. 0.00', metricsX, startY + 28);
        
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text('Net Amount Payable matches your Total Food Sales.', metricsX, startY + 38);

        // --- 3. Important Notice ---
        const noticeY = startY + 55;
        doc.setFillColor(255, 252, 235); // Light yellow
        doc.setDrawColor(250, 200, 100); // Orange border
        doc.roundedRect(15, noticeY, pageWidth - 30, 25, 2, 2, 'FD');
        
        doc.setFontSize(9);
        doc.setTextColor(100, 50, 0);
        doc.text('Important Notice:', 20, noticeY + 8);
        doc.setTextColor(0);
        doc.text('• Customers pay platform convenience fees separately.', 20, noticeY + 15);
        doc.text('• No commission or platform fee is deducted from your food sales.', 20, noticeY + 20);

        // --- 4. Order Level Breakdown ---
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Order Details', 15, noticeY + 35);

        const tableData = settlement.ledgerEntries.map(entry => {
            // "Food Amount" = Vendor Net Amount (since we hide fees)
            // If entry.orderType is REFUND, make it displayed as negative
            const isRefund = entry.type === 'REFUND';
            const amount = entry.netAmount / 100;
            const displayAmount = isRefund ? -Math.abs(amount) : Math.abs(amount);
            
            return [
                format(new Date(entry.timestamp), 'dd MMM HH:mm'),
                entry.orderId?.substring(18) || '-', // Short ID
                entry.description || 'Order',
                entry.paymentMode || 'ONLINE',
                `Rs. ${displayAmount.toFixed(2)}`
            ];
        });

        // Use 'headStyles' and 'columnStyles' effectively for alignment
        autoTable(doc, {
            startY: noticeY + 40,
            head: [['Date', 'Order ID', 'Items/Description', 'Mode', 'Food Amount']],
            body: tableData,
            theme: 'grid', // Cleaner than 'striped' for finance
            styles: { 
                fontSize: 9, 
                cellPadding: 4,
                valign: 'middle'
            },
            headStyles: { 
                fillColor: [30, 30, 30], 
                textColor: 255, 
                fontStyle: 'bold',
                halign: 'left'
            },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 25 },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 20, halign: 'center' },
                4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' } // Explicit width and alignment for Money
            },
            foot: [['', '', 'TOTAL', '', `Rs. ${(settlement.totalVendorPayable / 100).toFixed(2)}`]],
            footStyles: { 
                fillColor: [240, 240, 240], 
                textColor: 0, 
                fontStyle: 'bold', 
                halign: 'right' 
            },
            // Ensure footer total aligns with the amount column (index 4)
            didParseCell: (data) => {
                if (data.section === 'foot' && data.column.index === 4) {
                    data.cell.styles.halign = 'right';
                }
            }
        });

        // --- 5. Footer ---
        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('Payout Status: PROCESSED (Refer to Bank Statement)', pageWidth / 2, finalY, { align: 'center' });
        doc.text('If you notice any mismatch, contact us within 48 hours.', pageWidth / 2, finalY + 5, { align: 'center' });
        doc.text('Thank you for partnering with SkipQ.', pageWidth / 2, finalY + 10, { align: 'center' });

        return doc.output('arraybuffer') as unknown as Uint8Array;
    }

    /**
     * Generate CSV Payout Statement
     * Schema: Order ID, Date, Amount
     */
    static generateCSV(settlement: SettlementWithRelations): string {
        const header = 'Settlement ID,Date,Order ID,Description,Mode,Food Amount (Vendor Share),Status\n';
        
        const rows = settlement.ledgerEntries.map(entry => {
            const date = format(new Date(entry.timestamp), 'yyyy-MM-dd HH:mm:ss');
            const amount = (entry.netAmount / 100).toFixed(2);
            const desc = (entry.description || 'Order').replace(/,/g, ' '); // Clean CSV
            
            return `${settlement.id},${date},${entry.orderId || '-'},${desc},${entry.paymentMode},${amount},PAID`;
        });

        return header + rows.join('\n');
    }
}
