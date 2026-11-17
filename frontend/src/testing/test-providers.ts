import { EnvironmentProviders, importProvidersFrom } from '@angular/core';
import {
  LucideAngularModule,
  GraduationCap,
  Vote,
  Shield,
  Landmark,
  Megaphone,
  LogOut,
  User,
  Users,
  Lock,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  FileText,
  Inbox,
  FileCheck,
  Check,
  X,
  FileEdit,
  Video,
  Key,
  Send,
  ArrowLeft,
  Info,
  BarChart2,
  Play,
  ChevronDown,
  LogIn,
  ArrowDown,
  MessageSquare
} from 'lucide-angular';

/**
 * Enregistre les icônes Lucide dans TestBed selon la même méthode que app.config.ts.
 */
export function provideLucideTestIcons(): EnvironmentProviders {
  return importProvidersFrom(
    LucideAngularModule.pick({
      GraduationCap,
      Vote,
      Shield,
      Landmark,
      Megaphone,
      LogOut,
      User,
      Users,
      Lock,
      Upload,
      Loader2,
      CheckCircle2,
      AlertTriangle,
      Plus,
      RefreshCw,
      FileText,
      Inbox,
      FileCheck,
      Check,
      X,
      FileEdit,
      Video,
      Key,
      Send,
      ArrowLeft,
      Info,
      BarChart2,
      Play,
      ChevronDown,
      LogIn,
      ArrowDown,
      MessageSquare
    })
  );
}
