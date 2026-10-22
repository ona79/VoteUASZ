import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
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
  ArrowDown
} from 'lucide-angular';
import { routes } from './app.routes';
import { jwtInterceptor } from './interceptors/jwt.interceptor';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    importProvidersFrom(LucideAngularModule.pick({
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
        ArrowDown
    })),
    provideServiceWorker('ngsw-worker.js', {
        enabled: false,
        registrationStrategy: 'registerWhenStable:30000'
    })
]
};
