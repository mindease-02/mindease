"use client";
export default function PrintButton() {
  return <button type="button" className="btn btn-primary" style={{ padding: "10px 18px" }} onClick={() => window.print()}>Print / save as PDF</button>;
}
