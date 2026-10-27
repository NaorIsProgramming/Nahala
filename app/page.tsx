import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex p-4">
        <div className="ms-auto">
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-16 text-center">
        <Logo />
        <h1 className="text-3xl font-semibold tracking-tight">נחלה</h1>
        <p className="text-base leading-normal text-muted">
          מערכת ניהול בתי אריזה
        </p>
      </main>
    </div>
  );
}
