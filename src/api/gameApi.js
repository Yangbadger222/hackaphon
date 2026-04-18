const DEFAULT_API_URL = "http://localhost:3001";

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL || DEFAULT_API_URL;
}

export async function sendGameState(gameState) {
  const response = await fetch(`${getApiBaseUrl()}/api/game`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(gameState),
  });

  if (!response.ok) {
    throw new Error(`Game API request failed with status ${response.status}`);
  }

  return response.json();
}
