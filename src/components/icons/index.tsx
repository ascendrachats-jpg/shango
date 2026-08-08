import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const icon =
  (paths: React.ReactNode) =>
  ({ size = 14, className = "", ...props }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {paths}
    </svg>
  )

export const HomeIcon = icon(
  <>
    <path d="M1.5 6L7 1.5 12.5 6V12.5H9V9H5v3.5H1.5V6z" />
  </>,
)
export const AppsIcon = icon(
  <>
    <rect x="1.5" y="1.5" width="4" height="4" rx="1" />
    <rect x="8.5" y="1.5" width="4" height="4" rx="1" />
    <rect x="1.5" y="8.5" width="4" height="4" rx="1" />
    <rect x="8.5" y="8.5" width="4" height="4" rx="1" />
  </>,
)
export const HistoryIcon = icon(
  <>
    <circle cx="7" cy="7" r="5.5" />
    <polyline points="7,4 7,7 9,9" />
  </>,
)
export const TemplatesIcon = icon(
  <>
    <rect x="1.5" y="1.5" width="11" height="8" rx="1" />
    <line x1="1.5" y1="11" x2="5.5" y2="11" />
    <line x1="8.5" y1="11" x2="12.5" y2="11" />
  </>,
)
export const IntegrationsIcon = icon(
  <>
    <circle cx="3.5" cy="7" r="2" />
    <circle cx="10.5" cy="3.5" r="2" />
    <circle cx="10.5" cy="10.5" r="2" />
    <line x1="5.4" y1="6.1" x2="8.6" y2="4.4" />
    <line x1="5.4" y1="7.9" x2="8.6" y2="9.6" />
  </>,
)
export const DeployIcon = icon(
  <>
    <path d="M7 1.5L7 9.5M7 1.5L4 4.5M7 1.5L10 4.5" />
    <path d="M2 11h10a1 1 0 010 1.5H2A1 1 0 012 11z" />
  </>,
)
export const FilesIcon = icon(
  <>
    <path d="M2.5 1.5h5.5l3.5 3.5v8a1 1 0 01-1 1h-8a1 1 0 01-1-1v-10a1 1 0 011-1z" />
    <polyline points="8,1.5 8,5 11.5,5" />
  </>,
)
export const ForkIcon = icon(
  <>
    <circle cx="3.5" cy="3.5" r="1.5" />
    <circle cx="3.5" cy="10.5" r="1.5" />
    <circle cx="10.5" cy="3.5" r="1.5" />
    <path d="M3.5 5v2.5c0 1.1.9 2 2 2H8M10.5 5v2" />
  </>,
)
export const RestoreIcon = icon(
  <>
    <path d="M2 7A5 5 0 107 2" />
    <polyline points="2,2 2,7 7,7" />
  </>,
)
export const ArchiveIcon = icon(
  <>
    <rect x="1.5" y="4" width="11" height="8.5" rx="1" />
    <rect x="1" y="1.5" width="12" height="3" rx="0.5" />
    <line x1="5.5" y1="7.5" x2="8.5" y2="7.5" />
  </>,
)
export const DuplicateIcon = icon(
  <>
    <rect x="4.5" y="4.5" width="8" height="8" rx="1" />
    <path d="M4.5 9.5H2.5a1 1 0 01-1-1v-7a1 1 0 011-1h7a1 1 0 011 1v2" />
  </>,
)
export const ExportIcon = icon(
  <>
    <path d="M5 2.5H2.5a1 1 0 00-1 1v8a1 1 0 001 1h9a1 1 0 001-1V10M8.5 1.5H12.5V5.5M7 7L12.5 1.5" />
  </>,
)
export const ShareIcon = icon(
  <>
    <circle cx="11.5" cy="3" r="1.5" />
    <circle cx="2.5" cy="7" r="1.5" />
    <circle cx="11.5" cy="11" r="1.5" />
    <line x1="4" y1="7.8" x2="10" y2="10.2" />
    <line x1="10" y1="3.8" x2="4" y2="6.2" />
  </>,
)
export const VersionIcon = icon(
  <>
    <rect x="1.5" y="1.5" width="11" height="3" rx="0.5" />
    <rect x="1.5" y="5.5" width="11" height="3" rx="0.5" />
    <rect x="1.5" y="9.5" width="11" height="3" rx="0.5" />
  </>,
)
export const BellIcon = icon(
  <>
    <path d="M7 1a3.5 3.5 0 013.5 3.5c0 3.5 1.5 4.5 1.5 4.5H2s1.5-1 1.5-4.5A3.5 3.5 0 017 1z" />
    <path d="M5.5 9v.5a1.5 1.5 0 003 0V9" />
  </>,
)
export const LockIcon = icon(
  <>
    <rect x="2.5" y="6.5" width="9" height="6" rx="1" />
    <path d="M4.5 6.5v-2a2.5 2.5 0 015 0v2" />
  </>,
)
export const GlobeIcon = icon(
  <>
    <circle cx="7" cy="7" r="5.5" />
    <ellipse cx="7" cy="7" rx="2.5" ry="5.5" />
    <line x1="1.5" y1="5" x2="12.5" y2="5" />
    <line x1="1.5" y1="9" x2="12.5" y2="9" />
  </>,
)
export const SearchIcon = icon(
  <>
    <circle cx="6" cy="6" r="4" />
    <line x1="9.5" y1="9.5" x2="12.5" y2="12.5" />
  </>,
)
export const SettingsIcon = icon(
  <>
    <circle cx="7" cy="7" r="2" />
    <path d="M7 1.5v1M7 11.5v1M1.5 7h1M11.5 7h1M3.2 3.2l.7.7M10.1 10.1l.7.7M3.2 10.8l.7-.7M10.1 3.9l.7-.7" />
  </>,
)
export const ChevronLeftIcon = icon(
  <>
    <polyline points="9,11 4.5,7 9,3" />
  </>,
)
export const ChevronRightIcon = icon(
  <>
    <polyline points="5,3 9.5,7 5,11" />
  </>,
)
export const ChevronDownIcon = icon(
  <>
    <polyline points="3,5 7,9.5 11,5" />
  </>,
)
export const ChevronUpIcon = icon(
  <>
    <polyline points="3,9 7,4.5 11,9" />
  </>,
)
export const PlusIcon = icon(
  <>
    <line x1="7" y1="2" x2="7" y2="12" />
    <line x1="2" y1="7" x2="12" y2="7" />
  </>,
)
export const XIcon = icon(
  <>
    <line x1="2.5" y1="2.5" x2="11.5" y2="11.5" />
    <line x1="11.5" y1="2.5" x2="2.5" y2="11.5" />
  </>,
)
export const CheckIcon = icon(
  <>
    <polyline points="2,7 5.5,10.5 12,3" />
  </>,
)
export const DotsIcon = icon(
  <>
    <circle cx="3.5" cy="7" r="1" fill="currentColor" stroke="none" />
    <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
    <circle cx="10.5" cy="7" r="1" fill="currentColor" stroke="none" />
  </>,
)
export const CodeIcon = icon(
  <>
    <polyline points="4,4 1,7 4,10" />
    <polyline points="10,4 13,7 10,10" />
    <line x1="6.5" y1="11.5" x2="7.5" y2="2.5" />
  </>,
)
export const InspectIcon = icon(
  <>
    <circle cx="7" cy="7" r="2" />
    <line x1="7" y1="1.5" x2="7" y2="3.5" />
    <line x1="7" y1="10.5" x2="7" y2="12.5" />
    <line x1="1.5" y1="7" x2="3.5" y2="7" />
    <line x1="10.5" y1="7" x2="12.5" y2="7" />
  </>,
)
export const FullscreenIcon = icon(
  <>
    <path d="M1.5 5V1.5H5M9 1.5h3.5V5M12.5 9v3.5H9M5 12.5H1.5V9" />
  </>,
)
export const RefreshIcon = icon(
  <>
    <path d="M12 7A5 5 0 112 7" />
    <polyline points="12,3 12,7 8,7" />
  </>,
)
export const SendIcon = icon(
  <>
    <line x1="12.5" y1="1.5" x2="6.5" y2="7.5" />
    <polygon points="12.5,1.5 8.5,12.5 6.5,7.5 1.5,5.5" />
  </>,
)
export const AttachIcon = icon(
  <>
    <path d="M12.5 6.5L6 13a3.5 3.5 0 01-4.95-4.95L7.5 1.6a2 2 0 012.83 2.83L3.88 10.9a.5.5 0 01-.71-.71l5.66-5.67" />
  </>,
)
export const ArrowUpIcon = icon(
  <>
    <line x1="7" y1="12" x2="7" y2="2" />
    <polyline points="3,6 7,2 11,6" />
  </>,
)
export const CopyIcon = icon(
  <>
    <rect x="4.5" y="4.5" width="8" height="8" rx="1" />
    <path d="M4.5 9.5H2.5a1 1 0 01-1-1v-7a1 1 0 011-1h7a1 1 0 011 1v2" />
  </>,
)
export const EditIcon = icon(
  <>
    <path d="M10 2.5l1.5 1.5-7 7H3V9.5l7-7z" />
    <line x1="1.5" y1="12.5" x2="12.5" y2="12.5" />
  </>,
)
export const StarIcon = icon(
  <>
    <polygon points="7,1.5 8.8,5.3 13,5.8 10,8.7 10.8,12.8 7,10.8 3.2,12.8 4,8.7 1,5.8 5.2,5.3" />
  </>,
)
export const BackIcon = icon(
  <>
    <line x1="12.5" y1="7" x2="1.5" y2="7" />
    <polyline points="5,3 1.5,7 5,11" />
  </>,
)
export const KeyboardIcon = icon(
  <>
    <rect x="1" y="4" width="12" height="7" rx="1" />
    <line x1="4" y1="7" x2="4" y2="7" stroke="currentColor" strokeWidth={2} />
    <line x1="7" y1="7" x2="7" y2="7" stroke="currentColor" strokeWidth={2} />
    <line x1="10" y1="7" x2="10" y2="7" stroke="currentColor" strokeWidth={2} />
    <line x1="4" y1="9.5" x2="10" y2="9.5" />
  </>,
)
export const GridIcon = icon(
  <>
    <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="0.5" />
    <rect x="8" y="1.5" width="4.5" height="4.5" rx="0.5" />
    <rect x="1.5" y="8" width="4.5" height="4.5" rx="0.5" />
    <rect x="8" y="8" width="4.5" height="4.5" rx="0.5" />
  </>,
)
export const ListIcon = icon(
  <>
    <line x1="1.5" y1="3.5" x2="12.5" y2="3.5" />
    <line x1="1.5" y1="7" x2="12.5" y2="7" />
    <line x1="1.5" y1="10.5" x2="12.5" y2="10.5" />
  </>,
)
export const SortIcon = icon(
  <>
    <line x1="1.5" y1="4" x2="12.5" y2="4" />
    <line x1="3.5" y1="7" x2="10.5" y2="7" />
    <line x1="5.5" y1="10" x2="8.5" y2="10" />
  </>,
)
export const MonitorIcon = icon(
  <>
    <rect x="1" y="1.5" width="12" height="8" rx="1" />
    <line x1="4" y1="12.5" x2="10" y2="12.5" />
    <line x1="7" y1="9.5" x2="7" y2="12.5" />
  </>,
)
export const TabletIcon = icon(
  <>
    <rect x="2.5" y="1" width="9" height="12" rx="1" />
    <circle cx="7" cy="11" r="0.7" fill="currentColor" stroke="none" />
  </>,
)
export const MobileIcon = icon(
  <>
    <rect x="4" y="1" width="6" height="12" rx="1" />
    <circle cx="7" cy="11" r="0.7" fill="currentColor" stroke="none" />
  </>,
)
export const ZapIcon = ({ size = 14, className = "", ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14 14"
    fill="none"
    className={className}
    {...props}
  >
    <path d="M8.5 1L2.5 8H7L5.5 13L11.5 6H7L8.5 1Z" fill="currentColor" />
  </svg>
)
export const UserIcon = icon(
  <>
    <circle cx="7" cy="5" r="2.5" />
    <path d="M1.5 12.5a5.5 5.5 0 0111 0" />
  </>,
)
export const LogOutIcon = icon(
  <>
    <path d="M9.5 1.5h2a1 1 0 011 1v9a1 1 0 01-1 1h-2M6 9.5L9.5 7 6 4.5M9.5 7H1.5" />
  </>,
)
export const RocketIcon = icon(
  <>
    <path d="M7 1.5C7 1.5 11.5 2.5 12.5 7c-1 2-3 3-3 3L7 7.5M7 1.5C7 1.5 2.5 2.5 1.5 7c1 2 3 3 3 3L7 7.5M7 1.5v6" />
    <path d="M4 9L3 11.5M10 9l1 2.5M5.5 10l1.5 2.5 1.5-2.5" />
  </>,
)
export const PaperclipIcon = icon(
  <>
    <path d="M12.5 6.5L6 13a3.5 3.5 0 01-4.95-4.95L7.5 1.6a2 2 0 012.83 2.83L3.88 10.9a.5.5 0 01-.71-.71l5.66-5.67" />
  </>,
)
export const StopIcon = icon(
  <>
    <rect
      x="3"
      y="3"
      width="8"
      height="8"
      rx="1.5"
      fill="currentColor"
      stroke="none"
    />
  </>,
)
export const CommunityIcon = icon(
  <>
    <circle cx="5" cy="5.5" r="2" />
    <circle cx="9.5" cy="5.5" r="2" />
    <path d="M1 12a4 4 0 018 0" />
    <path d="M7.5 11.5a3.5 3.5 0 016.5.5" />
  </>,
)
export const BookmarkIcon = icon(
  <>
    <path d="M3.5 1.5h7a1 1 0 011 1v10l-4.5-3-4.5 3v-10a1 1 0 011-1z" />
  </>,
)
export const BookOpenIcon = icon(
  <>
    <path d="M7 2v11M7 2C7 2 4 1.5 1.5 2.5v10C4 11.5 7 12 7 12M7 2C7 2 10 1.5 12.5 2.5v10C10 11.5 7 12 7 12" />
  </>,
)
export const AwardIcon = icon(
  <>
    <circle cx="7" cy="5.5" r="3.5" />
    <path d="M4.5 8.5L3 13l4-2 4 2-1.5-4.5" />
  </>,
)
export const UsersIcon = icon(
  <>
    <circle cx="5" cy="5" r="2" />
    <path d="M1 12a4 4 0 018 0" />
    <path d="M10 4.5a2 2 0 110 0" />
    <path d="M12.5 11.5a3.5 3.5 0 00-4-2.5" />
  </>,
)
