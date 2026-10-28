import React from "react";
import {
  LayoutDashboard,
  PartyPopper,
  BookOpen,
  UtensilsCrossed,
  Sparkles,
  User,
  BadgeCheck,
  Mail,
  PlusCircle,
  Armchair,
  Clock,
  Users,
  TrendingUp,
  PenTool,
  ArrowRight,
  Send,
  LayoutGrid,
  Utensils,
  Info,
  Check,
  Search,
  Filter,
  Download,
  Upload,
  QrCode,
  Shield,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Edit,
  Share2,
  Copy,
  RefreshCw,
  Phone,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Calendar,
  MapPin,
  Camera,
  Eye,
  Lock,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  SlidersHorizontal,
  FolderOpen,
  ArrowLeft,
  DollarSign,
  Receipt,
  type LucideProps,
} from "lucide-react";

export type IconName =
  | "space_dashboard"
  | "celebration"
  | "menu_book"
  | "table_restaurant"
  | "styler"
  | "person"
  | "verified"
  | "drafts"
  | "add_circle"
  | "chair"
  | "pending"
  | "diversity_3"
  | "trending_up"
  | "stylus"
  | "arrow_forward"
  | "outgoing_mail"
  | "table_chart_view"
  | "restaurant_menu"
  | "info"
  | "check"
  | "schedule"
  | "search"
  | "filter_list"
  | "download"
  | "upload"
  | "qr_code_scanner"
  | "shield"
  | "credit_card"
  | "settings"
  | "logout"
  | "chevron_left"
  | "chevron_right"
  | "close"
  | "delete"
  | "edit"
  | "share"
  | "copy"
  | "refresh"
  | "mail"
  | "phone"
  | "link"
  | "error"
  | "check_circle"
  | "help"
  | "calendar"
  | "location"
  | "camera"
  | "visibility"
  | "lock"
  | "expand_more"
  | "expand_less"
  | "more_vert"
  | "tune"
  | "folder"
  | "arrow_back"
  | "payments"
  | "receipt_long";

const iconMap: Record<IconName, React.ComponentType<LucideProps>> = {
  space_dashboard: LayoutDashboard,
  celebration: PartyPopper,
  menu_book: BookOpen,
  table_restaurant: UtensilsCrossed,
  styler: Sparkles,
  person: User,
  verified: BadgeCheck,
  drafts: Mail,
  add_circle: PlusCircle,
  chair: Armchair,
  pending: Clock,
  diversity_3: Users,
  trending_up: TrendingUp,
  stylus: PenTool,
  arrow_forward: ArrowRight,
  outgoing_mail: Send,
  table_chart_view: LayoutGrid,
  restaurant_menu: Utensils,
  info: Info,
  check: Check,
  schedule: Clock,
  search: Search,
  filter_list: Filter,
  download: Download,
  upload: Upload,
  qr_code_scanner: QrCode,
  shield: Shield,
  credit_card: CreditCard,
  settings: Settings,
  logout: LogOut,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  close: X,
  delete: Trash2,
  edit: Edit,
  share: Share2,
  copy: Copy,
  refresh: RefreshCw,
  mail: Mail,
  phone: Phone,
  link: LinkIcon,
  error: AlertCircle,
  check_circle: CheckCircle2,
  help: HelpCircle,
  calendar: Calendar,
  location: MapPin,
  camera: Camera,
  visibility: Eye,
  lock: Lock,
  expand_more: ChevronDown,
  expand_less: ChevronUp,
  more_vert: MoreVertical,
  tune: SlidersHorizontal,
  folder: FolderOpen,
  arrow_back: ArrowLeft,
  payments: DollarSign,
  receipt_long: Receipt,
};

export interface IconProps extends LucideProps {
  name: IconName;
}

export function Icon({ name, className, size = 18, ...props }: IconProps) {
  const Component = iconMap[name];
  if (!Component) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Icon] Unknown icon name: "${String(name)}"`);
    }
    return null;
  }
  return <Component className={className} size={size} {...props} />;
}
