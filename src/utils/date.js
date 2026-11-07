// Data local (YYYY-MM-DD). toISOString() usa UTC e "vira o dia" às 21h no Brasil.
export function hojeLocalStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
