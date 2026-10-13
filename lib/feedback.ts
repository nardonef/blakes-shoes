export const FEEDBACK_EMAIL = "franknardone95@gmail.com";
export const MAX_MESSAGE_LENGTH = 1500;

// encodeURIComponent throws on a lone surrogate (e.g. an emoji cut in half by maxLength).
const wellFormed = (s: string) =>
  s.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDFFF]/g, (m) => (m.length === 2 ? m : "\uFFFD"));

export function buildFeedbackMailto(name: string, message: string): string {
  const cleanName = wellFormed(name).replace(/\s+/g, " ").trim();
  const cleanMessage = wellFormed(message).trim();
  if (!cleanName) throw new Error("Name is required");
  if (!cleanMessage) throw new Error("Message is required");
  if (cleanMessage.length > MAX_MESSAGE_LENGTH) throw new Error("Message is too long");

  const subject = `Blake's Shoes feedback from ${cleanName}`;
  const body = `${cleanMessage}\n\n- ${cleanName}`;
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
