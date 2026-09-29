const RISKY = /\.(exe|scr|com|bat|cmd|pif|js|jse|vbs|vbe|wsf|hta|msi|jar|ps1|lnk|iso|img|html?|docm|xlsm|pptm)$/i;

export function hasRiskyAttachment(atts: { filename: string; contentType?: string }[]): boolean {
  return atts.some((a) => RISKY.test(a.filename.trim()));
}
