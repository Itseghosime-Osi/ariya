import React from "react";
import {
  LayoutDashboard,
  PartyPopper,
  BookOpen,
  UtensilsCrossed,
  Sparkles,
  LayoutTemplate,
  User,
  BadgeCheck,
  Mail,
  Bell,
  BellOff,
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
  Type,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Layers,
  ListChecks,
  Wand2,
  Move,
  EyeOff,
  GripVertical,
  Palette,
  CloudUpload,
  type LucideProps,
} from "lucide-react";

export type IconName =
  | "space_dashboard"
  | "notifications"
  | "notifications_off"
  | "celebration"
  | "menu_book"
  | "table_restaurant"
  | "styler"
  | "layout_template"
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
  | "checklist"
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
  | "receipt_long"
  | "text_fields"
  | "image"
  | "undo"
  | "redo"
  | "layers"
  | "magic"
  | "move"
  | "visibility_off"
  | "grip"
  | "swatch"
  | "cloud_upload";

const iconMap: Record<IconName, React.ComponentType<LucideProps>> = {
  space_dashboard: LayoutDashboard,
  celebration: PartyPopper,
  menu_book: BookOpen,
  table_restaurant: UtensilsCrossed,
  styler: Sparkles,
  layout_template: LayoutTemplate,
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
  checklist: ListChecks,
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
  notifications: Bell,
  notifications_off: BellOff,
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
  text_fields: Type,
  image: ImageIcon,
  undo: Undo2,
  redo: Redo2,
  layers: Layers,
  magic: Wand2,
  move: Move,
  visibility_off: EyeOff,
  grip: GripVertical,
  swatch: Palette,
  cloud_upload: CloudUpload,
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
