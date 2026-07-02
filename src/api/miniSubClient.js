export const MINI_SUB_BASE_URL = "http://192.168.4.1";
export const COMMAND_ENDPOINT = "/api/v1/command";

export function createCommandRequest(payload) {

  const formattedBody = {
    command: payload.command
  };

  if (payload.ballast_level !== undefined && payload.ballast_level !== null) {
    formattedBody.ballast_level = payload.ballast_level;
  }

  if (payload.durationSeconds !== undefined && payload.durationSeconds !== null) {
    formattedBody.duration_seconds = payload.durationSeconds;
  }

  if (payload.turnDegrees !== undefined && payload.turnDegrees !== null) {
    formattedBody.angle_deg = payload.turnDegrees;
  }

  if (payload.motor_power_pct !== undefined && payload.motor_power_pct !== null) {
    formattedBody.motor_power_pct = payload.motor_power_pct;
  }

  return {
    method: "POST",
    url: `${MINI_SUB_BASE_URL}${COMMAND_ENDPOINT}`,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  };
}

export async function sendMiniSubCommand(payload) {
  const request = createCommandRequest(payload);

  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return {
    request,
    response: {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: parseResponseBody(responseText)
    }
  };
}

function parseResponseBody(text) {
  if (!text) {
    return "";
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
