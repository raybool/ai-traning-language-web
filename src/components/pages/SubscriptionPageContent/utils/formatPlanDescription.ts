export const formatPlanDescription = (
  raw: string
): {
  intro: string;
  extrasLabel: string | null;
  extras: string[];
} => {
  const normalized = raw.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return { intro: '', extrasLabel: null, extras: [] };
  }

  const bulletParts = normalized
    .split('•')
    .map((part) => part.trim())
    .filter(Boolean);

  if (bulletParts.length === 0) {
    return { intro: normalized, extrasLabel: null, extras: [] };
  }

  const [firstPart, ...rest] = bulletParts;
  const extrasLabelMatch = firstPart.match(/^(.*?)(Включено:)\s*$/i);

  if (extrasLabelMatch) {
    return {
      intro: extrasLabelMatch[1].trim(),
      extrasLabel: extrasLabelMatch[2].trim(),
      extras: rest,
    };
  }

  return {
    intro: firstPart,
    extrasLabel: rest.length > 0 ? 'Включено:' : null,
    extras: rest,
  };
};
