import { IconSvg } from "./IconSvg";

export const QrIcon = () => (
  <IconSvg size={18}>
    <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
    <rect x="14.5" y="3.5" width="6" height="6" rx="1" />
    <rect x="3.5" y="14.5" width="6" height="6" rx="1" />
    <path d="M14.5 14.5h2v2M20.5 14.5v.01M14.5 20.5h.01M17.5 17.5h3v3h-3z" />
  </IconSvg>
);
