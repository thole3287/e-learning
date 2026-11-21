import { api } from './api';

export interface VisitStats {
  total_visits: number;
  today_visits: number;
  yesterday_visits: number;
  this_month_visits: number;
  online_visitors: number;
}

let cachedStats: VisitStats | null = null;
let listeners: Array<(stats: VisitStats) => void> = [];

function notify(stats: VisitStats) {
  cachedStats = stats;
  listeners.forEach((fn) => fn(stats));
}

export function subscribeVisitStats(fn: (stats: VisitStats) => void) {
  listeners.push(fn);
  if (cachedStats) fn(cachedStats);
  return () => {
    listeners = listeners.filter((item) => item !== fn);
  };
}

function getSessionId(): string {
  let sId = sessionStorage.getItem('visitor_session_id');
  if (!sId) {
    sId = 's_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
    sessionStorage.setItem('visitor_session_id', sId);
  }
  return sId;
}

export async function recordVisit(page?: string): Promise<VisitStats | null> {
  try {
    const sessionId = getSessionId();
    const lastRecordTs = Number(sessionStorage.getItem('last_record_ts') || 0);
    const now = Date.now();

    // Nếu vừa gửi trong vòng 2 phút thì chỉ lấy stats để tránh ghi nhận liên tục khi chuyển trang
    if (now - lastRecordTs < 2 * 60 * 1000 && cachedStats) {
      return cachedStats;
    }

    sessionStorage.setItem('last_record_ts', String(now));
    const res: any = await api.post('/visits/record', {
      session_id: sessionId,
      page: page || window.location.pathname,
    });

    if (res.success && res.data) {
      notify(res.data);
      return res.data;
    }
  } catch (e) {
    console.debug('Visit tracking skipped:', e);
  }
  return cachedStats;
}

export async function fetchVisitStats(): Promise<VisitStats | null> {
  try {
    const res: any = await api.get('/visits/stats');
    if (res.success && res.data) {
      notify(res.data);
      return res.data;
    }
  } catch (e) {
    console.debug('Fetch visit stats skipped:', e);
  }
  return cachedStats;
}
