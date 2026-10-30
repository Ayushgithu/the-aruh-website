import { site, waLink } from "@/lib/site";
import { WhatsAppIcon } from "@/components/ui/icons";

export function WhatsAppFab() {
  return (
    <a
      href={waLink(`Hi ${site.name}, I have a question.`)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg transition-transform duration-200 animate-pulse-ring hover:scale-110 sm:right-6"
    >
      <WhatsAppIcon className="h-7 w-7" />
      <span className="pointer-events-none absolute right-16 hidden whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 md:block">
        Chat with us
      </span>
    </a>
  );
}
