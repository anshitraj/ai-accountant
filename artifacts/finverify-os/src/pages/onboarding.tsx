import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { BrandMark } from "@/components/app/finverify-ui";
import { getUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

type OnboardingState = {
  profession: string;
  companyType: string;
  monthlyVolume: string;
  tools: string[];
  priorities: string[];
};

const initialState: OnboardingState = {
  profession: "Founder",
  companyType: "SaaS startup",
  monthlyVolume: "100-500 records/month",
  tools: ["Bank statement", "Invoices", "Tally/Zoho export"],
  priorities: ["Find missing invoices", "Prepare CA review"],
};

const professionOptions = ["Founder", "Finance manager", "CA or consultant", "Operations lead"];
const companyTypeOptions = ["SaaS startup", "D2C brand", "Services business", "Marketplace"];
const volumeOptions = ["Under 100 records/month", "100-500 records/month", "500-2,000 records/month", "2,000+ records/month"];
const toolOptions = ["Bank statement", "Invoices", "Tally/Zoho export", "GST/TDS files", "Payroll sheet", "Gateway settlements"];
const priorityOptions = ["Find missing invoices", "Match bank credits", "Flag GST/TDS risks", "Prepare CA review", "Export reports"];

function onboardingKey(email: string) {
  return `finverify_onboarding:${email}`;
}

function completionKey(email: string) {
  return `finverify_onboarding_complete:${email}`;
}

function toggleItem(items: string[], item: string) {
  return items.includes(item) ? items.filter(existing => existing !== item) : [...items, item];
}

function OptionButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition",
        active
          ? "border-primary bg-primary/10 text-foreground shadow-sm"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
      )}
    >
      <span>{children}</span>
      {active && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  );
}

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const user = getUser();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingState>(initialState);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const saved = localStorage.getItem(onboardingKey(user.email));
    if (saved) {
      try {
        setForm({ ...initialState, ...JSON.parse(saved) });
      } catch {
        localStorage.removeItem(onboardingKey(user.email));
      }
    }
  }, [navigate, user]);

  const summary = useMemo(() => {
    const firstUpload = form.tools.includes("Bank statement")
      ? "Upload the latest bank statement first, then add invoices and ledger exports for matching."
      : "Start with invoices and ledger exports, then add bank statements when available.";
    const riskLanguage = form.priorities.includes("Flag GST/TDS risks")
      ? "Potential risk — needs CA review items should be routed before reporting."
      : "Potential risk — needs CA review items should still be reviewed before the CA-ready export.";
    const cadence = form.monthlyVolume.includes("2,000+") || form.monthlyVolume.includes("500-2,000")
      ? "Weekly verification is recommended for this volume."
      : "Monthly verification should work for this volume.";

    return {
      title: `${form.companyType} workspace for ${form.profession.toLowerCase()}`,
      objective: form.priorities.slice(0, 2).join(" and ") || "Prepare CA review",
      firstUpload,
      riskLanguage,
      cadence,
    };
  }, [form]);

  if (!user) return null;

  const steps = [
    {
      eyebrow: "Welcome",
      title: `Welcome, ${user.name.split(" ")[0]}. Let us set up your verification workspace.`,
      description: "FinVerify will use this profile to shape your dashboard summary, upload priorities, and CA review queue labels.",
      icon: Sparkles,
      body: (
        <div className="grid gap-3 sm:grid-cols-2">
          {professionOptions.map(option => (
            <OptionButton
              key={option}
              active={form.profession === option}
              onClick={() => setForm(current => ({ ...current, profession: option }))}
            >
              {option}
            </OptionButton>
          ))}
        </div>
      ),
    },
    {
      eyebrow: "Company profile",
      title: "What kind of finance workflow are we preparing?",
      description: "This keeps the experience professional and relevant without claiming live integrations.",
      icon: Building2,
      body: (
        <div className="grid gap-3 sm:grid-cols-2">
          {companyTypeOptions.map(option => (
            <OptionButton
              key={option}
              active={form.companyType === option}
              onClick={() => setForm(current => ({ ...current, companyType: option }))}
            >
              {option}
            </OptionButton>
          ))}
        </div>
      ),
    },
    {
      eyebrow: "Monthly load",
      title: "How many finance records do you usually clean before CA review?",
      description: "The summary will recommend a monthly or weekly verification cadence.",
      icon: FileSpreadsheet,
      body: (
        <div className="grid gap-3">
          {volumeOptions.map(option => (
            <OptionButton
              key={option}
              active={form.monthlyVolume === option}
              onClick={() => setForm(current => ({ ...current, monthlyVolume: option }))}
            >
              {option}
            </OptionButton>
          ))}
        </div>
      ),
    },
    {
      eyebrow: "Upload sources",
      title: "Which files will you upload most often?",
      description: "Current FinVerify workflows are upload-based unless a page explicitly says otherwise.",
      icon: UploadCloud,
      body: (
        <div className="grid gap-3 sm:grid-cols-2">
          {toolOptions.map(option => (
            <OptionButton
              key={option}
              active={form.tools.includes(option)}
              onClick={() => setForm(current => ({ ...current, tools: toggleItem(current.tools, option) }))}
            >
              {option}
            </OptionButton>
          ))}
        </div>
      ),
    },
    {
      eyebrow: "Goal",
      title: "What should FinVerify help summarize first?",
      description: "AI is optional here; the product summary is built from your selections and rule-first checks.",
      icon: ClipboardCheck,
      body: (
        <div className="grid gap-3 sm:grid-cols-2">
          {priorityOptions.map(option => (
            <OptionButton
              key={option}
              active={form.priorities.includes(option)}
              onClick={() => setForm(current => ({ ...current, priorities: toggleItem(current.priorities, option) }))}
            >
              {option}
            </OptionButton>
          ))}
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const CurrentIcon = currentStep.icon;
  const isLastStep = step === steps.length - 1;

  const finishOnboarding = () => {
    localStorage.setItem(onboardingKey(user.email), JSON.stringify({ ...form, summary }));
    localStorage.setItem(completionKey(user.email), "true");
    navigate("/app/overview");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="fv-container flex h-16 items-center justify-between">
          <BrandMark />
          <button type="button" onClick={() => navigate("/app/overview")} className="fv-button-ghost">
            Skip for now
          </button>
        </div>
      </header>

      <main className="fv-container grid gap-8 py-8 lg:grid-cols-2 lg:items-start lg:py-12">
        <motion.section
          key={step}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26 }}
          className="fv-card p-5 sm:p-8"
        >
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <CurrentIcon className="h-3.5 w-3.5" />
                {currentStep.eyebrow}
              </div>
              <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{currentStep.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{currentStep.description}</p>
            </div>
            <div className="shrink-0 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              {step + 1} of {steps.length}
            </div>
          </div>

          {currentStep.body}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setStep(current => Math.max(0, current - 1))}
              className="fv-button-secondary"
              disabled={step === 0}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => (isLastStep ? finishOnboarding() : setStep(current => current + 1))}
              className="fv-button-primary"
            >
              {isLastStep ? "Create workspace summary" : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.section>

        <aside className="fv-card-flat bg-card p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Workspace summary</div>
              <div className="text-xs text-muted-foreground">Built from your onboarding answers</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile</div>
              <div className="mt-2 text-sm font-semibold">{summary.title}</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">{form.monthlyVolume}</div>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Primary objective</div>
              <div className="mt-2 text-sm font-semibold">{summary.objective}</div>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">First run</div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{summary.firstUpload}</p>
            </div>
            <div className="fv-status-missing rounded-xl border p-4">
              <div className="text-xs font-semibold uppercase tracking-wide">Compliance note</div>
              <p className="mt-2 text-xs leading-5">{summary.riskLanguage}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cadence</div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{summary.cadence}</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-3 text-xs text-muted-foreground">
            <UserRound className="h-4 w-4 shrink-0 text-primary" />
            Signed in as {user.email}
          </div>
        </aside>
      </main>
    </div>
  );
}
