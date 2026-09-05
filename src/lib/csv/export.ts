/**
 * DSSA Room Attendance System
 * CSV Export Utility & Formula Injection Sanitization
 * Phase 16: Attendance & Admin Management
 *
 * Security:
 * - Prevents CSV Formula Injection (DDE attacks) where cells starting with =, +, -, @, \t, \r execute commands in Excel/Sheets.
 * - Sanitizes and quotes cells according to RFC 4180.
 * - Omits internal security context, raw GPS coordinates, QR hashes, or device details.
 */

export interface ExportAttendanceRecord {
  id: string;
  markedAt: Date | string;
  status: string;
  user: {
    name: string | null;
    email: string;
  };
  session: {
    title: string;
    room: {
      name: string;
      code: string;
    };
    host?: {
      name: string | null;
      email: string;
    } | null;
  };
}

/**
 * Sanitizes a single cell value to prevent CSV Formula Injection and handle RFC 4180 escaping.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let stringValue = String(value);

  // Trim extraneous control characters
  stringValue = stringValue.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Check for dangerous CSV formula injection characters: =, +, -, @, \t, \r
  // If present at the start of the cell, prefix with a single quote (') so spreadsheet engines treat it as literal text
  const formulaChars = ["=", "+", "-", "@", "\t"];
  if (formulaChars.some((char) => stringValue.startsWith(char))) {
    stringValue = `'${stringValue}`;
  }

  // If the value contains double quotes, commas, newlines, or single quotes from escaping, escape it with RFC 4180 rules
  if (
    stringValue.includes('"') ||
    stringValue.includes(",") ||
    stringValue.includes("\n") ||
    stringValue.startsWith("'")
  ) {
    // Escape all existing double quotes by doubling them ("" -> """")
    const escapedQuotes = stringValue.replace(/"/g, '""');
    return `"${escapedQuotes}"`;
  }

  return stringValue;
}

/**
 * Generates an RFC 4180 compliant CSV string from verified attendance records.
 */
export function generateAttendanceCsv(records: ExportAttendanceRecord[]): string {
  const headers = [
    "Attendance ID",
    "Member Name",
    "Member Email",
    "Session",
    "Room",
    "Host",
    "Status",
    "Marked At (UTC)",
    "Marked At (Local / IST)",
  ];

  const headerLine = headers.map(sanitizeCsvCell).join(",");

  const rows = records.map((rec) => {
    const markedDate = new Date(rec.markedAt);
    const utcIso = isNaN(markedDate.getTime()) ? "" : markedDate.toISOString();
    
    // Format IST (UTC+5:30)
    const istString = isNaN(markedDate.getTime())
      ? ""
      : markedDate.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "medium",
        });

    const hostName = rec.session.host
      ? rec.session.host.name || rec.session.host.email
      : "N/A";

    const rowData = [
      rec.id,
      rec.user.name || "Member",
      rec.user.email,
      rec.session.title,
      `${rec.session.room.name} (${rec.session.room.code})`,
      hostName,
      rec.status,
      utcIso,
      istString,
    ];

    return rowData.map(sanitizeCsvCell).join(",");
  });

  // UTF-8 BOM prefix for reliable Excel UTF-8 character encoding support
  return "\uFEFF" + [headerLine, ...rows].join("\r\n");
}
