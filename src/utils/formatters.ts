/**
 * Standardizes time interval strings to "HH:MM – HH:MM" or single "HH:MM"
 * Examples:
 * - "de 08:00 até 10:00" -> "08:00 – 10:00"
 * - "08:00 até 10:00"    -> "08:00 – 10:00"
 * - "08:00 -> 10:00"     -> "08:00 – 10:00"
 * - "08:00 ➔ 10:00"     -> "08:00 – 10:00"
 * - "08:00 - 10:00"      -> "08:00 – 10:00"
 * - "08:00 – 10:00"      -> "08:00 – 10:00"
 * - "08:00"              -> "08:00"
 */
export function formatAppointmentWindow(
  window?: string | null,
  fallbackDeparture?: string | null,
  fallbackArrival?: string | null
): string {
  const text = (window || '').trim();
  if (text) {
    // Extract times in HH:MM format
    const times = text.match(/\b\d{1,2}:\d{2}\b/g);
    if (times && times.length >= 2) {
      return `${times[0]} – ${times[1]}`;
    }
    if (times && times.length === 1) {
      return times[0];
    }
    return text.replace(/de\s+/gi, '').replace(/\s*até\s*/gi, ' – ').replace(/➔|->/g, '–').trim();
  }

  if (fallbackDeparture && fallbackArrival) {
    return `${fallbackDeparture} – ${fallbackArrival}`;
  }
  if (fallbackDeparture) {
    return fallbackDeparture;
  }
  if (fallbackArrival) {
    return fallbackArrival;
  }
  return '—';
}
