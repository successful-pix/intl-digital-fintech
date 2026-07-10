import { jsPDF } from "jspdf";
import { formatMoney, type Currency } from "./currency";

export interface ReceiptData {
  reference: string;
  date: string;
  status: string;
  type: string;
  amount: number;
  currency: Currency;
  senderName?: string | null;
  senderAccount?: string | null;
  receiverName?: string | null;
  receiverAccount?: string | null;
  description?: string | null;
}

export function buildReceipt(r: ReceiptData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(11, 11, 15);
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("International Digital", 40, 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Transaction Receipt", 40, 65);
  doc.setFontSize(9);
  doc.text(r.reference, W - 40, 45, { align: "right" });
  doc.text(new Date(r.date).toLocaleString(), W - 40, 60, { align: "right" });

  // Amount
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(formatMoney(r.amount, r.currency), 40, 150);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(`${r.type.toUpperCase()} · ${r.status.toUpperCase()}`, 40, 170);

  // Divider
  doc.setDrawColor(220);
  doc.line(40, 195, W - 40, 195);

  // Rows
  const rows: Array<[string, string]> = [
    ["From", r.senderName ?? "—"],
    ["From account", r.senderAccount ?? "—"],
    ["To", r.receiverName ?? "—"],
    ["To account", r.receiverAccount ?? "—"],
    ["Reference", r.reference],
    ["Description", r.description ?? "—"],
  ];
  let y = 225;
  doc.setFontSize(10);
  for (const [k, v] of rows) {
    doc.setTextColor(120);
    doc.text(k, 40, y);
    doc.setTextColor(20);
    doc.text(String(v), 200, y);
    y += 22;
  }

  // Footer
  doc.setDrawColor(220);
  doc.line(40, y + 20, W - 40, y + 20);
  doc.setTextColor(140);
  doc.setFontSize(9);
  doc.text("This is an official electronic receipt from International Digital.", 40, y + 40);
  doc.text("© International Digital · internationaldigital.app", 40, y + 55);

  return doc;
}

export function downloadReceipt(r: ReceiptData) {
  buildReceipt(r).save(`receipt-${r.reference}.pdf`);
}

export function printReceipt(r: ReceiptData) {
  const doc = buildReceipt(r);
  const url = doc.output("bloburl");
  const w = window.open(url as unknown as string, "_blank");
  if (w) w.addEventListener("load", () => w.print());
}
