// Core UI Components
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from "./Button";
export { Input, type InputProps } from "./Input";
export { TextArea, type TextAreaProps } from "./TextArea";

// Dialog
export { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogBody,
  DialogClose,
  ProgressBar
} from "./Dialog";

// Text Components
export { Heading, Text } from "./Text";
export type { HeadingProps, HeadingSize } from "./Text/Heading";
export type { TextProps, TextSize, TextTheme } from "./Text/Text";

// Link Component
export { LinkComponent as Link, InternalLink, ExternalLink } from "./link";

// Icons (Lucide React)
export { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Users,
  MessageSquare,
  GraduationCap,
  Trophy,
  BarChart3,
  Info,
  Lock,
  Pencil,
  Search,
  Plus,
  Minus,
  Settings,
  LogOut,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Star,
  Heart,
  Share2,
  Copy,
  Download,
  Upload,
  File,
  Folder,
  Image,
  Video,
  Link as LinkIcon,
  Compass,
  ChevronDown
} from 'lucide-react';

// Layout Primitives
export { Box, Flex } from "./BoxFlex";
