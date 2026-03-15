import { JournalRegistrationWizard } from "@/src/features/journals"
import { ShieldAlert } from "lucide-react"

export default function JournalRegistrationPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-4xl space-y-4">
        {/* Header Hero */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Register a Journal
          </h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Digitopub provides institutional-grade scholarly publishing infrastructure. Use this wizard to configure your publication's peer-review mechanisms, editorial architecture, and distribution networks.
          </p>
        </div>

        {/* Advisory Warning */}
        <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/50 dark:bg-yellow-900/20 shadow-sm transition-all duration-300">
          <ShieldAlert className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
          <div className="text-sm text-yellow-800 dark:text-yellow-200/90">
            <span className="font-semibold block mb-1">Administrative Action</span>
            Journal registration is subject to Digitopub's quality assurance framework. Upon submission, our technical team will provision an isolated OJS instance tailored to your specifications. Setup typically requires 24-48 hours.
          </div>
        </div>

        {/* Registration Wizard Component */}
        <JournalRegistrationWizard />

      </div>
    </div>
  )
}
