export function getErrorMessage(error: unknown, fallback = "操作失败，请稍后重试") {
  if (typeof error === "string" && error) return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message || "");
    if (message) return message;
  }
  return fallback;
}
