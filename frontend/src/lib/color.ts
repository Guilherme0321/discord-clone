const PALETTE = ["#6D3CFF", "#EB459E", "#57F287", "#FEE75C", "#ED4245"];

export function colorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
