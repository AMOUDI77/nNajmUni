import { applicationUrl, whatsappUrl, track, type Inquiry } from "../discovery";
export default function AdvisorLink({
  context = {},
  children,
  className = "student-button secondary",
}: {
  context?: Inquiry;
  children?: React.ReactNode;
  className?: string;
}) {
  const whatsapp = whatsappUrl(context);
  return (
    <a
      className={className}
      href={whatsapp || applicationUrl(context, true)}
      target={whatsapp ? "_blank" : undefined}
      rel={whatsapp ? "noopener noreferrer" : undefined}
      onClick={() => {
        if (context.program) track("program_inquiry_clicked");
        track(whatsapp ? "whatsapp_handoff_clicked" : "consultation_requested");
      }}
    >
      {children || (whatsapp ? "تحدث مع مستشار عبر واتساب" : "تحدث مع مستشار")}
    </a>
  );
}
