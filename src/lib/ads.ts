/**
 * Booked ad tiles, keyed by tile id (L1, L2 = left rail top/bottom; R1, R2 = right rail).
 * Images live in public/ads/ so visitors never load anything from a third party.
 * Remove an entry to put the "Advertise here" placeholder back.
 */
export interface Ad {
  name: string;
  url: string;
  image: string;
  line: string;
  cta: string;
  /** Tile colours, to match the advertiser's brand. */
  bg: string;
  fg: string;
}

export const ADS: Partial<Record<'L1' | 'L2' | 'R1' | 'R2', Ad>> = {
  R1: {
    name: 'Nullchat',
    url: 'https://nullchat.tech/?ref=isthere',
    image: '/ads/nullchat.png',
    line: 'Anonymous group chat. No sign-up, no history, leaves no trace.',
    cta: 'Start chatting',
    bg: '#000000',
    fg: '#ffffff',
  },
};
