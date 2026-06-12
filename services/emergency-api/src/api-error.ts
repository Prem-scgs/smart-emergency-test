export function buildApiErrorPayload(
  statusCode: number,
  code: string,
  message: string
) {
  return {
    error: message,
    code,
    statusCode,
  };
}
