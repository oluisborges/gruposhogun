const BRT_OFFSET = -3 * 60;

export function nowBRT(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + BRT_OFFSET * 60000);
}

export function startOfWeekBRT(date?: Date): Date {
  const d = date ? new Date(date) : nowBRT();
  const day = d.getDay();
  const diff = d.getDate() - day;
  const sunday = new Date(d.setDate(diff));
  sunday.setHours(20, 0, 0, 0);
  return sunday;
}

export function currentPixWeekStart(): Date {
  const now = nowBRT();
  const weekStart = startOfWeekBRT(now);
  if (now < weekStart) {
    weekStart.setDate(weekStart.getDate() - 7);
  }
  return weekStart;
}

export function formatBRTDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatBRTDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
