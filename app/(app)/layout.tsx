import { validateRequest } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import MobileNav from "@/components/mobile-nav";
import UserMenu from "@/components/user-menu";
import RecordingIndicator from "@/components/recording-indicator";
import ThemeToggle from "@/components/theme-toggle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await validateRequest();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>
      <header role="banner" className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <nav role="navigation" aria-label="Main navigation" className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4 sm:gap-6">
            <MobileNav />
            <Link href="/" className="text-lg sm:text-xl font-bold transition-opacity hover:opacity-80">
              AI Voice Keyboard
            </Link>
            <div className="hidden sm:flex gap-4 items-center">
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Dictation
              </Link>
              <Link
                href="/dictionary"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Dictionary
              </Link>
              <RecordingIndicator />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <span className="hidden sm:inline text-xs sm:text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-none">
              {user.email}
            </span>
            <UserMenu email={user.email} />
            <div className="hidden sm:block">
              <LogoutButton />
            </div>
          </div>
        </nav>
      </header>
      <main id="main-content" role="main" className="flex-1">{children}</main>
    </div>
  );
}

