export interface TicketShape {
  w: number;
  h: number;
  corner: number;
  notch: number;
}

/** A ticket's silhouette: rounded corners with a round notch in each end. */
export function ticketPath({ w, h, corner: c, notch: n }: TicketShape): string {
  const m = h / 2;
  return [
    `M${c} 0H${w - c}A${c} ${c} 0 0 1 ${w} ${c}`,
    `V${m - n}A${n} ${n} 0 0 0 ${w} ${m + n}`,
    `V${h - c}A${c} ${c} 0 0 1 ${w - c} ${h}`,
    `H${c}A${c} ${c} 0 0 1 0 ${h - c}`,
    `V${m + n}A${n} ${n} 0 0 0 0 ${m - n}`,
    `V${c}A${c} ${c} 0 0 1 ${c} 0Z`,
  ].join("");
}
