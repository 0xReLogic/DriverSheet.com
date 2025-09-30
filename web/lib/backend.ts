export interface BackendUser {
  id: number;
  googleId: string;
  email: string;
  sheetId: string | null;
  forwardAddress: string;
  paid: boolean;
  created: string;
  trialExpired: boolean;
  lemonPaymentUrl: string;
}

export interface BackendLogEntry {
  id: number;
  userId: number;
  orderDate: string;
  gross: number;
  tips: number;
  mileage: number | null;
  parsedAt: string;
}

export type UpsertUserPayload = {
  googleId: string;
  email: string;
  sheetId?: string | null;
};

export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

export async function upsertUser(payload: UpsertUserPayload, token?: string): Promise<BackendUser> {
  const response = await fetch(`${API_BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to sync user: ${response.status} ${text}`);
  }

  return response.json() as Promise<BackendUser>;
}

export async function fetchLogs(userId: number, token?: string): Promise<BackendLogEntry[]> {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/logs`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 402) {
      throw new Error("payment_required");
    }
    const text = await response.text();
    throw new Error(`Failed to load logs: ${response.status} ${text}`);
  }

  return response.json() as Promise<BackendLogEntry[]>;
}
